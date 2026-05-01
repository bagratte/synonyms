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

# Rebuild synsets.json (run after changing LANGUAGES in the script)
.venv/bin/python scripts/build_synsets.py
```

There are no tests. TypeScript (`tsc --noEmit`) is the main correctness check.

## Architecture

This is a bilingual synonym flashcard trainer. It has two independent parts:

### 1. Data pipeline (Python, one-time)

`scripts/build_synsets.py` pulls from NLTK's WordNet + Open Multilingual Wordnet (OMW) and writes `public/synsets.json`. The venv lives at `.venv/`. NLTK data is downloaded to `~/nltk_data/` (unzipped manually — the zips alone aren't enough for `wn.all_synsets()` to work).

The JSON schema is a flat array of synsets:
```json
[{ "id": "happy.a.01", "pos": "a", "en": ["happy", "glad"], "it": ["felice", "contento"] }, ...]
```
`en` and `it` are both optional — synsets without Italian coverage appear as English-only cards.

### 2. React app (TypeScript + Vite)

`public/synsets.json` (~6MB) is fetched once on load and cached in module scope (`src/data/loader.ts`). All game logic runs client-side with no backend.

**Data flow:**
- `useGame(filter)` (`src/hooks/useGame.ts`) owns all game state. It builds a `byPos` index (Map from POS string → synset[]) on load, used to sample distractors efficiently.
- Each card is built by `buildCard()`: pick a random eligible synset, take one lemma as the prompt, take 1–5 other lemmas as correct answers (random count), fill the rest of the 6 slots with lemmas from other same-POS synsets as distractors.
- `LangFilter` (`"en" | "it" | "both"`) controls which languages appear in the prompt and options. Synsets with no cross-language equivalent are valid cards — their options just stay in the available language.

**Component tree:**
```
App
├── FlashCard       — prompt word + 6 OptionButtons + submit/next
│   └── OptionButton — idle / selected / correct / missed / wrong states
└── Settings        — modal overlay with LangFilter radio group
```

All styling is in `src/index.css` (no CSS modules, no Tailwind). Supports `prefers-color-scheme: dark`.
