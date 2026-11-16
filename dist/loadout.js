import { NANOS,validateLoadout } from './nanos.js';
const $=id=>document.getElementById(id);
export function equipNanoInSlot(loadout,slot,id,skillId){
 const result=validateLoadout(loadout).map(e=>({...e}));
 const record=NANOS.find(n=>n.id===id);if(!record||slot<0||slot>2)return result;
 const skill=record.skills.find(s=>String(s.id)===String(skillId))||record.skills[0];
 const duplicate=result.findIndex(e=>e.id===id);
 if(duplicate>=0&&duplicate!==slot)result[duplicate]={...result[slot]};
 result[slot]={id,skillId:skill.id};return validateLoadout(result);
}
export class LoadoutMenu {
 constructor(sim,world,onChange=()=>{}){
  this.sim=sim;this.world=world;this.onChange=onChange;this.slot=0;this.filter='all';this.search='';
  let saved;try{saved=JSON.parse(localStorage.getItem('fusionfall-nano-loadout')||'null')}catch{}
  sim.setLoadout(validateLoadout(saved));this.resetDraft();this.render();this.sync();
  $('nano-collection').addEventListener('keydown',e=>{const buttons=[...$('nano-collection').querySelectorAll('[data-nano-id]')],index=buttons.indexOf(document.activeElement);if(index<0)return;const columns=getComputedStyle($('nano-collection')).gridTemplateColumns.split(' ').length;const delta={ArrowRight:1,ArrowLeft:-1,ArrowDown:columns,ArrowUp:-columns}[e.code];let next;if(delta!==undefined)next=Math.max(0,Math.min(buttons.length-1,index+delta));else if(e.code==='Home')next=0;else if(e.code==='End')next=buttons.length-1;else return;e.preventDefault();this.choose(buttons[next].dataset.nanoId)});
  $('nano-search').addEventListener('input',e=>{this.search=e.target.value.toLowerCase().trim();this.renderCollection()});
  for(const b of document.querySelectorAll('[data-filter]'))b.onclick=()=>{this.filter=b.dataset.filter;document.querySelectorAll('[data-filter]').forEach(el=>el.classList.toggle('active',el===b));this.renderCollection()};
 }
 resetDraft(){const current=this.sim.loadout[this.slot];this.inspected=current.id;this.skillId=current.skillId}
 sync(){try{localStorage.setItem('fusionfall-nano-loadout',JSON.stringify(this.sim.loadout))}catch{}this.world.setSquad(this.sim.squad).catch(e=>this.onChange(e.message))}
 choose(id){const n=NANOS.find(n=>n.id===id);if(!n)return;this.inspected=id;this.skillId=this.sim.loadout.find(e=>e.id===id)?.skillId||n.skills[0].id;this.renderCollection();this.renderDetail();$('nano-collection').querySelector(`[data-nano-id="${id}"]`)?.focus()}
 power(id){this.skillId=id;this.renderDetail();$('power-choices').querySelector(`[data-power-id="${id}"]`)?.focus()}
 equip(){this.sim.setLoadout(equipNanoInSlot(this.sim.loadout,this.slot,this.inspected,this.skillId));this.sync();this.render();$('loadout-slots').querySelector('.active')?.focus()}
 render(){const slots=$('loadout-slots');slots.replaceChildren();for(const [i,n]of this.sim.squad.entries()){
  const b=document.createElement('button');b.className='equipped-slot'+(this.slot===i?' active':'');b.style.setProperty('--nano-color',n.color);b.setAttribute('aria-pressed',String(this.slot===i));b.innerHTML=`<span class="equipped-number">${i+1}</span><img src="${n.originalIcon||n.portrait}" alt=""><span><strong>${n.name}</strong><small>${n.power}</small></span>`;
  b.onclick=()=>{this.slot=i;this.resetDraft();this.render();$('loadout-slots').children[i].focus()};slots.appendChild(b);
 }this.renderCollection();this.renderDetail()}
 renderCollection(){const list=$('nano-collection');list.replaceChildren();const visible=NANOS.filter(n=>(this.filter==='all'||n.type===this.filter)&&(!this.search||n.name.toLowerCase().includes(this.search))).sort((a,b)=>a.name.localeCompare(b.name));$('collection-count').textContent=`${visible.length} / ${NANOS.length} Nanos`;
  for(const n of visible){const b=document.createElement('button'),equipped=this.sim.loadout.findIndex(e=>e.id===n.id);b.className='collection-nano'+(this.inspected===n.id?' active':'')+(equipped>=0?' equipped':'');b.dataset.nanoId=n.id;b.tabIndex=this.inspected===n.id||!visible.some(v=>v.id===this.inspected)&&visible[0]===n?0:-1;b.title=`Preview ${n.name}`;b.setAttribute('aria-label',`Preview ${n.name}${equipped>=0?`, equipped in slot ${equipped+1}`:''}`);b.setAttribute('aria-pressed',String(this.inspected===n.id));b.style.setProperty('--nano-color',n.color);b.innerHTML=`<img src="${n.originalIcon||n.portrait}" alt="" loading="lazy"><span>${n.name}</span><i>${n.type||'—'}</i>${equipped>=0?`<b>${equipped+1}</b>`:''}`;b.onclick=()=>this.choose(n.id);list.appendChild(b)}
  if(!visible.length){const p=document.createElement('p');p.className='empty-collection';p.textContent='No Nanos match your search.';list.appendChild(p)}
 }
 renderDetail(){const n=NANOS.find(n=>n.id===this.inspected),current=this.sim.loadout[this.slot];$('detail-portrait').src=n.portrait;$('detail-name').textContent=n.name;$('detail-type').textContent=n.type?`${n.type} · ${n.typeName}`:n.typeName;$('detail-type').style.color=n.color;$('assigning-slot').textContent=`Preview for slot ${this.slot+1}`;$('power-original').textContent=n.originalPowersKnown===false?'Survival protocols: original power data unavailable.':'Original powers adapted for solo survival.';
  const options=$('power-choices');options.replaceChildren();for(const skill of n.skills){const b=document.createElement('button');b.className='power-choice'+(String(skill.id)===String(this.skillId)?' selected':'');b.dataset.powerId=skill.id;b.setAttribute('aria-pressed',String(skill.id)===String(this.skillId));b.innerHTML=`<span class="power-dot"></span><div><strong>${skill.name}</strong><small>${skill.category} · ${skill.cooldown}s cooldown</small><p>${skill.description}</p></div><span class="power-cost">${skill.cost}<small>ENERGY</small></span>`;b.title=skill.description;b.onclick=()=>this.power(skill.id);options.appendChild(b)}
  const equipped=current.id===n.id&&String(current.skillId)===String(this.skillId),duplicate=this.sim.loadout.findIndex((e,i)=>i!==this.slot&&e.id===n.id);
  $('equip-nano').textContent=equipped?'Equipped':`${duplicate>=0?'Swap into':'Equip in'} slot ${this.slot+1}`;$('equip-nano').disabled=equipped;$('equip-hint').textContent=equipped?'This slot is ready.':duplicate>=0?`Swaps with slot ${duplicate+1}`:`Replaces ${this.sim.squad[this.slot].name}`;$('equip-nano').onclick=()=>this.equip();
  const caption=document.querySelector('.preview-caption');if(caption)caption.textContent=`PREVIEW · ${n.name}`;this.world.inspectNano(n).catch(e=>this.onChange(e.message));
 }
}
