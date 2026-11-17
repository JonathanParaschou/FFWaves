import {createVercelGateway} from '../server/vercel-gateway.mjs';
import {RedisRoomStore} from '../server/redis-room-store.mjs';
import {createHash} from 'node:crypto';
const environment=process.env.VERCEL_ENV||'development';
const namespace=createHash('sha256').update([process.env.VERCEL_PROJECT_ID||'ffwaves',environment,environment==='preview'?process.env.VERCEL_GIT_COMMIT_REF||'default':''].join(':')).digest('hex').slice(0,24);
const store=process.env.REDIS_URL?new RedisRoomStore(process.env.REDIS_URL,{namespace,maxRooms:Math.max(1,Math.min(32,Number(process.env.MAX_ROOMS)||8))}):null;
const gateway=await createVercelGateway({store});
export default gateway.server;
