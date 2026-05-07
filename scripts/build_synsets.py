"""
Build synsets.json for the synonym trainer.

Output: public/synsets.json
Schema:
  [{
    "id": "oewn-01151786-a",
    "lang": "en",
    "ili": "i90287",
    "pos": "a",
    "lexname": "adj.all",
    "def": "enjoying or showing or marked by joy or pleasure",
    "examples": ["a happy smile"],
    "hypernyms": ["oewn-01152267-s"],
    "lemmas": [{"name": "happy", "count": 37, "antonyms": [{"synset": "oewn-01152997-a", "lemma": "unhappy"}]}]
  }, ...]

Each entry belongs to exactly one lexicon. Cross-language linking happens at runtime via ILI.
To add a language: add one entry to LEXICONS — no other changes needed.
"""

import json
import sys
import warnings
from pathlib import Path

import wn
from tqdm import tqdm

warnings.filterwarnings("ignore", category=wn.WnWarning)

LEXICONS: list[tuple[str, wn.Wordnet, str]] = [
    ("oewn",   wn.Wordnet(lexicon="oewn:2025+"), "en"),
    ("omw-it", wn.Wordnet(lexicon="omw-it:2.0"), "it"),
    ("ruwn",   wn.Wordnet(lexicon="ruwn:0.1"),   "ru"),
]


def build() -> list[dict]:
    synsets = []

    for lex_id, lex, lang in LEXICONS:
        is_oewn = lex_id == "oewn"
        for ss in tqdm(lex.synsets(), desc=f"  {lex_id}", unit=" synsets", file=sys.stderr):
            lemmas: list[dict] = []
            for sense in ss.senses():
                lemma_name = sense.word().lemma()
                d: dict = {"name": lemma_name}
                if counts := sense.counts():
                    d["count"] = counts[0]
                if is_oewn:
                    if antonyms := [
                        {"synset": a.synset().id, "lemma": a.word().lemma()}
                        for a in sense.get_related("antonym")
                    ]:
                        d["antonyms"] = antonyms
                lemmas.append(d)

            if not lemmas:
                continue

            entry: dict = {
                "id": ss.id,
                "lang": lang,
                "pos": ss.pos,
                "lemmas": lemmas,
            }

            if ili := ss.ili:
                entry["ili"] = ili

            if lf := ss.lexfile():
                entry["lexname"] = lf

            if d := ss.definition():
                entry["def"] = d

            if exs := ss.examples():
                entry["examples"] = exs

            if hyps := list(dict.fromkeys(
                h.id for h in ss.hypernyms() + ss.get_related("similar")
            )):
                entry["hypernyms"] = hyps

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
