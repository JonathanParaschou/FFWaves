import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {OriginalMusic,musicFor} from '../dist/original-music.js';
import {MUSIC_TRACKS} from '../dist/music-tracks.js';
class Media extends EventTarget{
 constructor(){super();this.src='';this.currentTime=0;this.paused=true;this.volume=1;this.loads=0;this.plays=0;this.fail=null;this.muted=false}
 load(){this.loads++;this.currentTime=0;this.paused=true}
 play(){this.plays++;if(this.fail)return Promise.reject(this.fail);this.paused=false;this.dispatchEvent(new Event('playing'));return Promise.resolve()}
 pause(){this.paused=true;this.dispatchEvent(new Event('pause'))}
 removeAttribute(){this.src=''}
}
const settle=()=>new Promise(r=>setTimeout(r,0));
test('the same native player starts in a gesture, loops, and does not restart across waves or frames',async()=>{
 const element=new Media(),music=new OriginalMusic(null,null,{element});
 music.unlock('menu','dexlabs-bunker');assert.equal(element.plays,1,'play is called before awaiting catalog/network work');await settle();assert.equal(element.src,MUSIC_TRACKS['main-theme'].url);assert.equal(element.loop,true);
 element.currentTime=12;for(let i=0;i<100;i++)music.update('menu','dexlabs-bunker');assert.equal(element.currentTime,12);assert.equal(element.loads,1);assert.match(music.status,/0:12/);
 music.update('playing','dexlabs-bunker');await settle();assert.equal(element.src,MUSIC_TRACKS['tech-center'].url);assert.equal(element.loads,2);
 music.dispose();assert.equal(element.paused,true);
});
test('autoplay rejection is visible and retried by the next trusted gesture',async()=>{
 const element=new Media(),music=new OriginalMusic(null,null,{element});element.fail=Object.assign(Error('blocked'),{name:'NotAllowedError'});music.unlock('menu','sector-v');await settle();assert.equal(music.blocked,true);const attempts=element.plays;for(let i=0;i<50;i++)music.update('menu','sector-v');assert.equal(element.plays,attempts);assert.match(music.status,/press Play Music/);
 element.fail=null;music.unlock('menu','sector-v');await settle();assert.equal(element.paused,false);assert.equal(music.blocked,false);
});
test('global mute/visibility pause preserve position; native pause remains intentional',async()=>{
 const element=new Media(),music=new OriginalMusic(null,null,{element});music.unlock('playing','dexlabs-bunker');await settle();element.currentTime=19;
 music.update('playing','dexlabs-bunker',{enabled:false});assert.equal(element.paused,true);music.update('playing','dexlabs-bunker',{enabled:true});await settle();assert.equal(element.currentTime,19);assert.equal(element.paused,false);
 music.update('playing','dexlabs-bunker',{paused:true});assert.equal(element.paused,true);music.update('playing','dexlabs-bunker');await settle();element.pause();assert.equal(music.userPaused,true);music.update('playing','dexlabs-bunker');assert.equal(element.paused,true);
 element.muted=true;music.unlock('playing','dexlabs-bunker',{force:true});await settle();assert.equal(element.paused,false);assert.equal(element.muted,false);
});
test('native controls and the game slider share volume; download failures expose a retry state',async()=>{
 const element=new Media(),music=new OriginalMusic(null,null,{element});let changed=null;music.onUserVolume=v=>changed=v;music.unlock('menu','sector-v',{volume:.45});await settle();assert.equal(element.volume,.45);element.dispatchEvent(new Event('volumechange'));assert.equal(changed,null,'programmatic mixer changes do not overwrite preferences');element.volume=.3;element.dispatchEvent(new Event('volumechange'));assert.equal(changed,.3);
 element.error={code:2};element.dispatchEvent(new Event('error'));assert.match(music.status,/download failed/);element.error=null;music.unlock('menu','sector-v',{force:true});await settle();assert.equal(music.error,null);
});
test('every map track has a separate browser MP3 and keeps the preserved original Ogg',async()=>{
 const catalog=JSON.parse(await readFile('dist/assets/music-original/catalog.json'));for(const [id,track]of Object.entries(MUSIC_TRACKS)){const entry=catalog.tracks[id],mp3=await readFile('dist/'+track.url),ogg=await readFile('dist/'+entry.url);assert.equal(ogg.subarray(0,4).toString(),'OggS');assert.equal(mp3.length,entry.playback.bytes);assert.ok(mp3.length>100000);assert.ok(entry.playback.rmsDb>-24);assert.equal(entry.playback.mime,'audio/mpeg')}assert.equal(musicFor('playing','dexlabs-bunker'),'tech-center');
});
