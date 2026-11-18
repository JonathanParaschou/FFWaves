// Metres and seconds. Shared by solo and authoritative multiplayer movement.
export const PLAYER_SCALE=Object.freeze({height:1.8,eye:1.68,radius:.35,walk:4,sprint:6,aim:2.7,crouch:2.1,slideStart:8,slideEnd:4,slideDuration:.8,jumpVelocity:5.4,gravity:22});
// Shooter-style horizontal FOV at 16:9; retain vertical coverage on ultrawide displays.
export function verticalFov(horizontal=95){return 2*Math.atan(Math.tan(horizontal*Math.PI/360)/(16/9))*180/Math.PI}
export function horizontalFov(vertical){return 2*Math.atan(Math.tan(vertical*Math.PI/360)*(16/9))*180/Math.PI}
