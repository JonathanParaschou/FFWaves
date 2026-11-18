import {horizontalFov} from './player-scale.js';
export const DEFAULT_SETTINGS={musicVolume:.65,effectsVolume:1,voiceVolume:.8,reticle:'cross',reticleColor:'#f5fbff',weaponMotion:1,cameraMotion:0,damageNumbers:false,cameraVersion:2,fieldOfView:95,sensitivity:1,hudScale:'auto'};
export function validateSettings(value={}){if(!value||typeof value!=='object')value={};return {musicVolume:volume(value.musicVolume,.65),effectsVolume:volume(value.effectsVolume,1),voiceVolume:volume(value.voiceVolume,.8),hudScale:['auto',1,1.15,1.3].includes(value.hudScale)?value.hudScale:'auto',reticle:['cross','dot','ring'].includes(value.reticle)?value.reticle:'cross',reticleColor:['#f5fbff','#62f0ff','#ffef6e'].includes(value.reticleColor)?value.reticleColor:DEFAULT_SETTINGS.reticleColor,weaponMotion:[0,.4,1].includes(value.weaponMotion)?value.weaponMotion:1,cameraMotion:value.cameraMotion===1?1:0,damageNumbers:value.damageNumbers===true,cameraVersion:2,fieldOfView:Math.max(80,Math.min(110,Number(value.fieldOfView)||95)),sensitivity:Math.max(.4,Math.min(2,Number(value.sensitivity)||1))}}
export function loadSettings(){try{const saved=JSON.parse(localStorage.getItem('fusionfall-fps-settings')||'{}');if(saved&&saved.cameraVersion!==2&&saved.fieldOfView)saved.fieldOfView=saved.fieldOfView===75?95:horizontalFov(saved.fieldOfView);return validateSettings(saved)}catch{return {...DEFAULT_SETTINGS}}}
export function saveSettings(value){try{localStorage.setItem('fusionfall-fps-settings',JSON.stringify(value))}catch{}}

export function resolveHudScale(value,width,height){return value==='auto'?width>=1800||height>=1000?1.2:1:Number(value)||1}

function volume(value,fallback){return Number.isFinite(value)?Math.max(0,Math.min(1,value)):fallback}
