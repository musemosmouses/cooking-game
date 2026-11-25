[![make.fun](https://make.fun/badge/best-cooking-game-20261125-0137.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137)
[![Rank](https://make.fun/badge/best-cooking-game-20261125-0137/musemosmouses/cooking-game/rank.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137)
[![Reward](https://make.fun/badge/best-cooking-game-20261125-0137/musemosmouses/cooking-game/reward.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137)

# Ember Kitchen — Sizzle & Serve

A complete cooking game for the make.fun bounty
[best-cooking-game-20261125-0137](https://make.fun/c/best-cooking-game-20261125-0137)
("Make the best cooking game"). It runs offline in a desktop browser from its
own static files — no network, no library, no assets: canvas art and WebAudio
synth sounds only.

## How to play

You are the only chef on a lunch shift. Orders land on the board with a
patience timer; cook them before the ticket runs out.

- **Move:** WASD / arrow keys, or click anywhere to walk there
- **Interact:** E / Space, or click a station when you arrive
- **Pause:** P · **Mute:** M

Stations: ingredient bins (bottom counter) → **chopping board** (chop tomato,
lettuce, onion) → **grill** (cook patties; they burn if left too long) →
**assembly** counter (stack the dish on the plate) → **serving window** (serve
the matching order) → **trash** (dump a mistake).

## What's in the game

- 8 recipes, 6 ingredients, chop + grill + assemble, order timers, tips & combos
- Orders arrive faster and lose patience sooner as your level rises
- 3 hearts: an expired order costs one; a 180-second shift, 1–3 star results
- Combo multiplier for fast consecutive serves, best-shift score saved locally
- Synthesized sound effects (chop, sizzle, serve chime) with mute

## Run it

```sh
node serve.ts   # then open http://localhost:8080
```

Screenshots in `screenshots/` are real renders of the game, staged with
`?shot=title|play|serve|end&seed=1` (see `shots.json`). The entry program is
`main.ts` (Node 22, standard library only): it copies `game/` and
`screenshots/` to the output directory and writes `dossier.json`.

## License

MIT — see [LICENSE](LICENSE).
