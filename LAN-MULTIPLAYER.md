# LAN multiplayer

The local Node server serves both the existing game and a native browser WebSocket endpoint at `/lan`. `npm install` installs `ws`; `npm start` listens on all IPv4 interfaces on port 4180. Set `PORT` before starting for a different port. `/api/lan` reports local addresses and the current party. No accounts, database, external relay, router configuration or asset download is involved.

## Shared simulation

`server/coop-room.mjs` runs one four-player party, with a fixed 60 Hz simulation and 20 Hz snapshots. It reuses solo movement, weapon, Nano, station, terrain and progression rules. Each operative has independent weapons, ammo, credits, health and Nano cooldowns; map gates, power, extraction, box and enemy state are shared. Ordinary wave counts grow by 55% per additional connected player; enemy health grows by 16% per additional player. Spawn intervals shorten with the team size. Enemy movement chooses a living target and keeps windup attacks committed to that target. Spawning avoids teammates where the available entrances permit it.

Server raycasts use the same map collision volumes and terrain as movement, with enemy body/head regions, falloff and splash damage. Clients submit actions and look/movement input; damage, hit results, inventory, costs and rewards are calculated on the server. Friendly fire is disabled. Input sequences and match IDs prevent old packets from affecting a new run.

`dist/lan-client.js` predicts local movement with the shared movement function and reconciles against server acknowledgments. The renderer smoothly follows authoritative enemy and teammate positions. Teammates use original hero rigs, accessory sockets, weapon models and a single animated selected Nano. Combat events replicate muzzle flashes, tracers, impacts, casts and relevant local audio. The lobby supports host/join, player callsigns, map selection and a copyable LAN URL. The combat HUD adds teammates and revive progress.

## Joining and survival

The first player creates the party. Only the host chooses maps and starts runs. Guests can join a run in progress, with six seconds of initial protection. Closing a player connection reserves its place and inventory for 20 seconds. A per-tab session token permits explicit reconnect. Refreshing that tab reconnects through the LAN menu; a separate tab receives a separate player token. Host controls transfer to a connected teammate when necessary. Host migration transfers UI authority; it does not move the Node server to another computer.

Each player keeps the original one-time emergency self-revive. Thereafter they are downed until a living teammate holds F nearby for three seconds or the team finishes the wave. A teammate revive restores 50 HP and four seconds of protection. A wave clear restores downed teammates at the deployment point. All connected operatives down ends the run. Menus release local controls while the shared simulation continues. Pausing/disconnecting never switches the client into its solo simulation.

The box reserves its rolling/ready offer for the paying operative. Personal loadouts change between matches. There is no PvP, matchmaking, voice chat, split-screen or cross-machine server transfer. Static hosted builds retain solo gameplay; LAN features require this local Node process.

## Connection boundaries

The WebSocket upgrade accepts same-origin browser requests. Payload size, per-connection message rates, movement input, profiles, actions, session tokens, party capacity and host-only actions are validated. The server does not enable internet access or change router/firewall settings. On the current host, the resolved Node executable already has an inbound Private-network TCP allowance. A separate private/local-subnet TCP 4180 allowance can be used on hosts without an existing rule.

## Verification

`npm run check` includes all network modules. `npm test` exercises real loopback WebSocket connections for four-player capacity and role checks, shared map/run state, movement and stale input, authoritative damage and wall occlusion, independent ammunition and reloads, gate payment, box ownership, Nano selection/powers, downing and revives, team wipes, late joining, host migration, reconnect, redeployment and browser-client reconciliation. Existing solo, asset, animation and map tests remain included.

The live service at `http://10.0.0.233:4180` was checked with four separate WebSocket clients using the LAN address. All four received 125 matching shared snapshots while moving, firing and progressing into wave 1. The test party then left, resetting the lobby for play. Browser preview automation was unavailable; visual multiplayer gameplay and a connection from a second physical device remain unverified.
