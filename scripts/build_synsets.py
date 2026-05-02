"""
Build synsets.json for the synonym trainer.

Output: public/synsets.json
Schema:
  [
    {
      "id": "happy.a.01",
      "pos": "a",
      "lexname": "adj.all",
      "def": "experiencing or showing happiness",
      "examples": ["a happy smile"],     # omitted if empty
      "def": {"en": "experiencing or showing happiness", "it": "..."},  # lang keys omitted if no data
      "examples": {"en": ["a happy smile"]},                           # omitted entirely if empty
      "en": [{"name": "happy", "count": 12, "antonyms": [{"synset": "unhappy.a.01", "lemma": "unhappy"}]}],
      "it": [{"name": "felice"}],        # omitted if no coverage
    },
    ...
  ]

Only synsets with at least one lemma in a selected language are included.
"""

import json
import sys
from pathlib import Path

from nltk.corpus import wordnet as wn

LANGUAGES = ["eng", "ita"]
LANG_KEYS = {"eng": "en", "ita": "it"}
def lemma_ref(lemma) -> dict:
    return {"synset": lemma.synset().name(), "lemma": lemma.name()}


def build_lemma(lemma) -> dict:
    d = {"name": lemma.name()}

    count = lemma.count()
    if count:
        d["count"] = count

    antonyms = [lemma_ref(a) for a in lemma.antonyms()]
    if antonyms:
        d["antonyms"] = antonyms

    return d


def build():
    synsets = []

    for ss in wn.all_synsets():
        lemmas_by_lang = {}
        for lang in LANGUAGES:
            lemmas = ss.lemmas(lang)
            if lemmas:
                lemmas_by_lang[LANG_KEYS[lang]] = [build_lemma(l) for l in lemmas]

        if not lemmas_by_lang:
            continue

        defs = {key: ss.definition(lang=lang) for lang, key in LANG_KEYS.items() if ss.definition(lang=lang)}
        examples = {key: exs for lang, key in LANG_KEYS.items() if (exs := ss.examples(lang=lang))}

        hyps = [h.name() for h in ss.hypernyms() + ss.instance_hypernyms() + ss.similar_tos()]

        entry = {
            "id": ss.name(),
            "pos": ss.pos(),
            "lexname": ss.lexname(),
            "def": defs,
        }

        if hyps:
            entry["hypernyms"] = hyps

        if examples:
            entry["examples"] = examples

        entry.update(lemmas_by_lang)
        synsets.append(entry)

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
