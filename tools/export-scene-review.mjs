import {verticalFov} from '../dist/player-scale.js';
import {readFile} from 'node:fs/promises';
// Builds the real runtime scene without a browser. Software views are geometry reviews.
import {mkdir,writeFile} from 'node:fs/promises';
import * as THREE from '../dist/vendor/three.module.js';
import {loadReviewAssets,installLabelCanvas,serializeReviewScene} from './scene-review-lib.mjs';
import {REFERENCE_MAP as map} from '../dist/reference-map.js';
import {BUNKER_LIGHTING as lighting} from '../dist/reference-lighting.js';
import {buildReferenceEnvironment} from '../dist/reference-environment.js';
import {WEAPONS} from '../dist/weapons.js';
import {createWeaponPresentation} from '../dist/weapon-presentation.js';
import {ViewModelMotion} from '../dist/viewmodel.js';
import {createFirstPersonArms} from '../dist/first-person-arms.js';
const closed=process.argv.includes('--doors-closed');installLabelCanvas();const assets=await loadReviewAssets(),root=new THREE.Scene(),env=buildReferenceEnvironment(root,assets,null,map);for(const g of env.gateMeshes.values())g.group.visible=closed;
root.add(new THREE.HemisphereLight(lighting.sky,lighting.ground,lighting.ambient));const sun=new THREE.DirectionalLight(map.palette.sun,map.palette.light);sun.position.set(-30,65,25);root.add(sun);const fill=new THREE.DirectionalLight(lighting.fill,lighting.fillIntensity);fill.position.set(45,25,-40);root.add(fill);
const hero=JSON.parse(await readFile('dist/assets/heroes-catalog.json','utf8')).heroes[0];
const hj=JSON.parse(await readFile('dist/'+assets.manifest.assets[hero.asset].url,'utf8'));for(const part of hj.parts)for(const m of part.materials||[])if(m.map&&!assets.textures.has(m.map)){const t=new THREE.Texture();t.userData.sourceUrl=m.map;t.colorSpace=THREE.SRGBColorSpace;t.flipY=false;assets.textures.set(m.map,t)}assets.registerModel(hero.asset,hj);assets.rigs.set(hero.asset,JSON.parse(await readFile('dist/'+hero.rig,'utf8')));
const environment=serializeReviewScene(root),views=[...map.checkpoints,...(map.dressing?.reviewViews||[])].map((p,i)=>({id:'runtime-'+(i+1),name:p.name,eye:p.position,target:p.target,fov:verticalFov(95)})),weapons={};
const reviewCases=[...Object.keys(WEAPONS).map(id=>({id,weapon:id,state:{}})),{id:'cannon-sprint',weapon:'cannon',state:{moving:true,sprinting:true}},{id:'rifle-reload',weapon:'rifle',state:{reloadTimer:1.2,reloadTotal:2}},{id:'pistol-reload',weapon:'pistol',state:{reloadTimer:1.2,reloadTotal:2}}];
for(const {id,weapon:weaponId,state}of reviewCases){const w=WEAPONS[weaponId];const scene=new THREE.Scene(),gp=new THREE.Group();scene.add(gp);const p=createWeaponPresentation(assets,weaponId,w);p.model.visible=true;gp.add(p.model);const arms=createFirstPersonArms(scene);arms.setHero(assets,hero);const motion=new ViewModelMotion();let pose;for(let tick=0;tick<90;tick++)pose=motion.update(.016,{weapon:w.archetype,weaponTop:p.top,presentation:p.profile,...state});gp.position.fromArray(pose.position);gp.rotation.set(...pose.rotation);arms.update(gp,pose,w.archetype,p.grips);scene.add(new THREE.HemisphereLight('#e9ffef','#71818a',2.8));const light=new THREE.DirectionalLight('#fff1dd',2.5);light.position.set(-2,4,3);scene.add(light);weapons[id]={...serializeReviewScene(scene),camera:{eye:[0,0,0],target:[0,0,-1],fov:65},profile:p.profile,weaponId,pose:state};}
await mkdir('qa',{recursive:true});await writeFile('qa/runtime-scene-review.json',JSON.stringify({environment,views,weapons,doors:closed?'closed':'open',diagnostics:env.dressing.diagnostics,kind:'Actual runtime geometry/materials/props/viewmodels; software shading remains approximate.'}));console.log(JSON.stringify({parts:environment.parts.length,materials:environment.materials.length,props:env.props.length,...env.dressing.diagnostics,weapons:Object.keys(WEAPONS).length,weaponViews:Object.keys(weapons).length}));
