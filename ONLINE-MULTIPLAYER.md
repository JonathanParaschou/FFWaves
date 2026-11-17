# Online multiplayer on Vercel

Vercel is the default public host. The same deployment serves the game, `/api/matchmaking`, and the WebSocket endpoint at `/online`. No Render service, server IP, `MATCHMAKING_URL`, or cross-origin allowlist is required for this mode.

## One-time Vercel setup

1. Push this checkout, including `api/`, `server/`, `dist/`, `vercel.json`, `package.json`, and `package-lock.json`.
2. In your Vercel project's **Storage** tab, connect a Redis integration (for example Upstash). Ensure the project receives its native TCP/TLS connection string as **`REDIS_URL`** in the environments you use: Production, and Preview if needed. Use the integration's `redis://` / `rediss://` URL, not its REST API URL. Keep this server-side secret in Vercel; never place it in client configuration or Git.
3. If you previously set `MATCHMAKING_URL` for Render, remove it so the client uses the same Vercel site. Redeploy after connecting storage/changing environment variables.
4. Open `https://YOUR-GAME/api/matchmaking`. A healthy deployment returns JSON with `ok: true`, `protocol: 1`, `online: true`, and `provider: "vercel"`.
5. Open **Multiplayer > Online**, create a party, and share its invitation link/code. Friends use that same game URL.

Fluid compute, function duration and rewrites are included in `vercel.json`. Vercel supports WebSockets, but connections can land on different instances and close at the function duration limit. Redis is required to share and preserve room state. Official references: https://vercel.com/docs/functions/websockets and https://vercel.com/kb/guide/real-time-presence-hono-react .

## Rooms and invitations

A private party holds four players. The host requests an eight-character random code. Each code admits one guest, expires after ten minutes, and rotates after a successful join. **Generate new code** revokes an existing invite. Only the current host receives the next invitation. Rooms are not publicly listed. These are private party invitations, not ranked public matchmaking or user accounts.

Disconnects reserve a player's seat for 20 seconds. The browser automatically reconnects with its existing session token, without consuming another invitation. Function restarts may take a few seconds to detect; stale connection generations cannot disconnect the replacement session. Host privileges move to a connected teammate. Leaving ends membership; the last member leaving destroys the room and invitation.

## Shared authoritative simulation

`api/online.js` exports a Node WebSocket server as a Vercel Function. Instances send room operations through `RedisRoomStore`; a per-room lock and atomic Lua commit serialize writes, invitations, capacity updates, checkpoint saves, and notifications. Lock ownership is checked again at commit, preventing an expired writer from replacing newer state. Control request receipts make retries idempotent.

Each operation restores the authoritative checkpoint, advances accumulated wall-clock time in fixed 60 Hz steps, applies controls, and saves the complete match again. Snapshots are published at approximately 20 Hz and relayed to every function holding a party member's socket. Inputs are coalesced per player between flushes. Long outages pause/cap catch-up rather than teleporting the simulation. Rooms retain inventories, enemies, gates, floor contexts, waves and reload state across instance changes. Clients do not submit damage or currency.

All live match operations pass through Redis, not an in-memory function singleton. Production and preview branches use separate key namespaces. Active room state expires after 30 minutes without updates; idle disconnected memberships are pruned. The default room limit is eight (`MAX_ROOMS`), not a measured performance guarantee. Real-time state has sustained Redis command/bandwidth usage; check your integration's quotas and usage when testing.

## Verification and limits

`npm run build` prepares public client configuration and runs the checks. Tests exercise checkpoint fidelity, atomic Lua commits through a Redis mock, two independent actual WebSocket gateways sharing that mock, single-use codes, room isolation, stale connection rejection, capacity and migration. They do not establish deployed Redis latency or Vercel performance.

Set `FFWAVES_TEST_REDIS_URL` to a dedicated test Redis connection to run the optional real Redis integration test. It writes to a unique test namespace with expiring data. That test is skipped when no test service is configured. Production integration and public multiplayer must still be verified after connecting your Vercel project to Redis. No external service was provisioned automatically.

The checkpoint schema is versioned. A future incompatible simulation update needs migration/versioning rather than assuming old checkpoints remain compatible. Function-instance transitions preserve compatible state; a Redis outage temporarily interrupts online play. Solo play does not need Redis.

## Local LAN and optional separate hosting

`npm ci --ignore-scripts`, `npm run build`, then `npm start` retains the local Node host at `http://localhost:4180`. Its **Online** option uses local private rooms and its **Local Network** option uses the original LAN lobby, both without Redis. For local testing of the Vercel gateway use the tests or `vercel dev` with a development Redis connection.

The included Render Blueprint/Dockerfile remain optional alternatives. If you deliberately choose a separate host, set `MATCHMAKING_URL` in Vercel to its HTTPS origin and `ALLOWED_ORIGINS` on that host to the exact Vercel origin. The Render configuration disables its public legacy LAN lobby (`ENABLE_LAN=false`). This optional mode uses the separate process's existing in-memory room service and ends rooms on restart.
