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

Use **Operative** to choose among **24 full-size heroes**, including the Powerpuff Girls, Ed/Edd/Eddy, the five Kids Next Door, Billy, Mandy, Grim, Dexter, Dee Dee, Mandark, Mac, Bloo, Wilt, Eduardo, Gwen, Samurai Jack and Mojo Jojo. Equip one of **20 original head/back accessories**. The preview supports rotation and idle/run/crouch/slide poses, with the chosen weapon and a single Nano. First person shows hands and weapons, with the body hidden to avoid cropped legs and camera intersections. Press **F5** (or **H**) to see the full body and accessories in third person.

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

New procedural first-person sleeves and gloved hands follow the original weapon models. Walking, sprinting, recoil, weapon swaps and landing blend smoothly. Reloads have distinct lower, remove-cell, insert-cell and ready phases synchronized to ammunition completion. The camera stays stable by default. Settings offer three sight designs/colors, weapon movement strength, optional camera motion, field of view, sensitivity, HUD scale and floating damage numbers. Settings and squad selections save locally. See [FPS-UX.md](FPS-UX.md) for the research and applied design decisions.

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

See [ASSETS.md](ASSETS.md) for provenance, format, and reproducible extraction. The current runtime contains 179 individual models, 256 texture entries, 84 rigs / 602 original clips, an additional placed city scene with 59 mesh parts / 28 textures, and 16 recovered combat-effect textures, the complete 44-Nano roster, original UI sprites, and 297 original audio entries. Original art/audio retain their original ownership. Three.js r170 is bundled under MIT. The UI uses system fonts and requires no web-font service. Play requires a desktop keyboard/mouse.

`npm run check` validates all game module syntax. `npm test` covers gameplay, all 132 powers, loadout validation, single-companion switching, reload timing, first-person animation, settings, every original rig through Three.js skin deformation, asset references, and map navigation. Live browser visual QA remains unavailable because the browser access host is unavailable. The local HTTP server continues at http://localhost:4180 so the user can refresh and play.

Sector V now includes an actual placed city-section crop recovered from Map_04_04 as a distant skyline landmark. It preserves the original relative mesh placement; it is not a playable port of that map. Rotated frontage no longer protrudes into the arena, duplicate distant buildings were removed, and upper benches/planters now clear Relay Hall. See [source recovery notes](docs/FUSIONFALL-SOURCE-RECOVERY.md).

**Original City** is a separate, playable 128×128 metre source region recovered from Map_04_04, including its original TerrainData, street meshes, buildings and props at source transforms. It uses source-derived height samples and conservative source collider bounds, with a connected outdoor navigation mask. Survival fixtures, spawns and wave rules are added. Power, wall guns, the supply box, upgrades and extraction work in solo and LAN. Select it from **Deployment**. See [playable map recovery](docs/NATIVE-CITY-RECOVERY.md) for the source, coordinate conversion and collision limitations.

## Vercel deployment

`vercel.json` publishes the current `dist/` game as a static site. The build runs syntax checks and the automated suite. `.vercelignore` omits extraction caches, research, local environment files and the unused original placement archive. Public assets are about 50 MB; no raw cache is uploaded.

Deploy with `npx vercel@65.16.0 --prod` from this directory after authenticating to the intended Vercel account. Existing Vercel projects can be linked with `vercel link`; the local link is ignored by Git. The deployment includes solo gameplay, all characters, maps, weapons, Nanos and customization. The multiplayer dialog uses the included Vercel Function and shared Redis rooms; local LAN remains available through the Node host.

LAN multiplayer continues with `npm start` and the host computer's local IP. Vercel online multiplayer uses the included Function and Redis-backed checkpoints, rather than an in-memory singleton; connect Redis as documented in ONLINE-MULTIPLAYER.md.

## Measured bunker rebuild

Dexlabs Bunker is the default deployment, reconstructed from the published NZ:P Nacht source. The game retains both overlapping floors, two working staircases, three independent original barriers and original weapon anchors. Per-entity `floorY` keeps lower and upper rooms separate in movement, combat, rendering and LAN snapshots. Source architectural sections, route traces and camera checkpoints are available at `/map-reader.html`. See [the map-reading workflow](docs/MAP-READING-WORKFLOW.md). Earlier maps are accessible through Show earlier map prototypes.


## Bunker presentation and prop pass

The bunker now replaces plain source furniture shells with original textured FusionFall storage, grounds point-model replacements on real surfaces and rejects indoor outdoor-tree anchors. Wall conduit runs, source-positioned light housings, overhead monitors, working equipment, floor seams and subtle contact shade add detail. Standing-clearance checks keep decorative props out of the original walking space, and source cover footprints remain unchanged. Opaque source brush backs are culled; chain-link surfaces use original alpha-masked fence art.

All ten first-person weapons have individual size and grip profiles. Closed gloved hands follow those anchors, reload support offsets remain relative to the grip, and the weapon rear stays clear of the camera. Large projectile sprites are reduced and leave the visible muzzle. HUD size is automatic on large displays and adjustable in Settings.

`npm run review:scene` exports the actual runtime scene through `AssetLibrary.registerModel`, then creates labeled software reviews including props and weapons. These views use approximate lighting; live WebGL output and performance still require a browser review.


## Audio and companion personality

Music starts with the first gameplay/audio gesture to satisfy browser autoplay restrictions. Original FusionFall recordings play through a shared music bus, duck for dialogue, and fade on pause or hidden tabs. Settings has independent Music, Sound effects, and Voices & breathing sliders, including zero volume. Sprint exertion builds over two seconds and breathing recovers over four; low health also triggers breathing. Original hero/avatar hurt variants and melee exertion replace the injury beep. Nano summon/power voices have a shared cooldown to prevent switch-spam chatter.

Nanos retain the single active companion and clear ADS lane. Per-Nano float cadence, bank, gaze, source gestures, and cooldown-limited kill/injury reactions add personality. First-person hands and sleeves now use the selected hero's actual textured triangles. `npm test` exercises all hero extractions, vocal headers/provenance, audio scheduling and pause behavior; `npm run review:scene` includes the current source-derived arms. Live audio mix, WebGL and performance still need verification in the user's browser.


## Online private parties

The online service and client live in this checkout. `server/matchmaker.mjs` owns ephemeral room IDs, cryptographic single-use eight-character invitations, ten-minute expiry and room capacity. `server.mjs` routes `/online` connections into per-room authoritative simulations while preserving `/lan` locally. Every synchronous room operation scopes the shared legacy map exports with `inRoom`, including ticks, actions and snapshots; cross-map regression tests run concurrent parties. Public discovery lists service capabilities only. Invitations are sent only to the current host, rotate after each join, and are invalidated when the room ends. Reconnects use room identity plus a per-tab cryptographic token.

`npm run build` prepares client discovery, checks syntax and runs tests. Vercel uses the same-origin Function by default; `MATCHMAKING_URL` is only an optional override for separate hosting. The optional Render mode pins one instance for its in-memory rooms. See [ONLINE-MULTIPLAYER.md](ONLINE-MULTIPLAYER.md) for setup and verification boundaries. No external service is provisioned automatically.


## Vercel-native rooms (supersedes the separate-host default)

The Vercel configuration now includes a same-origin Function at `api/online.js`; `vercel.json` routes both matchmaking discovery and `/online` WebSockets there with Fluid compute enabled. It uses server-only `REDIS_URL` from a Vercel Storage integration. No external Node/Render deployment is required. Previous dedicated-server notes apply only to optional separate hosting.

`server/room-checkpoint.mjs` saves/restores full simulation and membership state without serializing event handlers, geometry or flow caches. `server/redis-room-store.mjs` uses per-room locking, a fenced atomic Lua commit, expiring invitation/session indexes, and room-scoped pub/sub. `server/vercel-rooms.mjs` restores, advances fixed steps and applies validated commands under that transaction. `server/vercel-gateway.mjs` batches/coalesces client input and relays committed events between instances. `LanClient` automatically reconnects online sessions, preserving the room identity and per-tab token. Connection generations and control receipts reject stale disconnects and duplicate controls.

Unit/architecture tests use a Redis mock executing the commit Lua and real local WebSocket connections across two independent gateways. A dedicated real Redis integration is optional via `FFWAVES_TEST_REDIS_URL`; it skips without a configured test instance. Live Vercel/Redis operation remains unverified here. See ONLINE-MULTIPLAYER.md for the one-time Storage connection and deployment checks.


## Original soundtrack playback

`dist/original-music.js` lazily loads the recovered original music catalog and the selected recording after a user gesture. Main Theme plays in menus; each map has a specific original regional track. Looping preserves the song across waves; menu/map changes crossfade over 0.8 seconds. Stale asynchronous loads cannot replace a newer selection, failed requests retry with a delay, and at most two decoded recordings are cached. The first menu interaction starts audio, while the sound button keeps its explicit enable/mute behavior. Existing volume, pause, visibility and voice ducking remain in `Soundscape`; generated score oscillators are removed.

Soundtrack tests verify all six source hashes and Ogg/Vorbis headers, authored map coverage, continuous playback, crossfade/mute/pause behavior, failure backoff and asynchronous selection races. Live listening in the deployed browser remains unverified here. Rebuild/redeploy Vercel to publish these local changes.


## Play-first main menu

The main menu now opens on Play, with mode/arena selection, the actual character preview and party overview in a stable lobby layout. Operative, Weapons and Nanos have dedicated tabs, a persistent equipped summary, and a context-dependent primary action. Service checks are requested only for network modes. Unapplied operative changes get an explicit apply/discard/stay decision; Nano browsing remains a preview until Equip. The same modal manager handles focus containment, Escape and focus return across the existing dialogs.

The CSS is rebuilt in deployment-hub.css. No new bitmap assets or font services are required. The live map backdrop, original model preview and original soundtrack remain in use. Tests exercise navigation, save guards, mode availability and party permissions against the actual DOM controller; browser rendering remains unverified because browser access was unavailable. See [MENU-DESIGN.md](docs/MENU-DESIGN.md) for references, decisions and validation limits.

## Audited bunker environment kit

`tools/audit-environment-library.py` reads every available cached bundle without
mutating it. `tools/extract-bunker-kit.py --review` renders semantic candidates;
`--publish` exports the selected subset and regenerates shared original bounds.
These are optional developer extraction tools; build, server and Vercel need
only the checked-in models, textures and pure JS plan. Read
[FUSIONFALL-BUNKER-ART.md](docs/FUSIONFALL-BUNKER-ART.md) before further dressing.

`bunker-dressing-plan.js` supplies all new physical equipment to rendering,
collision, actor support, navigation and map sections. Keep tabletop collision
pieces aligned with actual model dimensions. `reference-fixtures.js` caches
station/equipment colliders and support surfaces per immutable map. Existing
source furniture keeps its original convex collision. Repeated static source
meshes share instanced batches, while original hydrated meshes remain available
for bullet picking and review metadata.

Use `python tools/review-reference-geometry.py --rooms-only` for the nine-view
room sheet; omit the flag to also review all forty viewmodels. Keep the six
baseline cameras stable. `tests/bunker-art.test.mjs` verifies the original kit,
source anchors, sampled shell clearance, physical/visual extents, jump/drop
behavior and scene-relative instance transforms. That art-pass delivery passed 149 tests
with the optional real-Redis test skipped when unconfigured. That result does not
establish live browser lighting, frame rate or combat feel.

## External hero grip poses

`dist/held-weapon.js` derives external firearm attachments from the existing
first-person trigger/support profiles without changing the first-person frame.
`createHeroActor` applies the shared arm solve after source animation and stance
posing, then updates accessories. All bone overrides are restored before the
next animation frame and on returning to first person. The menu, local external
body and remote avatars pass the selected held presentation into this same path.
Do not reintroduce model-centre-to-wrist attachment in a separate view.

`tests/held-weapon.test.mjs` checks actual gun surfaces/muzzles, all 24 heroes and
40 guns through seven states, unmodified limb lengths and lower-body animation,
source-asset preservation, bulky bodies, missing hands, melee and remote muzzle
placement. The full build now passes 155 tests, with one optional real-Redis test
skipped. `python tools/review-held-weapons.py` renders the checked-in before/after,
motion and roster sheets using baked skinned vertices. Live WebGL/performance
review remains pending when browser access is unavailable.

## Shared hostile combat

Read [ENEMY-ROSTER.md](docs/ENEMY-ROSTER.md) before adding a monster. Source
identity/skin/rig metadata lives beside the curated forty and complete hostile
table. `enemy-roster.js` and `enemy-director.js` are shared by solo and the server;
do not add a browser-only enemy or allow retired tiers back into late waves.
`actor-collision.js` supplies swept body contacts to player movement, enemy
movement, authoritative co-op and client prediction/replay. Preserve floor
separation and static map collision.

`enemy-attacks.js` owns projectile creation and swept damage. Hostile launch and
impact events are copied into the co-op event stream independently of state
snapshots. `enemy-projectiles.js` adopts snapshot entities, limits extrapolation,
and rejects stale resurrection; it never applies damage. Keep the short-flight
visual regression check when changing reconciliation or rendering.

`enemy-actor.js` caches source animated-idle calibration per asset library. It
normalizes a rendered body's height/pivot at instantiation, while the original
clips continue playing. Raw source bind bounds alone can leave some creatures
floating or scaled differently from their body volumes. Source JSON and shared
template geometry stay unchanged.

`tests/hostile-combat.test.mjs` adds eleven source/progression/physics/network/
render-construction checks. The full build passes 166 tests with one optional
real-Redis integration skipped when unconfigured. Eighty offline source-pose
views were inspected; live browser rendering, balance and performance still
need a play session. No external deployment is performed by packaging the repo.
