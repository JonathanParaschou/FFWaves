# Online parties

The repo now includes an actual authoritative WebSocket room service, not a LAN-only UI. A host creates a private four-player party, shares an eight-character invite/link, and chooses when to deploy. Each code admits one player, expires after ten minutes, and rotates after a successful join. Generate a new code to revoke an old invite. Codes are server-generated when the host requests one; they are not user passwords or accounts.

Rooms isolate players, maps, waves, inventory, enemies, damage and broadcasts. The server owns simulation at 60 Hz and sends snapshots at 20 Hz. A disconnected member has 20 seconds to reconnect with their session token, without another invite. Host privileges transfer to a connected teammate. Leave ends that member's reconnect permission. Closing the final seat destroys the room and invite. The service limits room count, connections, join attempts and message rates. It never lists private rooms publicly.

## Simplest deployment: serve everything from Render

1. Push this checkout, including `render.yaml`, `server/`, `server.mjs`, `dist/`, tests and documentation.
2. On Render choose **New > Blueprint**, connect this GitHub repo and apply `render.yaml`.
3. Leave `ALLOWED_ORIGINS` empty when playing on the Render URL. If Render asks for a value, use the game site's exact origin. There are no required API keys.
4. Open the resulting HTTPS service URL. It hosts the game and matchmaking together. Multiplayer works without editing client files or entering a server IP.

The included free-service configuration is for trying it out. Free services can sleep when idle; first connection can take time. A running, single-instance service is needed for uninterrupted matches. No service has been provisioned by this code change. Render supports inbound public WebSockets on the same service port: https://render.com/docs/websocket . Blueprint configuration: https://render.com/docs/blueprint-spec .

## Keep Vercel as the game URL

Deploy the server above first, then:

1. In Vercel's project environment variables, set `MATCHMAKING_URL` to the Render origin, e.g. `https://your-service.onrender.com` (no path). It is a public endpoint, not a secret.
2. On the Render service, set `ALLOWED_ORIGINS` to the exact Vercel origin, e.g. `https://your-game.vercel.app`. Separate additional trusted origins with commas; preview deployments need their own exact origins. No wildcard access is enabled.
3. Redeploy both projects. Vercel's build writes `dist/net-config.json`; the client discovers the server there. Friends open the Vercel URL or the host's invite link.

A static Vercel upload by itself does not provision this game's shared room process. Vercel now supports WebSockets in Functions, but this repo intentionally uses one persistent authoritative process so all party members reach the same room state. It does not claim instance coordination or persistence across function workers.

## Local checks and other hosts

`npm ci --ignore-scripts`, `npm run build`, then `npm start`. Open `http://localhost:4180`, select **Multiplayer > Online**, and create a party. Another browser/session can join with the code. **Local Network** retains the original single LAN party locally. The Render configuration disables that public legacy lobby (`ENABLE_LAN=false`); online rooms remain enabled. `Dockerfile` also packages the server and client; expose the chosen `PORT` behind HTTPS for public play.

`npm test` includes real WebSocket clients exercising room creation/joining, one-use invites, simultaneous maps, start/snapshots, reconnection, host migration, full rooms, expiry, origin rules and invalid joins. This verifies the local service; public internet latency and provider deployment still need verification after deployment.

Rooms and reconnect tokens live in memory. Use exactly one server instance; no horizontal autoscaling. Restarts/deploys end active rooms. Default capacity is eight concurrent parties (`MAX_ROOMS`), not a performance guarantee. Empty rooms are removed after their reconnect reservations expire, and lobbies expire after 30 idle minutes. No port forwarding is needed when using a publicly hosted service.


## If the game says online is not configured

Pushing the code deploys the static game on Vercel; it does not create the Render service. First deploy the Blueprint above, then copy that service's HTTPS origin into Vercel's `MATCHMAKING_URL` environment variable. Set Render's `ALLOWED_ORIGINS` to the exact URL you use to open the game. Redeploy Vercel after changing the variable, because the client configuration is written at build time. The value must be enabled for the Vercel environment you are playing in (Production or Preview).

To verify deployment, open `https://YOUR-GAME/net-config.json` and check that `matchmakingUrl` contains your room service origin. Then open `https://YOUR-SERVER/api/matchmaking`; it should return JSON containing `ok: true`, `protocol: 1`, and `online: true`. A blank URL on a static game host means configuration is missing. A configured server returning 403 needs its origin allowlist updated; a 5xx response indicates a service startup or availability problem. Browser network failures can also be caused by CORS; the game cannot distinguish those from an unreachable server, so it reports both possibilities.
