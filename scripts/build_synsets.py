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
      "en": [{"name": "happy", "count": 12, "antonyms": [{"synset": "unhappy.a.01", "lemma": "unhappy"}]}],
      "it": [{"name": "felice"}],
      "hypernyms": ["cheerful.a.01"],    # all relation keys omitted if empty
      ...
    },
    ...
  ]

Only synsets with at least 2 total lemmas (across selected languages) are included.
"""

import json
import sys
from pathlib import Path

from nltk.corpus import wordnet as wn

LANGUAGES = ["eng", "ita"]
LANG_KEYS = {"eng": "en", "ita": "it"}
MIN_TOTAL_LEMMAS = 2


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

    related = [lemma_ref(r) for r in lemma.derivationally_related_forms()]
    if related:
        d["related"] = related

    pertainyms = [lemma_ref(p) for p in lemma.pertainyms()]
    if pertainyms:
        d["pertainyms"] = pertainyms

    frames = lemma.frame_strings()
    if frames:
        d["frames"] = frames

    return d


def ss_ids(synsets) -> list:
    return [ss.name() for ss in synsets]


def build():
    synsets = []

    for ss in wn.all_synsets():
        lemmas_by_lang = {}
        total = 0
        for lang in LANGUAGES:
            lemmas = ss.lemmas(lang)
            if lemmas:
                lemmas_by_lang[LANG_KEYS[lang]] = [build_lemma(l) for l in lemmas]
                total += len(lemmas)

        if total < MIN_TOTAL_LEMMAS:
            continue

        entry = {
            "id": ss.name(),
            "pos": ss.pos(),
            "lexname": ss.lexname(),
            "def": ss.definition(),
        }

        examples = ss.examples()
        if examples:
            entry["examples"] = examples

        entry.update(lemmas_by_lang)

        relations = {
            "hypernyms":          ss_ids(ss.hypernyms()),
            "instance_hypernyms": ss_ids(ss.instance_hypernyms()),
            "hyponyms":           ss_ids(ss.hyponyms()),
            "instance_hyponyms":  ss_ids(ss.instance_hyponyms()),
            "part_meronyms":      ss_ids(ss.part_meronyms()),
            "part_holonyms":      ss_ids(ss.part_holonyms()),
            "member_meronyms":    ss_ids(ss.member_meronyms()),
            "member_holonyms":    ss_ids(ss.member_holonyms()),
            "substance_meronyms": ss_ids(ss.substance_meronyms()),
            "substance_holonyms": ss_ids(ss.substance_holonyms()),
            "similar":            ss_ids(ss.similar_tos()),
            "also":               ss_ids(ss.also_sees()),
            "attributes":         ss_ids(ss.attributes()),
            "entailments":        ss_ids(ss.entailments()),
            "causes":             ss_ids(ss.causes()),
            "verb_groups":        ss_ids(ss.verb_groups()),
            "topic_domains":      ss_ids(ss.topic_domains()),
            "region_domains":     ss_ids(ss.region_domains()),
            "usage_domains":      ss_ids(ss.usage_domains()),
            "in_topic_domains":   ss_ids(ss.in_topic_domains()),
            "in_region_domains":  ss_ids(ss.in_region_domains()),
            "in_usage_domains":   ss_ids(ss.in_usage_domains()),
        }

        for key, val in relations.items():
            if val:
                entry[key] = val

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
