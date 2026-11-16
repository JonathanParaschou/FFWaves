# FusionFall: Last Signal

A browser-based first-person wave-survival shooter using actual models, textures, and audio extracted from the user's existing FusionFall cache. Original FusionFall weapon and Nano names are verified against OpenFusion tabledata. The survival rules and FPS balance are new adaptations.

## Run locally

With Node.js 18 or later, run `npm start`, then open **http://localhost:4180** in a desktop browser supporting WebGL 2 and Pointer Lock. Run `npm install` once to install the LAN server dependency. No build is needed. The deployment hub opens on **Operative**, with a large animated hero preview and the full 24-character roster. Choose your hero and accessories, then **Apply Operative**. **Field Kit** chooses one of three starter sidearms and a katana, hammer or bat; these choices save immediately. **Nano Squad** holds the three Nano slots, collection search and power selection. Then click **Enter the Game** to start; click **Engage** if the browser asks for a second gesture to capture the mouse. Escape releases the mouse and pauses a solo run. The complete `dist/` directory supports solo play on static hosting; LAN multiplayer also requires this Node server.

## LAN co-op (up to four players)

Run `npm start` on the host computer and keep it running. It listens on **0.0.0.0:4180** and prints the host's network URLs. On this machine, use **http://10.0.0.233:4180/?lan=1**. Every player on the same LAN opens that same address in a desktop browser. The LAN menu also displays a copyable address.

1. Choose your hero, accessories and three Nano options before joining.
2. Open **LAN Co-op**, enter a callsign, and choose **Host LAN**. Other players choose **Join Party**.
3. The host chooses the map and clicks **Deploy Party**. Each player clicks **Engage** to capture the mouse.

The server controls movement limits, gun cadence/ammunition, hit detection, enemy AI, pickups, personal currency and inventory, and shared gates/power/waves. Teammates appear as their chosen animated heroes, weapons, accessories and one active Nano. Friendly fire is off. Wave counts and health scale with connected players. The teammate HUD and radar mark the party. After a player's emergency self-revive is used, hold **F for three seconds** nearby to revive them; surviving a wave also brings downed teammates back. A team wipe ends the run.

Players can join a running match. Disconnecting preserves a player for **20 seconds**; use **Reconnect** in the LAN panel. Host controls transfer to another connected player, while the Node server stays on the original machine. One party runs per server. Opening a menu does **not** pause the shared match. The supply box reserves an active roll for the player who paid. Loadouts can change in the lobby between runs.

Windows already has a Private-network allowance for this machine's Node version. If running on another computer with a blocked port, allow inbound TCP 4180 for the local subnet on its Private network. No port forwarding or external service is required. See [LAN-MULTIPLAYER.md](LAN-MULTIPLAYER.md) for architecture and verification details.

## Hero, movement and weapon progression

Use **Operative** to choose among **24 full-size heroes**, including the Powerpuff Girls, Ed/Edd/Eddy, the five Kids Next Door, Billy, Mandy, Grim, Dexter, Dee Dee, Mandark, Mac, Bloo, Wilt, Eduardo, Gwen, Samurai Jack and Mojo Jojo. Equip one of **20 original head/back accessories**. The preview supports rotation and idle/run/crouch/slide poses, with the chosen weapon and a single Nano. Look down to see your body, or press **F5** (or **H**) for the third-person camera.

Press **V** to strike with the selected **Samurai Katana**, **King Hammer**, or **Aluminum Endsville Slugger**. Their reach, damage, windup and recovery differ; melee respects cover, cancels reloads and prevents simultaneous firing. First- and third-person models show the selected original weapon. The field kit deploys with a Null Void Pistol, Bracer Blaster or Heatblaster. Wall guns and the supply box remain the source of stronger firearms.

**C** toggles crouch. Pressing **Shift** stands you up, then sprints when movement and weapon state permit it. While sprinting, C starts a momentum slide. **C** cancels back to standing/running; **Space** cancels into a jump. Sliding supports steering and shooting, and spends stamina. Original NPC locomotion clips are combined with newly authored crouch/slide poses.

Each map has **five physical wall weapon racks**, one **supply box**, ammunition caches and an armor station. The global weapon shop is removed from play. Wall buys sell their displayed gun and discounted refills for owned guns. Their rarity improves over rounds. A box roll costs **950 taros**, cycles guns for 3.1 seconds, then gives **12 seconds** to press F and claim the offer. It never replaces a weapon automatically. Ten original guns are available; the box can offer five rarity levels. Rarity and Nano-Forge upgrades stack.

The selected Nano now floats visibly ahead and to the side, including while aiming. Reserves remain hidden. Wave health, speed, damage and spawn pressure grow in stages, with caps on health, speed and damage. See [OPERATIVE-SYSTEMS.md](OPERATIVE-SYSTEMS.md) for controls, source references and tuning details.

## Choose a map

Use **Deployment** at the top of the main menu to choose a survival zone. The selector includes route/elevation diagrams and enemy information. Map choice and best wave per map save locally; the Nano loadout carries between maps.

| Map | Playable structure | Atmosphere |
|---|---|---|
| Sector V / Rooftop Relay | Fountain circuit, two-door transit depot, 3.6m service roof, reactor yard, 6m monorail approach | Original town buildings, vehicles, street furniture and monorail pieces; dusk |
| Camp Kidney / Canopy Crossing | Camp loop, creek crossings, ranger shelter, 2.4m lookout, 3m watch platform, 5m canopy ridge | Original cabins, tents, campfires, bridges, twisted trees, fireflies and forest haze |
| Salvage Yard / Furnace Circuit | Control-bay start, car-press lanes, 2.4m scrap overlook, 3.6m crane apron, 7m furnace circuit | Original crane, press, forklift, scrap cars, tires and metal trees; steam and warm haze |

Each map now has four covered, two-exit spaces, a continuous set of marked routes, and larger structures that frame its combat spaces. Sector V connects shop street, fountain square, Jelly Arcade, transit depot and a monorail relay hall. Camp Kidney uses solid creek banks with two bridge crossings, a mess hall, boathouse and lookout lodge. Salvage Yard connects dispatch, press lanes, sorting hall, loading dock and furnace control. District paving, room signs and connected service structures support navigation.

All 18 ramps share their geometry and endpoints with collision and enemy navigation. Upper routes have two approaches. Player drops fall under gravity; melee, station prompts, projectiles and line of sight account for height. Interiors have opposing exits, and major props and tree trunks have collision. See [MAP-DESIGN.md](MAP-DESIGN.md) for the specific Call of Duty references and design decisions.

These are new survival layouts using original FusionFall art, rather than exact original map ports. Camp Kidney includes source-verified Pack Arachnids and Wild Stingers; Salvage Yard includes Crash Loaders, Scrap Tyrants and Junkasaurus Wrecks. Broader regional creatures appear as adapted reinforcements. Habitat evidence and limits are recorded in `dist/assets/biome-kit.json`.

### Shared progression

Each map has three connected sectors. The original Sector V progression remains:

- **Signal Plaza:** a curved road loop around an original FusionFall fountain, continuous sidewalks, crosswalks, planted seating, a transit stop, and Burger Frenzy / Jelly's Candy street frontage, a starter armory, and a Particle Rifle wall buy. Two security gates open together for 750 taros, preserving two routes between sectors.
- **Reactor Yard:** a connected industrial loop around a workshop and paired reactor cylinders, ammunition, a shotgun wall buy, and a mystery cache. Restore power at the marked console to enable Nano Garden access. Supplies sit away from the power switch, rewarding route planning.
- **Skywalk:** a six-metre deck beneath the monorail, reached by two ramps. Unlock both approaches for 1,000 taros after restoring power. The Nano-Forge upgrades your current weapon twice, the recharge station restores Nano powers, and the emergency uplink offers extraction after wave 10 is cleared. You may also continue surviving indefinitely.

The layout uses original buildings, trees, fences, benches, crates, lamps, machines, cars, and other FusionFall props. Walkable routes and collision are authored for this game; it is a new map, not a port of an original game zone. Enemies use a flow field that updates when gates open and navigate around buildings and cover. Active enemies are capped at 22 for browser performance while additional wave enemies wait to enter.

## Combat and progression

The original four weapons remain available: **Null Void Pistol**, **Particle Rifle**, **Twist Cannon Shotgun**, and **Bio-Plasma Cannon**. Carry two. New weapons replace the selected weapon when both slots are full. Ammunition is finite; reload magazines and purchase held-weapon resupplies at caches or weapon racks. Headshots deal extra damage and earn bonus credits. Cannon shots cause area damage. Each biome selects its enemies: ranged threats join at wave 2, faster threats at wave 3, surges arrive every fourth wave, and biome elites every fifth. Elite rounds include two elites from wave 10 and three from wave 20. Later surges can introduce regional reinforcements.

Choose any three of the **44 cached Nanos** in the main-screen NanoCom. Search the complete roster or filter by the original Adaptium / Blastons / Cosmix types. Each Nano offers three power selections, for **132 power options** across 14 functional survival effects. The three squad slots and selected powers save locally. Duplicates swap slots instead of duplicating Nanos.

The default squad is Buttercup / Miss Fire (stun), Eddy / Jawbreaker Break (heal), and Dee Dee / Ponypuff Pirouette (area damage). Original names/categories are used where data exists; Ben, Ghostfreak, and Upgrade's unavailable/placeholder original power data is explicitly identified in the menu as survival protocols. Power timing and solo FPS effects are adaptations.

Only the selected Nano accompanies the player. Keys **1 / 2 / 3** instantly swap the active companion; reserves stay hidden. The active Nano hovers in the forward periphery, stays out of the central aiming lane, and remains visible during ADS. Nano bodies use original skeletal idle and cast clips; enemies use original run, attack, wound and death clips. These are skinned character models with original weights and decoded animation curves. The NanoCom, minimap frame and Nano icons retain recovered FusionFall sprites. The combat HUD uses a quieter FPS layout with stable health, ammunition and active-ability anchors.

Each gun has its own effect profile using original FusionFall muzzle, projectile and impact textures. Ballistic, scatter, energy and explosive shots differ in color, size, travel and impact. These are visual trails for authoritative hitscan combat; this update does not introduce ballistic projectile physics.

New procedural first-person sleeves and gloved hands follow the original weapon models. Walking, sprinting, recoil, weapon swaps and landing blend smoothly. Reloads have distinct lower, remove-cell, insert-cell and ready phases synchronized to ammunition completion. The camera stays stable by default. Settings offer three sight designs/colors, weapon movement strength, optional camera motion, field of view, sensitivity and floating damage numbers. Settings and squad selections save locally. See [FPS-UX.md](FPS-UX.md) for the research and applied design decisions.

Powers spend shared energy and have separate cooldowns. Health regenerates six seconds after taking damage. One emergency Nano revive is available per run. Best wave is saved locally.

| Controls | Action |
|---|---|
| WASD / arrows | Move |
| Mouse | Look |
| Left / right click | Shoot / aim down sights |
| Shift / Space | Sprint (stands from crouch) / jump; Space cancels a slide |
| C | Crouch; sprint + C slides; C cancels |
| F5 / H | First / third person |
| R / G / mouse wheel | Reload / swap weapon |
| 1 / 2 / 3 | Select Nano |
| Q | Nano ability |
| V | Strike with equipped melee weapon |
| F | Buy / interact |
| Tab | Tactical map |
| Escape / P | Pause |

## Source assets and verification

See [ASSETS.md](ASSETS.md) for provenance, format, and reproducible extraction. The current runtime contains 179 individual models, 256 texture entries, 84 rigs / 602 original clips, an additional placed city scene with 59 mesh parts / 28 textures, and 16 recovered combat-effect textures, the complete 44-Nano roster, original UI sprites, and 16 original OGG sounds. Original art/audio retain their original ownership. Three.js r170 is bundled under MIT. The UI uses system fonts and requires no web-font service. Play requires a desktop keyboard/mouse.

`npm run check` validates all game module syntax. `npm test` covers gameplay, all 132 powers, loadout validation, single-companion switching, reload timing, first-person animation, settings, every original rig through Three.js skin deformation, asset references, and map navigation. Live browser visual QA remains unavailable because the browser access host is unavailable. The local HTTP server continues at http://localhost:4180 so the user can refresh and play.

Sector V now includes an actual placed city-section crop recovered from Map_04_04 as a distant skyline landmark. It preserves the original relative mesh placement; it is not a playable port of that map. Rotated frontage no longer protrudes into the arena, duplicate distant buildings were removed, and upper benches/planters now clear Relay Hall. See [source recovery notes](docs/FUSIONFALL-SOURCE-RECOVERY.md).

## Vercel deployment

`vercel.json` publishes the current `dist/` game as a static site. The build runs syntax checks and the automated suite. `.vercelignore` omits extraction caches, research, local environment files and the unused original placement archive. Public assets are about 50 MB; no raw cache is uploaded.

Deploy with `npx vercel@65.16.0 --prod` from this directory after authenticating to the intended Vercel account. Existing Vercel projects can be linked with `vercel link`; the local link is ignored by Git. The deployment includes solo gameplay, all characters, maps, weapons, Nanos and customization. The hosted LAN dialog explains how to use the local multiplayer build.

LAN multiplayer continues with `npm start` and the host computer's local IP. Vercel supports WebSockets, but this game's in-memory party cannot be moved unchanged into independently scaled, time-limited Function instances. Internet multiplayer requires shared match coordination/state or a dedicated game-server service. This Vercel configuration does not claim online co-op.
