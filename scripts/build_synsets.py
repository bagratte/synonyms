"""
Build synsets.json for the synonym trainer.

Output: public/synsets.json
Schema:
  [{
    "id": "oewn-01151786-a",
    "pos": "a",
    "lexname": "adj.all",
    "def": {"en": "enjoying or showing or marked by joy or pleasure", "ru": "..."},
    "examples": {"en": ["a happy smile"]},
    "hypernyms": ["oewn-01152267-s"],
    "en": [{"name": "happy", "count": 37, "antonyms": [{"synset": "oewn-01152997-a", "lemma": "unhappy"}]}],
    "it": [{"name": "felice"}],
    "ru": [{"name": "счастливый"}]
  }, ...]

Primary English source: oewn:2025+ (lemmas, antonyms, hypernyms, definitions, examples).
English lemma counts: omw-en:1.4 (oewn lacks counts; omw-en also bridges RuWordNet
  since both use PWN 3.0 offsets, while oewn uses 3.1 offsets).
Italian lemmas: omw-it:2.0
Russian lemmas/defs: RuWordNet (PWN 3.0 offsets → ILI via omw-en:1.4)

Only synsets with at least one lemma from any adapter are included.
To add a language: implement LangAdapter, add it to ADAPTERS.
"""

import json
import sys
import warnings
from abc import ABC, abstractmethod
from pathlib import Path

import wn
from tqdm import tqdm

warnings.filterwarnings("ignore", category=wn.WnWarning)

_oewn = wn.Wordnet(lexicon="oewn:2025+")
_omw_en = wn.Wordnet(lexicon="omw-en:1.4")
_omw_it = wn.Wordnet(lexicon="omw-it:2.0")


class LangAdapter(ABC):
    @abstractmethod
    def lemmas_for(self, ili: str) -> list[dict]:
        """Return lemma dicts for the given ILI. Each dict has at least 'name'."""
        ...

    def definition_for(self, ili: str) -> str | None:
        return None


class OMWAdapter(LangAdapter):
    """Fetches lemmas from an OMW lexicon by ILI."""

    def __init__(self, lex: wn.Wordnet):
        self._lex = lex

    def lemmas_for(self, ili: str) -> list[dict]:
        seen: set[str] = set()
        result: list[dict] = []
        for ss in self._lex.synsets(ili=ili):
            for lemma in ss.lemmas():
                if lemma not in seen:
                    seen.add(lemma)
                    result.append({"name": lemma})
        return result


class RuWordNetAdapter(LangAdapter):
    """Fetches Russian lemmas from RuWordNet via ILI alignment.

    RuWordNet's ili_table stores PWN 3.0 offsets (e.g. "01148283-a"), not CILI ILIs.
    omw-en:1.4 (also PWN 3.0) is used as a bridge: its synset IDs embed those same
    offsets, so we can resolve offset → ILI and then key everything by ILI.

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

        # omw-en IDs look like "omw-en-01148283-a"; RuWordNet wn_ids look like
        # "01148283-a" — the trailing part after the second "-".
        print(" building ILI map...", end="", flush=True, file=sys.stderr)
        offset_to_ili: dict[str, str] = {}
        for ss in _omw_en.synsets():
            parts = ss.id.split("-", 2)
            if len(parts) == 3 and ss.ili:
                offset_to_ili[parts[2]] = ss.ili

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
            ili = offset_to_ili.get(wn_id)
            if not ili:
                continue
            if lemmas := senses_by_synset.get(ruwn_id):
                index.setdefault(ili, []).extend(lemmas)
            if definition := defs_by_synset.get(ruwn_id):
                def_index.setdefault(ili, definition)

        self._index = index
        self._def_index = def_index
        print(f" {len(index)} synsets mapped", file=sys.stderr)

    def lemmas_for(self, ili: str) -> list[dict]:
        if self._index is None:
            self._load()
        return self._index.get(ili, [])

    def definition_for(self, ili: str) -> str | None:
        if self._def_index is None:
            self._load()
        return self._def_index.get(ili)


ADAPTERS: dict[str, LangAdapter] = {
    "it": OMWAdapter(_omw_it),
    "ru": RuWordNetAdapter(),
}


def _en_counts(ili: str) -> dict[str, int]:
    counts: dict[str, int] = {}
    for ss in _omw_en.synsets(ili=ili):
        for sense in ss.senses():
            if c := sense.counts():
                counts[sense.word().lemma()] = c[0]
    return counts


def build() -> list[dict]:
    synsets = []

    for ss in tqdm(_oewn.synsets(), desc="  Processing synsets", unit=" synsets", file=sys.stderr):
        ili = ss.ili

        counts = _en_counts(ili) if ili else {}
        en_lemmas: list[dict] = []
        for sense in ss.senses():
            lemma_name = sense.word().lemma()
            d: dict = {"name": lemma_name}
            if count := counts.get(lemma_name):
                d["count"] = count
            if antonyms := [
                {"synset": a.synset().id, "lemma": a.word().lemma()}
                for a in sense.get_related("antonym")
            ]:
                d["antonyms"] = antonyms
            en_lemmas.append(d)

        lemmas_by_lang: dict[str, list[dict]] = {}
        if en_lemmas:
            lemmas_by_lang["en"] = en_lemmas
        if ili:
            for lang_key, adapter in ADAPTERS.items():
                if lemmas := adapter.lemmas_for(ili):
                    lemmas_by_lang[lang_key] = lemmas

        if not lemmas_by_lang:
            continue

        defs: dict[str, str] = {}
        if d := ss.definition():
            defs["en"] = d
        if ili:
            for lang_key, adapter in ADAPTERS.items():
                if lang_key not in defs:
                    if d := adapter.definition_for(ili):
                        defs[lang_key] = d

        examples: dict[str, list[str]] = {}
        if exs := ss.examples():
            examples["en"] = exs

        hyps = list(dict.fromkeys(
            h.id for h in ss.hypernyms() + ss.get_related("similar")
        ))

        entry: dict = {
            "id": ss.id,
            "pos": ss.pos,
            "lexname": ss.lexfile(),
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
