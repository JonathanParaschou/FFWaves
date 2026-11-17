import {readFile} from 'node:fs/promises';
import {configureNanos} from '../dist/nanos.js';
import {configureWeapons} from '../dist/weapons.js';
import {configureHeroes} from '../dist/avatars.js';
let ready;
export function loadServerCatalogs(){return ready??=Promise.all(['nanos','heroes'].map(name=>readFile(new URL('../dist/assets/'+name+'-catalog.json',import.meta.url),'utf8').then(JSON.parse))).then(([nanos,heroes])=>{configureNanos(nanos.nanos);configureHeroes(heroes);configureWeapons(heroes.weapons)})}
