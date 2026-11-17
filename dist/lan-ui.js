import {discoverOnlineService} from './online-service.js';
import {MAPS} from './maps.js';
const $=id=>document.getElementById(id);
export function initLanUI(client,getProfile){
 let info=null,error='',available=false,endpoint=location.origin,online=!new URLSearchParams(location.search).has('lan'),busy=false;
 try{$('lan-name').value=localStorage.getItem('fusionfall-lan-name')||''}catch{}
 if(location.hash.startsWith('#join=')){try{$('join-code').value=decodeURIComponent(location.hash.slice(6)).slice(0,12)}catch{$('join-code').value=''};history.replaceState(null,'',location.pathname+location.search)}
 for(const map of MAPS){const option=document.createElement('option');option.value=map.id;option.textContent=map.name+' / '+map.title;$('lan-map').appendChild(option)}
 const empty=()=>({phase:'lobby',map:getProfile().map,players:[]});
 function status(message){error=message;$('lan-status').textContent=message}
 function render(lobby=client.joined?client.lobby:online?empty():info?.lobby||empty()){
  const joined=client.joined,host=client.isHost,players=lobby?.players||[];
  for(const mode of ['online','lan']){$('net-'+mode).disabled=joined||busy;$('net-'+mode).setAttribute('aria-pressed',String((mode==='online')===online))}
  $('join-code-label').classList.toggle('hidden',!online||joined);$('join-code').disabled=busy;
  const share=available&&(!online||joined&&host);document.querySelector('#lan-panel .lan-share').classList.toggle('hidden',!share);$('lan-share-label').classList.toggle('hidden',!share);
  $('lan-share-label').textContent=online?'One-use invite for your next teammate':'Share with players on your network';
  $('lan-new-code').classList.toggle('hidden',!online||!joined||!host);$('lan-new-code').disabled=!client.connected||busy||players.length>=4;
  if(online)$('lan-address').value=lobby?.invite?.code||'';
  $('invite-expiry').textContent=online&&joined&&host?(players.length>=4?'Party full.':lobby.invite&&lobby.invite.expiresAt>Date.now()?'One player per code. Expires '+new Date(lobby.invite.expiresAt).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})+'.':'Invite expired. Generate a new code.') :'';
  $('lan-roster').replaceChildren();for(let i=0;i<4;i++){const player=players[i],row=document.createElement('li'),name=document.createElement('strong'),detail=document.createElement('span');name.textContent=player?player.profile.name+(player.id===client.id?' (you)':''):'Open slot';detail.textContent=player?(!player.connected?'Reconnecting':player.id===lobby.hostId?'HOST':'TEAMMATE'):'Waiting for a player';if(!player)row.className='empty-slot';row.append(name,detail);$('lan-roster').appendChild(row)}
  $('lan-map').value=lobby.map;$('lan-map').disabled=!joined||!host||lobby.phase==='playing';$('lan-name').disabled=joined;
  $('lan-create').classList.toggle('hidden',joined);$('lan-create').textContent=online?'CREATE PARTY':'HOST LAN';$('lan-create').disabled=busy||!available||!online&&players.length>0;
  $('lan-join').classList.toggle('hidden',joined&&client.connected);$('lan-join').disabled=busy||!available||!online&&!players.length;$('lan-join').textContent=joined?'RECONNECT':online?'JOIN WITH CODE':'JOIN PARTY';
  $('lan-start').classList.toggle('hidden',!joined||!host||lobby.phase==='playing'||!client.connected);$('lan-start').textContent=lobby.phase==='result'?'START NEW RUN':'DEPLOY PARTY';$('lan-leave').classList.toggle('hidden',!joined);$('lan-edit').classList.toggle('hidden',!joined||lobby.phase==='playing');
  if(!error)$('lan-status').textContent=joined?(lobby.phase==='playing'?'Match in progress.':host?'Share an invite, then deploy when everyone is ready.':'Your host will start the match.'):online?'Create a private party or enter a code from your host.':'Host or join the party on this local server.';
 }
 async function refresh(){busy=true;error='';available=false;status('Connecting to the party service...');render();try{
  if(online){const service=await discoverOnlineService({origin:location.origin,signal:AbortSignal.timeout(60000)});endpoint=service.endpoint;info=service.info;}
  else{endpoint=location.origin;const response=await fetch(endpoint+'/api/lan',{cache:'no-store',signal:AbortSignal.timeout(10000)});if(!response.ok)throw Error("Open the host computer's local game link to play LAN.");info=await response.json();if(info.protocol!==1)throw Error('Game versions differ. Refresh this page.');}
  available=true;error='';
  if(!online){const preferred=info.addresses.find(a=>/ethernet|wi-fi/i.test(a.name))||info.addresses[0];$('lan-address').value=(location.hostname==='localhost'?preferred?.url||location.origin:location.origin)+'/?lan=1'}
 }catch(e){status(e.message)}finally{busy=false;render()}}
 async function open(){if(client.joined)online=client.online;error='';$('lan-panel').classList.remove('hidden');if(client.joined){available=true;render()}else await refresh();$('lan-name').focus()}
 function close(){$('lan-panel').classList.add('hidden');$('lan-button').focus()}
 async function connect(mode){if(busy)return;busy=true;error='';status('Joining party...');render();try{const name=$('lan-name').value.trim()||'Operative';try{localStorage.setItem('fusionfall-lan-name',name)}catch{}let roomId=client.roomId;if(online&&!client.joined&&mode==='join'&&!$('join-code').value.trim()){try{const saved=JSON.parse(sessionStorage.getItem('fusionfall-online-room'));if(saved?.endpoint===endpoint)roomId=saved.roomId}catch{}}if(online&&(client.joined||roomId)&&mode==='join')mode='reconnect';await client.connect(mode,{...getProfile(),name},getProfile().map,{online,endpoint,code:$('join-code').value,roomId});$('join-code').value='';error='';}catch(e){status(e.message)}finally{busy=false;render()}}
 $('lan-button').onclick=open;$('lan-refresh').onclick=refresh;$('lan-close').onclick=close;$('lan-create').onclick=()=>connect('create');$('lan-join').onclick=()=>connect('join');$('lan-new-code').onclick=()=>{error='';client.invite()};$('join-code').onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();connect('join')}};
 $('lan-start').onclick=()=>{client.updateProfile({...getProfile(),name:$('lan-name').value.trim()||'Operative'});client.start()};$('lan-map').onchange=()=>client.chooseMap($('lan-map').value);$('lan-edit').onclick=close;
 $('net-online').onclick=()=>{online=true;refresh()};$('net-lan').onclick=()=>{online=false;refresh()};
 $('lan-copy').onclick=async()=>{if(online&&client.lobby?.invite?.expiresAt<=Date.now()){status('Invite expired. Generate a new code.');return}const value=online?location.origin+location.pathname+'#join='+$('lan-address').value:$('lan-address').value;try{await navigator.clipboard.writeText(value);status(online?'One-use invite link copied.':'LAN address copied.')}catch{$('lan-address').select();status('Code/address selected. Press Ctrl+C to copy.')}};
 return {open,close,refresh,render,status,get name(){return $('lan-name').value.trim()||'Operative'}};
}
