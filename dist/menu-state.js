export const MENU_SECTIONS=['play','operative','weapons','nanos'];
export const PLAY_MODES={solo:{title:'Solo',detail:'Your pace. Your run.',players:'1 player'},online:{title:'Private co-op',detail:'Invite friends with a code.',players:'1–4 players'},lan:{title:'Local network',detail:'Play on the same network.',players:'1–4 players'}};
export function primaryAction({section='play',mode='solo',party=null,busy=false,availability='idle'}={}){
 if(busy)return {label:'Preparing...',detail:'Getting your run ready.',action:'none',disabled:true};
 if(section!=='play')return {label:'Back to Play',detail:'Review your setup before deploying.',action:'play',disabled:false};
 if(party?.joined){if(!party.connected)return {label:'Reconnect to party',detail:'Your seat is reserved briefly.',action:'party',disabled:false};if(party.phase==='playing')return {label:'Return to party',detail:'Your run is in progress.',action:'party',disabled:false};if(!party.host)return {label:'Waiting for host',detail:'The party host starts the run.',action:'none',disabled:true};return {label:'Deploy party',detail:'Start the run for everyone in your party.',action:'start-party',disabled:false}}
 if(mode==='solo')return {label:'Start solo run',detail:'Wave 1 starts when you enter the arena.',action:'solo',disabled:false};
 if(availability==='checking')return {label:'Checking connection...',detail:'Contacting the party service.',action:'none',disabled:true};
 if(availability==='error')return {label:mode==='lan'?'Local host unavailable':'Online unavailable',detail:'Retry the connection or choose Solo.',action:'none',disabled:true};
 return {label:'Create or join party',detail:mode==='online'?'Private rooms. One-use invitation codes.':'Connect to the same local host.',action:'party',disabled:false};
}
