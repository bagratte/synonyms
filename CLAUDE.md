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

# Rebuild synsets.json (run after changing ADAPTERS in the script)
.venv/bin/python scripts/build_synsets.py
```

There are no tests. TypeScript (`tsc --noEmit`) is the main correctness check.

## Architecture

This is a multilingual synonym flashcard trainer (English, Italian, Russian). It has two independent parts:

### 1. Data pipeline (Python, one-time)

`scripts/build_synsets.py` pulls from Open English WordNet (`oewn:2025+`) via the `wn` library for English, OMW (`omw-it:2.0`) for Italian, and RuWordNet for Russian, then writes `public/synsets.json`. The venv lives at `.venv/`. WordNet data is managed by `wn` (`pip install wn`; lexicons downloaded with `wn.download(...)`). RuWordNet is installed via `pip install ruwordnet` and its DB via `python -m ruwordnet download`.

The language architecture is pluggable: each language is a `LangAdapter` subclass registered in `ADAPTERS`. To add a language, implement the adapter and add it there — no other changes needed.

The JSON schema is a flat array of synsets:
```json
[{
  "id": "oewn-01151786-a", "pos": "a", "lexname": "adj.all",
  "def": {"en": "enjoying or showing or marked by joy or pleasure", "ru": "..."},
  "examples": {"en": ["a happy smile"]},
  "hypernyms": ["oewn-01152267-s"],
  "en": [{"name": "happy", "count": 37, "antonyms": [{"synset": "oewn-01152997-a", "lemma": "unhappy"}]}],
  "it": [{"name": "felice"}],
  "ru": [{"name": "счастливый"}]
}, ...]
```
All language keys (`en`, `it`, `ru`) are optional — a synset appears as a card as long as it has lemmas in at least one active language.

### 2. React app (TypeScript + Vite)

`public/synsets.json` (~33MB) is fetched once on load and cached in module scope (`src/data/loader.ts`). All game logic runs client-side with no backend.

**Data flow:**
- `useGame(filter)` (`src/hooks/useGame.ts`) owns all game state. It builds a `byPos` index (Map from POS string → synset[]) and a `byHypernym` index on load.
- Each card is built by `buildCard()`: pick a random eligible synset, take one lemma as the prompt, take 1–5 other lemmas as correct answers (random count), fill the rest of the 6 slots with distractors — preferring semantic siblings (co-hyponyms via `byHypernym`), falling back to same-POS synsets.
- `LangFilter` (`Record<"en" | "it" | "ru", boolean>`) controls which languages appear in the prompt and options. Synsets with no coverage in the active language(s) are skipped; those with partial coverage are valid cards.
- The card also carries `def` and `examples` from the synset, displayed as hints in the flashcard prompt.

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

`SynsetDetail` uses `loadSynsetMap()` (second export of `src/data/loader.ts`) which builds an `id → Synset` Map on first call and caches it.

`LANGS` (`["en", "it", "ru"]` from `src/data/types.ts`) is the canonical ordered list iterated wherever language order matters (lemma display, filter iteration).

All styling is in `src/index.css` (no CSS modules, no Tailwind). Supports `prefers-color-scheme: dark`.
