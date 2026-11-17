import {OriginalMusic} from './original-music.js';
// Original FusionFall recordings share the existing music, ducking and pause bus.
export function exertionTarget(player,playing){return !playing?0:player?.isSprinting?1:player?.hp<30?.55:0}
export class Soundscape{
 constructor(ctx,master,{musicPlayer}={}){this.ctx=ctx;this.music=ctx.createGain();this.voice=ctx.createGain();this.music.connect(master);this.voice.connect(master);this.recordings=musicPlayer||new OriginalMusic(ctx,this.music);this.breathAt=0;this.exertion=0;this.lastGrunt=-10;this.duckUntil=0;this.settings={musicVolume:.65,voiceVolume:.8};
  this.noise=ctx.createBuffer(1,ctx.sampleRate,ctx.sampleRate);const d=this.noise.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;
 }
 breath(strength){const c=this.ctx,t=c.currentTime;for(const [offset,length,volume,freq]of [[0,.42,.20,850],[.55,.55,.30,1100]]){const s=c.createBufferSource(),f=c.createBiquadFilter(),g=c.createGain();s.buffer=this.noise;f.type='bandpass';f.frequency.value=freq;f.Q.value=.8;g.gain.setValueAtTime(.001,t+offset);g.gain.linearRampToValueAtTime(volume*strength,t+offset+length*.35);g.gain.exponentialRampToValueAtTime(.001,t+offset+length);s.connect(f).connect(g).connect(this.voice);s.start(t+offset);s.stop(t+offset+length);s.onended=()=>{s.disconnect();f.disconnect();g.disconnect()}}}
 duck(){this.duckUntil=this.ctx.currentTime+2.5}
 update(dt,{phase='menu',player=null,intermission=0,wave=0,hidden=false,mapId='sector-v'}={},settings=this.settings){this.settings=settings;const c=this.ctx,playing=phase==='playing'&&!hidden,paused=phase==='paused'||hidden;this.voice.gain.setTargetAtTime(paused?0:settings.voiceVolume??.8,c.currentTime,.08);this.music.gain.setTargetAtTime((paused?0:settings.musicVolume??.65)*(c.currentTime<this.duckUntil?.38:1),c.currentTime,.15);
  this.exertion+=(exertionTarget(player,playing)-this.exertion)*(1-Math.exp(-dt/(playing&&player?.isSprinting?2:4)));
  if(playing&&this.exertion>.12&&c.currentTime>this.breathAt){this.breath(Math.min(.9,this.exertion));this.breathAt=c.currentTime+2.6-this.exertion*1.2}
  this.recordings.update(phase,mapId,{paused,volume:settings.musicVolume??.65});
 }
}
