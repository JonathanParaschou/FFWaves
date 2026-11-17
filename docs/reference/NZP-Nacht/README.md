# Measured reference: NZ:P Nacht

This snapshot comes from the NZ:P Team's published Nacht der Untoten recreation
for **Nazi Zombies: Portable**. It is an actual playable game's map source, not
original Treyarch source and not a claim that every dimension matches the CoD
release. The reconstruction retains this published source's geometry one-to-one.

- Project: <https://github.com/nzp-team/assets>
- Map: `source/maps/ndu/ndu.map`
- File revision: `e147b116b2ade3920193a5b8839f6cc7e46da4a4`
- Source SHA-256: `e6ab600be27a3eb3981ae4bbbe7a88c65e4c5b06936428ca8d13ca3d76cf7f88`
- Attribution: NZ:P Team. Original source header and license are retained.
- Source and derived geometric data: **CC BY-SA 4.0**; see [LICENSE.md](LICENSE.md).
- Adaptations: coordinate conversion, mesh triangulation, navigation sampling,
  FusionFall material substitutions, and survival equipment/rules. The source
  layout, angled walls, door openings, stair treads and rubble are retained.

The CC license applies to the source map and its derived geometric data. It does
not relicense independently supplied FusionFall artwork or game code.

## Read the layout

Use [lower-plan.png](lower-plan.png) and [upper-plan.png](upper-plan.png) together.
Both use identical coordinates, orientation and scale. This matters: drawing
both floors on one flat minimap hides the two staircases and makes doors appear
to connect unrelated spaces.

- **A / Spawn hall**: the long lower wing containing source player start. Five
  window entrances define pressure around the hall, and two wall weapons are on
  its original walls.
- **B / Help and box room**: the lower wing beyond original gate 2, containing
  source mystery-box entity 3 and another three window entrances. Its rear
  staircase is a second route to the upper floor.
- **C / Upper floor**: an upper landing over the spawn hall joins an upper
  holdout above the Help room. Four upper windows, source rubble, columns and
  partial walls define distinct sightlines. Two staircases form the original
  vertical loop once their separate debris gates are opened.

Gate 2 connects A to B. Gate 110 obstructs the spawn-hall stairs. Gate 111
obstructs the Help-room stairs. These are **three independent source doors**;
they should not be replaced by an arbitrary three-sector north/east unlock.

The plans are generated from source convex brush cross-sections at standing
chest height, with source floors and a multi-floor navigation overlay. No room
outline is manually redrawn. Markers identify original entity IDs; labels A/B/C
are interpretation aids and not original gameplay claims.

## Coordinate contract

```text
game x = (source X - 1248) * .025
game y = (source Z -   48) * .025
game z =-(source Y - 2048) * .025
```

The rigid axis conversion preserves orientation, and the uniform unit conversion
uses NZ:P's documented 72-unit standing hull as 1.8 metres. See the player-hull
definitions in the [upstream shared definitions](https://github.com/nzp-team/quakec/blob/main/source/shared/shared_defs.qc).
The two main source floor heights are 48 and 192 units: **0 and 3.6 metres** after
conversion. Source player origin is above the floor and should settle onto it.

World faces, source point entities, collision planes and navigation nodes all
use this transform. Rendering must use position `(0,0,0)` and scale 1. Recentring
the mesh using its outdoor bounds would destroy agreement with navigation.

## Runtime export

Run `python tools/export-reference-map.py` to regenerate:

- `dist/assets/reference-bunker/catalog.json`: a dedicated model catalog.
- `geometry.json`: 194 render batches grouped by original entity and material.
  Each carries `sourceEntityId`, `sourceMaterial`, `sourceFaceIds` and optionally
  `doorEntityId`. Rendering excludes invisible tool textures, while their source
  collision data remains intact.
- `data.json` and `data.js`: identical data, the latter as an ES-module default
  export. All 432 source entities, 760 brushes and 4,250 source faces remain
  identifiable. `floors` lists source face IDs with upward, solid surfaces.
- `nav`: a 0.25-metre, multi-floor graph with 16,521 connected nodes. Every column
  can contain multiple independent floor nodes. Doors are omitted from static
  connectivity so runtime can apply their independent unlock states.

Each convex brush has `planes: [[nx,ny,nz,d], ...]`, always oriented outward.
Inside means `nx*x + ny*y + nz*z <= d`. `min`/`max` are broad-phase bounds only;
they are not replacements for the angled planes. Nonphysical entity classes
(triggers, illusionary effects) have `solid: false`; source doors have
`movable: true`. All face polygons retain source UV axes/scales as `uvBasis`.

Navigation samples the actual source floor polygons, rejects obstructed standing
body volumes, and checks links across walls at three intermediate positions.
Its static clearance uses radius 0.35m, height 1.8m and 0.45m step clearance; links
allow a maximum 0.36m rise. Source door collision must still block live movement,
shots and path selection until the matching source door opens. Outer ground is
excluded by connectivity from the original indoor spawn. This graph does not
flatten overlapping lower and upper floors into one heightmap.

## Fidelity checks

The exporter intersects the source half-spaces and refuses invalid source
brushes rather than silently replacing or dropping them. Mesh triangles derive
from those same source polygons. Validate normal/winding agreement, per-plane
residuals and source-coordinate round trips before changing the importer.
Inspect both plans when editing gameplay placement. Wall guns should use source
weapon-wall anchors; enemy entrance points should use the inward side of source
barricades; a new supply fixture must not occupy a door or stair landing.

These geometric guarantees establish agreement with the published source. They
do not establish final browser visual composition, frame rate or combat feel.
