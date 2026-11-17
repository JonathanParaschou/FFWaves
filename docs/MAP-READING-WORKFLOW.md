# Reading and rebuilding a reference map

The active rebuild is **Dexlabs Bunker**. Its structural reference is the published NZ:P recreation of Nacht der Untoten, pinned to a source revision and SHA-256 in [the provenance file](reference/NZP-Nacht/provenance.json). This is a match to that published reconstruction, not a claim of possessing Treyarch's original map. The four earlier maps remain legacy prototypes and are hidden from the normal deployment list.

## One measured spatial model

`docs/reference/NZP-Nacht/ndu.map` is the reference, rather than a remembered impression or a loose collection of props. `tools/export-reference-map.py` intersects its convex brush planes to recover real face polygons. The same polygons supply rendered architecture, exact convex collision, floor sampling, bullet/visibility rays, and architectural sections in the map reader. Movable barriers remain separate source entities.

The source standing hull is 72 units high. A uniform conversion of .025 metres per source unit makes it 1.8 metres, with no independent stretching of rooms to fit an arbitrary arena. The coordinate conversion is recorded alongside the export. Structural vertices, stair treads, angled rubble, window bays, posts and openings retain their source positions. FusionFall materials replace surface presentation. Original wall-gun and box anchors are retained; added survival services are identified separately.

## Read the plan in layers

Open `/map-reader.html` on the local server. Its sections are generated from actual solids at chest height, not generic room rectangles.

1. **Enclosure:** inspect the lower and upper architectural sections. Gray is a source solid; amber is an original barrier. Confirm room edges, openings, structural bays and recognizable destinations.
2. **Traversal:** turn on walking clearance. Each sample includes a floor height, standing clearance and links checked through source collision. The map has 16,521 samples and 6,196 columns containing overlapping floor layers. Two floors must never collapse into a single height map.
3. **Progression:** close all three barriers. The source graph is a triangle: Spawn Hall to Help Room via door 2; Spawn Hall to Upper via stairs 110; Help Room to Upper via stairs 111. Each is purchased independently. Open them and trace routes from spawn by clicking the plan.
4. **Sightlines:** use the six source-derived eye-level checkpoints. Review what a player sees before entering a doorway, how pillars divide a room, and where upper floors obscure lower rooms. The magenta source overlay checks structural silhouettes against the FusionFall presentation.
5. **Equipment:** purple marks a retained source anchor; cyan marks a new survival service. Props are retargeted only at existing source entity origins. Decorative substitutions that occupy the measured walking corridor are omitted. Random scattering and invented frontage are excluded from the rebuild.

The reader's cutaway, source overlay and route trace are review tools, separate from the combat UI. The game's minimap follows the player's current floor.

## Acceptance checks

```sh
npm run check
npm test
python tools/export-reference-map.py --validate-only
python tools/review-reference-geometry.py
```

The Python geometry audit uses NumPy and Pillow; it can read checkout-local Python dependencies or the sibling development cache. Re-exporting uses the checked-in MAP source. No installed Call of Duty game is required.

Reference tests enforce source hash and vertex identity, multi-floor movement/visibility/bullet separation, clear supply approaches, and actual physical traversal up and down both staircases with the other staircase closed. They walk all twelve window approaches to spawn and verify that enemies below an upper-floor player seek a stair route. LAN snapshots retain each entity's surface height and synchronize each barrier independently.

The exporter retains all 760 brushes and 4,250 source faces. Maximum rounded plane residual is .000032 metres. This is geometric evidence, not a visual-quality score.

## Visual review gate

After a structural change, revisit the same eye-level checkpoints with the same field of view. Check human scale, wall/ceiling intersections, openings, material repetition, contrast, floor readability and equipment clearance. Check walking, crouching, sliding, both stair directions and third-person camera pull-in. Use the actual game for final frame-rate and visual review.

Browser access was unavailable during this implementation. The measured plans and automated physical checks were inspected, but they do not establish live WebGL lighting, frame rate, or player perception. Offline geometry views, when generated, are labeled as such and use approximate lighting. Do not call a reconstruction visually approved based solely on reachable navigation.

## Rules for subsequent maps

Choose one pinned reference with usable geometry or a dimensioned floor plan. Preserve its room graph and measurements in a source packet. Build the shell, collision, floor layers and stair routes first; compare source sections and eye-level views before placing equipment. Surface and prop substitutions must keep the shell intact. Record intentional changes. Do not derive another biome by swapping props over the same generic three-sector template.

[Inspected runtime scene review](reference/NZP-Nacht/eye-review.jpg) now includes actual hydrated materials, furniture replacements, decorative props, fixtures, and contact shade. A ten-weapon viewmodel atlas is also generated in `qa/viewmodel-review.jpg`. The old shell-only review missed raised prop origins and camera-relative weapon framing; the complete scene is now the default review. Lighting and GPU shadows remain approximate in these software images.


## Asset integration constraints

Opaque brush surfaces use their original outward winding and front-face culling. Alpha-masked railings use an original FusionFall chain-link texture with alpha testing, preserving open sightlines. Material shader hooks must survive cloning in the map reader.

Source tree entity 176 and other outdoor anchors inside the bunker envelope are excluded from retargeting. Ground props are placed on measured support surfaces, rather than blindly using original model-center Y values. Source furniture entities 184, 185, 214, 215, 217, 263, 266, 275 and 337 have their visual shells replaced with textured FusionFall cabinets/crates while their original collision footprints remain intact. Cosmetic items are rejected if they intersect measured standing clearance; mounted displays stay above head height. Conduits and lamps are attached to actual source walls and light anchors. Contact shade and floor seams supply grounding without collision changes.

First-person gun placement uses per-weapon trigger/support anchors and a camera-clear rear extent. Validate actual mesh projections through idle, aim, sprint and reload states. Visual projectiles originate from the rendered muzzle; damage rays retain camera aim and the same analytic source collision used by LAN.
