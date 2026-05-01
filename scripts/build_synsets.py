"""
Build synsets.json for the synonym trainer.

Output: public/synsets.json
Schema:
  [
    { "id": "happy.a.01", "pos": "a", "en": ["happy", "glad"], "it": ["felice", "contento"] },
    ...
  ]

Only synsets with at least 2 total lemmas (across selected languages) are included,
so there is always at least one prompt word and one correct answer candidate.
"""

import json
import sys
from pathlib import Path

from nltk.corpus import wordnet as wn

LANGUAGES = ["eng", "ita"]
LANG_KEYS = {"eng": "en", "ita": "it"}
MIN_TOTAL_LEMMAS = 2  # prompt word + at least 1 synonym

def build():
    synsets = []

    for ss in wn.all_synsets():
        lemmas_by_lang = {}
        total = 0
        for lang in LANGUAGES:
            names = ss.lemma_names(lang)
            if names:
                lemmas_by_lang[LANG_KEYS[lang]] = names
                total += len(names)

        if total < MIN_TOTAL_LEMMAS:
            continue

        synsets.append({
            "id": ss.name(),
            "pos": ss.pos(),
            **lemmas_by_lang,
        })

    return synsets

def main():
    out_path = Path(__file__).parent.parent / "public" / "synsets.json"
    out_path.parent.mkdir(parents=True, exist_ok=True)

    print("Building synset data...", file=sys.stderr)
    synsets = build()
    print(f"  {len(synsets)} synsets collected", file=sys.stderr)

    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(synsets, f, ensure_ascii=False, separators=(",", ":"))

    size_kb = out_path.stat().st_size / 1024
    print(f"  Written to {out_path} ({size_kb:.0f} KB)", file=sys.stderr)

if __name__ == "__main__":
    main()
