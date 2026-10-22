/* Soft modal strings. All pitches are supplied by the instrument's geometry. */
export class StringSynth {
  constructor(context,{volume=.65}={}) {
    this.context=context; this.voices=[];
    const c=context;
    this.input=c.createGain(); this.input.gain.value=.8;
    const dry=c.createGain(); dry.gain.value=.85;
    const reverb=c.createConvolver(); reverb.buffer=this.makeImpulse(6);
    const wet=c.createGain(); wet.gain.value=.42;
    const highpass=c.createBiquadFilter(); highpass.type='highpass';highpass.frequency.value=35;
    const compressor=c.createDynamicsCompressor();
    compressor.threshold.value=-18; compressor.knee.value=16; compressor.ratio.value=6;
    compressor.attack.value=.006; compressor.release.value=.6;
    const ceiling=c.createWaveShaper();
    ceiling.curve=Float32Array.from({length:4096},(_,i)=>.92*Math.tanh((i/4095*2-1)/.92));
    this.master=c.createGain(); this.master.gain.value=volume;
    this.input.connect(dry); this.input.connect(reverb);reverb.connect(wet);
    dry.connect(highpass);wet.connect(highpass);highpass.connect(compressor);
    compressor.connect(ceiling);ceiling.connect(this.master);this.master.connect(c.destination);
  }
  makeImpulse(seconds) {
    const c=this.context, buffer=c.createBuffer(2,c.sampleRate*seconds,c.sampleRate);
    let seed=5139;
    for(let channel=0;channel<2;channel++){
      const data=buffer.getChannelData(channel);let smooth=0;
      for(let i=0;i<data.length;i++){
        seed=(seed*16807)%2147483647;
        smooth=.68*smooth+.32*(seed/2147483647*2-1);
        const t=i/c.sampleRate;
        data[i]=t>.026?smooth*Math.exp(-t*1.15)*Math.min(1,(t-.026)*18):0;
      }
    }
    return buffer;
  }
  setVolume(value,when=this.context.currentTime) {
    const p=this.master.gain;p.cancelScheduledValues(when);p.setTargetAtTime(Math.max(0,Math.min(1,value)),when,.025);
  }
  pluck(frequency,{velocity=.7,pan=0,when=this.context.currentTime}={}) {
    const c=this.context, now=Math.max(c.currentTime,when);
    if(!Number.isFinite(frequency)||frequency<40||frequency>1200) return;
    if(this.voices.length>=24) this.release(this.voices[0],now);
    const envelope=c.createGain(), panner=c.createStereoPanner();
    panner.pan.value=Math.max(-.85,Math.min(.85,pan));envelope.connect(panner);panner.connect(this.input);
    const amplitude=.26*Math.max(.1,Math.min(1,velocity));
    envelope.gain.setValueAtTime(0,now);
    envelope.gain.linearRampToValueAtTime(amplitude,now+.024);
    envelope.gain.exponentialRampToValueAtTime(amplitude*.55,now+.8);
    envelope.gain.exponentialRampToValueAtTime(amplitude*.03,now+14);
    envelope.gain.linearRampToValueAtTime(0,now+16);
    const voice={envelope,panner,oscillators:[],partials:[],released:false};
    const harmonics=[[1,.55,0],[1,.12,2.2],[2,.32,-1.3],[3,.21,1.6],[4,.12,-2],[5,.07,1],[7,.035,-1]];
    harmonics.forEach(([multiple,level,detune])=>{
      const osc=c.createOscillator(), gain=c.createGain();
      osc.type='sine';osc.frequency.value=frequency*multiple;osc.detune.value=detune;
      // Upper partials are inaudible once their decay ends, so they stop there instead of idling until 16 s.
      const decayed=now+14/Math.sqrt(multiple), end=multiple===1?now+16.1:decayed+.05;
      gain.gain.setValueAtTime(level,now);
      gain.gain.exponentialRampToValueAtTime(Math.max(.0001,level*(multiple===1?.4:.025)),decayed);
      if(multiple>1)gain.gain.linearRampToValueAtTime(0,end);
      osc.connect(gain);gain.connect(envelope);osc.start(now);osc.stop(end);
      voice.oscillators.push(osc);voice.partials.push(gain);
    });
    voice.oscillators[0].onended=()=>this.disconnect(voice);
    this.voices.push(voice);
  }
  release(voice,when=this.context.currentTime) {
    if(voice.released)return;voice.released=true;
    const gain=voice.envelope.gain;
    // Firefox lacks cancelAndHoldAtTime; holding the current value is close enough for a 55 ms fade.
    if(gain.cancelAndHoldAtTime)gain.cancelAndHoldAtTime(when);else{gain.cancelScheduledValues(when);gain.setValueAtTime(gain.value,when);}
    gain.linearRampToValueAtTime(0,when+.055);
    for(const osc of voice.oscillators)osc.stop(when+.06);
    this.voices=this.voices.filter(v=>v!==voice);
  }
  disconnect(voice) {
    voice.oscillators.forEach(o=>o.disconnect());voice.partials.forEach(g=>g.disconnect());
    voice.envelope.disconnect();voice.panner.disconnect();
    this.voices=this.voices.filter(v=>v!==voice);
  }
  silence() { this.setVolume(0);for(const voice of [...this.voices])this.release(voice); }
}
