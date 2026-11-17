import {readFile} from 'node:fs/promises';
import * as THREE from '../../dist/vendor/three.module.js';
import {AssetLibrary} from '../../dist/assets.js';
export async function loadReviewAssets(){
 const assets=new AssetLibrary();assets.manifest=JSON.parse(await readFile('dist/assets/manifest.json','utf8'));
 const catalog=JSON.parse(await readFile('dist/assets/reference-bunker/catalog.json','utf8'));assets.manifest.assets[catalog.id]=catalog;
 const models=[];for(const [id,entry]of Object.entries(assets.manifest.assets)){if(/^(hero|enemy|nano|accessory)-/.test(id))continue;models.push([id,JSON.parse(await readFile('dist/'+entry.url,'utf8'))])}
 const paths=new Set(Object.values(assets.manifest.surfaces).map(s=>s.map));for(const [,model]of models)for(const part of model.parts)for(const material of part.materials||[])if(material.map)paths.add(material.map);
 for(const path of ['assets/native-city/textures/084463fa87ca.webp','assets/textures/66a79f240e3a.webp','assets/textures/479010711d2f.webp','assets/textures/b6c6ab64998c.webp'])paths.add(path);
 for(const path of paths){const t=new THREE.Texture();t.userData.sourceUrl=path;t.colorSpace=THREE.SRGBColorSpace;t.flipY=false;assets.textures.set(path,t)}
 for(const [id,model]of models)assets.registerModel(id,model);
 return assets;
}
export function installLabelCanvas(){globalThis.document={createElement(){return {width:512,height:128,getContext(){return {fillRect(){},strokeRect(){},fillText(){}}}}}}}
