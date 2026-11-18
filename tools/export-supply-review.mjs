// Real fixture meshes at one repeatable interaction approach; no browser/GPU rendering.
import {writeFile,mkdir} from 'node:fs/promises';
import * as THREE from '../dist/vendor/three.module.js';
import {loadReviewAssets,installLabelCanvas,serializeReviewScene} from './scene-review-lib.mjs';
import {REFERENCE_MAP as map} from '../dist/reference-map.js';
import {BUNKER_LIGHTING as lighting} from '../dist/reference-lighting.js';
import {buildReferenceEnvironment} from '../dist/reference-environment.js';
import {verticalFov} from '../dist/player-scale.js';
installLabelCanvas();
const assets=await loadReviewAssets(),root=new THREE.Scene(),env=buildReferenceEnvironment(root,assets,null,map);
for(const gate of env.gateMeshes.values())gate.group.visible=false;
root.add(new THREE.HemisphereLight(lighting.sky,lighting.ground,lighting.ambient));
const camera={eye:[-.6,1.68,-8.8],target:[-2.8,.95,-8],fov:verticalFov(95)},scenes=[];
for(const phase of ['idle','rolling','ready']){
 for(let i=0;i<120;i++)env.update(1/60,2+i/60,{box:{phase,stationId:'source-box',offer:{id:'rifle',rarity:2}},wave:1});
 scenes.push({phase,camera,scene:serializeReviewScene(root)});
}
await mkdir('qa',{recursive:true});
await writeFile('qa/supply-scenes.json',JSON.stringify(scenes));
env.dispose();
