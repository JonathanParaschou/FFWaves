# FusionFall: Last Signal

A browser wave-survival FPS with 24 original FusionFall heroes, 21 accessories,
44 Nanos, forty guns, three melee weapons and original effects. The main map is now
Dexlabs Bunker, a measured Nacht reconstruction; four earlier maps remain as
optional legacy prototypes.

Open **Play**, choose Solo or Private co-op, and use the selected arena card to choose **Dexlabs Bunker**. Its architecture comes directly from
NZ:P's published Nacht source, preserving both floors, the two staircases,
openings, three barriers and original weapon anchors. FusionFall materials,
weapons, Nanos and survival services supply the adaptation.

The bunker now has coordinated intake, containment and observation equipment,
original DexTech campus scenery, and shared physical workcells. See the
[asset audit and map art review](docs/FUSIONFALL-BUNKER-ART.md) for the original
model selections, intentional additions and current verification limits.

Open `/map-reader.html` on the running server for floor sections, clearance,
progression routes, source overlays and eye-level checkpoints. See the
[map-reading workflow](docs/MAP-READING-WORKFLOW.md).

Enemies now block movement, ranged attacks have visible charged projectiles, and
the forty-model roster changes as waves progress. Open the Field Manual's
**Enemy field guide** or `/bestiary.html` to inspect the selection and search the
complete cached source-table roster. See [enemy systems and provenance](docs/ENEMY-ROSTER.md).

First person shows hands and weapons. Press **F5** or **H** for your full hero
body and accessories in third person.

## Deploy from GitHub to Vercel

1. Extract this ZIP. Add the extracted contents to your GitHub repository.
   `vercel.json`, `package.json` and `dist/` must be at the repository root.
   Upload the files, not the ZIP itself.
2. In Vercel, choose **Add New > Project**, import that repository, and select the
   repository root as the **Root Directory**.
3. Use **Other** for the framework preset and deploy. Settings are already in
   `vercel.json`:

| Setting | Value |
| --- | --- |
| Node.js | 24.x |
| Install command | `npm ci --ignore-scripts` |
| Build command | `npm run build` |
| Output directory | `dist` |
| Environment variables | `REDIS_URL` from Vercel Storage for online; none for solo |

The build checks the source and runs the automated tests, then publishes the game
and all its assets. No game build tool, database or API key is required.

This project has over 1,000 files. GitHub Desktop or a normal Git push is the
easiest way to upload the complete folder. GitHub's browser uploader accepts up
to 100 files at a time:
https://docs.github.com/en/repositories/working-with-files/managing-files/adding-a-file-to-a-repository

## Multiplayer

Online private four-player rooms are included. Choose **Multiplayer > Online**, create a party and share its one-use invite. Codes expire after ten minutes and rotate after each successful join. Players can reconnect for 20 seconds. Each party has its own authoritative match and map.

Vercel serves both the game and online room endpoints. Connect Redis through the Vercel project's **Storage** tab, ensure `REDIS_URL` is available, then redeploy. No Render service or `MATCHMAKING_URL` is needed. Include `api/` when pushing. Full setup, persistence, limits and verification are in [ONLINE-MULTIPLAYER.md](ONLINE-MULTIPLAYER.md).

`npm start` retains local private parties and LAN co-op without Redis. `npm run build` prepares client configuration and runs checks. Render/Docker hosting remains an optional alternative.

## Controls

WASD move; Shift sprint/stand from crouch; C crouch/slide; Space jump;
mouse aim; left/right click shoot/ADS; R reload; G swap gun; V melee;
1/2/3 select Nano; Q ability; F interact/hold to revive; F5 or H camera;
Tab map; Escape menu.

See [DEVELOPMENT.md](DEVELOPMENT.md) for the full game documentation and
[ASSETS.md](ASSETS.md) for original art provenance and ownership.


## Main menu

Play opens directly into the lobby. Choose Solo, Private co-op or Local network, review the selected arena and equipped kit, then use the primary action. Operative, Weapons and Nanos are separate tabs. Unapplied operative previews offer Apply, Discard or Keep editing before leaving. Network modes display service availability and the actual party roster; only a host can choose the arena and deploy a party.

See [menu design notes](docs/MENU-DESIGN.md) for references, interaction decisions and verification limits.


The Weapons screen includes the full 40-firearm library, class filters and acquisition details. Six sidearms can be equipped in the starting kit; all forty guns can roll from the supply box.

Original FusionFall music uses the browser's native player. Click once to enable sound, or open Settings and press **Play Music**. Settings shows the playing track and clock. For a direct soundtrack test without loading the game, open `/audio-check.html`. See [the arsenal and music notes](docs/ARSENAL-AND-MUSIC.md) for source provenance and validation.
