# FusionFall: Last Signal

A browser wave-survival FPS with 24 original FusionFall heroes, 20 accessories,
44 Nanos, three survival maps, ten guns, three melee weapons and original effects.

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
| Build command | `npm run check && npm test` |
| Output directory | `dist` |
| Environment variables | None required |

The build checks the source and runs the automated tests, then publishes the game
and all its assets. No game build tool, database or API key is required.

This project has over 1,000 files. GitHub Desktop or a normal Git push is the
easiest way to upload the complete folder. GitHub's browser uploader accepts up
to 100 files at a time:
https://docs.github.com/en/repositories/working-with-files/managing-files/adding-a-file-to-a-repository

## Multiplayer

The Vercel edition supports **solo play**. The LAN dialog explains that LAN
co-op uses a local host. To run it locally with Node.js 24:

```sh
npm ci --ignore-scripts
npm start
```

Open `http://localhost:4180`. Other players on the same network use the host's
printed LAN address. This package includes the complete local four-player server.

Internet co-op is not configured in this static deployment. Vercel supports
WebSockets, but reliable shared matches also require state/coordination across
its function instances or a dedicated game server.

## Controls

WASD move; Shift sprint/stand from crouch; C crouch/slide; Space jump;
mouse aim; left/right click shoot/ADS; R reload; G swap gun; V melee;
1/2/3 select Nano; Q ability; F interact/hold to revive; F5 or H camera;
Tab map; Escape menu.

See [DEVELOPMENT.md](DEVELOPMENT.md) for the full game documentation and
[ASSETS.md](ASSETS.md) for original art provenance and ownership.
