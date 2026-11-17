# Operative, movement and survival systems

## Heroes and accessories

The Operative menu offers 24 original full-size NPC hero bodies and 20 original head/back accessories. They are separate from Nano models. Select a hero, choose a head item and back item, inspect the animated preview, then commit with **Use This Operative**. Cancel preserves the previous selection. The character uses original walk/run/idle clips, with authored bone posing for crouch, slide and firearm readiness. First-person arms match the selected outfit; the full body is hidden in first person to prevent cropped legs and camera intersections. F5 or H toggles a third-person camera that pulls inward near walls. Accessories appear in third person and in the preview.

The head/back items follow original skeleton sockets with authored fitting offsets. Their fit and the new player movement are adaptations rather than recovered original player-controller animations. Gear is cosmetic; Nano selections continue to determine abilities.

## Movement

[Activision's Black Ops 6 movement guide](https://www.callofduty.com/guides/blackops6/training/call-of-duty-guides-black-ops-6-multiplayer-training-movement) describes sliding in horizontal directions while retaining combat control. This game's input timing and movement values are authored for its maps rather than claimed as exact CoD values.

- C toggles crouch; crouch speed is 2.65 units/s, with a smoothly lowered eye position.
- Sprinting for at least 0.12s enables a slide. C starts it while moving on the ground.
- A slide lasts up to 0.9s, decelerating from 10.8 to 4.8 units/s with limited steering. It spends stamina, stops against obstacles and allows shooting/ADS.
- C immediately cancels into standing/running. Space cancels into a jump. A short cooldown and stamina cost govern chaining; holding jump does not add repeated impulses.
- Weapon motion and mandatory stance-height changes stay separate from optional camera bob/shake.

## Physical weapons and box rolls

[Activision's Zombies deep dive](https://www.callofduty.com/blog/2025/09/call-of-duty-black-ops-7-zombies-deep-dive) describes physical wall buys, discounted wall ammunition, timed Mystery Box reveals and better weapon rarity as rounds progress. Those principles replace the previous catalogue shop.

Every map has five mounted racks with their actual original gun model. The first purchase grants that rack's weapon; later purchases replenish that gun at 35% of its base price. Wall rarity advances every ten rounds to a maximum of Epic. A higher rarity purchase preserves existing forge upgrades. Full ammunition does not incur another refill charge.

The supply box costs 950 in-game taros. It cycles through gun models for 3.1s and reveals a predetermined random offer. The player has 12s to press F and take it. Walking away does not equip it. Offers expire without replacing a carried gun. Rolls avoid currently owned guns, and five rarity levels multiply damage separately from forge tier.

The ten guns include the four existing weapons plus Spitwad Sniper Rifle, Rotation Rifle, Heatblaster, Vertical Scattergun, Marshmallow Launcher and Bracer Blaster. Their names/meshes/skins are original; FPS statistics and rarity behavior are adaptations.

## Wave tuning

The same official deep dive describes staged pressure, later fast enemies and round-based equipment improvement. Exact CoD health formulas are not established by that reference. `rounds.js` defines this game's own curve for its 22-actor browser limit:

| Round | Approximate health multiplier | Base enemy count | Elite count on elite rounds |
|---|---:|---:|---:|
| 1 | 1.00 | 9 | 1 |
| 5 | 1.64 | 20 | 1 |
| 10 | 2.89 | 33 | 2 |
| 20 | 6.54 | 60 | 3 |
| 40+ | 14.00 cap | 88 cap | 3 |

Surges add six enemies. Every fifth round adds biome elites. Spawn intervals shorten to a floor of 0.26s; speed and damage growth also cap. Faster enemies still retain readable windups, while ranged enemies and later reinforcements vary the encounter. The forge and weapon rarity provide corresponding damage progression.

## Nano presence and map polish

Only one Nano follows the player. Its target now sits visibly ahead and beside the player, moving farther aside during ADS. Faster catch-up prevents sprinting from leaving it behind the camera. Turning and aiming do not recall it. Tests check the companion's projected screen position during sprints, turns and ADS.

Map detailing adds physical weapon displays, supply-box animation, room beams and thresholds, street markings, drains, storefront awnings, upper-route trim, contact shadows, grounded signs, forest cliff rocks and additional biome prop clusters. Repeated small details use instancing to limit draw calls.

## Verification limits

Automated checks cover movement transitions, collision, slide cancellation, box timing/pickup/expiry, wall purchases, rarity/forge preservation, wave caps, all 24 hero rigs and accessory transforms, full-body visibility when switching camera modes, Nano screen position, wall-rack visibility rays, and existing map/animation/gameplay behavior. Skinned pose previews were rendered from actual animated vertices. Browser access remains unavailable, so live WebGL rendering, frame rate and final play feel remain unverified.

## Field kit and deployment hub update

The initial screen now centers the operative preview, with Operative, Field Kit and Nano Squad tabs. The expanded source roster has 24 heroes and 20 accessories. Field Kit validates three starter sidearms and the katana/hammer/bat; selections persist locally and join the LAN profile. New matches initialize the server player's actual starter weapon and melee ID from that validated profile. Stronger wall guns and supply-box rolls retain the existing two-firearm inventory.

Melee starts a visible windup before server/solo damage. Sword: 110 damage / 3.4m / 0.85s recovery. Hammer: 190 / 3m / 1.35s. Bat: 80 / 3.1m / 0.58s. Arcs, line of sight, floors, stun, cooldown and firing lockout apply. Hits are awarded after the windup, rather than instantly when V is pressed. Gameplay timing is an FPS adaptation around original weapon art.

Gun effects have ten profiles using recovered FusionFall textures; muzzle maps, projectile sprites, additive impacts and splash presentation vary per gun. Combat remains authoritative hitscan, with visual travel trails. Melee models use their original +Y blade axis, not the +Z gun-muzzle convention.
