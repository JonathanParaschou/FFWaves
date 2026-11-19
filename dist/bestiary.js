const $=id=>document.getElementById(id),element=(tag,text,cls)=>{const e=document.createElement(tag);if(text)e.textContent=text;if(cls)e.className=cls;return e};
try{
 const [roster,library]=await Promise.all(['enemy-roster','enemy-library'].map(name=>fetch('assets/'+name+'.json').then(r=>{if(!r.ok)throw Error('Field guide data could not load. Refresh to retry.');return r.json()})));
 const records=Object.values(roster.enemies).sort((a,b)=>a.tier-b.tier||a.name.localeCompare(b.name)),selected=new Set(records.map(r=>r.source));
 function render(){
  const query=$('search').value.trim().toLowerCase(),role=$('role').value,tier=Number($('tier').value),wave=Number($('wave').value);
  const visible=records.filter(r=>(!query||(r.name+' '+r.role).toLowerCase().includes(query))&&(!role||r.role===role)&&(!tier||r.tier===tier)&&(!wave||r.fromWave<=wave&&(!r.toWave||r.toWave>=wave)&&(r.role!=='elite'||wave%5===0)));
  $('count').textContent=visible.length+' / 40 enemies';$('roster').replaceChildren();
  for(const r of visible){const card=element('article',null,'card'),image=element('img');image.src=r.portrait;image.alt=r.name;image.className='portrait';image.loading='lazy';card.append(image);const copy=element('div',null,'copy');copy.append(element('span','Tier '+r.tier+' / '+r.role,'badge'),element('h3',r.name));const facts=element('div',null,'facts');facts.append(element('span','Waves '+r.fromWave+(r.toWave?'–'+r.toWave:'+')),element('span',r.role==='elite'?'Elite rounds':r.stats.ranged?'Dodge the volley':'Body blocks movement'));copy.append(facts,element('div','Original NPC '+r.npcId+' / '+r.source,'source'));card.append(copy);$('roster').append(card)}
  if(!visible.length)$('roster').append(element('p','No enemies match these filters.','empty'));
 }
 function renderLibrary(){const query=$('library-search').value.trim().toLowerCase(),entries=library.entries.filter(r=>!query||(r.name+' '+r.source).toLowerCase().includes(query));$('library-count').textContent=entries.length+' original identities'+(entries.length>80?' / Showing the first 80; narrow the search to see more.':'');$('library').replaceChildren();for(const r of entries.slice(0,80)){const li=element('li',r.name);li.append(element('span',selected.has(r.source)?'Model in selected roster':r.cachedModel?'Model cached / available for review':'Model absent from cache'));$('library').append(li)}}
 $('inventory').textContent=`Audited all ${library.hostileRows.toLocaleString()} hostile NPC rows: ${library.uniqueIdentities} named mesh/skin identities and ${library.cachedEnemyModelPaths} cached monster models. Search here for alternatives to the current 40; source entries sharing a model can have different names and skins.`;
 $('filters').onsubmit=e=>e.preventDefault();for(const id of ['search','role','tier','wave'])$(id).addEventListener('input',render);$('library-search').addEventListener('input',renderLibrary);render();renderLibrary();
}catch(error){$('roster').append(element('p',error.message,'empty'))}
