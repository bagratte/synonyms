# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Frontend dev server
npm run dev

# Type check + production build
npm run build

# Lint
npm run lint

# Rebuild synsets.json (run after changing LEXICONS in the script)
.venv/bin/python scripts/build_synsets.py
```

There are no tests. TypeScript (`tsc --noEmit`) is the main correctness check.

## Architecture

This is a multilingual synonym flashcard trainer (English, Italian, Russian). It has two independent parts:

### 1. Data pipeline (Python, one-time)

`scripts/build_synsets.py` iterates all lexicons in `LEXICONS` via the `wn` library and writes `public/synsets.json`. The venv lives at `.venv/`. All lexicons must be wn-compatible; currently `oewn:2025+` (EN), `omw-it:2.0` (IT), `ruwn:0.1` (RU).

To add a language: add one entry to `LEXICONS` — no other changes to the script needed. The app's `Lang` type and `LANGS` array in `src/data/types.ts` must also be updated, plus a label in `Settings.tsx`.

The JSON schema is a flat array of per-lexicon synsets (~215k entries):
```json
[{
  "id": "oewn-01151786-a", "lang": "en", "ili": "i90287",
  "pos": "a", "lexname": "adj.all",
  "def": "enjoying or showing or marked by joy or pleasure",
  "examples": ["a happy smile"],
  "hypernyms": ["oewn-01152267-s"],
  "lemmas": [{"name": "happy", "count": 37, "antonyms": [{"synset": "oewn-01152997-a", "lemma": "unhappy"}]}]
}, ...]
```
Each entry belongs to one lexicon (`lang`). Cross-language linking uses the `ili` field at runtime. `lexname`, `hypernyms`, `antonyms`, and `count` are OEWN-only in practice but the schema treats them as optional for all.

### 2. React app (TypeScript + Vite)

`public/synsets.json` (~49MB) is fetched once on load and cached in module scope (`src/data/loader.ts`). All game logic runs client-side with no backend.

**Data flow:**
- `useGame(filter)` (`src/hooks/useGame.ts`) owns all game state. It builds `byPos`, `byHypernym`, and `byILI` indices on load.
- Each card is built by `buildCard()`: pick a weighted-random synset (lower performance → higher weight; see `src/data/stats.ts`), resolve its ILI group (all synsets sharing the same `ili`), merge lemmas across the group filtered by active languages, take one lemma from the picked synset itself as the prompt (never from other ILI-group members), take 1–5 others as correct answers, fill the rest of the 6 slots with distractors — preferring semantic siblings (co-hyponyms found via `byHypernym`, resolved through their ILI groups), falling back to same-POS synsets.
- `LangFilter` (`Record<"en" | "it" | "ru", boolean>`) controls which languages appear in the prompt and options. ILI groups with fewer than 2 lemmas in active languages are skipped.
- The card carries `def` and `examples` from the anchor synset, displayed as hints.

**Statistics** (`src/data/stats.ts`): per-synset performance tracking stored in localStorage under the key `synsetStats`. Each entry records `seen`, `correctFound`, `correctMissed`, `wrongPicked`, `lastSeen`. Performance = `correctFound / (correctFound + correctMissed + 2 * wrongPicked)`; weight = `1 − performance`. Unseen synsets default to weight 1.0 (highest priority). `loadStats` / `saveStats` are synchronous (localStorage); no React state is needed in components that only read stats.

**Component tree:**
```
App  (view: "play" | "explore" | "detail")
├── FlashCard       — prompt word + 6 OptionButtons + submit/next  [play]
│   └── OptionButton — idle / selected / correct / missed / wrong states
├── Settings        — modal overlay with LangFilter radio group     [play]
├── Explore         — search + POS filters + infinite-scroll synset list  [explore]
└── SynsetDetail    — full synset view with definitions, examples, antonym links  [detail]
```

`Explore` and `FlashCard` both call `onNavigate(id)` to push into "detail" view. `App` manages a `detailStack: string[]` to support following antonym/hypernym links within `SynsetDetail` — `pushDetail` appends, `goBack` pops (or exits to origin view when the stack empties).

`Explore` loads synsets via the same cached `loadSynsets()` call. Filtering (search + POS) runs in a `useMemo` with `useDeferredValue` on the query for responsiveness. The list renders 50 rows at a time, expanding via `IntersectionObserver` on a sentinel element. WordNet POS `"a"` and `"s"` (satellite adjective) are both displayed as "adj" and merged under the Adjective filter.

`SynsetDetail` uses `loadSynsetMap()` and `loadSynsetsByILI()` (exports of `src/data/loader.ts`). It shows the primary synset plus an "In other languages" section for ILI-linked synsets from other lexicons. It also shows `N× · X%` performance stats in the meta row for synsets that have been played at least once (read synchronously via `loadStats()`).

`LANGS` (`["en", "it", "ru"]` from `src/data/types.ts`) is the canonical ordered list iterated wherever language order matters (lemma display, filter iteration).

All styling is in `src/index.css` (no CSS modules, no Tailwind). Supports `prefers-color-scheme: dark`.
