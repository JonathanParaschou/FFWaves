# Forty guns and a separate soundtrack player

The playable roster grows from 10 to **40 firearms**, alongside the existing three equipped melee weapons. This exceeds the 33 total launch armaments in the official [Black Ops 6 launch weapon reference](https://www.callofduty.com/blog/2024/10/call-of-duty-black-ops-6-launch-comms-weapons-attachments-intel), used as a concrete roster-size benchmark. It does not claim COD's attachment system or exact weapon behavior.

The 30 additions include Beamer, Bean Cannon, Blue Wing Laser, Crayon Cannon, Crystal Pistol, Pop Gun, Zip Zapper, Toxic Heater, Cyber Auto Rifle, Shuttlegun, S.C.A.M.P.P., Piston Rifle, Anubis Laser Rifle, Ripper, Lightning Gun, Firespike Rifle, Airbrush Blaster, Super Scope, Recon Rifle, Needlenose Rifle, Galvanized Gun, Bunsen Burner 2.0, C.H.E.E.Z.O.O.K.A., Cheese Spreader, Snotgun, Sharkbite, Gatling Gum, T.H.U.M.P.E.R., Chill Caster and Atomic Engine.

Each has a distinct recovered mesh, original table-selected skin, original firing-sound association and actual-model portrait. Magazines, reserve ammunition, firing cadence, damage, pellet counts, range, reload time, visual effects, recoil and ADS magnification are authored for this survival game. Precision weapons zoom further; SMGs prioritize rate of fire; support guns have larger magazines and longer reloads; launchers retain splash damage. Hand anchors fit the actual source geometry. The normal original-model hand animation system remains intact.

All forty are in the supply-box pool. Six sidearms are eligible for the starting kit. The bunker retains its eight original wall anchors but uses a broader selection of the new arsenal. Its structure, circulation and independent barriers stay unchanged. Guns are shared static data in solo, LAN and Vercel authority. Browsing a preview does not equip it: the Weapons screen has search, class filters, numerical stats, acquisition instructions and an explicit sidearm equip action. Starting melee equipment remains available at the top of that screen.

## Music repair

The reported symptom was effects audible but music silent on both local and Vercel. The production Vercel site also lacked the previous commit's `audio-levels.js` when checked; local playback still needed attention. The source recordings decode to non-silent PCM, but there was no live browser connection to verify the previous Web Audio music path. That path is replaced rather than treating another gain increase as sufficient evidence.

The new player uses native browser MP3 playback, outside the Web Audio effects graph. Original Oggs are preserved. Playback copies are normalized with a peak cap and measured after encoding. A trusted gesture starts the media player directly before asynchronous work; later gestures can recover autoplay rejection. Settings provide native play/pause/seek controls, volume synchronization and a real track timer. Play Music also clears a native-player mute and recovers a zero music-volume preference on explicit request. Music continues quietly in the pause/settings screen so sliders can be auditioned. Hiding the page or globally muting pauses the stream without losing its position. Wave changes do not restart a track.

`/audio-check.html` plays the same Main Theme and Tech Center files without WebGL. Local responses supply the correct MIME type and support byte ranges; those behaviors have actual HTTP tests. Browser listening is still unverified here because the browser host and native computer-use pipe were unavailable.

## Validation

`npm run build` checks the full runtime and test suite, including distinct meshes/skins/sounds, all-gun box eligibility, two-slot inventory, authoritative firing/reloading, original-model hand contact, camera clipping through idle/aim/run/reload, menu filtering/preview/equip behavior, native media lifecycle, autoplay recovery, muting/visibility, volume synchronization and real HTTP seeking. The optional real-Redis integration remains conditional on its test environment variable. Offline first-person views are inspected via `python tools/review-runtime-scene.py --weapons-only` and saved in [the arsenal atlas](arsenal-review.jpg).

Use the refreshed local build for review, then push the prepared commits to the linked GitHub branch to update Vercel. No live deployment or repository push was performed during this work.
