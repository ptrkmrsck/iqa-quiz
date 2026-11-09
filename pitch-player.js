// One reusable audio context; all frequencies come from the source catalog.
class PitchPlayer {
 constructor(){this.tone='sine';this.context=null;this.voices=new Set();this.generation=0;this.playing=false;this.onchange=()=>{};}
 setTone(value){
  const tone=['sine','square','sawtooth','triangle'].includes(value)?value:'sine';
  if(tone!==this.tone){this.stop();this.tone=tone;}
 }
 stop(){
  this.generation++;clearTimeout(this.timer);
  const now=this.context?.currentTime||0;
  for(const voice of this.voices){
   if(voice.released)continue;
   voice.released=true;
   const {oscillator,gain,at,duration}=voice;
   // Match the scheduled linear envelope at this instant, then release smoothly.
   // Setting gain to its peak here would click when interrupting an attack or release.
   const elapsed=now-at;
   const level=elapsed<=0||elapsed>=duration?0:elapsed<.02?.18*elapsed/.02:elapsed>duration-.04?.18*(duration-elapsed)/.04:.18;
   gain.gain.cancelScheduledValues(now);
   gain.gain.setValueAtTime(level,now);
   gain.gain.linearRampToValueAtTime(0,now+.015);
   try{oscillator.stop(now+(elapsed<0?0:.016));}catch{}
  }
  this.playing=false;this.onchange(false);
 }
 async play(frequencies){
  this.stop();const generation=this.generation;
  const Audio=window.AudioContext||window.webkitAudioContext;
  if(!Audio)throw Error('Note playback is unavailable in this browser.');
  this.context??=new Audio();
  await this.context.resume();
  if(generation!==this.generation)return;
  if(this.context.state!=='running')throw Error('Press Play again to enable audio.');
  const start=this.context.currentTime+.03;
  frequencies.forEach((frequency,index)=>{
   const oscillator=this.context.createOscillator(),gain=this.context.createGain();
   const at=start+index*.65,duration=index===frequencies.length-1?.8:.5;
   oscillator.type=this.tone;oscillator.frequency.setValueAtTime(frequency,at);
   gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(.18,at+.02);
   gain.gain.setValueAtTime(.18,at+duration-.04);gain.gain.linearRampToValueAtTime(0,at+duration);
   oscillator.connect(gain);gain.connect(this.context.destination);
   const voice={oscillator,gain,at,duration,released:false};
   this.voices.add(voice);oscillator.onended=()=>{this.voices.delete(voice);oscillator.disconnect();gain.disconnect();};
   oscillator.start(at);oscillator.stop(at+duration+.01);
  });
  this.playing=true;this.onchange(true);
  this.timer=setTimeout(()=>{this.playing=false;this.onchange(false);},(frequencies.length-1)*650+850);
 }
}
