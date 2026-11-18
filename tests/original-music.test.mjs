import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {OriginalMusic,musicFor,MAP_MUSIC} from '../dist/original-music.js';
import {MAPS} from '../dist/maps.js';
const catalog=JSON.parse(await readFile('dist/assets/music-original/catalog.json','utf8'));
test('original music files retain source bytes, Ogg/Vorbis headers and duration metadata',async()=>{assert.equal(Object.keys(catalog.tracks).length,6);for(const t of Object.values(catalog.tracks)){const b=await readFile('dist/'+t.url);assert.equal(b.subarray(0,4).toString(),'OggS');assert.ok(b.includes(Buffer.from('vorbis')));assert.equal(b.length,t.bytes);assert.equal(createHash('sha256').update(b).digest('hex'),t.sha256);assert.ok(t.duration>60&&t.duration<300);assert.ok(t.source.startsWith('bgm/'));assert.ok(t.bundle.includes('music'))}});
test('menus and every map choose a real original regional recording',()=>{assert.equal(musicFor('menu','dexlabs-bunker'),'main-theme');for(const map of MAPS){assert.ok(MAP_MUSIC[map.id],map.id+' has an authored assignment');assert.ok(catalog.tracks[musicFor('playing',map.id)])}assert.equal(musicFor('playing','dexlabs-bunker'),'tech-center')});
