# FusionFall: Last Signal

A browser wave-survival FPS with 24 original FusionFall heroes, 20 accessories,
44 Nanos, ten guns, three melee weapons and original effects. The main map is now
Dexlabs Bunker, a measured Nacht reconstruction; four earlier maps remain as
optional legacy prototypes.

Choose **Deployment > Dexlabs Bunker**. Its architecture comes directly from
NZ:P's published Nacht source, preserving both floors, the two staircases,
openings, three barriers and original weapon anchors. FusionFall materials,
weapons, Nanos and survival services supply the adaptation.

Open `/map-reader.html` on the running server for floor sections, clearance,
progression routes, source overlays and eye-level checkpoints. See the
[map-reading workflow](docs/MAP-READING-WORKFLOW.md).

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
| Environment variables | None for solo; `MATCHMAKING_URL` for online |

The build checks the source and runs the automated tests, then publishes the game
and all its assets. No game build tool, database or API key is required.

This project has over 1,000 files. GitHub Desktop or a normal Git push is the
easiest way to upload the complete folder. GitHub's browser uploader accepts up
to 100 files at a time:
https://docs.github.com/en/repositories/working-with-files/managing-files/adding-a-file-to-a-repository

## Multiplayer

Online private four-player rooms are included. Choose **Multiplayer > Online**, create a party and share its one-use invite. Codes expire after ten minutes and rotate after each successful join. Players can reconnect for 20 seconds. Each party has its own authoritative match and map.

Push this repo and deploy the included `render.yaml` as a Render Blueprint to serve both the game and multiplayer. To keep the Vercel game URL, set `MATCHMAKING_URL` in Vercel and `ALLOWED_ORIGINS` on the room server, then redeploy. Full instructions and lifecycle limits are in [ONLINE-MULTIPLAYER.md](ONLINE-MULTIPLAYER.md). A static client upload alone does not provision the shared game service.

`npm start` also retains local LAN co-op at the host's printed network address. `npm run build` prepares the client configuration and runs all checks. `Dockerfile` provides another hosting option.

## Controls

WASD move; Shift sprint/stand from crouch; C crouch/slide; Space jump;
mouse aim; left/right click shoot/ADS; R reload; G swap gun; V melee;
1/2/3 select Nano; Q ability; F interact/hold to revive; F5 or H camera;
Tab map; Escape menu.

See [DEVELOPMENT.md](DEVELOPMENT.md) for the full game documentation and
[ASSETS.md](ASSETS.md) for original art provenance and ownership.
