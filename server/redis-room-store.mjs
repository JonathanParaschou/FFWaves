import Redis from 'ioredis';
import {randomUUID,createHash} from 'node:crypto';
const commit=`
if redis.call('GET',KEYS[1]) ~= ARGV[1] then return -1 end
local count=tonumber(ARGV[8])
for i=0,count-1 do
 local n=10+i*5
 if ARGV[n+3]=='1' and redis.call('EXISTS',ARGV[n])==1 then return -3 end
end
redis.call('ZREMRANGEBYSCORE',KEYS[3],'-inf',ARGV[5])
if ARGV[7]=='1' and redis.call('ZCARD',KEYS[3])>=tonumber(ARGV[6]) then return -2 end
if ARGV[2]=='null' then redis.call('DEL',KEYS[2]);redis.call('ZREM',KEYS[3],ARGV[4])
else redis.call('SET',KEYS[2],ARGV[2],'EX',ARGV[3]);redis.call('ZADD',KEYS[3],tonumber(ARGV[5])+tonumber(ARGV[3])*1000,ARGV[4]) end
for i=0,count-1 do
 local n=10+i*5
 if ARGV[n+4]=='1' then redis.call('SET',ARGV[n],ARGV[n+1],'PX',ARGV[n+2]) else redis.call('DEL',ARGV[n]) end
end
redis.call('PUBLISH',KEYS[4],ARGV[9]);redis.call('DEL',KEYS[1]);return 1`;
export class RedisRoomStore{
 constructor(url,{namespace='production',maxRooms=8,RedisClient=Redis}={}){this.prefix='ffwaves:{'+namespace.replace(/[^a-zA-Z0-9_-]/g,'_')+'}:v1:';this.maxRooms=maxRooms;this.redis=new RedisClient(url,{lazyConnect:true,connectTimeout:5000,maxRetriesPerRequest:1,retryStrategy:n=>Math.min(2000,n*200)});this.redis.on('error',()=>{});this.sub=this.redis.duplicate();this.sub.on('error',()=>{});this.listeners=new Map();this.sub.on('message',(channel,message)=>{try{for(const fn of this.listeners.get(channel)||[])fn(JSON.parse(message))}catch{}});}
 key(kind,id){return this.prefix+kind+':'+id}
 tokenKey(token){return this.key('session',createHash('sha256').update(token).digest('hex'))}
 async health(){return await this.redis.ping()==='PONG'}
 async lookupCode(code){return this.redis.get(this.key('invite',code))}
 async lookupToken(token){return this.redis.get(this.tokenKey(token))}
 async read(id){const data=await this.redis.get(this.key('room',id));return data?JSON.parse(data):null}
 async transact(id,operation){
  const lock=this.key('lock',id),token=randomUUID(),start=Date.now();let acquired=false;
  while(Date.now()-start<1800){if(await this.redis.set(lock,token,'PX',5000,'NX')){acquired=true;break}await new Promise(r=>setTimeout(r,10+Math.random()*15))}
  if(!acquired)throw Error('The party is busy. Try again.');
  try{const previous=await this.read(id),result=operation(previous),changes=result.changes||[],events=result.events||[];
   const status=await this.redis.eval(commit,4,lock,this.key('room',id),this.key('rooms','active'),this.key('events',id),token,JSON.stringify(result.state),1800,id,Date.now(),this.maxRooms,previous?'0':'1',changes.length,JSON.stringify(events),...changes.flatMap(c=>[c.key,c.value||'',c.ttl||1,c.unique?'1':'0',c.value!==undefined?'1':'0']));
   if(status===-2)throw Error('Server is full. Try again shortly.');if(status===-3)throw Error('Invite collision. Generate another invite.');if(status!==1)throw Error('The party changed while saving. Please reconnect.');return result.value;
  }finally{await this.redis.eval("if redis.call('GET',KEYS[1])==ARGV[1] then return redis.call('DEL',KEYS[1]) else return 0 end",1,lock,token).catch(()=>{})}
 }
 async subscribe(id,listener){const channel=this.key('events',id);if(!this.listeners.has(channel)){this.listeners.set(channel,new Set());await this.sub.subscribe(channel)}this.listeners.get(channel).add(listener);return async()=>{const set=this.listeners.get(channel);set?.delete(listener);if(set&&!set.size){this.listeners.delete(channel);await this.sub.unsubscribe(channel)}}}
 async close(){this.redis.disconnect();this.sub.disconnect()}
}
