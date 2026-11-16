export const BOUNDS={minX:-52,maxX:52,minZ:-48,maxZ:44};
export function groundHeight(x,z){const t=Math.max(0,Math.min(1,(-z-28)/11));return t*t*(3-2*t)*1.8}
export const BUILDINGS=[
 {id:'west-apartments',asset:'town-building-1',x:-48,z:1,w:7,d:12,h:23,rotation:0,zone:0},
 {id:'west-corner',asset:'town-building-2',x:-46,z:-20,w:10,d:14,h:27,rotation:Math.PI/2,zone:0},
 {id:'burger-frenzy',asset:'town-burger',x:-28,z:42,w:14,d:13,h:6.4,rotation:Math.PI,zone:0},
 {id:'jellys-candy',asset:'town-candy',x:-45,z:30,w:9,d:11,h:10,rotation:Math.PI/2,zone:0},
 {id:'reactor-workshop',asset:'yard-garage',x:37,z:-10,w:12,d:17,h:8,rotation:0,zone:1},
 {id:'reactor-admin',asset:'town-firestation',x:47,z:26,w:11,d:17,h:8.3,rotation:-Math.PI/2,zone:1},
 {id:'garden-pavilion',asset:'town-park',x:2,z:-46,w:18,d:7,h:6,rotation:0,zone:2}
];
export const COVER=[
 {asset:'town-fountain',x:-23,z:3,w:9,d:8,h:4.8,rotation:0},
 {asset:'car',x:-7,z:13,w:3.2,d:5.6,h:1.7,rotation:0},
 {asset:'town-pickup',x:-40,z:10,w:3.3,d:5.6,h:1.5,rotation:0},
 {asset:'crate',x:-12,z:-17,w:3,d:2,h:1.7,rotation:0},
 {asset:'planter',x:-29,z:15,w:4,d:2,h:1.1,rotation:0},
 {asset:'planter',x:-17,z:15,w:4,d:2,h:1.1,rotation:0},
 {asset:'crate',x:-39,z:-17,w:2.4,d:2,h:1.5,rotation:0},
 {asset:'yard-cylinder',x:22,z:9,w:3.3,d:3.3,h:5.1,rotation:0},
 {asset:'yard-cylinder',x:35,z:12,w:3.3,d:3.3,h:5.1,rotation:0},
 {asset:'barrel',x:45,z:3,w:2,d:3,h:2,rotation:0},
 {asset:'crate',x:15,z:32,w:3.8,d:2.7,h:2.2,rotation:0},
 {asset:'town-firetruck',x:26,z:29,w:3,d:8,h:3.3,rotation:0},
 {asset:'crate',x:16,z:-18,w:2.4,d:2.4,h:1.8,rotation:0},
 {asset:'town-planter',x:-12,z:-36,w:5,d:2.5,h:1.2,rotation:0},
 {asset:'town-planter',x:14,z:-36,w:5,d:2.5,h:1.2,rotation:0},
 {asset:'town-planter',x:-43,z:-39,w:4,d:2.4,h:1,rotation:0},
 {asset:'town-planter',x:43,z:-39,w:4,d:2.4,h:1,rotation:0}
];
export const DIVIDERS=[
  {x:5,z:-22.5,w:1.1,d:9,h:3.5},{x:5,z:5.5,w:1.1,d:29,h:3.5},{x:5,z:37,w:1.1,d:14,h:3.5},
  {x:-44,z:-27,w:16,d:1.1,h:3.5},{x:0,z:-27,w:52,d:1.1,h:3.5},{x:44,z:-27,w:16,d:1.1,h:3.5}
];
export const GATES=[{id:'yard-west',unlock:'yard',x:5,z:-14,w:1.2,d:10,h:3.5},{id:'yard-south',unlock:'yard',x:5,z:25,w:1.2,d:10,h:3.5},{id:'garden-west',unlock:'garden',x:-31,z:-27,w:10,d:1.2,h:3.5},{id:'garden-east',unlock:'garden',x:31,z:-27,w:10,d:1.2,h:3.5}];
export const STATIONS=[
  {id:'armory-plaza',kind:'armory',x:-35,z:27,label:'FIELD ARMORY',sub:'Weapons, ammunition & armor',icon:'ϟ',asset:'vending',zone:0},
  {id:'rifle',kind:'weapon',weapon:'rifle',cost:700,x:-9,z:1,label:'PARTICLE RIFLE',sub:'Wall buy · 700 credits',icon:'⌁',asset:'console',zone:0},
  {id:'yard-gate',kind:'gate',unlock:'yard',cost:750,x:2,z:25,label:'OPEN REACTOR YARD',sub:'Unlock both routes · 750 credits',icon:'→',asset:'console',zone:0},
  {id:'yard-gate-north',kind:'gate',unlock:'yard',cost:750,x:2,z:-14,label:'OPEN REACTOR YARD',sub:'Unlock both routes · 750 credits',icon:'→',asset:'console',zone:0},
  {id:'power',kind:'power',cost:0,x:26,z:-1,label:'RESTORE REACTOR POWER',sub:'Bring the emergency network online',icon:'ϟ',asset:'console',zone:1},
  {id:'shotgun',kind:'weapon',weapon:'shotgun',cost:1000,x:39,z:29,label:'TWIST CANNON SHOTGUN',sub:'Wall buy · 1,000 credits',icon:'⋔',asset:'vending',zone:1},
  {id:'mystery',kind:'mystery',cost:850,x:17,z:-20,label:'MYSTERY CACHE',sub:'Random weapon · 850 credits',icon:'?',asset:'crate',zone:1},
  {id:'armory-yard',kind:'armory',x:44,z:14,label:'REACTOR SUPPLY',sub:'Weapons, ammunition & armor',icon:'ϟ',asset:'vending',zone:1},
  {id:'garden-gate',kind:'gate',unlock:'garden',cost:1000,x:-31,z:-24,label:'OPEN NANO GARDEN',sub:'Requires power · 1,000 credits',icon:'→',asset:'console',zone:0},
  {id:'garden-gate-east',kind:'gate',unlock:'garden',cost:1000,x:31,z:-24,label:'OPEN NANO GARDEN',sub:'Requires power · 1,000 credits',icon:'→',asset:'console',zone:1},
  {id:'upgrade',kind:'upgrade',cost:1800,x:-24,z:-41,label:'NANO-FORGE',sub:'Upgrade equipped weapon · 1,800 credits',icon:'↑',asset:'console',zone:2},
  {id:'nano-refill',kind:'nano',cost:400,x:28,z:-40,label:'NANO RECHARGE',sub:'Recharge all Nano powers · 400 credits',icon:'✧',asset:'vending',zone:2},
  {id:'evac',kind:'evac',cost:0,x:-1,z:-34,label:'EMERGENCY UPLINK',sub:'Extraction available after wave 10',icon:'↗',asset:'antenna',zone:2}
];
export const SPAWNS=[{x:-35,z:-23,zone:0},{x:-4,z:-21,zone:0},{x:-46,z:20,zone:0},{x:-3,z:37,zone:0},{x:-13,z:38,zone:0},{x:15,z:-23,zone:1},{x:47,z:-20,zone:1},{x:45,z:39,zone:1},{x:12,z:39,zone:1},{x:-46,z:-44,zone:2},{x:45,z:-44,zone:2},{x:-20,z:-31,zone:2}];
