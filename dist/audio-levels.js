// Balance quiet original recordings at playback; source files stay byte-identical.
export function recordingGain(buffer,target=.112){
 if(!buffer?.getChannelData)return 1;
 let peak=0,sum=0,count=0;
 for(let channel=0;channel<buffer.numberOfChannels;channel++){
  const samples=buffer.getChannelData(channel);
  for(let i=0;i<samples.length;i++){const v=samples[i];peak=Math.max(peak,Math.abs(v));sum+=v*v;count++}
 }
 const rms=Math.sqrt(sum/Math.max(1,count));
 return rms<.00001?1:Math.min(8,target/rms,.88/Math.max(.00001,peak));
}

// Retry on later gestures too: a suspended/interrupted context is not unlocked forever.
export function installAudioUnlock(audio,target=document){
 let pending=null;
 const unlock=event=>{if(event?.target?.closest?.('#audio')||audio.userMuted||pending)return;if(!audio.ctx||audio.ctx.state!=='running'){pending=Promise.resolve(audio.start()).finally(()=>pending=null)}};
 target.addEventListener('pointerdown',unlock);
 target.addEventListener('keydown',unlock);
 return ()=>{target.removeEventListener('pointerdown',unlock);target.removeEventListener('keydown',unlock)};
}

export function nanoVoicePrefix(nano,kind){return Number.isFinite(nano?.originalId)?`${kind}-${nano.originalId}-`:null}
