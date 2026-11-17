# Playable original city region

`dist/assets/native-city/` contains a playable crop of the original cached FusionFall scene **Map_04_04**, rather than a new arrangement of individual props. The export includes original TerrainData, original street/building/prop meshes at their source transforms, source materials, and conservative collision data. It does not claim to be an exact port of Sector V or recover the original game's missions and game logic. Survival rules and supply placements are separate overlays.

## Reproduce

Run `python tools/export-native-city.py` from this checkout. The script reads the user's existing Unity Web Player cache at `%USERPROFILE%/AppData/LocalLow/Unity/Web Player/Cache/FusionFall`. It uses UnityPackFF and Python packages from `.tools/`, falling back to the sibling development directory `../fusionfall-survival/.tools/` when necessary. The cache and game installation remain read-only. Original art retains its original ownership.

The exact source is `map_5f04_5f04_2eunity3d/BuildPlayer-Map_04_04` with TerrainData `generateddongs/terraindata_04_04.asset`. The original scene root has world anchor `[2048, 0, 2048]`. The playable crop covers original tile-local X128..256 and Z320..448, preserving the source unit scale. Rendering extends sixteen metres beyond every playable edge, and intersecting original meshes remain intact rather than being cut across their façades.

The common coordinate conversion is:

```text
gameX = 192 - originalLocalX
gameY = originalLocalY - (-50.163273...)  // exact value is in navigation.normalization
gameZ = originalLocalZ - 384
```

The X reflection matches the rest of the runtime. UnityPackFF MeshData already reflects X in local mesh vertices, so the exporter applies `R * M * R` to those vertices, equivalent to `R * M * originalVertices`. The same conversion is used for source colliders. The exported model is already in navigation coordinates: render it at **position(0,0,0), scale1**. Do not recenter or normalize it again according to its tall skyline bounds.

## Runtime files

- `catalog.json`: dedicated model/texture/source catalog. Logical model ID is `original-city`; model URL is `assets/native-city/scene.json`.
- `scene.json`: 188 parts, 108,538 triangles. This includes 187 source scene mesh renderers plus a regular mesh reconstructed from original TerrainData. GameObject activity, inherited parent activity and MeshRenderer enabled state are respected. Missing/zero mesh normals are reconstructed; invalid remaining normal arrays are omitted so the runtime may compute them.
- `ground.webp`: 1024px composite of seventeen original splat layers at their original tiling and weights, with the original terrain lightmap supplying shade. This adapts the source terrain shader into one browser texture; it is not hand-painted ground art. Sixty-seven original texture entries are referenced in total.
- `navigation.json` and `navigation.js`: identical synchronous data; the latter is `export default <JSON>;` for shared browser/Node consumption.

## Terrain and original floors

Original TerrainData has 129x129 integer height samples over512x512m, spacing4m and height scale600m. Its source Transform translates terrain Y by-300m; the sample integers use normalization32767. This aligns the source street meshes and terrain at approximately-50.16m before normalization. These values are read from the actual source data.

Runtime navigation uses a129x129 grid at one-metre spacing within bounds X/Z-64..64. Both height arrays are row-major. Grid coordinates are `column=(x-originX)/cell`, `row=(z-originZ)/cell`, with originX/Z-64, cell1. Triangles use `[a,c,b],[b,c,d]`, where a=NW,b=NE,c=SW,d=SE. The larger161x161 rendered terrain mesh uses exactly the same resampled source heights and triangle diagonal.

Some source plazas and sidewalks are separate meshes over depressed terrain. `terrainHeights` retains untouched, bilinearly resampled TerrainData. `heights` additionally samples upward-facing source floor triangles near street level, excluding roofs higher than2.4m above the normalized street datum.412 grid samples use259 such original triangles. Actual original floor meshes remain at their source positions. Forty-four source parts with near-ground floors have `floorOverlay:true`, allowing a material depth bias for coplanar surfaces without moving source vertices.

## Navigation and gameplay points

The `blocked` array uses the same grid/indexing as heights. It conservatively projects actual non-trigger source MeshCollider AABBs at operative height, adds body clearance, rejects source terrain gradients steeper than the controller can traverse, and keeps the largest connected outdoor component. It does not invent walls or fences. The final component has6,263 walkable cells. Buildings represented by coarse source collider bounds may be less permissive than their visible façades; this approximation avoids sending enemies into inaccessible original buildings.

Eighteen `obstacles` records retain source object IDs and normalized AABBs as `{id,sourceObjectId,x,z,w,d,h,base,baseOffset}`. `base` is absolute normalized world Y; baseOffset is relative to the source floor at the box centre. They support conservative line-of-sight and damage checks. Floors and overhead-only transport pieces do not become ground-level walls.

`points` supplies one start, six distributed street-entrance spawns and thirteen clear station candidates. Each includes a source position and measured clearance. They are authored survival choices on existing original surfaces, not original game spawn claims. The start is `(38,-12)` with yaw0. A full source collision/terrain plan is generated at `qa/native-city-plan.png` for inspection.

## Verification

Run `python tools/validate-native-city.py`. The checker verifies every mesh index, UV/normal count and texture reference. It casts downward through the exported geometry at the start, all six spawns and all thirteen station candidates; all twenty points match their navigation heights with zero measured error. The resampled terrain samples also match rendered terrain vertices with zero measured error. Evidence is written to `qa/native-city-validation.json`. These geometric checks do not replace an in-browser composition or frame-rate review.
