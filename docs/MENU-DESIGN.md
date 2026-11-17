# Main menu design

The front end opens on Play, with the selected arena, equipped character and party together. Character, weapon and Nano editing are separate destinations in the same navigation. A persistent footer summarizes the actual equipped setup and gives one primary next action.

## Reference reading

- Call of Duty's official [Zombies pre-game menu breakdown](https://www.callofduty.com/blog/2024/10/call-of-duty-black-ops-6-launch-comms-zombies-mode-prep-intel) separates operator selection, weapon preparation and other progression. The applicable lesson here is separation of preparation tasks from starting a run.
- The official [Gears of War 2 manual](https://download.microsoft.com/download/F/9/9/F99AB8F0-5191-4EDD-B312-7A9B9E4784FA/GOW2_MNL_EN-PEGI.pdf) describes a multiplayer party lobby and host-controlled map choice. That informs visible party membership, host permissions and a distinct deployment action.
- Lobby reference images for Black Ops 6 show a central operative, game selection and a party list in stable regions. This implementation adapts that information hierarchy to FusionFall's characters, map diagrams and private invitations. It does not reproduce another game's screen or add unsupported progression systems.

## Information hierarchy

| Area | Player decision |
| --- | --- |
| Navigation | Play, Operative, Weapons or Nanos |
| Play left column | Solo, private co-op or local network; selected arena |
| Character stage | Current hero and equipment; rotate the original model |
| Play right column | Actual party membership, connection status and run objective |
| Footer | Equipped hero, starting weapon and three Nanos; primary next action |

The palette uses dark blue surfaces, restrained cyan labels and one pale green action color. The live map scene and original animated hero remain visible. Experimental arenas retain their explicit map-selection toggle. The menu contains no invented rank, account, player-count or reward metrics.

## Behavior

- Solo is immediately playable with the saved/default setup. Customization is optional.
- The primary action changes by context: Start solo run, Create or join party, Deploy party, Waiting for host, Reconnect, or Back to Play. Checking/unavailable service states explain why deployment is disabled and offer retry or Solo.
- Modes lock while in a party. Only a host can change the arena before a run. The party summary reflects the actual client roster and connectivity.
- Solo mode does not probe the multiplayer service. Private and LAN modes check the relevant service. Stale service responses cannot overwrite a newer choice.
- Operative previews require Apply. Leaving with unapplied changes offers Apply and continue, Discard changes, or Keep editing. Saved equipment and preview state are labeled separately.
- Weapons equip immediately and update the footer. Nano inspection is explicitly a preview; Equip writes to the chosen slot. Leaving Nano browsing returns the character stage to the equipped companion.
- Character search, roving keyboard selection, tab arrow navigation, focus-visible styles, modal focus containment, Escape paths and focus restoration support keyboard use.
- Responsive layouts reduce to two columns and then a scrolling single-column flow. The primary action remains in the footer. Hidden character previews skip WebGL resizing so zero-size canvases do not corrupt camera aspect ratios. Reduced-motion preferences remove CSS transitions.

## Validation boundary

`tests/menu-ux.test.mjs` runs the actual menu controller against a DOM implementation. It verifies default launch, duplicate-start prevention, navigation/draft guards, network failure/recovery, party permissions, modal focus cycling, Escape and focus return. It does not render CSS or WebGL.

Live browser access was unavailable during implementation. Responsive composition, visual contrast, animations and the final WebGL scene still require a visual review in the deployed browser. Passing the DOM tests is not a claim that pixel layout or controller/gamepad support has been verified. Existing keyboard/mouse gameplay remains the supported input method.
