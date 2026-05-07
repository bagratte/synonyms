import { useState, useMemo, useEffect, useRef, useDeferredValue, memo } from "react";
import { loadSynsets } from "../data/loader";
import type { Synset } from "../data/types";

const PAGE_SIZE = 50;

const POS_SHORT: Record<string, string> = { n: "noun", v: "verb", a: "adj", s: "adj", r: "adv" };

type PosFilter = "all" | "n" | "v" | "a" | "r";

const POS_FILTERS: { key: PosFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "n",   label: "Noun" },
  { key: "v",   label: "Verb" },
  { key: "a",   label: "Adjective" },
  { key: "r",   label: "Adverb" },
];

interface Props {
  onNavigate: (id: string) => void;
}

export function Explore({ onNavigate }: Props) {
  const [synsets, setSynsets] = useState<Synset[] | null>(null);
  const [search, setSearch] = useState("");
  const [posFilter, setPosFilter] = useState<PosFilter>("all");
  const [wholeWord, setWholeWord] = useState(false);
  const [matchLemmas, setMatchLemmas] = useState(true);
  const [matchSynsets, setMatchSynsets] = useState(false);
  const [count, setCount] = useState(PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const deferredSearch = useDeferredValue(search);

  useEffect(() => { loadSynsets().then(setSynsets); }, []);

  const filtered = useMemo(() => {
    if (!synsets) return [];
    const q = deferredSearch.trim().toLowerCase();
    const regex = q && wholeWord
      ? new RegExp(`\\b${q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i")
      : null;
    const test = (text: string) => regex ? regex.test(text) : text.toLowerCase().includes(q);
    const matchLemmaName = (name: string) => test(name.replace(/_/g, " "));
    return synsets.filter((ss) => {
      if (posFilter !== "all") {
        const posMatch = posFilter === "a" ? ss.pos === "a" || ss.pos === "s" : ss.pos === posFilter;
        if (!posMatch) return false;
      }
      if (q && (matchLemmas || matchSynsets)) {
        return (matchLemmas && ss.lemmas.some((l) => matchLemmaName(l.name)))
            || (matchSynsets && test(ss.id));
      }
      return true;
    });
  }, [synsets, deferredSearch, posFilter, wholeWord, matchLemmas, matchSynsets]);

  useEffect(() => { setCount(PAGE_SIZE); }, [deferredSearch, posFilter, wholeWord, matchLemmas, matchSynsets]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setCount((c) => Math.min(c + PAGE_SIZE, filtered.length)); },
      { rootMargin: "300px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [filtered.length]);

  const visible = filtered.slice(0, count);
  const q = deferredSearch.trim().toLowerCase();

  return (
    <div className="explore">
      <div className="explore__controls">
        <input
          className="explore__search"
          type="search"
          placeholder="Search words…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoFocus
        />
        <div className="explore__toggles">
          {([
            { label: "whole word",    checked: wholeWord,     set: setWholeWord },
            { label: "synset names",  checked: matchSynsets,  set: setMatchSynsets },
            { label: "lemma names",   checked: matchLemmas,   set: setMatchLemmas },
          ] as const).map(({ label, checked, set }) => (
            <label key={label} className="explore__toggle">
              <input type="checkbox" checked={checked} onChange={(e) => set(e.target.checked)} />
              {label}
            </label>
          ))}
        </div>
        <div className="explore__filters">
          {POS_FILTERS.map(({ key, label }) => (
            <button
              key={key}
              className={`explore__filter${posFilter === key ? " explore__filter--active" : ""}`}
              onClick={() => setPosFilter(key)}
            >
              {label}
            </button>
          ))}
          <span className="explore__total">
            {synsets === null ? "…" : filtered.length.toLocaleString()} synsets
          </span>
        </div>
      </div>

      <div className="explore__list">
        {synsets === null && <p className="status">Loading…</p>}
        {synsets !== null && filtered.length === 0 && <p className="status">No results.</p>}
        {visible.map((ss) => <SynsetRow key={ss.id} ss={ss} query={q} wholeWord={wholeWord} onClick={() => onNavigate(ss.id)} />)}
        <div ref={sentinelRef} />
      </div>
    </div>
  );
}

function highlight(word: string, query: string, wholeWord: boolean) {
  const text = word.replace(/_/g, " ");
  if (!query) return text;
  if (wholeWord) {
    const re = new RegExp(`\\b(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})\\b`, "i");
    const m = re.exec(text);
    if (!m) return text;
    return (
      <>
        {text.slice(0, m.index)}
        <mark>{m[0]}</mark>
        {text.slice(m.index + m[0].length)}
      </>
    );
  }
  const idx = text.toLowerCase().indexOf(query);
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark>{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
}

const SynsetRow = memo(function SynsetRow({ ss, query, wholeWord, onClick }: { ss: Synset; query: string; wholeWord: boolean; onClick: () => void }) {
  return (
    <div className="synset synset--clickable" onClick={onClick}>
      <span className={`synset__pos synset__pos--${ss.pos}`}>{POS_SHORT[ss.pos]}</span>
      <div className="synset__body">
        <div className="synset__row">
          <span className={`synset__lang${ss.lang !== "en" ? ` synset__lang--${ss.lang}` : ""}`}>{ss.lang.toUpperCase()}</span>
          <span className={`synset__words${ss.lang !== "en" ? ` synset__words--${ss.lang}` : ""}`}>
            {ss.lemmas.map((l, i) => (
              <span key={l.name}>
                {highlight(l.name, query, wholeWord)}
                {i < ss.lemmas.length - 1 ? ", " : ""}
              </span>
            ))}
          </span>
        </div>
      </div>
    </div>
  );
});
