import * as THREE from './vendor/three.module.js';
import { createAnimatedModel } from './animation.js';
export { THREE };
export class AssetLibrary {
  constructor(){this.models=new Map();this.textures=new Map();this.rigs=new Map();this.rigPromises=new Map();this.manifest=null;this.loader=new THREE.TextureLoader()}
  async load(progress=()=>{}){
    const response=await fetch('assets/manifest.json');if(!response.ok)throw new Error('Could not load FusionFall asset manifest.');this.manifest=await response.json();
    this.combatFxCatalog=await fetch('assets/combat-fx-catalog.json').then(r=>r.json());
    this.nanoCatalog=await fetch('assets/nanos-catalog.json').then(r=>r.json());this.heroCatalog=await fetch('assets/heroes-catalog.json').then(r=>r.json());
    this.sectionCatalog=await fetch('assets/map-sections/catalog.json').then(r=>r.json());this.manifest.assets[this.sectionCatalog.id]={url:this.sectionCatalog.url,bounds:this.sectionCatalog.bounds,source:this.sectionCatalog.source};
    const entries=Object.entries(this.manifest.assets);let done=0;progress(.03,'Reading original FusionFall models…');
    const jsons=await Promise.all(entries.map(async([id,entry])=>{const r=await fetch(entry.url);if(!r.ok)throw new Error(`Missing extracted model: ${id}`);const json=await r.json();progress(.03+ ++done/entries.length*.38,`Loading ${id.replaceAll('-',' ')}…`);return [id,json]}));
    const texturePaths=new Set();for(const [,j]of jsons)for(const part of j.parts)for(const m of part.materials||[])if(m.map)texturePaths.add(m.map);for(const s of Object.values(this.manifest.surfaces||{}))texturePaths.add(s.map);
    for(const texture of Object.values(this.combatFxCatalog.textures))texturePaths.add(texture.url);
    done=0;await Promise.all([...texturePaths].map(async path=>{const t=await this.loader.loadAsync(path);t.colorSpace=THREE.SRGBColorSpace;t.flipY=false;if(path.startsWith('assets/map-sections/'))t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=8;this.textures.set(path,t);progress(.41+ ++done/texturePaths.size*.42,'Restoring original textures…')}));
    for(const [id,json] of jsons){const group=new THREE.Group();group.name=id;
      for(const part of json.parts){const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(part.positions,3));if(part.normals?.length)geo.setAttribute('normal',new THREE.Float32BufferAttribute(part.normals,3));else geo.computeVertexNormals();if(part.uvs?.length)geo.setAttribute('uv',new THREE.Float32BufferAttribute(part.uvs,2));if(part.indices?.length)geo.setIndex(part.indices);if(!part.normals?.length)geo.computeVertexNormals();
        const mats=(part.materials||[{color:[1,1,1]}]).map(m=>{const color=m.color?new THREE.Color(...m.color):new THREE.Color('white');const mat=new THREE.MeshStandardMaterial({name:m.name||'',map:m.map?this.textures.get(m.map):null,color,roughness:.8,metalness:0,side:THREE.DoubleSide,alphaTest:m.alphaTest||0,transparent:(m.opacity??1)<.98,opacity:m.opacity??1});return mat});
        if(part.groups?.length)for(const g of part.groups)geo.addGroup(g.start,g.count,Math.min(g.materialIndex,mats.length-1));
        const mesh=new THREE.Mesh(geo,mats.length===1?mats[0]:mats);mesh.name=part.name;mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);
      }
      group.userData.bounds=json.bounds;group.userData.source=json.source;this.models.set(id,group);
    }progress(.9,'Restoring original character animations…');
    await Promise.all(['nano-buttercup','nano-eddy','nano-deedee',...entries.filter(([id])=>id.startsWith('enemy-')).map(([id])=>id)].map(id=>this.ensureRig(id)));
  }
  model(id,{height,dimensions,scale=1,uniqueMaterials=false}={}){
    const template=this.models.get(id);if(!template)throw new Error(`Extracted FusionFall asset unavailable: ${id}`);const object=this.rigs.has(id)?createAnimatedModel(template,this.rigs.get(id)):template.clone(true),size=template.userData.bounds.size;
    if(dimensions)object.scale.set(dimensions[0]/size[0],dimensions[1]/size[1],dimensions[2]/size[2]);else object.scale.setScalar(height?height/size[1]:scale);
    if(uniqueMaterials)object.traverse(o=>{if(o.isMesh)o.material=Array.isArray(o.material)?o.material.map(m=>m.clone()):o.material.clone()});
    return object;
  }
  async ensureRig(id){if(this.rigs.has(id))return this.rigs.get(id);if(this.rigPromises.has(id))return this.rigPromises.get(id);if(!id.startsWith('nano-')&&!id.startsWith('enemy-')&&!id.startsWith('hero-'))return null;const promise=fetch(`assets/animations/${id}.json`).then(r=>{if(!r.ok)throw new Error(`Missing original rig: ${id}`);return r.json()}).then(rig=>{this.rigs.set(id,rig);return rig});this.rigPromises.set(id,promise);return promise}
  surface(name,repeatX=1,repeatZ=1){const source=this.manifest.surfaces[name];if(!source)return null;const t=this.textures.get(source.map).clone();t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(repeatX,repeatZ);t.needsUpdate=true;return t}
}
