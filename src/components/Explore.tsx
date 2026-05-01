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

export function Explore() {
  const [synsets, setSynsets] = useState<Synset[] | null>(null);
  const [search, setSearch] = useState("");
  const [posFilter, setPosFilter] = useState<PosFilter>("all");
  const [count, setCount] = useState(PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const deferredSearch = useDeferredValue(search);

  useEffect(() => { loadSynsets().then(setSynsets); }, []);

  const filtered = useMemo(() => {
    if (!synsets) return [];
    const q = deferredSearch.trim().toLowerCase();
    return synsets.filter((ss) => {
      if (posFilter !== "all") {
        const posMatch = posFilter === "a" ? ss.pos === "a" || ss.pos === "s" : ss.pos === posFilter;
        if (!posMatch) return false;
      }
      if (q) return ss.en?.some((w) => w.toLowerCase().includes(q)) || ss.it?.some((w) => w.toLowerCase().includes(q));
      return true;
    });
  }, [synsets, deferredSearch, posFilter]);

  useEffect(() => { setCount(PAGE_SIZE); }, [deferredSearch, posFilter]);

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
        {visible.map((ss) => <SynsetRow key={ss.id} ss={ss} query={q} />)}
        <div ref={sentinelRef} />
      </div>
    </div>
  );
}

function highlight(word: string, query: string) {
  const text = word.replace(/_/g, " ");
  if (!query) return text;
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

const SynsetRow = memo(function SynsetRow({ ss, query }: { ss: Synset; query: string }) {
  return (
    <div className="synset">
      <span className={`synset__pos synset__pos--${ss.pos}`}>{POS_SHORT[ss.pos]}</span>
      <div className="synset__body">
        {ss.en && ss.en.length > 0 && (
          <div className="synset__row">
            <span className="synset__lang">EN</span>
            <span className="synset__words">
              {ss.en.map((w, i) => (
                <span key={w}>{highlight(w, query)}{i < ss.en!.length - 1 ? ", " : ""}</span>
              ))}
            </span>
          </div>
        )}
        {ss.it && ss.it.length > 0 && (
          <div className="synset__row">
            <span className="synset__lang synset__lang--it">IT</span>
            <span className="synset__words synset__words--it">
              {ss.it.map((w, i) => (
                <span key={w}>{highlight(w, query)}{i < ss.it!.length - 1 ? ", " : ""}</span>
              ))}
            </span>
          </div>
        )}
      </div>
    </div>
  );
});
