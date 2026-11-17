# Map design and source references

The main rebuild is **Dexlabs Bunker**, derived directly from a pinned NZ:P Nacht source map. The source packet preserves geometry, measured floor plans, barriers, room graph and camera checkpoints. Read the [map-reading workflow](docs/MAP-READING-WORKFLOW.md) and use `/map-reader.html` for structural review. Runtime rendering, collision, floor layers and navigation all share source geometry.

The four older maps below are **legacy prototypes**. They are hidden by default in deployment selection; they are not the basis for the rebuild.

Sector V, Camp Kidney and Salvage Yard are authored survival arenas using original FusionFall art. Each combines open circulation space, tighter cover routes, two-door interiors, climbable upper surfaces and supplies that require leaving a comfortable holding position. Original City is a fourth map recovered from the original game scene.

## Original City: recovered original region

This 128×128 metre playable crop preserves original Map_04_04 terrain, street floors, buildings, props and source scale. Scenery is not rearranged into a new arena. Rendering extends beyond the playable crop, keeping intersecting meshes intact. Original mesh floors supplement terrain heights so players stand on source sidewalks and plazas rather than their underlying depressions. A connected outdoor navigation mask uses source collider bounds and terrain gradients; this is conservative collision, not the original Unity controller or a promise that every original interior is accessible.

Six street entrances supply enemies. Thirteen added survival fixtures distribute ammunition, wall guns, armor, power, the supply box, the forge, Nano recharge and extraction across clear original surfaces. The source region starts open; power still gates the forge and extraction requires wave 10. Geometry ray checks compare rendered source floors with navigation heights at all gameplay positions, while flow-field checks verify supply and spawn reachability. See [source and reproduction details](docs/NATIVE-CITY-RECOVERY.md).

## Specific Call of Duty references

[Activision's Liberty Falls guide](https://www.callofduty.com/guides/blackops6/zombies/call-of-duty-guides-black-ops-6-round-based-zombies-liberty-falls) describes branching early paths, rooftop traversal between major routes, an upgrade destination reached by progressing through town, and extraction after round 10. The applied design judgment here is to connect elevated positions back into a loop and put progression resources away from the starting area. These maps use ramps instead of ziplines. The revised routes connect recognizable rooms and courtyards, with an exposed route and a more constrained alternative around the same destination.

[Activision's Terminus guide](https://www.callofduty.com/guides/blackops6/zombies/call-of-duty-guides-black-ops-6-round-based-zombies-terminus) describes staged power progression, alternative approaches with different supplies, and confined passages leading toward an upgrade destination. The applied design judgment here is a three-stage resource journey with two approaches per unlock, covered supply rooms, and open areas interspersed with constrained routes. Neither source establishes a formula for dimensions, density or difficulty; those choices are authored for this browser game and its four-player LAN mode.

## Spatial revision

The earlier arenas used small isolated buildings in broad rectangular clearings. This revision changes the circulation and enclosure: walls and rooms define the routes, paths follow those routes, and props support the activity of each place. The design aims to alternate broad space for gathering a horde with shorter, constrained transitions for resupply and progression. It retains two approaches to each gated sector and two ramps to each upper circuit.

The 4-7 metre marked routes use straight segments so their markings do not swing through buildings. Every segment is checked for a continuous walking surface with a 0.6 metre radius. Twelve covered rooms have two opposing entrances, with 4.2-6 metre doorways. These are deliberate pressure points, not safe camping rooms: enemies can use both entrances. Door headers and roofs block shots without blocking movement underneath. Detail such as windows, lintels, awnings, pipe runs and conveyor supports ties the shell to its function. Repeated trim/windows use instancing to limit additional draw calls.

## Sector V: Rooftop Relay

The south shop street leads into fountain square. Jelly Arcade forms the plaza's eastern edge and gives a covered alternative to the open square; the maintenance roof supplies a third route with elevation. The two reactor entrances lead to a depot forecourt and reactor court, separated by a wall return rather than a single open yard. Reactor Control houses the power console. The transit depot remains a covered supply run. The upper monorail route now leads through Relay Hall, with a narrow outside bypass. Continuous nearby town frontage encloses the street, while distinct paving, awnings and signs explain the public/service spaces.

## Camp Kidney: Canopy Crossing

The fire clearing, mess hall and scout lookout define the camp. Solid rock-lined creek banks make the two bridges meaningful crossings; players and enemies must use them. The ranger station serves the southern watch trail, while the boathouse connects the northern approach. The raised watch platform still has two access ramps. Lookout Lodge anchors the canopy destination. Rock shoulders, vegetation grouped on banks, timber frames and trail signs replace the impression of separate cabins scattered across a lawn. The north scout ramp was shortened to leave a usable turning space at its foot.

Pack Arachnids and Wild Stingers are explicitly named in primary Camp Kidney mission data. Spider Toads and Ghoulish Growths are broader Wilds reinforcements. Canyon Stalkers may join later surges. Guest placements are adaptations, not claims about original Camp Kidney spawns.

## Salvage Yard: Furnace Circuit

The dispatch control bay opens toward two press lanes divided by maintenance buildings and a baffle wall. The low scrap overlook reconnects through its two ramps. Sorting Hall contains the supply box, requiring entry into a covered space instead of a stop in an empty yard. Loading Dock frames the southern apron; the north apron remains clear of the crane ramp. Furnace Control anchors the upper circuit. Continuous conveyor runs and adjoining industrial frontage make these spaces read as one plant. Large decorative wrecks without collision were removed from the traversal floor; key wrecks remain deliberate collision/cover volumes.

Crash Loader, Scrap Tyrant and Junkasaurus Wrecks are supported by original salvage/junk-yard mission and spawn evidence. Shocktanglers fill an adapted ranged role; later surges may bring Dread Heads, Unisickles and Streetgrinders as industrial reinforcements. Source identities and habitat limits are recorded in `dist/assets/biome-kit.json`.

## Functional constraints and verification

All 18 ramps share endpoints between scene geometry and physics. Flow-field links reject cliffs, so enemies climb connectors. Player drops preserve world height while gravity resolves the fall. Upper and lower levels do not share melee range or interaction prompts. Ranged projectiles pass over low cover and collide with raised floors. Interior wall segments leave opposing exits open. All marked route centerlines, room entrances and through paths are verified, alongside the existing spawn/station reachability tests.

Automated checks traverse spawn routes, verify every ramp centerline, reach each upper tier, enforce locked-sector boundaries, assemble scenes from extracted meshes, and compare rendered ramp intersections with navigation height. Browser access remains unavailable, so these checks do not establish final visual composition, frame rate or human play feel. Localhost is the playable review build.
