import {WEAPONS,MELEE_WEAPONS} from './weapons.js';
export const STARTER_GUNS=['pistol','bracer','heatblaster','beamer','crayon','pop-gun'];
export function validateFieldKit(value={}){if(!value||typeof value!=='object')value={};return {gun:STARTER_GUNS.includes(value.gun)&&WEAPONS[value.gun]?value.gun:'pistol',melee:MELEE_WEAPONS[value.melee]?value.melee:MELEE_WEAPONS.sword?'sword':'fists'}}
export function loadFieldKit(){try{return validateFieldKit(JSON.parse(localStorage.getItem('fusionfall-field-kit')||'{}'))}catch{return validateFieldKit()}}
export function saveFieldKit(value){try{localStorage.setItem('fusionfall-field-kit',JSON.stringify(validateFieldKit(value)))}catch{}}
