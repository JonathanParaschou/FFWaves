import {referenceMaterial,referenceSurfaceGroups} from './reference-materials.js';
import * as THREE from './vendor/three.module.js';
import { createAnimatedModel } from './animation.js';
export { THREE };
export function cloneMaterial(material){const copy=material.clone();copy.onBeforeCompile=material.onBeforeCompile;copy.customProgramCacheKey=material.customProgramCacheKey;return copy}
export class AssetLibrary {
  constructor(){this.models=new Map();this.textures=new Map();this.rigs=new Map();this.rigPromises=new Map();this.manifest=null;this.loader=new THREE.TextureLoader()}
  async load(progress=()=>{}){
    const response=await fetch('assets/manifest.json');if(!response.ok)throw new Error('Could not load FusionFall asset manifest.');this.manifest=await response.json();
    this.combatFxCatalog=await fetch('assets/combat-fx-catalog.json').then(r=>r.json());
    this.nanoCatalog=await fetch('assets/nanos-catalog.json').then(r=>r.json());this.heroCatalog=await fetch('assets/heroes-catalog.json').then(r=>r.json());
    this.sectionCatalog=await fetch('assets/map-sections/catalog.json').then(r=>r.json());this.manifest.assets[this.sectionCatalog.id]={url:this.sectionCatalog.url,bounds:this.sectionCatalog.bounds,source:this.sectionCatalog.source};
    this.nativeCatalog=await fetch('assets/native-city/catalog.json').then(r=>r.json());this.manifest.assets[this.nativeCatalog.id]={url:this.nativeCatalog.url,bounds:this.nativeCatalog.bounds,source:this.nativeCatalog.source};
    this.referenceCatalog=await fetch('assets/reference-bunker/catalog.json').then(r=>r.json());this.manifest.assets[this.referenceCatalog.id]={url:this.referenceCatalog.url,bounds:this.referenceCatalog.bounds,source:this.referenceCatalog.source};
    const entries=Object.entries(this.manifest.assets);let done=0;progress(.03,'Reading original FusionFall models…');
    const jsons=await Promise.all(entries.map(async([id,entry])=>{const r=await fetch(entry.url);if(!r.ok)throw new Error(`Missing extracted model: ${id}`);const json=await r.json();progress(.03+ ++done/entries.length*.38,`Loading ${id.replaceAll('-',' ')}…`);return [id,json]}));
    const texturePaths=new Set();for(const [id,j]of jsons)for(const part of j.parts){for(const m of part.materials||[])if(m.map)texturePaths.add(m.map);if(id==='reference-bunker'){const style=referenceMaterial(part.sourceMaterial);if(style.map)texturePaths.add(style.map)}}for(const s of Object.values(this.manifest.surfaces||{}))texturePaths.add(s.map);
    for(const texture of Object.values(this.combatFxCatalog.textures))texturePaths.add(texture.url);
    done=0;await Promise.all([...texturePaths].map(async path=>{const t=await this.loader.loadAsync(path);t.colorSpace=THREE.SRGBColorSpace;t.flipY=false;t.userData.sourceUrl=path;if((path.startsWith('assets/map-sections/')||path.startsWith('assets/native-city/textures/')))t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=8;this.textures.set(path,t);progress(.41+ ++done/texturePaths.size*.42,'Restoring original textures…')}));
    for(const [id,json]of jsons)this.registerModel(id,json);progress(.9,'Restoring original character animations…');
    await Promise.all(['nano-buttercup','nano-eddy','nano-deedee',...entries.filter(([id])=>id.startsWith('enemy-')).map(([id])=>id)].map(id=>this.ensureRig(id)));
  }
  registerModel(id,json){
    const group=new THREE.Group();group.name=id;
      for(const part of json.parts){if(id==='reference-bunker'&&referenceMaterial(part.sourceMaterial).hidden)continue;const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(part.positions,3));if(part.normals?.length===part.positions.length&&part.normals.some(n=>Math.abs(n)>.1))geo.setAttribute('normal',new THREE.Float32BufferAttribute(part.normals,3));if(part.uvs?.length)geo.setAttribute('uv',new THREE.Float32BufferAttribute(part.uvs,2));if(part.indices?.length)geo.setIndex(part.indices);if(!geo.getAttribute('normal'))geo.computeVertexNormals();
        let mats=(part.materials||[{color:[1,1,1]}]).map(m=>{const style=id==='reference-bunker'?referenceMaterial(part.sourceMaterial):null,color=style?new THREE.Color(style.color):m.color?new THREE.Color(...m.color):new THREE.Color('white');const refTexture=style?.surface?this.surface(style.surface):style?.map?this.textures.get(style.map)?.clone():null;if(refTexture){refTexture.wrapS=refTexture.wrapT=THREE.RepeatWrapping;refTexture.needsUpdate=true}const mat=new THREE.MeshStandardMaterial({name:m.name||'',map:refTexture||(m.map?this.textures.get(m.map):null),color,roughness:.8,metalness:0,side:id==='reference-bunker'&&!style?.alphaTest?THREE.FrontSide:THREE.DoubleSide,alphaTest:style?.alphaTest??m.alphaTest??0,transparent:style?.transparent||(m.opacity??1)<.98,depthWrite:style?.depthWrite??true,opacity:style?.opacity??m.opacity??1,polygonOffset:!!part.floorOverlay,polygonOffsetFactor:part.floorOverlay?-1:0,polygonOffsetUnits:part.floorOverlay?-1:0});mat.userData.review={map:style?.map||(style?.surface?this.manifest.surfaces[style.surface]?.map:m.map)||null,color:mat.color.getHexString(),opacity:mat.opacity,alphaTest:mat.alphaTest,side:mat.side};return mat});
        if(id==='reference-bunker')mats=referenceSurfaceGroups(part,geo,mats[0],style=>{const mat=new THREE.MeshStandardMaterial({color:style.color,map:style.surface?this.surface(style.surface):null,roughness:.9,side:THREE.FrontSide});if(style.contrast){mat.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\ndiffuseColor.rgb = mix(diffuse, diffuseColor.rgb, '+style.contrast.toFixed(2)+');'+(style.seams?'\nvec2 bunkerTile=abs(fract(vMapUv)-0.5);diffuseColor.rgb*=1.0-0.16*smoothstep(0.487,0.498,max(bunkerTile.x,bunkerTile.y));':'' ))};mat.customProgramCacheKey=()=>'bunker-surface-'+style.contrast+'-'+!!style.seams}mat.userData.review={map:style.surface?this.manifest.surfaces[style.surface]?.map:null,color:mat.color.getHexString(),contrast:style.contrast??1,seams:!!style.seams};return mat});
        if(part.groups?.length)for(const g of part.groups)geo.addGroup(g.start,g.count,Math.min(g.materialIndex,mats.length-1));
        const mesh=new THREE.Mesh(geo,mats.length===1?mats[0]:mats);mesh.name=part.name;mesh.userData.sourceEntityId=part.sourceEntityId;mesh.userData.sourceMaterial=part.sourceMaterial;mesh.userData.assetId=id;mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);
      }
      group.userData.bounds=json.bounds;group.userData.source=json.source;this.models.set(id,group);
    return this.models.get(id);
  }
  model(id,{height,dimensions,scale=1,uniqueMaterials=false}={}){
    const template=this.models.get(id);if(!template)throw new Error(`Extracted FusionFall asset unavailable: ${id}`);const object=this.rigs.has(id)?createAnimatedModel(template,this.rigs.get(id)):template.clone(true),size=template.userData.bounds.size;
    if(dimensions)object.scale.set(dimensions[0]/size[0],dimensions[1]/size[1],dimensions[2]/size[2]);else object.scale.setScalar(height?height/size[1]:scale);
    if(uniqueMaterials)object.traverse(o=>{if(o.isMesh)o.material=Array.isArray(o.material)?o.material.map(cloneMaterial):cloneMaterial(o.material)});
    return object;
  }
  async ensureRig(id){if(this.rigs.has(id))return this.rigs.get(id);if(this.rigPromises.has(id))return this.rigPromises.get(id);if(!id.startsWith('nano-')&&!id.startsWith('enemy-')&&!id.startsWith('hero-'))return null;const promise=fetch(`assets/animations/${id}.json`).then(r=>{if(!r.ok)throw new Error(`Missing original rig: ${id}`);return r.json()}).then(rig=>{this.rigs.set(id,rig);return rig});this.rigPromises.set(id,promise);return promise}
  surface(name,repeatX=1,repeatZ=1){const source=this.manifest.surfaces[name];if(!source)return null;const t=this.textures.get(source.map).clone();t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(repeatX,repeatZ);t.needsUpdate=true;return t}
}
