import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {parseHTML} from 'linkedom';
import {WEAPONS,rollWeapon} from '../dist/weapons.js';
import {EXPANDED_WEAPONS,WEAPON_SOUNDS} from '../dist/weapon-roster.js';
import {STARTER_GUNS,validateFieldKit} from '../dist/field-kit.js';
import {initWeaponLibrary,weaponClass} from '../dist/weapon-library.js';
import {Survival} from '../dist/simulation.js';
import {fireAuthoritative} from '../server/combat.mjs';
import {createLanServer} from '../server.mjs';
const manifest=JSON.parse(await readFile('dist/assets/manifest.json'));

test('40 guns have distinct original geometry, portraits, table-selected skins and firing sounds',async()=>{
 assert.equal(Object.keys(WEAPONS).length,40);assert.equal(Object.keys(EXPANDED_WEAPONS).length,30);const fingerprints=new Set(),sources=new Set();
 for(const [id,w]of Object.entries(WEAPONS)){
  const entry=manifest.assets[w.asset],model=JSON.parse(await readFile('dist/'+entry.url));sources.add(entry.source);
  fingerprints.add(createHash('sha256').update(JSON.stringify(model.parts.map(p=>[p.positions,p.indices]))).digest('hex'));
  await readFile('dist/'+(w.portrait||`assets/ui/weapon-${id}.webp`));
  for(const part of model.parts)for(const material of part.materials)assert.ok(material.map,id+' has its original textured skin');
  const sound=manifest.audio[WEAPON_SOUNDS[id]];assert.ok(sound,id+' original firing sample');const bytes=await readFile('dist/'+sound.url);assert.equal(bytes.subarray(0,4).toString(),'OggS');
  if(EXPANDED_WEAPONS[id]){assert.ok(w.sourceItemId>0);assert.ok(w.bodyTexture);assert.ok(w.behaviorIsFpsAdaptation)}
 }
 assert.equal(sources.size,40);assert.equal(fingerprints.size,40,'reskins of the same mesh do not inflate the roster');
 assert.ok(new Set(Object.values(WEAPON_SOUNDS)).size>=8,'multiple original sound families');
 assert.ok(new Set(Object.values(WEAPONS).map(weaponClass)).size>=7);
});

test('all 40 guns can roll from the box; ownership exclusion and starter restrictions remain',()=>{
 const seen=new Set();for(let i=0;i<4000;i++){let call=0;const result=rollWeapon(12,[],()=>call++? .6:i/4000);seen.add(result.id)}assert.equal(seen.size,40);
 for(const id of Object.keys(WEAPONS)){assert.notEqual(rollWeapon(12,[id],()=>.5).id,id);assert.ok(WEAPONS[id].mag>0);assert.ok(WEAPONS[id].reload>0)}
 assert.equal(STARTER_GUNS.length,6);for(const id of STARTER_GUNS)assert.equal(validateFieldKit({gun:id}).gun,id);assert.equal(validateFieldKit({gun:'cannon'}).gun,'pistol');
});

test('every gun survives authoritative firing, ammunition use and two-slot inventory changes',()=>{
 const sim=new Survival();sim.start();sim.intermission=999;
 for(const [id,w]of Object.entries(WEAPONS)){sim.giveWeapon(id);sim.player.fireTimer=0;const before=sim.equipped.ammo,packet=fireAuthoritative(sim,{yaw:0,pitch:0},'host',()=>.5);assert.equal(packet.weapon,id);assert.equal(sim.equipped.ammo,before-1);assert.equal(packet.ends.length,Math.min(3,w.pellets));assert.ok(packet.ends.every(p=>[p.x,p.y,p.z].every(Number.isFinite)));assert.ok(sim.player.weapons.length<=2);sim.equipped.ammo=0;sim.player.fireTimer=0;assert.ok(sim.reload());assert.equal(sim.player.reloadTotal,w.reload)}
});

test('arsenal search, class filtering and preview do not silently equip a box weapon',async t=>{
 const prior=globalThis.document,{document,window}=parseHTML(await readFile('dist/index.html','utf8'));globalThis.document=document;t.after(()=>globalThis.document=prior);
 const sim=new Survival();let preview=null;const library=initWeaponLibrary(sim,{onPreview:id=>preview=id,onEquip:id=>{sim.setFieldKit({...sim.fieldKit,gun:id});library.refresh()}}),$=id=>document.getElementById(id);
 assert.equal($('weapon-library').children.length,40);library.select('thumper');assert.equal(preview,'thumper');assert.equal(sim.fieldKit.gun,'pistol');assert.ok($('weapon-equip').classList.contains('hidden'));assert.match($('weapon-acquisition').textContent,/supply box|wall rack/i);
 library.select('beamer');$('weapon-equip').click();assert.equal(sim.fieldKit.gun,'beamer');assert.equal($('weapon-equip').textContent,'EQUIPPED');
 $('weapon-search').value='Gatling';$('weapon-search').dispatchEvent(new window.Event('input'));assert.equal($('weapon-library').children.length,1);assert.equal($('weapon-library').firstElementChild.dataset.weapon,'gatling-gum');
 $('weapon-search').value='not-a-real-gun';$('weapon-search').dispatchEvent(new window.Event('input'));assert.equal($('weapon-empty').classList.contains('hidden'),false);
 $('weapon-search').value='';for(const option of $('weapon-class').children)option.selected=false;[...$('weapon-class').children].find(option=>option.value==='Precision').selected=true;$('weapon-class').dispatchEvent(new window.Event('change'));assert.ok($('weapon-library').children.length>=5);for(const card of $('weapon-library').children)assert.equal(weaponClass(WEAPONS[card.dataset.weapon]),'Precision');
});

test('local soundtrack responses support native media seeking and the correct MIME type',async t=>{
 const app=await createLanServer({port:0,host:'127.0.0.1',autoTick:false});const port=await app.listen();t.after(()=>app.close());const url=`http://127.0.0.1:${port}/assets/music-original/tech-center.mp3`,bytes=await readFile('dist/assets/music-original/tech-center.mp3');
 const range=await fetch(url,{headers:{Range:'bytes=120-219'}});assert.equal(range.status,206);assert.equal(range.headers.get('content-type'),'audio/mpeg');assert.equal(range.headers.get('content-range'),`bytes 120-219/${bytes.length}`);assert.deepEqual(Buffer.from(await range.arrayBuffer()),bytes.subarray(120,220));
 const suffix=await fetch(url,{headers:{Range:'bytes=-80'}});assert.equal(suffix.status,206);assert.deepEqual(Buffer.from(await suffix.arrayBuffer()),bytes.subarray(-80));
 const invalid=await fetch(url,{headers:{Range:`bytes=${bytes.length+1}-`}});assert.equal(invalid.status,416);const head=await fetch(url,{method:'HEAD'});assert.equal(head.status,200);assert.equal(head.headers.get('content-length'),String(bytes.length));
});
