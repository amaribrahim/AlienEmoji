export const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
export const distance3 = (a, b) => Math.hypot(a.x-b.x, a.y-b.y, a.z-b.z);
export const pitchOptions = [38,41,43,45,48,50,53,55,57,60,62,65,67,69,72,74];
export function restorePitchRange(saved) {
  return pitchOptions.includes(saved?.lowest)&&pitchOptions.includes(saved?.highest)&&saved.lowest<saved.highest
    ? {lowest:saved.lowest,highest:saved.highest} : {lowest:50,highest:62};
}
export const noteName = midi => `${['C','C♯','D','E♭','E','F','F♯','G','A♭','A','B♭','B'][midi%12]}${Math.floor(midi/12)-1}`;
export function pitchForLength(length, shortest, longest, lowest=50, highest=62) {
  if(!pitchOptions.includes(lowest)||!pitchOptions.includes(highest)||lowest>=highest)throw new RangeError('Choose a lowest note below the highest note.');
  const pitches = pitchOptions.filter(p=>p>=lowest&&p<=highest).reverse();
  const t = longest > shortest ? clamp((length-shortest)/(longest-shortest),0,1) : .5;
  const midi = pitches[Math.round(t * (pitches.length-1))];
  return {midi, name:noteName(midi), frequency:440 * 2 ** ((midi-69)/12)};
}
// Quantile spacing gives dense clusters of lengths more musical room, while
// preserving longer = lower. Equal lengths always receive the same pitch.
export function pitchForDistribution(length,lengths,lowest=50,highest=62) {
  const sorted=[...new Set(lengths)].sort((a,b)=>a-b);
  if(sorted.length<2)return pitchForLength(.5,0,1,lowest,highest);
  let rank=sorted.findIndex(value=>value>=length);
  if(rank<0)rank=sorted.length-1;
  else if(rank>0)rank=rank-1+(length-sorted[rank-1])/(sorted[rank]-sorted[rank-1]);
  return pitchForLength(rank,0,sorted.length-1,lowest,highest);
}
export function pointDistance(p, a, b) {
  const dx=b.x-a.x, dy=b.y-a.y, d=dx*dx+dy*dy;
  const t=d ? clamp(((p.x-a.x)*dx+(p.y-a.y)*dy)/d,0,1) : 0;
  return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy);
}
export function sweptDistance(a,b,c,d) {
  const cross=(u,v,w)=>(v.x-u.x)*(w.y-u.y)-(v.y-u.y)*(w.x-u.x);
  const abC=cross(a,b,c), abD=cross(a,b,d), cdA=cross(c,d,a), cdB=cross(c,d,b);
  if(abC*abD<0 && cdA*cdB<0) return 0;
  return Math.min(pointDistance(a,c,d),pointDistance(b,c,d),pointDistance(c,a,b),pointDistance(d,a,b));
}
export class ContactGate {
  constructor(cooldown=180) { this.cooldown=cooldown; this.active=new Set(); this.last=new Map(); }
  enter(id,time) {
    if(this.active.has(id)) return false;
    this.active.add(id);
    if(time-(this.last.get(id)??-Infinity)<this.cooldown) return false;
    this.last.set(id,time); return true;
  }
  leaveExcept(ids) { for(const id of this.active) if(!ids.has(id)) this.active.delete(id); }
  clear() { this.active.clear(); }
}
// Real separation in light years, from right ascension and declination (degrees) and distance from Earth.
export function lightYearsBetween(a,b) {
  const r=Math.PI/180, place=({ra,dec,ly})=>({x:ly*Math.cos(dec*r)*Math.cos(ra*r),y:ly*Math.cos(dec*r)*Math.sin(ra*r),z:ly*Math.sin(dec*r)});
  return distance3(place(a),place(b));
}
export const formatLightYears = ly => `${Number(ly.toPrecision(2)).toLocaleString('en-US')} ly`;
// Familiar sky patterns. x, y, z place the instrument (depth is art-directed and sets pitch);
// ra, dec, ly are catalogue values from Wikipedia's "List of stars in …" tables, used for real distances.
export const constellations = [
  {id:'orion',name:'Orion',stars:[
    ['Betelgeuse',-.7,-1.25,.2,88.7929,7.4070,643],['Bellatrix',.65,-1.15,5.8,81.2828,6.3497,243],
    ['Alnitak',-.28,.05,2.2,85.1897,-1.9426,817],['Alnilam',0,-.08,24,84.0534,-1.2019,1342],['Mintaka',.28,-.21,3.4,83.0017,-.2991,916],
    ['Saiph',-.65,1.15,6.5,86.9391,-9.6696,721],['Rigel',.75,.95,.7,78.6345,-8.2016,773]
  ],links:[[0,1],[0,2],[1,4],[2,3],[3,4],[2,5],[4,6],[5,6]]},
  {id:'cassiopeia',name:'Cassiopeia',stars:[
    ['Caph',-1.65,-.5,5.8,2.2920,59.1502,54],['Schedar',-.85,.55,.5,10.1266,56.5374,228],['Gamma Cassiopeiae',0,-.3,20,14.1771,60.7168,613],
    ['Ruchbah',.75,.7,2,21.4525,60.2354,99],['Segin',1.5,-.6,6.3,28.5987,63.6701,442]
  ],links:[[0,1],[1,2],[2,3],[3,4]]},
  {id:'cygnus',name:'Cygnus',stars:[
    ['Deneb',0,-1.2,28,310.3580,45.2803,2615],['Sadr',0,-.3,1.4,305.5571,40.2567,1523],['Albireo',.1,1.3,.3,292.6804,27.9597,385],
    ['Fawaris',-1,-.15,5,296.2435,45.1307,171],['Aljanah',1,.15,6.8,311.5518,33.9694,72]
  ],links:[[0,1],[1,2],[1,3],[1,4]]}
];
export const stars=[];
const links=[];
for(const group of constellations){
  const offset=stars.length;
  for(const [name,x,y,z,ra,dec,ly] of group.stars)stars.push({name,constellation:group.id,x:x*(5+z)/5,y:y*(5+z)/5,z,ra,dec,ly});
  links.push(...group.links.map(([a,b])=>[a+offset,b+offset]));
}
const lengths=links.map(([a,b])=>distance3(stars[a],stars[b]));
export const strings=links.map(([a,b],i)=>({a,b,length:lengths[i],lightYears:lightYearsBetween(stars[a],stars[b]),...pitchForDistribution(lengths[i],lengths)}));

export class RandomStrings {
  constructor(count,random=Math.random,now=0){
    this.random=random;this.last=-Infinity;
    this.next=Array.from({length:count},()=>now+2000+random()*26000);
  }
  reset(now){this.next=this.next.map(()=>now+28000+this.random()*57000);this.last=-Infinity;}
  poll(now){
    if(now-this.last<1200)return [];
    const due=Math.min(...this.next);if(due>now)return [];
    const id=this.next.indexOf(due);
    this.next[id]=now+28000+this.random()*57000;this.last=now;return [id];
  }
}

// Relative vertical distances include both page travel and star parallax.
export function crossedDivider(previous,current,x,left,right){
  return x>=left&&x<=right&&((previous>0&&current<=0)||(previous<0&&current>=0));
}
