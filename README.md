# The Rizzo
### Third Shift

First-person, found-footage, in-browser horror. You're the 3rd-shift maintenance engineer at the Rizzo Center
in Chapel Hill, working Christmas Eve. Clock in at the loading dock, close two work orders in McLean, then get sent over
to the old DuBose house. Something is standing in the hall. And something in the sewing room is singing.
At 6:51 on Christmas morning you hand your radio and keys to Dee at the front desk, and the power goes out on the walk back.
Get the lights back on, clock out at 7, and walk out into Christmas morning.

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
1. 10:58 PM, Christmas Eve, loading dock. Clint, the chief engineer, is waiting at the time clock, smoking, and he is not happy:
   he's been here since six and had to cover second shift. He hands off the building, grumbles, and walks out the employee-lot door.
   Once he's gone, clock in at the time clock (hold E).
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
12. 117 has heat. Dee asks you to come up to the front desk. 6:51 AM, Dec 25: the lobby (off the west end of McLean hall).
    Dee is at the night-audit station. Turn in your radio (radio tray) and your keys (key drop) — hold E on each. Merry Christmas, both ways.
13. The second you step out of the lobby into McLean hall the whole building loses power. The lobby doors swing shut and lock behind you.
    No radio, nobody to call. 173 is in the hall, the lights surge and flicker, doors bang open and shut on their own, and the lullaby is back.
14. Get to the shop (still unlocked): EMPLOYEES ONLY door → service corridor → dock → maintenance office. Shut the shop door — it can't get through.
    In the dark it only freezes when your flashlight or a flickering light is on it.
15. Reset MDP-1, the McLean main breaker on the shop's east wall (hold E: pump the charging handle, then push CLOSE). Lights, hum, silence. It's 7. Not the end yet.
16. Clock out at the dock time clock (hold E; the swipe only takes now, not earlier in the night). The dock goes completely dark,
    your flashlight dies, and the lullaby starts again. No statue this time. Just the dark and the humming.
17. The employee-lot door unlocks and Chris, the day-shift engineering supervisor, comes in with a flashlight (tall, short black hair, oatmeal cardigan
    over his work shirt, "Chris" name patch). The power comes back. He says you look pale as a sheet, tells you to go home and get some sleep, mentions something
    on the radio about a containment breach at a research lab out in Triangle Park ("probably a bunch of hoopla"), and wishes you a Merry Christmas.
18. Walk out the employee-lot door into the parking lot. Frost on the windshields, the sodium lights clicking off, birds. Look east and watch the sun come up
    over the trees. End of shift.
Checkpoints: power-out (A), breaker (B), after the slam in the bar (E), back in McLean for WO-4474 (F), the blackout just outside the lobby
(G: retries the chase, not the conversation), and clock-out after MDP-1 (H: dock lit, clock-out objective). Restart shift reloads (Clint plays again).

## Credits / licensing
- SCP-173 concept from the SCP Wiki (https://scp-wiki.wikidot.com/scp-173), CC BY-SA 3.0. Fan work.
- The statue here is an original design (not the original sculpture). All geometry, textures (canvas-generated) and
  sounds (WebAudio-synthesized, plus Dee's generated radio voice) are original and created in code. No assets from any other game.
- Dee's voice: synthetic, generated offline with Piper TTS (voice `en_US-kristin-medium`, trained on public-domain LibriVox
  audio). Radio lines are radio-processed; her in-person lines at the front desk use a light room treatment instead (no radio hiss).
  Not a recording or clone of any real person. Files in `audio/dee/` (d* = radio, l* = in person), map in `src/dee-lines.js`.
  Dee in the lobby is a stylized figure built from simple shapes, not a likeness of anyone.
- Clint's voice: synthetic, generated offline with Piper TTS (voice `en_US-joe-medium`, CC0 dataset), with a light in-person dock-room
  treatment (not radio). Not a recording or clone of any real person. Files in `audio/clint/`, map in `src/clint-lines.js`.
  Clint on the dock is a stylized figure built from simple shapes (heavyset, bald, blue short-sleeve work shirt, black pants, cigarette), not a likeness.
- Chris's voice: synthetic, generated offline with Piper TTS (voice `en_US-john-medium`, public-domain LibriVox dataset), pitched down 4 semitones
  (formant-preserving) for a deep grumble, with an in-person dock-room treatment (not radio). Not a recording or clone of any real person.
  Files in `audio/chris/`, map in `src/chris-lines.js`. Chris is a stylized figure built from simple shapes, not a likeness.
- The Rizzo Center is a real place; layout is a compressed, inspired-by interpretation. Not affiliated or endorsed.
- Three.js (MIT), see vendor/THREE-LICENSE.

## Dev
- `node shoot.mjs "http://localhost:8123/?shots" '<json>'`: screenshots from given positions.
- `node walk.mjs`: headless end-to-end test of the whole shift (Clint → clock-in → WOs → DuBose → death/retry → breaker → sewing room haunt → slam → death/retry E → hide/peek → McLean WO-4474 → death/retry F → 6:51 front desk → radio + keys → blackout → death/retry G → chase → MDP-1 → clock-out (early clock-out refused) → blackout + humming → Chris → walk out into the sunrise → end card).
- `node clint-test.mjs`: focused test of the 10:58 opening (Clint on the dock, clock-in held, grumble, exit through the lot door, clock-in opens, 7/7 takes voiced). `SHOTS=1` writes `screenshots/clint-*.png`.
- `node ending-test.mjs`: focused test of the 6:51 ending (desk state, turn-in, Merry Christmas, blackout threshold, no answer from Dee, flicker + song, fair-bot run, MDP-1 is not the end, clock-out, full blackout + humming, Chris (look, 7/7 voiced lines), lot door, sunrise, end card, checkpoint G retries). `SHOTS=1` writes `screenshots/ending-*.png`. `URL=` picks the server.
- `node voice-fallback-test.mjs`: every mp3 404s: radio lines squelch; Clint, Dee in person and Chris show subtitles only, with no radio hiss and no soft-lock.
- Lady DuBose's haunt is audio + atmosphere only: an original synthesized hummed lullaby (not any existing song/carol), a single short distant cry, cold, an empty bar, slamming doors. Nothing is shown. The same lullaby follows 173 during the 6:51 blackout, and plays once more in the dark after you clock out.
