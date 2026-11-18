# FusionFall asset provenance

## Source-based bunker reconstruction

Dexlabs Bunker uses structural geometry from [NZ:P's published Nacht recreation](https://github.com/nzp-team/assets/blob/e147b116b2ade3920193a5b8839f6cc7e46da4a4/source/maps/ndu/ndu.map), credited to NZ:P Team under CC BY-SA 4.0. The original MAP, attribution, license and pinned revision are in [docs/reference/NZP-Nacht](docs/reference/NZP-Nacht/README.md). Source and derived geometry in `dist/assets/reference-bunker/` retain that license. Changes include coordinate conversion, triangulation, browser navigation, FusionFall material/prop substitutions and added survival services. No original CoD textures, models or audio are imported for this map. This is the published community reconstruction, not original Treyarch source.

The visible FusionFall models and textures in `dist/assets/` were extracted from the user's existing FusionFall Unity Web Player cache. The original art is from Cartoon Network Universe: FusionFall, by Cartoon Network and Grigon Entertainment. The cache was opened read-only; no installed game data was changed.

Each model's original asset path appears in `dist/assets/manifest.json` and the model JSON `source` field. The initial curated set has been expanded to 179 models and 256 texture entries, including all 44 cached Nanos, 23 additional town/industrial props, four ground surfaces, model portraits, and original Nano icons.

## Runtime format

`manifest.json` maps logical IDs to model JSON URLs. Each JSON contains `bounds` and a `parts` array. Every part provides flat `positions`, `normals`, `uvs`, and triangle `indices`, plus Three.js-style `groups` and a `materials` array. Material `map` paths are relative to the deployment root. Load these textures with **`texture.flipY = false`**: the extraction has already converted UV/image orientation. Surface textures use repeating UVs.

Coordinates are right-handed, Y-up. Models face positive Z; weapon muzzles point positive Z. Models are centered in X/Z and grounded at Y=0. GameObject transforms are baked into the vertex positions so separate renderers align. `bounds.size` preserves each extracted model's dimensions; use an appropriate display scale for the game. Nano heights are approximately 0.5 source units. The selected robot enemy is approximately 3 source units high.

The mesh exports preserve original visible art in bind pose. Original skeleton/clip exports now animate all 44 Nanos and all sixteen enemy types in the browser. Non-visible helper cubes were omitted; empty FX-plane normals were generated. Mesh geometry is rounded to five decimal places, UVs to six. Source textures were converted to WebP at quality 90, capped at 1024 pixels. UI WebP images have transparent backgrounds and were software-rasterized from the model and its source textures.

Character/weapon materials originally refer to runtime `link_a`/`link_b` placeholders. The extraction explicitly resolves these to the appropriate table-selected character skins and weapon textures. Buttercup's body and face use separate textures. Original texture names are retained in the manifest texture entries.

## Reproduce extraction

The original cache is expected at `%USERPROFILE%\AppData\LocalLow\Unity\Web Player\Cache\FusionFall`. The tooling is [UnityPackFF](https://github.com/dongresource/UnityPackFF), specialized for FusionFall's old Unity asset format. This project used revision `0620c2503dfd3d58ff6b771f6464c2902a4afd82`. Extraction scripts are authored for this project and are in `tools/`.

1. Clone UnityPackFF to `.tools/UnityPackFF`.
2. Install its Python dependencies to `.tools/python-deps` (`Pillow`, `numpy`, `lz4`, `fsb5`, `tinytag`, `wand`).
3. Run `python tools/catalog-fusionfall.py`. Its defaults index the required Nano bundle, world shared parts 1–5, character creation, character selection, character textures, NPC textures, freearea shared, and a selected map tile. Catalog output is `.tools/catalog.json`. Bundle directory names may be supplied as optional arguments to inspect another selection.
4. Run `python tools/extract-fusionfall.py`. It writes only to `dist/assets/` and extraction-local files.

The raw cache and cloned tooling are intentionally outside the deployable asset payload. No Unity plugin or remote asset service is needed by the finished browser game.

## Original audio

`manifest.audio` lists 16 original short Ogg Vorbis effects/voice clips exported byte-for-byte from the cache to `assets/audio/`. These include light/heavy laser fire, shell fire, slime fire, rifle impact, pickup, Fusion reward, weapon/Nano equip, generic Nano cast, stun/heal/Ponypuff Pirouette effects, and one ability voice line each for Buttercup, Eddy, and Dee Dee. Their original filenames are retained as `source`. This selection is approximately 155 KB. The original game has no equivalent of the survival shooter's manual reload sequence; that sound remains game-generated.

## Original skeletons and animation

`tools/export-rigs.py` decodes the cached original packed skin weights (5-bit weights summing to 31), original inverse bind matrices, and legacy packed quaternion animation keys. The exported `dist/assets/animations/` files contain bones, bind inverses, per-part skin indices/weights, and original position/quaternion/scale tracks. The runtime creates Three.js SkinnedMesh, Skeleton and AnimationMixer objects. The source hierarchy rest pose sometimes differs from its inverse-bind neutral pose; the exporter reconstructs that neutral pose and retains constant animation channels so geometry and curves remain aligned.

There are 70 rigs, 94 skinned parts and 490 selected original clips, including the full-size NPC hero set. All rigs pass bind-pose and animated-deformation checks; sampled maximum bind error is approximately 0.0000011 source units. Idle/cast clips are exported for every Nano; run, melee, wound and death clips are available for the sixteen enemies.

## Full Nano catalog

`tools/extract-all-nanos.py` produces `nanos-catalog.json`: 44 cached models, portraits, original type information and 132 selected power records. Each record retains original names/category/IDs where known, with normalized survival effects. Missing or placeholder original powers for Ben, Ghostfreak and Upgrade are marked `originalPower:false`, and disclosed in the loadout interface. The catalog also links 39 original icons where their source atlas cells are available.

## Original interface art

`tools/extract-original-ui.py` exports original client UI textures under `dist/assets/ui-original/`. Their manifest records source bundle/object provenance. The clean HUD frames, gauges, minimap ring, Nano wheel, menus and button states came from the original client `sharedassets0.assets`; help-screen screenshots are retained separately as layout references. The original source font data are bitmap atlases, so live readable text uses system Arial while the original raster controls retain their lettering.

## Town-square map kit

`tools/extract-map-kit.py` exports original town buildings, a fountain, Burger Frenzy, Jelly's Candy, park structures, monorail pieces, transit furniture, service vehicles, workshop, tanks and fencing. `environment.js` arranges them into an authored, walkable town square, industrial court and raised park promenade. Road ribbons, curbs, ground geometry, collision and the survival layout are newly authored; this is not an exact port of an original map tile.

## First-person presentation

`first-person-arms.js` creates new procedural sleeves, gloves and an energy cell. `viewmodel.js` authors walking, sprint, recoil, landing, swap and staged reload motion around the extracted original gun meshes. These first-person animations are newly authored and are not recovered FusionFall player animation clips. The quieter FPS combat HUD is also a new adaptation; it retains original Nano icons and minimap framing while the loadout menu retains original blue controls.


## Forest and industrial biome kit

`tools/extract-biome-kit.py` adds eight distinct original enemy models with their correct table-selected skins, original skeletons and animation curves, plus 24 original map props and four ground textures. `dist/assets/biome-kit.json` records every logical asset ID, original path, source NPC ID/name, proposed biome and association evidence. The main manifest now includes these assets and rigs.

The forest kit uses Camp Kidney cabins, tent, fire ring, benches, picnic table and signs; Leakey Lake bridge/tree pieces; a Twisted Forest tree and plant; and a Dark Tree watchtower. The industrial kit uses Salvage Yard forklift, car press, rail crane, scrapped car, metal structure, tires, drums, cabinet, television and metal bridge, with additional source Darklands burnt-tree and Devils Canyon rock props. Source region evidence comes directly from the original asset paths.

The distinct creature models are Spider Toad (`enemy-spidertoad`), Wild Skeeter (`enemy-skeeter`), Ghoulish Growth (`enemy-growth`), Canyon Stalker (`enemy-stalker`), Dread Head (`enemy-dreadhead`), Shocktangler (`enemy-shocktangler`), Streetgrinder (`enemy-streetgrinder`) and Unisickle (`enemy-unisickle`). Names/skin references come from the primary OpenFusion original XDT table. Their survival-map habitat assignments are authored thematic choices inferred from the actual art/names; they are not claims about original game spawn coordinates.

The biome expansion passed all-model geometry/texture checks (122 models, 243 parts, 200,869 triangles) and Three.js skin-deformation checks (56 original rigs, 79 skinned parts, 321 selected clips). Static transparent model portraits of the eight new enemies are also provided.


## Source-verified biome-native enemy follow-up

The biome kit now also contains Pack Arachnid (`enemy-packarachnid`, NPC326), Scrap Tyrant (`enemy-scraptyrant`, NPC309), Crash Loader (`enemy-crashloader`, NPC107), and Junkasaurus Wrecks (`enemy-junkasaurus`, NPC114), each with original skins, skeleton, selected animation clips and transparent portrait. The original cached map09_06/map09_07 bundles supply the newly needed industrial prefabs.

This follow-up verifies habitats from primary OpenFusion mission/spawn data rather than art theme alone. In `xdt.json`'s `m_pMissionTable.m_pMissionStringData`, index11803 explicitly places Pack Arachnids in Camp Kidney; index11768 links Wild Stingers to Camp Kidney's outhouses. Wild Stinger NPC133 uses exactly the already exported `enemy-skeeter` mesh and skins, so `biome-kit.json.nativeAliases.wild-stinger` provides its authentic identity without duplicating art.

For the industrial region, linked mission indices348?350 identify defending the salvage yard against Crash Loaders and protecting Goat's Junk Yard. Indices4715?4716 place Scrap Tyrants in the salvage yard. Indices4309/4311/4312/4317 connect Junkasaurus Wrecks patrolling outside the junk yard to the Megas mission sequence. Main-world `mobs.json` spawn records and the named Goat's Junk Yard transport anchor provide supporting location evidence. `biome-kit.json` stores these source indices and native pools.

The initial eight themed guests remain available but are explicitly distinguished from verified natives. In particular, Canyon Stalker is associated with Devil's Bluff, Streetgrinder with City Station/City Point, and Unisickle with Downtown. Dread Head is a genuine source name, while the main-world junkyard tire-model variant is Tread Head. All source display names are retained; no recolored substitutes were introduced.

After the native expansion, all-model checks passed for 126 models / 249 mesh parts / 213,984 triangles and original-skin deformation checks passed for 60 rigs / 83 skinned parts / 364 clips.


## Full-size playable-hero asset kit

`tools/extract-heroes-kit.py` writes `dist/assets/heroes-catalog.json` and merges the original full-size NPC hero models into the main manifest. These ten bodies are source `mob/npc_*.kfm` assets, distinct from the small Nano models: Dexter, Samurai Jack, Buttercup, Blossom, Eddy, Numbuh Five, Numbuh Two, Grim, Mac and Mandark. Each has its original NPC skin, skeleton, idle/walk/run clips and transparent source-model portrait. Seven have original melee/ready clips; Numbuh Five, Numbuh Two and Mac do not have original attack clips in the cached NPC source. This kit does not claim recovered player-controller, crouch, slide or gun-reload clips. Such gameplay posing remains newly authored.

Hero coordinates remain centered and grounded like the other exports. The catalog records source height, a suggested normalized 1.8m display height, foot-midpoint groundAnchor, actual exported ffbone socket names, original Bip01 names and indices, and source/normalized head/back/pelvis/leg/arm/hand positions. Hat/back fitting offsets are authored suggestions in world units for a 1.8m hero, not recovered wearable sockets. Bone-local axes can differ from model-root axes; attachment placement should use the provided socket metadata and transform spaces deliberately.

The kit also includes twelve original wearable meshes with table-selected skins: Chowder Hat, Pirate Hat, Wizard Hat, Construction Hat, Artist Beret, Monkey King's Crown, Devil Wings, Octi Backpack, Alien Bounty Hunter Pack, Rocket Pack, Pencil Back and Big Chill Wings. Entries identify head/back slot, target height, source dimensions, proposed offset/rotation, original item ID/table, and skin provenance. These fit values are cosmetic adaptations.

Six additional original weapon models are Spitwad Sniper Rifle (`weapon-spitwad`, source item 356), Rotation Rifle (`weapon-rotation`, 302), Heatblaster (`weapon-heatblaster`, 444), Vertical Scattergun (`weapon-scattergun`, 596), Marshmallow Launcher (`weapon-marshmallow`, 419), and Bracer Blaster (`weapon-bracer`, 191). Their catalog records preserve original item names, IDs, equip type, mesh and table-selected skins. FPS archetypes/loot rarity, fire patterns and damage statistics are adaptations. All weapons retain original forward +Z geometry, and all six have transparent source-model portraits.

After this kit, geometry/texture validation passed for 154 models / 284 mesh parts / 257,378 triangles and Three.js bone-deformation checks passed for 70 rigs / 94 skinned parts / 490 original clips. Source cache contents remain unchanged.

## Expanded operative and source-scene pass

The current hero catalog contains 24 full NPC heroes, 20 source accessories and three original melee models in addition to the guns. `tools/scan-extra-assets.py` reads additional cached bundles, and `tools/expand-hero-assets.py` incrementally exports only new records. All 84 rigs / 602 clips and all added attachment sockets are validated. Melee models extend along +Y from the grip, so their display scale/pivot differs from gun muzzles.

`tools/extract-combat-fx.py` exports 16 original lossless RGBA combat textures with alpha, source-path and blending metadata in `combat-fx-catalog.json`. Runtime profiles use the recovered shot/shotgun muzzle, projectile streak, fireball, lightning and impact textures. The original zero-alpha smoke and animated campfire atlas are retained as source material and are not incorrectly used as ordinary particle sprites.

`tools/recover-map-section.py` recovers original cached Map_04_04 placements and a bounded city crop (59 mesh parts, 15,461 triangles, 28 original textures). The crop is loaded through its own catalog and used as an out-of-bounds skyline landmark in Sector V. Relative placement is preserved; terrain/navigation is not claimed to be a playable original-map port. See [FUSIONFALL-SOURCE-RECOVERY.md](docs/FUSIONFALL-SOURCE-RECOVERY.md).

`tools/export-native-city.py` additionally recovers a separate playable 128×128 metre region from that original scene. **Original City** includes 188 parts and 108,538 triangles, with 67 original texture entries, original terrain splat/lightmap composition, source street floors and original placed scenery at game scale. Source MeshCollider bounds and terrain gradients define conservative outdoor collision/navigation. Supply equipment and enemy spawn positions are authored survival additions. See [NATIVE-CITY-RECOVERY.md](docs/NATIVE-CITY-RECOVERY.md).

All added visible source art in this pass comes from the existing FusionFall cache. No unrelated external art pack was needed. Original ownership remains unchanged.


## Bunker prop retargeting and first-person presentation

`reference-dressing.js` replaces source furniture shells within their original collision footprints. The current [research-annex kit](docs/FUSIONFALL-BUNKER-ART.md) supersedes the old salvage-cabinet, TV, barrel and tree scatter with clean lockers, workbenches, instruments, robotics parts, a containment machine and DexTech exterior landmarks. The complete available cache was indexed (181 bundles, 1,503 unique map GameObjects); 39 candidates were visually reviewed and 18 original models published. Source paths, original dimensions and rejection reasons are in `dist/assets/bunker-kit.json`. Original art ownership is unchanged.

Source architectural vertices remain unchanged. Added workcells preserve source anchor metadata and use explicit shared render/collision extents, support surfaces and navigation masking. Slim conduits, light housings, floor markings and contact shade are new browser-authored dressing. Decorative-only pieces are checked against the remaining standing clearance. Model-center origins are normalized to real support surfaces. Repeated original prop meshes are instanced.

`weapon-presentation.js` places the original ten gun meshes around new trigger/support anchors fitted to their normalized bounds. First-person closed gloves and reload motions are authored for the FPS adaptation; they are not recovered original player animations. Full-scene software review renders use the same material and geometry construction as the browser.


## Soundtrack, character audio and source-derived FPS arms

The earlier adaptive electronic score has been replaced by original FusionFall recordings; see the soundtrack section below. It requires no streaming service. Breath sounds are authored filtered-noise envelopes, rather than recovered character dialogue. The original regional tracks now provide the score, without added synthesized instruments. Voices duck the music, with independent saved music/effects/voice controls.

`tools/extract-personality-audio.py` adds 281 unmodified original clips from the existing read-only FusionFall cache: summon and power variants for 39 Nanos, hero/avatar hurt variants, and three Samurai Jack exertion grunts. The five Nanos without matching cached recordings remain animated without invented dialogue. Generic avatar hurt recordings cover heroes without a matching named hurt clip. Original ownership applies; each file is recorded with its source path and byte size in the audio manifest.

`dist/hero-arms.js` extracts the selected hero's actual textured arm/hand triangles by skin-weight ancestry. Original ready-pose geometry is baked and adapted to the authored FPS joint intervals and weapon grips, with sleeve boundary vertices constrained to those intervals. Source models, textures and full-body rigs remain unchanged. All 24 hero selections are checked. Wilt retains his source model's missing hand. This is an FPS adaptation of the existing hero assets, not newly recovered original first-person animations. Idle/cast Nano clips now also support summon, observation, celebration and concern gestures, selected only when the original clip exists.


## Original FusionFall soundtrack

The generated score has been replaced by six unmodified original Ogg/Vorbis recordings from `lobbymusic_2eresourceFile` and `pastmusic_2eresourceFile` in the existing local FusionFall cache. `tools/extract-original-music.py` copies the original bytes without transcoding. `dist/assets/music-original/catalog.json` records source paths, bundles, SHA-256 checksums, sample rates, durations and ownership for Main Theme, Tech Center, Suburbia, Woods, Reactor Works and Midtown. Original ownership remains with the original rights holders.

The menu uses Main Theme. Map associations are authored adaptations: Dexlabs Bunker uses Tech Center, Sector V uses Suburbia, Camp Kidney uses Woods, Salvage Yard uses Reactor Works, and Original City uses Midtown. These choices do not claim that the adapted maps used those songs in the original game. Tracks are loaded on demand with at most two decoded buffers cached, looped, and crossfaded when switching maps/menu. The procedural music oscillators have been removed. Player breathing remains procedural; recovered voice and effect recordings are unchanged.


## Forty-firearm arsenal

`tools/extract-weapon-roster.py` adds 30 original models and their original table-selected skins to the ten existing firearms. `dist/assets/weapon-roster.json` retains item IDs, mesh paths, texture names, firing-sound associations and the SHA-256 of the cached original XDT source. `dist/weapon-roster.js` shares the authored FPS balance between the browser and authoritative multiplayer. Forty distinct source paths and forty distinct geometry fingerprints are checked; recolors do not inflate this count. Seventeen original firing-sound families now serve the roster. Original names, shapes, skins and sounds are retained; damage, magazines, reloads, ADS, recoil and first-person hand fitting are adaptations.

`python tools/review-runtime-scene.py --weapons-only` reviews all forty actual guns with original textured hero hands. It generates the full atlas plus `docs/arsenal-review.jpg`. The images use approximate software lighting and do not establish live WebGL quality.

## Native browser soundtrack playback

The preserved original Ogg files remain unmodified. `python tools/prepare-browser-music.py` uses development-only NumPy, SoundFile and lameenc to create peak-limited, normalized 128 kbps MP3 playback copies. Run it after re-extracting original music. Catalog metadata records output hashes, gains and measured decoded RMS. These files require no Python or codec library on Vercel.

Music now uses an HTML media player directly, independently of the effects/voice Web Audio graph. Playback begins from trusted input, settings expose native playback controls and a real track clock, and autoplay/network errors can be retried with Play Music. `/audio-check.html` auditions the same files without the 3D engine. The local host supplies audio/mpeg and byte ranges for seeking; Vercel serves the checked-in static MP3s.
