# Gobble Dash

[![make.fun bounty](https://make.fun/badge/turkey-run-game-01.svg)](https://make.fun/bounty/turkey-run-game-01)
[![rank](https://make.fun/badge/turkey-run-game-01/Azizghandos/turkey-run-game/rank.svg)](https://make.fun/bounty/turkey-run-game-01)
[![reward](https://make.fun/badge/turkey-run-game-01/Azizghandos/turkey-run-game/reward.svg)](https://make.fun/bounty/turkey-run-game-01)

An entry for the make.fun bounty [Make the best turkey escape game](https://make.fun/bounty/turkey-run-game-01).

## What it is

**Gobble Dash** is a complete original 2D side-scrolling runner, drawn entirely
with canvas shapes in a warm autumn palette. You are a turkey on Thanksgiving
morning, and the farmer is coming for you with the oven already hot. Run 600
metres from the farmyard, through the cornfield and the kitchen yard, to the
forest — and freedom.

The farmer chases you from behind: every stumble lets him gain on you, and if
he catches you, you are dinner. Jump the fences, hay bales and the oven; duck
under the swinging carving knives and the low branches; splash through the mud
at your peril. Grab corn, grain and golden feathers for points and a little
breathing room. Three lives, four stages that get faster and busier, a real win
(the forest) and a real loss (caught).

## How to play

Serve `game/` with any static server and open `game/index.html` in desktop
Chrome. It plays offline, with no network request.

| Key / mouse | Action |
| --- | --- |
| Space, ↑, W, or click | Jump |
| ↓ or S (hold) | Duck under knives and branches |
| P or Esc | Pause / resume |
| M | Sound on / off |
| Space / Enter / click | Start, restart after caught or escaped |

## What's in it

- `main.ts` — the program that hands the game in: copies `game/` and
  `screenshots/` to the output directory and writes `dossier.json` with the
  vendored make.fun library.
- `vendor/makefun-game.ts` — the kit's dossier library, unchanged.
- `game/index.html` — the page and its canvas.
- `game/src/tuning.js` — every tuning number, stage and colour in one place.
- `game/src/world.js` — the rules: the turkey, the farmer, hazards, treats,
  stages, score, lives and the escape.
- `game/src/draw.js` — the painter: farm, kitchen, forest, turkey, farmer,
  HUD and all five screens.
- `game/src/input.js` — keyboard and pointer input.
- `game/src/sound.js` — small synthesised WebAudio sounds, no audio files.
- `game/src/random.js` — the seeded random source that makes runs repeatable.
- `game/src/shots.js` — the screenshot scenes: an autopilot plays the real
  rules forward to stage the title, a run in play, caught and escaped.
- `game/src/main.js` — boot and the one loop.
- `screenshots/` — four real renders of the game's own code: title, play,
  caught, escaped.

## License

MIT — see [LICENSE](LICENSE).
