# Project working rules

## Map changes

Read `docs/MAP-READING-WORKFLOW.md`, `MAP-DESIGN.md`, and the selected map's source packet before changing level geometry. Dexlabs Bunker is the main rebuild; earlier arenas are legacy prototypes.

For a new map, first record a real reference, pinned source revision, unit conversion, measured floor plans, room/portal graph, elevations and eye-level camera checkpoints. Preserve the structural shell and original spatial relationships when making a faithful reconstruction. Record intentional changes separately. Surface and prop substitutions need semantic roles and source anchors.

Rendering, collision, floor selection, navigation and map sections must use the same spatial data. Overlapping floors require separate surface heights. Independent barriers must stay independent in solo and LAN. Test physical traversal of each staircase with its alternative route closed, source entrance-to-player routes, supply access, and cross-floor combat.

Use `/map-reader.html` to inspect floor sections, clearance, progression routes, source geometry overlays and eye-level views. Keep `docs/reference/` source packets and licenses current. For material edits, regenerate the offline geometry review with `python tools/review-reference-geometry.py` and inspect the result. The exported source geometry remains at scale 1 in normalized coordinates.

Run `npm run check` and `npm test` for runtime changes. Use `npm run review:map` for source geometry and traversal audits. The Python review tools use NumPy and Pillow. They are optional developer tools; the deployed game needs only the checked-in static assets.

Review live WebGL composition and gameplay when browser access is available. When it is unavailable, inspect the measured plans and labeled offline eye-level views, and report the remaining visual/performance verification gap. Passing navigation tests does not establish visual quality. Retain the same checkpoints across iterations so changes can be compared.

## Delivery

Work in this Git checkout. Preserve hero customization, weapons, Nanos, movement and LAN behavior when rebuilding a map. Keep the locally hosted review build available when requested. Update `tools/package-vercel.py` output for an upload bundle; include this file, source provenance and applicable licenses. Do not push or deploy to external accounts unless the user requested that action.
