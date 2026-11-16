const initial=[
 {slug:'buttercup',name:'Buttercup',asset:'nano-buttercup',type:'B',typeName:'Blastons',skills:[{id:1,name:'MISS FIRE',kind:'stun',targeting:'cone',cost:35,cooldown:12,description:'Stun enemies in front of you.',originalPower:true}]},
 {slug:'eddy',name:'Eddy',asset:'nano-eddy',type:'C',typeName:'Cosmix',skills:[{id:7,name:'JAWBREAKER BREAK',kind:'heal',targeting:'self',cost:45,cooldown:20,description:'Restore your health.',originalPower:true}]},
 {slug:'deedee',name:'Dee Dee',asset:'nano-deedee',type:'B',typeName:'Blastons',skills:[{id:21,name:'PONYPUFF PIROUETTE',kind:'damage',targeting:'area',cost:55,cooldown:18,description:'Damage nearby enemies.',originalPower:true}]}
];
export const TYPE_COLORS={A:'#6f8aff',B:'#f27891',C:'#f7d55a',unknown:'#6fdaf4'};
function normalize(n){return {...n,id:n.slug,originalId:n.id,portrait:n.portrait||`assets/ui/${n.asset}.webp`,color:TYPE_COLORS[n.type]||TYPE_COLORS.unknown,skills:n.skills.map(s=>({...s,targeting:s.targeting||'self'}))}}
export const NANOS=initial.map(normalize);
export function configureNanos(records){if(!Array.isArray(records)||!records.length)throw new Error('The Nano catalog is empty.');NANOS.splice(0,NANOS.length,...records.map(normalize));return NANOS}
export function defaultLoadout(){return ['buttercup','eddy','deedee'].map(id=>{const n=NANOS.find(n=>n.id===id)||NANOS[0];return {id:n.id,skillId:n.skills[0].id}})}
export function validateLoadout(entries){const defaults=defaultLoadout(),used=new Set();return defaults.map((fallback,i)=>{const entry=entries?.[i],n=NANOS.find(n=>n.id===entry?.id);const safe=n&&!used.has(n.id)?n:NANOS.find(n=>n.id===fallback.id&&!used.has(n.id))||NANOS.find(n=>!used.has(n.id));used.add(safe.id);const skill=safe.skills.find(s=>String(s.id)===String(entry?.skillId))||safe.skills[0];return {id:safe.id,skillId:skill.id}})}
export function resolveSquad(entries){return validateLoadout(entries).map(e=>{const n=NANOS.find(n=>n.id===e.id),skill=n.skills.find(s=>String(s.id)===String(e.skillId))||n.skills[0];return {...n,...skill,id:n.id,skillId:skill.id,power:skill.name,name:n.name,skill}})}
