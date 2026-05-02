# Synonyms

A multilingual synonym flashcard trainer for English, Italian, and Russian, built with React + TypeScript + Vite.

## How it works

**Play** — a random word is presented and you select all its synonyms from 6 options. Words and options can come from any combination of languages (configurable in settings). Feedback is colour-coded: correct picks turn green, missed synonyms turn yellow, wrong picks turn red. The prompt also shows the synset definition and examples as a hint.

**Explore** — browse all 117k synsets with live search and part-of-speech filters (Noun, Verb, Adjective, Adverb). Each synset shows its English, Italian, and Russian lemmas side by side with match highlighting.

Data comes from [WordNet](https://wordnet.princeton.edu/) (Princeton), the [Open Multilingual Wordnet](https://omwn.org/), and [RuWordNet](https://ruwordnet.ru/en/), preprocessed into a static JSON file that ships with the app — no backend required.

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
.venv/bin/pip install nltk ruwordnet tqdm
.venv/bin/python -c "import nltk; nltk.download('wordnet'); nltk.download('omw-1.4')"
# Unzip the downloaded corpora (required — NLTK doesn't auto-unzip)
cd ~/nltk_data/corpora && unzip -o wordnet.zip && unzip -o omw-1.4.zip
cd /path/to/project
.venv/bin/python -m ruwordnet download
.venv/bin/python scripts/build_synsets.py
```

To add a new language, implement a `LangAdapter` subclass in `build_synsets.py` and add it to the `ADAPTERS` dict.
