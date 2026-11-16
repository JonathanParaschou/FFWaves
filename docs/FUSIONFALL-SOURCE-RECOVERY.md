# Original combat textures and placed map section

These exports come from the existing local FusionFall Unity Web Player cache, opened read-only through UnityPackFF. They retain original art ownership. Neither script changes the game installation or the shared browser mesh manifest.

## Combat textures

Run `python tools/extract-combat-fx.py` to reproduce `dist/assets/combat-fx-catalog.json` and the sixteen PNGs in `dist/assets/fx-original/`. Original RGBA pixels are retained, with Unity vertical orientation converted to the convention already used by the mesh exporter. PNG storage is lossless. Every catalog entry records the original container path, source bundle, dimensions, alpha range, corner pixels and blending guidance.

The 128px muzzle-shot and muzzle-scatter images are original white bursts with transparency. Impact-star and impact-ring are blue-white glints. Projectile is an elongated white streak; mega-projectile is an orange fireball. Nano-fire is a flame texture, while dust is a green particle cloud. RGB-on-black textures such as impact-burst and the energy lightning variants require additive blending. The 32px laser image is a horizontal scanline strip suitable for a stretched beam quad. Original `point_002.dds`, exported as spark, is visually a bubble rim and is suitable for an energy halo.

The smoke texture has original alpha zero throughout. A normal alpha-multiplied SpriteMaterial will not show it; use an RGB-driven additive shader or omit it. The campfire image is a **six-column, four-row, 24-frame** flipbook, not one flame. Its cell UVs must be selected explicitly. These details were checked against a rendered contact sheet at `.tools/combat-fx-contact.png`; the contact sheet is QA output only.

## Real placed map data

`map_5f04_5f04_2eunity3d/BuildPlayer-Map_04_04` is a cached built scene, separate from the shared resource bundles previously indexed by the project. It contains 13,779 serialized objects, including 3,868 GameObjects and 2,048 enabled mesh renderers. The recovered scene root has original world anchor `[2048, 0, 2048]`.

Run `python tools/recover-map-section.py --crop 150,300,230,390` to reproduce:

- `dist/assets/map-sections/map-04-04-placements.json`: 3,867 child nodes and 2,048 renderable mesh placement records. Root translation is omitted from each matrix and retained separately. X is reflected into the browser's right-handed coordinate basis, with column-major matrices.
- `dist/assets/map-sections/original-city-block.json`: a bounded selection of the original scene's placed meshes, normalized and grounded as one standard runtime model.
- `dist/assets/map-sections/catalog.json`: independent model/texture metadata and selected original placement records.
- `dist/assets/map-sections/textures/`: twenty-eight original texture conversions referenced by the model.

The selected section has **59 mesh parts, 15,461 triangles**, and bounds approximately **95.14 x 172.53 x 177.61** source units. It includes a tall technology/city-hall-style tower, a fountain and an adjacent city building, with platform and zipline pieces. Their relative positions, scales and rotations come directly from the original scene; the exporter applies only cropping and normalization. It is appropriate as a distant skyline section beyond the playable boundary. It contains no terrain or survival navigation and does not constitute a playable original map port or establish that Map_04_04 was Sector V. A software-rendered QA preview is at `.tools/original-city-block-preview.png`.

All texture references and mesh attribute/index counts were validated after export. The scripts intentionally leave shared manifest integration to the main game owner.
