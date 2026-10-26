import {clamp,pitchOptions,noteName,pitchForDistribution,restorePitchRange,stars,strings,constellations,pointDistance,sweptDistance,ContactGate,RandomStrings,formatLightYears,crossedDivider} from './star-guitar-core.mjs';
import {StringSynth} from './star-guitar-audio.mjs';
import {guitarRoutes,isGuitarPath} from './star-guitar-route.mjs';

const routes=guitarRoutes(import.meta.url);
// A directory entry keeps resolving assets and links from the site root after Back home.
const entryBase=document.querySelector('base');if(entryBase)entryBase.href=new URL('.',import.meta.url).href;
let instrumentActive=false,viewMix=0;
const constellationBounds=constellations.map(group=>{
 const members=stars.filter(star=>star.constellation===group.id);
 return {left:Math.max(...members.map(star=>-star.x*5/(5+star.z)))+.48,right:Math.max(...members.map(star=>star.x*5/(5+star.z)))+.48,top:Math.max(...members.map(star=>-star.y*5/(5+star.z)))+.36,bottom:Math.max(...members.map(star=>star.y*5/(5+star.z)))+.36};
});

const sky=document.createElement('div');sky.className='guitar-sky';
const scene=document.createElement('div');scene.className='guitar-scene';
scene.setAttribute('role','group');scene.setAttribute('aria-label','Star guitar constellations');
scene.innerHTML='<canvas class="guitar-canvas" aria-hidden="true"></canvas><div class="guitar-stars" inert></div><div class="guitar-labels" aria-hidden="true"></div><div class="guitar-readout" aria-hidden="true"><span>01 / STAR GUITAR</span><span class="guitar-note">D MINOR PENTATONIC</span><span class="guitar-caption">Touch a star. Brush a string.</span></div>';
sky.append(scene);document.body.prepend(sky);document.querySelector('.star-field')?.remove();
const canvas=scene.querySelector('canvas'),ctx=canvas.getContext('2d');
if(!ctx)throw new Error('Canvas is unavailable');
const starLayer=scene.querySelector('.guitar-stars');
const starButtons=stars.map((star,i)=>{
 const button=document.createElement('button');button.type='button';button.className='guitar-star';button.dataset.star=i;
 const notes=[...new Set(strings.filter(s=>s.a===i||s.b===i).map(s=>s.name))];
 button.setAttribute('aria-label',`${star.name}, ${star.constellation}: strum ${notes.join(', ')}`);button.innerHTML=`<span>${star.name}</span>`;
 starLayer.append(button);return button;
});
const labels=constellations.map(group=>{const label=document.createElement('span');label.textContent=group.name;scene.querySelector('.guitar-labels').append(label);return label;});
const dock=document.createElement('section');dock.className='guitar-dock';dock.id='star-guitar-console';dock.setAttribute('aria-label','Star Guitar Console');
dock.innerHTML=`<button class="guitar-sound guitar-control-row" type="button" aria-pressed="false"><span class="guitar-sound-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4 6 8H3v8h3l5 4V4Z"/><path class="guitar-speaker-waves" d="M15 8a6 6 0 0 1 0 8M18 5a10 10 0 0 1 0 14"/><path class="guitar-speaker-muted" d="m16 9 6 6m0-6-6 6"/></svg></span><span class="guitar-sound-label">Turn sound on</span></button>
<a class="guitar-expand guitar-control-row" href="${routes.instrument}"><span>Play the Star Guitar</span><span class="guitar-expand-icon" aria-hidden="true">→</span></a>
<p class="guitar-status sr-only" role="status"></p>`;
const instrument=document.createElement('main');instrument.className='guitar-page';instrument.hidden=true;instrument.inert=true;instrument.setAttribute('aria-labelledby','guitar-page-title');
instrument.innerHTML=`<header class="guitar-page-header"><a class="guitar-back" href="${routes.home}"><span aria-hidden="true">←</span> Back home</a><span class="guitar-page-brand">alien emoji</span></header>
<div class="guitar-page-intro"><p class="guitar-eyebrow">An instrument in the stars</p><h1 id="guitar-page-title" tabindex="-1">Star Guitar</h1><p>Touch a star. Brush a string.</p></div>
<section class="guitar-panel" aria-label="Instrument controls">
<div class="guitar-playback"><button class="guitar-sound guitar-control-row" type="button" aria-pressed="false"><span class="guitar-sound-icon" aria-hidden="true">♪</span><span class="guitar-sound-label">Play the Star Guitar</span></button>
<button class="guitar-auto guitar-control-row" type="button" aria-pressed="true" aria-label="Auto strum"><span class="guitar-toggle-icon" aria-hidden="true">Ⅱ</span><span class="guitar-toggle-label">Pause auto strum</span></button>
</div>
<label class="guitar-volume">Volume <input type="range" min="0" max="100" value="90" step="5" aria-label="Star guitar volume"><output>90%</output></label>
<div class="guitar-range"><label>Lowest note<select class="guitar-low" aria-label="Lowest note"></select></label><label>Highest note<select class="guitar-high" aria-label="Highest note"></select></label></div>
<p class="guitar-panel-help">D minor pentatonic<span>Auto strum plays occasional notes. Keys 1–9 play stars.</span></p>
<p class="guitar-status sr-only" role="status"></p></section>`;
document.body.append(instrument);
const panel=instrument.querySelector('.guitar-panel');
const hero=document.querySelector('.hero-stage');if(hero)hero.append(dock);
const soundButtons=[dock.querySelector('.guitar-sound'),panel.querySelector('.guitar-sound')];
let autoStrum=true;
let context=null,synth=null,sound=false,starting=false,volume=.9,audioGeneration=0;
try{const saved=Number(localStorage.getItem('star-guitar-volume-v2'));if(localStorage.getItem('star-guitar-volume-v2')!==null&&Number.isFinite(saved))volume=clamp(saved,0,1);}catch{}
const volumeInputs=[panel.querySelector('input[type=range]')];
function syncVolume(){for(const input of volumeInputs){input.value=Math.round(volume*100);input.parentElement.querySelector('output').value=`${Math.round(volume*100)}%`;}}
syncVolume();
function syncSound(message){
 for(const button of soundButtons){const label=starting?'Starting…':sound?'Turn sound off':button===soundButtons[0]?'Turn sound on':'Play the Star Guitar';button.querySelector('.guitar-sound-label').textContent=label;button.setAttribute('aria-pressed',String(sound));button.setAttribute('aria-label',label);button.disabled=starting;button.title=label;}
 if(sound)nudge?.cancel();
 document.body.classList.toggle('guitar-sounding',sound);
 dock.querySelector('.guitar-status').textContent=message||(sound?'Sound enabled. Brush a string or touch a star.':'Sound off.');
 panel.querySelector('.guitar-status').textContent=message||(sound?'Sound enabled. Brush a string or touch a star.':'Sound off.');
 scene.querySelector('.guitar-caption').textContent=message||(sound?'Touch a star. Brush a string.':'Switch sound on to listen.');
}
async function enableSound(){
 if(starting||sound)return sound;
 starting=true;syncSound();const generation=++audioGeneration;let pending,errorMessage;
 try{
  const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)throw new Error('Web Audio unavailable');
  pending=new Audio({latencyHint:'interactive'});await pending.resume();
  if(generation!==audioGeneration){await pending.close();return false;}
  if(pending.state!=='running')throw new Error('Audio suspended');
  context=pending;synth=new StringSynth(context,{volume});sound=true;
  if(autoStrum)pluck(Math.floor(Math.random()*strings.length),0,.4);
  context.addEventListener('statechange',()=>{if(context===pending&&sound&&context.state!=='running')muteSound('Sound paused. Enable sound to continue.');});
 }catch{if(pending&&pending.state!=='closed')pending.close().catch(()=>{});errorMessage='Audio unavailable. Try enabling sound in your browser.';return false;}
 finally{if(generation===audioGeneration){starting=false;syncSound(errorMessage);}}
 return sound;
}
function muteSound(message){
 ++audioGeneration;sound=false;starting=false;
 const oldContext=context,oldSynth=synth;context=null;synth=null;
 oldSynth?.silence();if(oldContext&&oldContext.state!=='closed')setTimeout(()=>oldContext.close().catch(()=>{}),100);
 syncSound(message);
}
for(const button of soundButtons)button.addEventListener('click',async()=>{if(sound)muteSound();else await enableSound();});
for(const input of volumeInputs)input.addEventListener('input',()=>{volume=Number(input.value)/100;synth?.setVolume(volume);syncVolume();try{localStorage.setItem('star-guitar-volume-v2',String(volume));}catch{}});

const dividers=[...document.querySelectorAll('.work-section,.services-section,.intro-section,.contact-new')].map(section=>{
 const element=document.createElement('div');element.className='guitar-divider';element.setAttribute('aria-hidden','true');section.prepend(element);
 return {element,previous:[],last:new Map()};
});
let previousScroll=scrollY;
function resetDividers(){previousScroll=scrollY;for(const divider of dividers)divider.previous=[];}
function scanDividers(now){
 if(instrumentActive)return;
 const moved=scrollY!==previousScroll;previousScroll=scrollY;
 for(const divider of dividers){
  const box=divider.element.getBoundingClientRect();
  const differences=points.map(p=>box.top-p.y);
  if(moved)points.forEach((p,i)=>{
   if(p.y<0||p.y>height||!crossedDivider(divider.previous[i],differences[i],p.x,box.left,box.right)||now-(divider.last.get(i)??-Infinity)<650)return;
   divider.last.set(i,now);strumStar(i,.34);
   divider.element.style.setProperty('--contact-x',`${p.x-box.left}px`);divider.element.classList.add('is-strummed');
   clearTimeout(divider.timeout);divider.timeout=setTimeout(()=>divider.element.classList.remove('is-strummed'),900);
  });
  divider.previous=differences;
 }
}
let width=0,height=0,points=[],frame=0,lastFrame=0,time=0,playArea={top:220,height:300};
let paused=document.body.classList.contains('motion-paused');
const reducedMotion=matchMedia('(prefers-reduced-motion:reduce)');
let pointer={x:0,y:0},camera={x:0,y:0,scroll:0},previous=null,pointerId=null,hoverStar=-1;
let colors={},sprites={},dustSprites={},nudge=null,lastNudge=-Infinity;
const gate=new ContactGate(180),lastPluck=new Map(),vibrations=new Map(),starPulses=new Map();
let seed=831;const random=()=>{seed=seed*16807%2147483647;return(seed-1)/2147483646;};
// Dust stays dimmer than every constellation star. 92% sits deep in the background; a few nearer motes give the parallax its scale.
const dust=Array.from({length:2100},(_,i)=>{const layer=i%100;return{x:random(),y:random(),near:layer===0?.6+random()*.75:layer<8?.2+random()*.25:.04+random()*.12,size:random(),phase:random()*6.28,color:random()};});
// Assign brightness once, independently of size, after generating the existing positions.
for(const star of dust)star.brightness=.26+.68*random()**1.4;
// Background dust is painted once per depth band and each band is moved as one sheet.
const FAR=.18,farEdges=[.04,.08,.12,.16],farBands=farEdges.slice(1).map((hi,i)=>{const sheet=document.createElement('canvas');return{lo:farEdges[i],hi,depth:(farEdges[i]+hi)/2,sheet,ctx:sheet.getContext('2d')};});
let liveDust=[],dpr=1;
const dustSprite=s=>dustSprites[s.color>.96?'warm':s.color>.85?'secondary':'paper'];
function paintFarDust(){
 if(!width||!height||!colors.paper)return;
 const field=dust.slice(0,width<701?1400:dust.length);liveDust=field.filter(s=>s.near>=FAR);
 for(const band of farBands){
  const c=band.ctx;band.sheet.width=canvas.width;band.sheet.height=canvas.height;c.setTransform(dpr,0,0,dpr,0,0);
  for(const s of field)if(s.near>=band.lo&&s.near<band.hi){const radius=1+s.size*1.1;c.globalAlpha=s.brightness;c.drawImage(dustSprite(s),s.x*width-radius,s.y*height-radius,radius*2,radius*2);}
 }
}
let stringLabels=[];
let lowest=38,highest=62;
try{({lowest,highest}=restorePitchRange(JSON.parse(localStorage.getItem('star-guitar-range-v4'))));}catch{}
const lowInput=panel.querySelector('.guitar-low'),highInput=panel.querySelector('.guitar-high');
for(const select of [lowInput,highInput])select.innerHTML=pitchOptions.map(midi=>`<option value="${midi}">${noteName(midi)}</option>`).join('');
function tune(persist=false){
 const lengths=strings.map(s=>s.length);
 for(const string of strings)Object.assign(string,pitchForDistribution(string.length,lengths,lowest,highest));
 stringLabels=strings.map(s=>`${s.name} · ${formatLightYears(s.lightYears)}`);
 lowInput.value=lowest;highInput.value=highest;
 for(const option of lowInput.options)option.disabled=Number(option.value)>=highest;
 for(const option of highInput.options)option.disabled=Number(option.value)<=lowest;
 starButtons.forEach((button,i)=>{const notes=[...new Set(strings.filter(s=>s.a===i||s.b===i).map(s=>s.name))];button.setAttribute('aria-label',`${stars[i].name}, ${stars[i].constellation}: strum ${notes.join(', ')}`);});
 scene.querySelector('.guitar-note').textContent=`${noteName(lowest)} – ${noteName(highest)} / D MINOR PENTATONIC`;
 if(persist){try{localStorage.setItem('star-guitar-range-v4',JSON.stringify({lowest,highest}));}catch{}panel.querySelector('.guitar-status').textContent=`Note range ${noteName(lowest)} to ${noteName(highest)}.`;}
}
lowInput.addEventListener('change',()=>{lowest=Number(lowInput.value);tune(true);});
highInput.addEventListener('change',()=>{highest=Number(highInput.value);tune(true);});
tune();
const rgba=(hex,a)=>{const h=hex.replace('#','');return`rgba(${[0,2,4].map(i=>parseInt(h.slice(i,i+2),16)).join(',')},${clamp(a,0,1)})`;};
function makeSprite(color,background=false){const sprite=document.createElement('canvas');sprite.width=sprite.height=64;const c=sprite.getContext('2d'),g=c.createRadialGradient(32,32,0,32,32,32);g.addColorStop(0,rgba(color,1));g.addColorStop(background?.14:.09,rgba(color,background?.85:.9));g.addColorStop(background?.42:.22,rgba(color,background?.4:.45));g.addColorStop(background?.78:.48,rgba(color,background?.1:.09));g.addColorStop(1,rgba(color,0));c.fillStyle=g;c.fillRect(0,0,64,64);return sprite;}
function palette(){
 const css=getComputedStyle(document.documentElement);
 const tokens={accent:'guitar-strings',paper:'guitar-stars',secondary:'guitar-glow',warm:'sky-warm',night:'night'};
 for(const [key,token]of Object.entries(tokens)){colors[key]=css.getPropertyValue(`--${token}`).trim()||css.getPropertyValue(`--${key}`).trim();sprites[key]=makeSprite(colors[key]);if(['paper','secondary','warm'].includes(key))dustSprites[key]=makeSprite(colors[key],true);}
 paintFarDust();draw(performance.now());
}
function layouts(){
 const home=width<701?[[.72,.72,.15],[.39,.48,.095],[.24,.79,.14]]:[[.64,.52,.14],[.34,.22,.10],[.20,.73,.12]];
 const play=width<701?[[.69,.43,.21],[.25,.22,.16],[.27,.72,.19]]:[[.50,.43,.20],[.21,.38,.15],[.79,.43,.17]];
 play.forEach((group,i)=>{
  const bounds=constellationBounds[i],x=group[0]*width,y=playArea.top+playArea.height*group[1];
  const scale=Math.min(width*group[2],playArea.height*(width<701?.27:.38),(x-28)/bounds.left,(width-x-28)/bounds.right,(y-playArea.top)/bounds.top,(playArea.top+playArea.height-y)/bounds.bottom);
  group[1]=y/Math.max(height,1);group[2]=Math.max(8,scale)/Math.max(width,1);
 });
 return home.map((group,i)=>group.map((value,j)=>value+(play[i][j]-value)*viewMix));
}
function geometry(){
 const layout=layouts();
 // The console shares Orion's camera offset, while remaining part of the scrolling hero.
 const scale=Math.min(width*layout[0][2],height*.21),depth=.62;
 dock.style.setProperty('--console-x',`${-camera.x*.48*scale*depth}px`);
 dock.style.setProperty('--console-y',`${-camera.y*.36*scale*depth-camera.scroll*depth*40}px`);
 const consoleTop=width<701?Math.max(375,height*.43):Math.max(140,height*.52-scale*1.25-88);
 dock.style.setProperty('--console-top',`${consoleTop}px`);
 dock.style.setProperty('--invitation-y',`${width<701?height*.72-scale*1.25-50-consoleTop:0}px`);
 points=stars.map(star=>{const index=constellations.findIndex(g=>g.id===star.constellation),[cx,cy,size]=layout[index],scale=Math.min(width*size,height*.21),depth=5/(5+star.z);return{x:width*cx+(star.x-camera.x*.48)*scale*depth,y:height*cy+(star.y-camera.y*.36)*scale*depth-camera.scroll*depth*40,depth};});
 points.forEach((p,i)=>{starButtons[i].style.transform=`translate(${p.x-22}px,${p.y-22}px)`;});
 labels.forEach((label,i)=>{const group=points.filter((_,j)=>stars[j].constellation===constellations[i].id);label.style.transform=`translate(${Math.min(...group.map(p=>p.x))}px,${Math.max(...group.map(p=>p.y))+25}px)`;});
}
function resize(){const box=scene.getBoundingClientRect();width=box.width;height=box.height;if(!width||!height)return;if(instrumentActive){const top=instrument.querySelector('.guitar-page-intro').getBoundingClientRect().bottom+36;playArea={top,height:Math.max(60,panel.getBoundingClientRect().top-top-45)};}dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);previous=null;resetDividers();geometry();paintFarDust();draw(performance.now());}
function draw(now){
 if(!width||!height||!colors.paper)return;
 ctx.clearRect(0,0,width,height);geometry();scanDividers(now);
 for(const band of farBands){
  const d=band.depth,fx=((-camera.x*d*120)%width+width)%width,fy=((-camera.y*d*95-camera.scroll*d*40+time*d*.5)%height+height)%height;
  for(const[dx,dy]of[[0,0],[-width,0],[0,-height],[-width,-height]])ctx.drawImage(band.sheet,fx+dx,fy+dy,width,height);
 }
 for(const s of liveDust){
  const n=s.near;
  const x=((s.x*width-camera.x*n*120+Math.sin(time*.012+s.phase)*n*7)%width+width)%width;
  const y=((s.y*height-camera.y*n*95-camera.scroll*n*40+time*n*.5)%height+height)%height;
  const radius=n>.5?1.8+s.size*1.6:1+s.size*1.3;
  const alpha=s.brightness*(.95+Math.sin(time*.25+s.phase)*.05);
  ctx.globalAlpha=alpha;ctx.drawImage(dustSprite(s),x-radius,y-radius,radius*2,radius*2);
 }ctx.globalAlpha=1;
 strings.forEach((string,i)=>{
  const a=points[string.a],b=points[string.b],age=Math.max(0,(now-(vibrations.get(i)??-1e9))/1000);
  const energy=Math.exp(-age*1.7),distance=Math.hypot(b.x-a.x,b.y-a.y),nx=-(b.y-a.y)/(distance||1),ny=(b.x-a.x)/(distance||1);
  const alpha=.40+energy*.5;
  const gradient=ctx.createLinearGradient(a.x,a.y,b.x,b.y);gradient.addColorStop(0,rgba(colors.accent,alpha*(.55+a.depth*.45)));gradient.addColorStop(1,rgba(colors.secondary,alpha*(.55+b.depth*.45)));
  ctx.strokeStyle=gradient;ctx.lineWidth=.65+(a.depth+b.depth)*.26+energy*.8;ctx.beginPath();
  for(let j=0;j<=36;j++){const t=j/36,wave=paused?0:Math.sin(t*Math.PI)*Math.sin(t*Math.PI*3-age*25)*energy*7,x=a.x+(b.x-a.x)*t+nx*wave,y=a.y+(b.y-a.y)*t+ny*wave;j?ctx.lineTo(x,y):ctx.moveTo(x,y);}ctx.stroke();
  if(energy>.08){ctx.fillStyle=rgba(colors.accent,energy*.85);ctx.font='9px "JetBrains Mono",monospace';ctx.fillText(stringLabels[i],(a.x+b.x)/2+7,(a.y+b.y)/2-9);}
 });
 points.map((p,i)=>({...p,i})).sort((a,b)=>a.depth-b.depth).forEach(p=>{
  const age=(now-(starPulses.get(p.i)??-1e9))/1000,energy=Math.exp(-age*2),hover=p.i===hoverStar;
  const radius=2.7+13*p.depth*p.depth,halo=radius*3+energy*16;
  ctx.globalAlpha=.20*p.depth+energy*.22;ctx.drawImage(sprites.accent,p.x-halo,p.y-halo,halo*2,halo*2);
  ctx.globalAlpha=.65+.35*p.depth;ctx.drawImage(sprites.paper,p.x-radius,p.y-radius,radius*2,radius*2);ctx.globalAlpha=1;
  ctx.fillStyle=rgba(colors.paper,.9);ctx.beginPath();ctx.arc(p.x,p.y,.65+1.1*p.depth*p.depth,0,Math.PI*2);ctx.fill();
  if(energy>.04||hover){ctx.strokeStyle=rgba(colors.accent,hover?.4:energy*.4);ctx.lineWidth=.6;ctx.beginPath();ctx.arc(p.x,p.y,radius+5+(paused?0:(1-energy)*19),0,Math.PI*2);ctx.stroke();}
 });
}
function tick(now){frame=-1;if(document.hidden){frame=0;return;}if(now-lastFrame>30){const delta=Math.min((now-lastFrame)/1000,.05);lastFrame=now;const target=instrumentActive?1:0;viewMix=reducedMotion.matches||paused?target:viewMix+(target-viewMix)*.14;if(Math.abs(viewMix-target)<.001)viewMix=target;if(!paused){time+=delta;camera.x+=(pointer.x-camera.x)*.045;camera.y+=(pointer.y-camera.y)*.045;camera.scroll+=((window.scrollY/Math.max(height,1))-camera.scroll)*.03;}draw(now);}for(const[id,at]of vibrations)if(now-at>6000)vibrations.delete(id);frame=(!paused||vibrations.size||viewMix!==(instrumentActive?1:0))?requestAnimationFrame(tick):0;}
function wake(){if(!frame&&!document.hidden)frame=requestAnimationFrame(tick);}
function setPaused(value){paused=value;draw(performance.now());wake();}
document.addEventListener('motionchange',e=>setPaused(e.detail.paused));
function notifyMutedPluck(){
 const now=performance.now();
 // One calm gesture at a time; chords never cancel and restart the sway.
 if(sound||document.hidden||now-lastNudge<5200||nudge?.playState==='running')return;
 lastNudge=now;
 const easing='cubic-bezier(.45,0,.55,1)';
 const frames=paused||reducedMotion.matches
  ? [{opacity:1,easing},{opacity:.6,easing},{opacity:1}]
  : [{transform:'rotate(0deg)',offset:0,easing},{transform:'rotate(-9deg)',offset:.25,easing},{transform:'rotate(7deg)',offset:.65,easing},{transform:'rotate(0deg)',offset:1}];
 nudge=soundButtons[instrumentActive?1:0].querySelector('.guitar-sound-icon').animate(frames,{duration:2600});
}
setInterval(notifyMutedPluck,9000);

function pluck(id,delay=0,velocity=.7){
 const now=performance.now();if(now-(lastPluck.get(id)??-Infinity)<120)return;
 lastPluck.set(id,now);vibrations.set(id,now+delay*1000);const s=strings[id];starPulses.set(s.a,now);starPulses.set(s.b,now);
 if(sound&&synth&&context?.state==='running')synth.pluck(s.frequency,{velocity,pan:clamp(((points[s.a].x+points[s.b].x)/width-1)*.8,-1,1),when:context.currentTime+delay});else notifyMutedPluck();
 scene.querySelector('.guitar-note').textContent=`${stringLabels[id].toUpperCase()} / ${stars[s.a].constellation.toUpperCase()}`;wake();
}
function strumStar(index,velocity=.65){const connected=strings.map((s,i)=>({...s,id:i})).filter(s=>s.a===index||s.b===index).sort((a,b)=>a.frequency-b.frequency);connected.forEach((s,i)=>pluck(s.id,i*.055,velocity));scene.querySelector('.guitar-note').textContent=`${stars[index].name.toUpperCase()} / ${connected.map(s=>s.name).join(' · ')}`;}
function clearPointer(){previous=null;pointerId=null;gate.clear();hoverStar=-1;pointer={x:0,y:0};scene.classList.remove('over-string');wake();}
function interact(event,down=false){
 if(event.pointerType==='touch'&&!down&&event.pointerId!==pointerId)return;
 // Page controls, text, and product covers retain their usual behavior.
 const blocked=event.target.closest('a,button,input,select,textarea,[contenteditable],.theme-panel,.ae-header,.project-cover,.guitar-panel,p,h1,h2,h3');
 if(blocked&&!blocked.classList.contains('guitar-star')){previous=null;gate.clear();hoverStar=-1;return;}
 const box=scene.getBoundingClientRect(),p={x:event.clientX-box.left,y:event.clientY-box.top};
 pointer={x:(p.x/width-.5)*2,y:(p.y/height-.5)*2};
 const before=previous&&previous.id===event.pointerId?previous:p,now=performance.now(),contacts=new Set();let nearest=-1,best=event.pointerType==='touch'?24:18;
 points.forEach((n,i)=>{const d=Math.hypot(n.x-p.x,n.y-p.y);if(d<best){best=d;nearest=i;}});
 hoverStar=nearest;scene.classList.toggle('over-string',nearest>=0);
 if(nearest>=0){const key=`star-${nearest}`;contacts.add(key);const entered=gate.enter(key,now);if(down||entered)strumStar(nearest);}
 else strings.forEach((s,i)=>{const a=points[s.a],b=points[s.b],threshold=event.pointerType==='touch'?13:6,on=pointDistance(p,a,b)<threshold,crossed=sweptDistance(before,p,a,b)<threshold,key=`string-${i}`;if(on)contacts.add(key);if(crossed&&gate.enter(key,now))pluck(i);if(on)scene.classList.add('over-string');});
 gate.leaveExcept(contacts);previous={...p,id:event.pointerId};wake();if(paused)draw(now);
}
document.addEventListener('pointermove',e=>interact(e),{passive:true});
document.addEventListener('pointerdown',e=>{if(e.button!==0)return;pointerId=e.pointerId;previous=null;interact(e,true);},{passive:true});
document.addEventListener('pointerup',e=>{if(e.pointerType==='touch')clearPointer();},{passive:true});
document.addEventListener('pointercancel',clearPointer);scene.addEventListener('lostpointercapture',clearPointer);document.addEventListener('pointerleave',clearPointer);
starButtons.forEach((button,i)=>button.addEventListener('click',e=>{if(e.detail===0)strumStar(i);}));
document.addEventListener('keydown',e=>{if(!instrumentActive||e.repeat||/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)||e.altKey||e.metaKey||e.ctrlKey)return;if(e.key==='Escape'){e.preventDefault();goHome();}else if(/^[1-9]$/.test(e.key)){e.preventDefault();strumStar(Number(e.key)-1);}});
const expandButton=dock.querySelector('.guitar-expand');
const homeView=document.createElement('div');homeView.className='guitar-home';
const homeTitle='Alien Emoji — Audio experiences, tools & systems';
document.body.insertBefore(homeView,instrument);
for(const element of document.querySelectorAll('#site-nav,#main,#site-footer'))homeView.append(element);
const homeSectionLinks=[...homeView.querySelectorAll('a[href^="#"]')].map(link=>({link,hash:link.getAttribute('href')}));
let homeScroll=history.state?.guitarScroll||0;
let homeLocation=isGuitarPath(location.pathname,routes.instrument)?(history.state?.guitarHome||routes.home):location.pathname+location.search+location.hash;
let navigationVersion=0,routeAnimations=[];
function showInstrument(active,animate=true){
 const version=++navigationVersion;
 for(const animation of routeAnimations)animation.cancel();routeAnimations=[];
 if(active&&!instrumentActive&&animate)homeScroll=scrollY;
 instrumentActive=active;clearPointer();resetDividers();
 homeView.hidden=false;instrument.hidden=false;
 homeView.inert=active;instrument.inert=!active;starLayer.inert=!active;
 document.documentElement.classList.toggle('guitar-route',active);
 document.body.classList.toggle('guitar-route',active);
 history.scrollRestoration=active?'manual':'auto';
 for(const {link,hash}of homeSectionLinks)link.href=homeLocation.split('#')[0]+hash;
 homeView.style.position=active?'fixed':'';homeView.style.top=active?`${-homeScroll}px`:'';
 window.scrollTo({top:active?0:homeScroll,behavior:'instant'});
 document.title=active?'Star Guitar — Alien Emoji':homeTitle;
 if(!animate||reducedMotion.matches||paused)viewMix=active?1:0;
 dimSky();resize();wake();
 const focusTarget=active?instrument.querySelector('h1'):expandButton;
 focusTarget.focus({preventScroll:true});
 const finish=()=>{if(version!==navigationVersion)return;homeView.hidden=active;instrument.hidden=!active;};
 if(animate&&!reducedMotion.matches&&!paused){
  const timing={duration:560,easing:'cubic-bezier(.22,.8,.2,1)',fill:'both'};
  routeAnimations=[homeView.animate(active?[{opacity:1,transform:'translateX(0)'},{opacity:0,transform:'translateX(-8vw)'}]:[{opacity:0,transform:'translateX(-8vw)'},{opacity:1,transform:'translateX(0)'}],timing),instrument.animate(active?[{opacity:0,transform:'translateX(12vw)'},{opacity:1,transform:'translateX(0)'}]:[{opacity:1,transform:'translateX(0)'},{opacity:0,transform:'translateX(12vw)'}],timing)];
  Promise.all(routeAnimations.map(animation=>animation.finished)).then(finish).catch(()=>{});
 }else finish();
}
function ordinaryClick(event){return event.button===0&&!event.metaKey&&!event.ctrlKey&&!event.shiftKey&&!event.altKey;}
expandButton.addEventListener('click',event=>{
 if(!ordinaryClick(event))return;event.preventDefault();
 if(!sound)void enableSound();
 homeLocation=location.pathname+location.search+location.hash;
 history.pushState({guitarView:true,guitarHome:homeLocation,guitarScroll:scrollY},'',routes.instrument);
 showInstrument(true);
});
function goHome(){
 if(history.state?.guitarView)history.back();
 else{history.replaceState(null,'',homeLocation);showInstrument(false);}
}
instrument.querySelector('.guitar-back').addEventListener('click',event=>{if(ordinaryClick(event)){event.preventDefault();goHome();}});
window.addEventListener('popstate',()=>{const active=isGuitarPath(location.pathname,routes.instrument);if(active!==instrumentActive)showInstrument(active);});
let schedule=new RandomStrings(strings.length,Math.random,performance.now());
function pauseToggle(selector,name,change){const button=panel.querySelector(selector);let on=true;button.addEventListener('click',()=>{on=!on;button.setAttribute('aria-pressed',String(on));button.querySelector('.guitar-toggle-label').textContent=`${on?'Pause':'Resume'} ${name}`;button.querySelector('.guitar-toggle-icon').textContent=on?'Ⅱ':'▷';change(on);});}
pauseToggle('.guitar-auto','auto strum',on=>{autoStrum=on;schedule=new RandomStrings(strings.length,Math.random,performance.now());});
setInterval(()=>{if(!document.hidden&&autoStrum)for(const id of schedule.poll(performance.now()))pluck(id,0,.35+Math.random()*.12);},750);
const resizeObserver=new ResizeObserver(resize);resizeObserver.observe(scene);resizeObserver.observe(panel);document.addEventListener('themechange',palette);
document.addEventListener('visibilitychange',()=>{if(document.hidden){muteSound('Sound paused while this page was away.');clearPointer();}else{schedule.reset(performance.now());wake();}});
window.addEventListener('pagehide',()=>muteSound());
function dimSky(){
 if(instrumentActive){sky.style.setProperty('--sky-dim','0');return;}
 const home=document.body.dataset.page==='home',hero=document.querySelector('.hero-stage');
 const travel=home?(hero?.offsetHeight||innerHeight)*.8:innerHeight*.65;
 sky.style.setProperty('--sky-dim',String((home?.04:.24)+clamp(scrollY/travel,0,1)*(home?.64:.44)));
}
window.addEventListener('scroll',()=>{dimSky();wake();},{passive:true});window.addEventListener('resize',dimSky);dimSky();
palette();resize();setPaused(paused);syncSound();wake();
if(isGuitarPath(location.pathname,routes.instrument))showInstrument(true,false);
