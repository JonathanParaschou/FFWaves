# FPS interface and animation decisions

The combat loop is look, aim, shoot, move, reload and select a Nano. The center of the screen must support aiming, while the player can find health, ammunition and ability readiness without searching.

## Primary references and applications

- [David Candland: Destiny UI](https://www.cand.land/destiny): contextual HUD information and preserving the world view. Applied as small, anchored status groups, intermission-only mission copy, short notifications and a maximum of two kill-feed entries. Floating damage numbers are optional.
- [David Candland: Halo HUD design specifications](https://www.cand.land/halohud): center/corner anchors, immediate situational feedback and readable information hierarchy. Applied as a stable center dot with dark outlines, small hit feedback, health at lower left, ammunition at lower right and the active Nano at lower center. A reload bar communicates progress without hiding the real ammunition count.
- [Xbox Accessibility Guideline 117: motion](https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/117): allow control over camera and weapon motion. Applied as a stable camera default with independently configurable weapon movement, optional camera bob/shake, FOV and sensitivity. Sprint and reload animation live in the weapon/hands layer.
- [Xbox Accessibility Guideline 102: contrast](https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/102): maintain readable information against changing backgrounds. Applied as outlined sight marks, panel backing for key ability information and text plus shape/state changes rather than color alone.
- [Game Accessibility Guidelines: crosshair choices](https://gameaccessibilityguidelines.com/provide-a-choice-of-cursor-crosshair-colours-designs/): provide alternatives for crosshair visibility. Applied as cross/dot/ring designs and white/cyan/yellow color choices, persisted locally.

These applications are design judgments for this game's solo FPS loop, not claims that an original FusionFall HUD was designed for first-person play.

## Interaction decisions

Browsing a Nano or power changes a draft preview. An explicit Equip action commits it to the chosen squad slot; duplicate Nanos swap slots. Slots show their committed powers. Keyboard users can move through the roster with arrows and Home/End. Power descriptions appear on the selected option.

Three slots provide three tactical options, but only one Nano exists visibly alongside the player. Switching immediately hides the other two and cancels their stale cast presentation. The selected Nano follows beside the shoulder, stays clear of the aiming lane and moves farther aside during ADS. Only a nearby station the player faces receives an interaction prompt; the same station is used when F is pressed.

Walk and sprint motion use actual distance traveled, so running against a wall does not animate a sprint. Aim, sprint, recoil and weapon swaps blend over time. Reloads sequence removal, insertion and readying around the gun, using newly authored gloved hands. Ammunition commits when the simulation timer completes.

## Verification

Automated checks cover single-companion visibility across rapid switches, ADS and casting, collision-aware follow, reload timing, sprint/ADS transitions, finite hand transforms for all four guns, duplicate loadout handling and saved setting validation. The existing asset, skeleton-deformation, Nano-power and map-navigation checks remain in the suite. Browser visual and play-feel verification could not run because the browser access host is unavailable; localhost remains the reviewable playable build.
