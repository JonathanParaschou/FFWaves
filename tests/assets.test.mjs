import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { resolve, sep } from 'node:path';

const root=resolve('dist');
const manifest=JSON.parse(await readFile(resolve(root,'assets/manifest.json'),'utf8'));
let parts=0,triangles=0;
async function exists(path){
  const full=resolve(root,path);
  assert.ok(full.startsWith(root+sep),`asset path stays inside dist: ${path}`);
  assert.ok((await stat(full)).size>0,`asset is populated: ${path}`);
}
for(const [id,entry] of Object.entries(manifest.assets)){
  await exists(entry.url);
  const data=JSON.parse(await readFile(resolve(root,entry.url),'utf8'));
  assert.equal(data.id,id);
  assert.ok(data.parts.length>0);
  for(const part of data.parts){
    parts++;
    const vertices=part.positions.length/3;
    assert.equal(vertices%1,0);
    assert.equal(part.normals.length,vertices*3,`${id} normals align`);
    assert.equal(part.uvs.length,vertices*2,`${id} UVs align`);
    assert.ok(part.positions.every(Number.isFinite));
    assert.ok(part.normals.every(Number.isFinite));
    assert.ok(part.uvs.every(Number.isFinite));
    assert.equal(part.indices.length%3,0);
    assert.ok(part.indices.every(i=>Number.isInteger(i)&&i>=0&&i<vertices),`${id} indices remain in bounds`);
    triangles+=part.indices.length/3;
    for(const group of part.groups){
      assert.ok(group.start>=0&&group.count>0&&group.start+group.count<=part.indices.length);
      assert.ok(group.materialIndex>=0&&group.materialIndex<part.materials.length);
    }
    for(const material of part.materials)if(material.map)await exists(material.map);
  }
}
for(const surface of Object.values(manifest.surfaces))await exists(surface.map);
for(const clip of Object.values(manifest.audio||{})){
  await exists(clip.url);
  const bytes=await readFile(resolve(root,clip.url));
  assert.equal(bytes.toString('ascii',0,4),'OggS','original audio has a browser-compatible Ogg Vorbis container');
}
for(const id of ['nano-buttercup','nano-eddy','nano-deedee','weapon-pistol','weapon-rifle','weapon-shotgun','weapon-cannon'])await exists(`assets/ui/${id}.webp`);
assert.ok(Object.keys(manifest.assets).length>=20);
console.log(`Validated ${Object.keys(manifest.assets).length} extracted models, ${parts} mesh parts, ${triangles} triangles, all source texture links, and seven UI portraits.`);
