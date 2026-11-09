// One reusable audio context; all frequencies come from the source catalog.
class PitchPlayer {
 constructor(){this.context=null;this.voices=new Set();this.generation=0;this.playing=false;this.onchange=()=>{};}
 stop(){
  this.generation++;clearTimeout(this.timer);
  for(const voice of this.voices){try{voice.stop();}catch{}}
  this.voices.clear();this.playing=false;this.onchange(false);
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
   oscillator.type='sine';oscillator.frequency.setValueAtTime(frequency,at);
   gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(.18,at+.02);
   gain.gain.setValueAtTime(.18,at+duration-.04);gain.gain.linearRampToValueAtTime(0,at+duration);
   oscillator.connect(gain);gain.connect(this.context.destination);
   this.voices.add(oscillator);oscillator.onended=()=>{this.voices.delete(oscillator);oscillator.disconnect();gain.disconnect();};
   oscillator.start(at);oscillator.stop(at+duration+.01);
  });
  this.playing=true;this.onchange(true);
  this.timer=setTimeout(()=>{this.playing=false;this.onchange(false);},(frequencies.length-1)*650+850);
 }
}
