import {MUSIC_TRACKS} from './music-tracks.js';
export const MAP_MUSIC={'dexlabs-bunker':'tech-center','sector-v':'suburbia','camp-kidney':'woods','salvage-yard':'reactor-works','original-city':'midtown'};
export function musicFor(phase,mapId){return phase==='menu'?'main-theme':MAP_MUSIC[mapId]||'suburbia'}
// Music uses the browser media player directly. Effects/voices keep their Web Audio bus.
export class OriginalMusic{
 constructor(ctx,destination,{element=globalThis.document?.getElementById?.('music-player')||(typeof Audio==='function'?new Audio():null),now=()=>performance.now()}={}){
  this.element=element;this.now=now;this.active=null;this.desired=null;this.error=null;this.blocked=false;this.pending=null;this.retryAt=0;this.generation=0;this.userPaused=false;this.pauseReason=null;this.enabled=true;this.disposed=false;this.expectedVolume=element?.volume??1;
  this.onPlaying=()=>{this.active={id:this.desired};this.error=null;this.blocked=false;this.userPaused=false;this.pauseReason=null};
  this.onVolumeChange=()=>{if(Math.abs(element.volume-this.expectedVolume)>.001){this.expectedVolume=element.volume;this.onUserVolume?.(element.volume)}};
  this.onPause=()=>{if(!this.pauseReason&&!this.disposed)this.userPaused=true};
  this.onError=()=>{this.error=Error(['Music could not load','Music loading was interrupted','Music download failed','Music format could not be decoded','Music file unavailable'][element?.error?.code||0]);this.retryAt=this.now()+5000;this.pending=null};
  if(element){element.loop=true;element.preload='metadata';element.addEventListener('playing',this.onPlaying);element.addEventListener('pause',this.onPause);element.addEventListener('error',this.onError);element.addEventListener('volumechange',this.onVolumeChange)}
 }
 setVolume(value){this.expectedVolume=Math.max(0,Math.min(1,value));if(Math.abs(this.element.volume-this.expectedVolume)>.00001)this.element.volume=this.expectedVolume}
 select(id){if(this.desired===id||!this.element)return;this.generation++;this.pending=null;this.pauseReason='switch';this.desired=id;this.active=null;this.error=null;this.retryAt=0;this.element.src=MUSIC_TRACKS[id].url;this.element.load()}
 play(force=false){if(!this.element||this.disposed||this.pending||this.userPaused||!this.enabled||(!force&&this.now()<this.retryAt))return;
  const generation=this.generation;if(this.error){this.pauseReason='reload';this.element.load();this.error=null}
  try{const promise=Promise.resolve(this.element.play());this.pending=promise;promise.then(()=>{if(generation===this.generation&&!this.disposed)this.onPlaying()}).catch(error=>{if(generation!==this.generation||this.disposed||error.name==='AbortError')return;if(error.name==='NotAllowedError'){this.blocked=true;this.retryAt=Infinity}else{this.error=error;this.retryAt=this.now()+5000}}).finally(()=>{if(this.pending===promise)this.pending=null})}catch(error){this.error=error;this.retryAt=this.now()+5000}
 }
 unlock(phase,mapId,{volume=.65,force=false}={}){if(!this.element)return;this.enabled=true;this.select(musicFor(phase,mapId));if(force){this.userPaused=false;this.element.muted=false}this.setVolume(volume);if(volume>0){this.blocked=false;this.retryAt=force?0:this.retryAt===Infinity?0:this.retryAt;this.play(force)}}
 update(phase,mapId,{paused=false,volume=.65,enabled=true}={}){if(!this.element||this.disposed)return;this.enabled=enabled;this.select(musicFor(phase,mapId));this.setVolume(volume);if(paused||!enabled||volume<=0){this.pauseReason=paused?'hidden':'muted';if(!this.element.paused)this.element.pause();return}if(this.element.paused&&!this.blocked)this.play()}
 get status(){if(!this.element)return 'Music player unavailable';if(this.error)return this.error.message+' - press Play Music to retry';if(this.blocked)return 'Browser paused music - press Play Music';if(this.element.muted)return 'Music muted in the player';if(this.userPaused)return 'Music paused';const title=MUSIC_TRACKS[this.desired]?.title||'FusionFall';if(this.element.paused||this.element.currentTime<.05)return 'Starting '+title+'...';const seconds=Math.floor(this.element.currentTime);return title+' / '+Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0')}
 dispose(){this.disposed=true;this.generation++;if(this.element){this.element.removeEventListener('playing',this.onPlaying);this.element.removeEventListener('pause',this.onPause);this.element.removeEventListener('error',this.onError);this.element.removeEventListener('volumechange',this.onVolumeChange);this.element.pause();this.element.removeAttribute('src');this.element.load()}this.active=null}
}
