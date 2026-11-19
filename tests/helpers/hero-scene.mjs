import {readFile} from 'node:fs/promises';
import * as THREE from '../../dist/vendor/three.module.js';
import {configureHeroes} from '../../dist/avatars.js';
import {configureWeapons} from '../../dist/weapons.js';
import {loadReviewAssets} from './scene-assets.mjs';
export async function loadHeroReviewAssets(){
 const assets=await loadReviewAssets(),catalog=JSON.parse(await readFile('dist/assets/heroes-catalog.json','utf8'));
 configureHeroes(catalog);configureWeapons(catalog.weapons);
 for(const item of [...catalog.heroes,...catalog.accessories]){
  const model=JSON.parse(await readFile('dist/'+assets.manifest.assets[item.asset].url,'utf8'));
  for(const part of model.parts)for(const material of part.materials||[])if(material.map&&!assets.textures.has(material.map)){
   const texture=new THREE.Texture();texture.userData.sourceUrl=material.map;texture.colorSpace=THREE.SRGBColorSpace;texture.flipY=false;assets.textures.set(material.map,texture);
  }
  assets.registerModel(item.asset,model);
  if(item.rig)assets.rigs.set(item.asset,JSON.parse(await readFile('dist/'+item.rig,'utf8')));
 }
 return {assets,catalog};
}
