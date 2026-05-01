# Synonyms

A bilingual synonym flashcard trainer for English and Italian, built with React + TypeScript + Vite.

## How it works

**Play** — a random word is presented and you select all its synonyms from 6 options. Words and options can come from either language (configurable in settings). Feedback is colour-coded: correct picks turn green, missed synonyms turn yellow, wrong picks turn red.

**Explore** — browse all 69k synsets with live search and part-of-speech filters (Noun, Verb, Adjective, Adverb). Each synset shows its English and Italian lemmas side by side with match highlighting.

Data comes from [WordNet](https://wordnet.princeton.edu/) (Princeton) and the [Open Multilingual Wordnet](https://omwn.org/), preprocessed into a static JSON file that ships with the app — no backend required.

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
.venv/bin/pip install nltk
.venv/bin/python -c "import nltk; nltk.download('wordnet'); nltk.download('omw-1.4')"
# Unzip the downloaded corpora (required — NLTK doesn't auto-unzip)
cd ~/nltk_data/corpora && unzip -o wordnet.zip && unzip -o omw-1.4.zip
cd /path/to/project
.venv/bin/python scripts/build_synsets.py
```
