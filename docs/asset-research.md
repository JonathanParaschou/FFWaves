# FusionFall source references

Primary data: https://github.com/OpenFusionProject/tabledata/blob/master/xdt.json

Extraction reference: https://github.com/dongresource/UnityPackFF

`fusionfall-reference.json` records verified Nano names, original power names, IDs, model and texture roots, and selected original weapon/enemy mappings. Browser FPS cooldowns, damage values, ammo magazines, purchasable upgrades, and enemy roles are adaptations for this game.

Selected Nano powers are Buttercup / Miss Fire (cone stun), Eddy / Jawbreaker Break (self heal), and Dee Dee / Ponypuff Pirouette (area damage). Bubbles is not a healing Nano in the primary data.

UnityPackFF documents .kfm to .obj and .psd to .png extraction. Its README warns that imported OBJ axes may need Forward/Up adjustment and normals may require clearing custom split normals. Model bounds/orientation must be checked on actual exported geometry. Nano icon references are atlas indices, not standalone image URLs: Buttercup icon 34, Eddy 20, Dee Dee 17, all icon type 1.

Downloaded raw table data is retained only at `.tools/research/xdt.json`, outside runtime assets. The game does not require raw tabledata or the original cache at runtime.
