import {writeFile} from 'node:fs/promises';
const value=process.env.MATCHMAKING_URL||'';
if(value){const u=new URL(value);if(u.protocol!=='https:'||u.username||u.password||u.search||u.hash||u.pathname!=='/')throw Error('MATCHMAKING_URL must be an HTTPS origin, e.g. https://ffwaves-online.onrender.com');}
await writeFile(new URL('../dist/net-config.json',import.meta.url),JSON.stringify({matchmakingUrl:value?new URL(value).origin:''})+'\n');
console.log('Multiplayer client: '+(value||'same-origin server'));

if(process.env.VERCEL&&!value&&!process.env.REDIS_URL)console.warn('Online rooms use the included Vercel Function. Connect Redis in Vercel Storage to supply REDIS_URL, then redeploy. No Render service or MATCHMAKING_URL is needed.');
