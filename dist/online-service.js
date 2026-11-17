// Discovery errors must distinguish a static game host from a broken room service.
export async function discoverOnlineService({origin,fetchImpl=fetch,signal}={}){
 let config;
 try{const response=await fetchImpl(new URL('/net-config.json',origin).href,{cache:'no-store',signal});config=response.ok?await response.json():{};}catch{throw Error('Could not load multiplayer settings. Refresh the game and try again.');}
 let endpoint;
 try{const url=new URL(config.matchmakingUrl||origin);if(!['http:','https:'].includes(url.protocol)||url.username||url.password)throw Error();endpoint=url.origin;}catch{throw Error('The multiplayer server address is invalid. The site owner needs to update its connection settings.');}
 if(origin.startsWith('https:')&&!endpoint.startsWith('https:'))throw Error('This game needs a secure HTTPS multiplayer server.');
 const missing='This site hosts the game only. A multiplayer server has not been connected yet.';
 let response;
 try{response=await fetchImpl(endpoint+'/api/matchmaking',{cache:'no-store',signal});}catch(error){if(error.name==='TimeoutError'||error.name==='AbortError')throw Error('The multiplayer server took too long to respond. It may be waking up. Wait a moment and retry.');throw Error('Cannot reach the multiplayer server. It may be offline, or its connection settings may be blocking this game site.');}
 if(!response.ok){if(response.status===404&&!config.matchmakingUrl)throw Error(missing);if(response.status===403)throw Error('The multiplayer server has not allowed connections from this game site. The host needs to update its connection settings.');if(response.status>=500){let detail;try{detail=await response.clone().json()}catch{}if(detail?.code==='STORAGE_NOT_CONFIGURED')throw Error('Online rooms need shared storage connected to this Vercel project. Connect Redis in Vercel Storage, then redeploy.');}if(response.status>=500)throw Error('The multiplayer server is starting or temporarily unavailable. Wait a moment and retry.');throw Error('The configured multiplayer address does not provide a room service. The host needs to check the server URL.');}
 let info;try{info=await response.json();}catch{throw Error(config.matchmakingUrl?'The configured multiplayer address serves a webpage instead of the room service. Check the server URL.':missing);}
 if(info.protocol!==1)throw Error('Game versions differ. Refresh the game; the host may also need to update the server.');
 if(!info.ok||info.online!==true)throw Error('The server responded, but its multiplayer service is unavailable.');
 return {endpoint,info};
}
