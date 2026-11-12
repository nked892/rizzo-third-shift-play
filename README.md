# The Rizzo — Third Shift

First-person, found-footage, in-browser horror. You're the 3rd-shift maintenance engineer at the Rizzo Center
in Chapel Hill, working Christmas Eve. Clock in at the loading dock, close two work orders in McLean, then get sent over
to the old DuBose house. Something is standing in the hall. And something in the sewing room is singing.

## Run it
```
cd /workspace/third-shift
npx serve -l 8123 dist        # or: npx serve -l 8123 .   (source tree runs as-is, no build step)
```
Open http://localhost:8123/ in Chrome. Click to start (captures the mouse). Headphones recommended.
Everything is local: no network, no API keys. (Three.js is vendored in `vendor/`.)

## Controls
WASD move · mouse look · SHIFT run · E use / HOLD E for repairs · SPACE blink (hold to keep eyes shut) · F flashlight · ESC pause
Q or RIGHT MOUSE (hold, next to a closed door): peek through the crack. 173 can't move while you see it through the gap; E throws the door open.

## The shift
1. Loading dock: clock in at the time clock (hold E).
2. Maintenance office just inside the dock: take the radio + flashlight. Dee (night audit) radios in two tickets.
3. WO-4471: McLean guest pantry ice machine leak: pull the panel, clear the drain, mop.
4. WO-4472: Stair B landing light: grab a ballast from the shop shelf, drop the lens, swap the ballast.
5. Dee: the DuBose Suite rang the desk, but nobody's booked. Get the DuBose key from the shop key cabinet.
6. McLean hall → terrace → DuBose side door. Something is on the stair-hall balcony. Check the suite. Power drops.
7. The statue only moves when unobserved. Reset the breaker in the butler's pantry; get back across the terrace into McLean.
8. 2:41 AM, Christmas. You come to in the shop (you sat down "a minute"). WO-4473: low-temp alarm in the DuBose sewing room (back hall, behind the front stair). Somebody humming on the house line.
9. Sewing room: the singing stops when you walk in. Ice cold (frost, breath, muffled sound). Open the radiator valve. A brief cry, far off. Then voices from the bar next door.
10. The bar is empty: a glass, a pulled-out stool. Doors slam behind you; the bar door bangs open. The statue is in the room when you turn around.
    Slip past it into the back hall (the linen closet there is a hide spot: shut the door and it pounds, then backs off; hold Q / right mouse to peek).
11. Back to McLean with it following. WO-4474: Room 117 PTAC (no heat): pull the cover, clean the filter, reset. Shut doors buy time.
12. 6:52 AM: walk back to the dock and clock out (hold E). One last look.
Checkpoints: power-out (A), breaker (B), after the slam in the bar (E), back in McLean for WO-4474 (F). Restart shift reloads.

## Credits / licensing
- SCP-173 concept from the SCP Wiki (https://scp-wiki.wikidot.com/scp-173), CC BY-SA 3.0. Fan work.
- The statue here is an original design (not the original sculpture). All geometry, textures (canvas-generated) and
  sounds (WebAudio-synthesized, plus Dee's generated radio voice) are original and created in code. No assets from any other game.
- Dee's radio voice: synthetic, generated offline with Piper TTS (voice `en_US-kristin-medium`, trained on public-domain LibriVox
  audio), then radio-processed in `voice/radio.py`. Not a recording or clone of any real person. Files in `audio/dee/`, map in `src/dee-lines.js`.
- The Rizzo Center is a real place; layout is a compressed, inspired-by interpretation. Not affiliated or endorsed.
- Three.js (MIT), see vendor/THREE-LICENSE.

## Dev
- `node shoot.mjs "http://localhost:8123/?shots" '<json>'`: screenshots from given positions.
- `node walk.mjs`: headless end-to-end test of the whole shift (clock-in → WOs → DuBose → death/retry → breaker → sewing room haunt → slam → death/retry E → hide/peek → McLean WO-4474 → death/retry F → clock out → end card).
- Lady DuBose's haunt is audio + atmosphere only: an original synthesized hummed lullaby (not any existing song/carol), a single short distant cry, cold, an empty bar, slamming doors. Nothing is shown.
