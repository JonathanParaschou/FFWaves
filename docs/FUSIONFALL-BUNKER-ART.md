# DexTech research annex art pass

The bunker keeps its pinned NZ:P Nacht shell, original dimensions, all three
independent barriers and both staircases. This pass gives the rooms a shared
research-annex purpose while preserving open combat circulation. It adds
intentional equipment footprints, not structural rooms or rearranged source walls.

## Assessing the available library

`python tools/audit-environment-library.py` indexes every **present** local
FusionFall CustomAssetBundle, one environment at a time. The scan found 351 cache
directories but only 181 actual bundle files; all 181 indexed successfully. Their
91,508 container entries include 1,503 unique `map/` GameObjects. Empty or missing
bundles are not counted as recovered art. This is the complete available local
cache, not a claim to have the full remotely downloadable game.

The inventory was filtered by laboratory, technology, maintenance, storage and
research roles. `python tools/extract-bunker-kit.py --review` extracts and renders
39 candidates with their original dimensions and textures. The inspected
[candidate atlas](reference/NZP-Nacht/bunker-asset-review.jpg) shows why filenames
alone are insufficient: the office chair is actually a park bench, the control
panel is a paper map, and the apparently colored pipe variants have mossy skins.
Wooden domestic furniture, pirate chests, oversized plant machinery, outdoor
pipework and static humanoids were rejected. Humanoid scenery could obscure
enemy recognition. A standing kiosk is not shrunk into a miniature desk monitor.

`python tools/extract-bunker-kit.py --publish` publishes 18 selected original
models and only their used textures. [The kit manifest](../dist/assets/bunker-kit.json)
records original paths, dimensions, triangles, inventory scope and rejection
reasons. Two reserve pieces (pump and barrel) are available in the kit but are
not scattered into the current map. The raw cache remains read-only. Detailed
working indexes and candidate extractions stay in ignored `.tools/library-review`.
The checked-in [map-model index](reference/NZP-Nacht/cached-map-models.json) preserves
the deduplicated source-path inventory for subsequent art selection.

The artwork retains its original ownership. Extraction does not grant a new
open-source license to FusionFall models or textures. The independent NZ:P map
license and source attribution remain in its [source packet](reference/NZP-Nacht/README.md).

## Spatial art direction

| Area | Equipment grouping | Source anchor IDs | Floor |
| --- | --- | --- | --- |
| Equipment intake | Maintenance and inspection workcells, clean steel lockers, shipping supplies and DexLabs sign | 199, 262 | 0 m |
| Containment / power | Containment pod on a machine pedestal, adjacent energy/cooling unit | 277, 274 | 0 m |
| Observation / control | Observation, diagnostics and relay workcells with instruments, robotics parts and service weapons | 321, 361, 334 | 3.6 m |
| Exterior campus | DexTech headquarters, tech building and communications dish beyond the playable shell | 260, 407, 257 | Exterior |

New placements preserve source entity IDs and original anchor coordinates for
review. The workcells are authored near those room anchors; they are intentional
equipment additions, not claims of original FusionFall or NZ:P prop placement.
Amber, teal and blue painted pads distinguish each area's servicing space.
The source's central circulation, window approaches and staircase landings stay
clear. No random placement pass or wholesale biome swap is used.

Eleven source furniture brush volumes receive clean original cabinets, low
lockers or cargo cases. Original collision remains in place. The old arbitrary
salvage/TV/barrel/tree substitutions are removed. Small instruments and shipping
boxes belong on benches or storage, not floating in the circulation space.
Twenty-four thin wall-attached conduit runs connect the architectural bays;
source lamp positions and contact shade ground the equipment. Floor panel seams
now repeat at 1.2 m. Equipment and architecture keep their original textures;
new markings and utility detail use restrained room colors.

## Rendering and physical agreement

`dist/bunker-dressing-plan.js` is pure shared data. It supplies visible item
extents, collision pieces, support surfaces, room labels, source links and the
three additional art-review cameras. Table collision separates its top, leg and
pedestal. The original shell is still the source of architectural collision,
floors, rays and navigation. `reference-fixtures.js` adds survival fixtures and
equipment consistently for solo and authoritative multiplayer.

Actor support includes the 0.35 m capsule footprint so falling off a desk beside
a chair does not strand a player inside the chair. Jumping onto a worktop and
dropping away conserve airborne world height. Navigation masks obstructed source
nodes and rejects links through equipment. A short collision-aware steering
probe lets enemies slide around a cabinet corner instead of oscillating near a
source graph sample. Both original stair routes and all twelve entrance routes
are physically tested, including each staircase with its alternative closed.

The current scene has 67 original prop placements, six equipment bays and 109
prop mesh instances rendered in 52 source-art batches. Density is concentrated
in useful workcells; raw object count is not the goal. Repeated props and painted
markings use instancing. These are construction counters, not measured GPU draw
calls or a frame-rate result.

## Review and remaining verification

Run `npm run build` and `npm run review:map`. The new art tests check source paths
and textures, source anchors/support, sampled shell intersections, visual versus
physical bounds, bullet hits, jump/drop behavior and instancing transforms.

`python tools/review-reference-geometry.py --rooms-only` regenerates the complete
runtime room review. The six baseline cameras are retained; intake, containment
and diagnostics views supplement them. The inspected
[nine-view sheet](reference/NZP-Nacht/runtime-room-review.jpg) includes actual
hydrated meshes and materials. Software light and shadows remain approximate.

Browser control was unavailable for this pass. Live WebGL composition, frame
rate and human combat feel still need a play session on the local build. The
offline views and traversal tests support this delivery but do not replace that
review. No external deployment is performed by packaging the repo.
