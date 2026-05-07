# Synonyms

A multilingual synonym flashcard trainer for English, Italian, and Russian, built with React + TypeScript + Vite.

## How it works

**Play** — a random word is presented and you select all its synonyms from 6 options. Words and options can come from any combination of languages (configurable in settings). Feedback is colour-coded: correct picks turn green, missed synonyms turn yellow, wrong picks turn red. The prompt also shows the synset definition and examples as a hint. Words you struggle with are shown more often; words you know well appear less frequently. Clicking the prompt word opens its detail page, where your seen count and accuracy (e.g. `3× · 67%`) are displayed once you've played it at least once.

**Explore** — browse all 215k synsets (English, Italian, Russian) with live search and part-of-speech filters. Clicking a synset shows its ILI-linked equivalents in other languages.

Data comes from [Open English WordNet](https://en-word.net/), the [Open Multilingual Wordnet](https://omwn.org/) (Italian), and [RuWordNet](https://ruwordnet.ru/en/) (Russian), preprocessed into a static JSON file that ships with the app — no backend required.

## Development

```bash
npm install
npm run dev
```

Type check:

```bash
npx tsc --noEmit
```

## Rebuilding the word data

The synset data is pre-built and committed at `public/synsets.json`. To rebuild it (e.g. after adding a language):

```bash
python3 -m venv .venv
.venv/bin/pip install wn tqdm
.venv/bin/python -c "import wn; wn.download('oewn:2025+'); wn.download('omw-it:2.0')"
# ruwn:0.1 must be installed separately (custom lexicon)
.venv/bin/python scripts/build_synsets.py
```

To add a new language, add one entry to the `LEXICONS` list in `build_synsets.py` (any wn-compatible lexicon works), then add the language code to `Lang` and `LANGS` in `src/data/types.ts` and a label in `src/components/Settings.tsx`.
