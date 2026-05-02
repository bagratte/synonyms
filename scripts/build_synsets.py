"""
Build synsets.json for the synonym trainer.

Output: public/synsets.json
Schema:
  [{
    "id": "happy.a.01",
    "pos": "a",
    "lexname": "adj.all",
    "def": {"en": "experiencing or showing happiness", "it": "..."},
    "examples": {"en": ["a happy smile"]},
    "en": [{"name": "happy", "count": 12, "antonyms": [{"synset": "unhappy.a.01", "lemma": "unhappy"}]}],
    "it": [{"name": "felice"}],
    "ru": [{"name": "счастливый"}],
  }, ...]

Only synsets with at least one lemma from any adapter are included.
Definitions come from NLTK/OMW or the language adapter (e.g. RuWordNet). Examples from NLTK only.

To add a language: implement LangAdapter, add it to ADAPTERS.
To swap a source: replace the adapter instance in ADAPTERS.
"""

import json
import sys
from abc import ABC, abstractmethod
from pathlib import Path

from nltk.corpus import wordnet as wn
from tqdm import tqdm


class LangAdapter(ABC):
    @abstractmethod
    def lemmas_for(self, synset_name: str, offset: int, pos: str) -> list[dict]:
        """Return lemma dicts for the given PWN synset. Each dict has at least 'name'."""
        ...

    def definition_for(self, offset: int, pos: str) -> str | None:
        return None


class NLTKOMWAdapter(LangAdapter):
    """Fetches lemmas from NLTK's Open Multilingual Wordnet (OMW 1.4)."""

    def __init__(self, lang: str):
        self.lang = lang

    def lemmas_for(self, synset_name: str, offset: int, pos: str) -> list[dict]:
        result = []
        for lemma in wn.synset(synset_name).lemmas(self.lang):
            d: dict = {"name": lemma.name()}
            if count := lemma.count():
                d["count"] = count
            if antonyms := [{"synset": a.synset().name(), "lemma": a.name()} for a in lemma.antonyms()]:
                d["antonyms"] = antonyms
            result.append(d)
        return result


class RuWordNetAdapter(LangAdapter):
    """Fetches Russian lemmas from RuWordNet via ILI alignment to PWN synsets.

    Requires the ruwordnet package and its database:
      pip install ruwordnet
      python -m ruwordnet download
    """

    def __init__(self):
        self._index: dict[str, list[dict]] | None = None
        self._def_index: dict[str, str] | None = None

    def _load(self) -> None:
        try:
            from ruwordnet.models import Sense, Synset, ili_table
            from ruwordnet.utils import get_default_session
        except ImportError:
            raise RuntimeError("ruwordnet not installed — run: pip install ruwordnet")

        print("  Loading RuWordNet...", end="", flush=True, file=sys.stderr)
        try:
            session = get_default_session()
        except FileNotFoundError:
            raise RuntimeError(
                "RuWordNet database not found.\n"
                "Run: .venv/bin/python -m ruwordnet download"
            )

        # Bulk queries instead of N+1 ORM lazy loads.
        senses_by_synset: dict[str, list[dict]] = {}
        for synset_id, name in session.query(Sense.synset_id, Sense.name).all():
            senses_by_synset.setdefault(synset_id, []).append({"name": name})

        defs_by_synset: dict[str, str] = {
            synset_id: definition
            for synset_id, definition in session.query(Synset.id, Synset.definition).all()
            if definition
        }

        index: dict[str, list[dict]] = {}
        def_index: dict[str, str] = {}
        for ruwn_id, wn_id in session.execute(ili_table.select()).fetchall():
            if lemmas := senses_by_synset.get(ruwn_id):
                index.setdefault(wn_id, []).extend(lemmas)
            if definition := defs_by_synset.get(ruwn_id):
                def_index.setdefault(wn_id, definition)

        self._index = index
        self._def_index = def_index
        print(f" {len(index)} synsets mapped", file=sys.stderr)

    def lemmas_for(self, synset_name: str, offset: int, pos: str) -> list[dict]:
        if self._index is None:
            self._load()
        return self._index.get("{:08d}-{}".format(offset, pos), [])

    def definition_for(self, offset: int, pos: str) -> str | None:
        if self._def_index is None:
            self._load()
        return self._def_index.get("{:08d}-{}".format(offset, pos))


# Edit here to add languages or swap sources.
ADAPTERS: dict[str, LangAdapter] = {
    "en": NLTKOMWAdapter("eng"),
    "it": NLTKOMWAdapter("ita"),
    "ru": RuWordNetAdapter(),
}

# Definitions and examples come from NLTK for OMW-covered languages.
# Automatically derived from ADAPTERS — no manual sync needed.
_NLTK_DEF_LANGS: dict[str, str] = {
    adapter.lang: key
    for key, adapter in ADAPTERS.items()
    if isinstance(adapter, NLTKOMWAdapter)
}


def build() -> list[dict]:
    synsets = []

    for ss in tqdm(wn.all_synsets(), desc="  Processing synsets", unit=" synsets", file=sys.stderr):
        lemmas_by_lang: dict[str, list[dict]] = {}
        for lang_key, adapter in ADAPTERS.items():
            lemmas = adapter.lemmas_for(ss.name(), ss.offset(), ss.pos())
            if lemmas:
                lemmas_by_lang[lang_key] = lemmas

        if not lemmas_by_lang:
            continue

        defs = {
            key: ss.definition(lang=lang)
            for lang, key in _NLTK_DEF_LANGS.items()
            if ss.definition(lang=lang)
        }
        for lang_key, adapter in ADAPTERS.items():
            if lang_key not in defs:
                if d := adapter.definition_for(ss.offset(), ss.pos()):
                    defs[lang_key] = d
        examples = {
            key: exs
            for lang, key in _NLTK_DEF_LANGS.items()
            if (exs := ss.examples(lang=lang))
        }
        hyps = [h.name() for h in ss.hypernyms() + ss.instance_hypernyms() + ss.similar_tos()]

        entry: dict = {
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
