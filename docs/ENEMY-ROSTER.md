# Enemy bodies, ranged combat and the curated roster

The complete hostile roster in the cached original XDT snapshot was audited:
3,314 total NPC rows, 1,033 hostile rows (`m_iTeam == 2`), and 619 identities after
grouping duplicate name/mesh/skin combinations. Encounter variants, Fusion heroes
and debug/event entries remain identifiable in `dist/assets/enemy-library.json`.
The previously indexed cache contains 123 `mob/mob_*.kfm` models. This is the
complete available local cache, not all downloadable assets from every game build.
The table SHA-256 is retained in both enemy catalogs.

Forty distinct monster models are curated: the previous sixteen plus twenty-four
new original models. Geometry hashes and source paths are distinct; recolors do
not inflate the count. Original table names, NPC IDs, skins, skeletons and clips
are retained. The original assets keep their ownership. FPS roles, body dimensions,
stats, projectiles, wave assignments and map associations are adaptations.
`tools/expand-enemy-roster.py` reproduces the read-only extraction using the
existing development cache and the full library index.

## Reviewing the selection

Open `/bestiary.html`, also linked from the game's Field Manual. It presents all
forty source-model portraits with role/tier/wave filters and searches all 619
source identities for alternatives. An unselected cached model still needs its
skin and rig reviewed before it can replace a selected enemy. The full JSON is
downloadable from the guide. It does not silently change a multiplayer roster.

Run `python tools/review-enemies.py` to regenerate
[the movement/attack sheet](enemy-roster-review.jpg). These eighty views bake the
actual skinned vertices, materials and source clips. Source idle rigs are measured
once by `enemy-actor.js` to normalize animated height and ground/pivot offsets;
raw bind-pose bounds do not reliably represent the visible body. The current
bunker's existing height cap remains intact. Lighting is approximate, and live
WebGL appearance and performance remain unverified while browser access is
unavailable.

## Wave composition

`enemy-roster.js` supplies source-backed identities and shared FPS profiles to
solo and authoritative co-op. `enemy-director.js` chooses a weighted mixture,
introduces available ranged/runner specialists, avoids long identical runs, and
retains the existing surge counts and every-fifth-wave elite schedule. Existing
map defaults supply preference weights; Camp Kidney keeps a restricted themed
pool. The bunker is an authored mixed Fusion invasion, not an original spawn map.

Tier 1 retires after wave 9, tier 2 after wave 18 and ordinary tier 3 after wave
28. Tier 4/5 and elite variants supply the later roster. Incoming stronger types
change the composition as well as the existing health/speed/damage ramp. No more
than four ranged enemies can be active at once; extra ranged spawns wait for a
slot without stopping eligible melee spawns. The existing 22-active-enemy cap is
preserved.

## Solid bodies

`actor-collision.js` sweeps movement in short steps against living enemy body
volumes. Contacts slide along the boundary while map collision prevents pushing
players through walls. Walking, sprinting and sliding share this path. Enemies
also avoid moving into players. Corpses and bodies on separate floor layers do
not block travel. The same function runs in solo, server movement and predicted
client input/reconciliation. Collision uses body volumes rather than individual
animated fingers, wings or weapon triangles. Enemy-to-enemy crowd separation
retains its existing behavior.

## Ranged attacks

`enemy-attacks.js` creates five readable projectile families: toxic, electric,
plasma, fire and void. Ranged attacks show a charge at the launch position and
use an available original ranged/skill clip. Volleys have telegraphs, finite
travel speed and longer recovery; multi-bolt damage is divided across the volley.
Projectile segments are swept against map geometry and player bodies so a fast
shot cannot skip through a wall or player between frames. Floors block shots.

`enemy-projectiles.js` renders an opaque unlit core, original textured halo and
depth-tested tail. Launch and impact effects survive short flights. Authoritative
co-op broadcasts launch/impact events independently of snapshots, so a shot that
starts and ends within a snapshot interval still has visible feedback. Snapshot
updates adopt existing visuals instead of duplicating them; finished shots
cannot be resurrected by an older snapshot. Prediction is bounded to 100 ms and
cannot apply damage. Solo/server physics owns all damage.

## Verification

`npm run build` checks the new modules and full regression suite.
`tests/hostile-combat.test.mjs` verifies original source identities, forty distinct
geometry hashes, texture/rig links, wave retirement and roster coverage,
30/60/144 Hz contact movement, wall pinning, floor separation, corpse clearance,
solo/server/client collision, swept projectile hits, network launch/impact events,
short-flight visuals and animated-body normalization. Existing source-map,
first-person view, arsenal, Nano, soundtrack and party tests remain in the build.

## Selected forty

| Enemy | Role | Tier | Waves | Original NPC |
| --- | --- | --- | --- | --- |
| Barrel Buster | chaser | 1 | 1-9 | 66 |
| Dread Head | chaser | 1 | 1-9 | 74 |
| Fusion Spawn | chaser | 1 | 1-9 | 55 |
| Noxious Spawn | ranged | 1 | 2-9 | 63 |
| Pack Arachnid | chaser | 1 | 1-9 | 326 |
| Tech Drone | chaser | 1 | 1-9 | 60 |
| Crash Loader | chaser | 2 | 3-18 | 107 |
| Cyber Stinger | ranged | 2 | 3-18 | 83 |
| Dire Hydra | ranged | 2 | 3-18 | 70 |
| Newsprint Ninja | runner | 2 | 3-18 | 69 |
| Painsaw | chaser | 2 | 3-18 | 68 |
| Shocktangler | ranged | 2 | 3-18 | 87 |
| Spider Toad | runner | 2 | 3-18 | 175 |
| Tech Wing | runner | 2 | 3-18 | 99 |
| Wild Stinger | ranged | 2 | 3-18 | 133 |
| Asphalt Freak Father | elite | 3 | 5+ | 543 |
| Canyon Stalker | runner | 3 | 7-28 | 206 |
| Doom Boiler | ranged | 3 | 7-28 | 129 |
| Gear Goon | chaser | 3 | 7-28 | 130 |
| Heavy Hauler | bruiser | 3 | 7-28 | 73 |
| Heavy Hunter | chaser | 3 | 7-28 | 146 |
| Motor Raptor | runner | 3 | 7-28 | 75 |
| Road Golem | bruiser | 3 | 7-28 | 62 |
| Scrap Tyrant | runner | 3 | 7-28 | 309 |
| Unisickle | runner | 3 | 7-28 | 147 |
| Verminator | ranged | 3 | 7-28 | 116 |
| Weird Welder | ranged | 3 | 7-28 | 128 |
| Ghoulish Growth | elite | 4 | 5+ | 160 |
| Junkasaurus Wrecks | elite | 4 | 12+ | 114 |
| Killowatt | ranged | 4 | 12+ | 215 |
| Mech Queen | elite | 4 | 12+ | 200 |
| Riot Rogue | bruiser | 4 | 12+ | 178 |
| Sonic Scorpion | ranged | 4 | 12+ | 145 |
| Streetgrinder | elite | 4 | 12+ | 141 |
| Ventilator | runner | 4 | 12+ | 127 |
| Extremospawn | runner | 5 | 20+ | 123 |
| Eyebulb | ranged | 5 | 20+ | 2059 |
| Hydraulic Enforcer | elite | 5 | 20+ | 212 |
| Magma Hulk | elite | 5 | 20+ | 2049 |
| Oil Ogre | elite | 5 | 20+ | 204 |
