import { useState, useEffect } from "react";
import { loadSynsetMap, loadSynsetsByILI } from "../data/loader";
import type { Lemma, LemmaRef, Synset } from "../data/types";

interface Props {
  synsetId: string;
  onNavigate: (id: string) => void;
  onBack: () => void;
  backLabel: string;
}

const POS_FULL: Record<string, string> = { n: "noun", v: "verb", a: "adj", s: "adj", r: "adv" };

function LemmaRefChip({ data, onClick }: { data: LemmaRef; onClick: () => void }) {
  return (
    <button className="lemma-ref" onClick={onClick}>
      {data.lemma.replace(/_/g, " ")}
    </button>
  );
}

function LemmaBlock({ lemma, lang, onNavigate }: { lemma: Lemma; lang: string; onNavigate: (id: string) => void }) {
  if (!lemma.count && !lemma.antonyms?.length) return null;
  return (
    <div className="detail__lemma">
      <div className="detail__lemma-header">
        <span className={`synset__lang${lang !== "en" ? ` synset__lang--${lang}` : ""}`}>{lang.toUpperCase()}</span>
        <span className="detail__lemma-name">{lemma.name.replace(/_/g, " ")}</span>
        {!!lemma.count && <span className="detail__lemma-count">freq {lemma.count}</span>}
      </div>
      {lemma.antonyms && lemma.antonyms.length > 0 && (
        <div className="detail__lemma-attr">
          <span className="detail__lemma-attr-label">antonyms</span>
          <span className="detail__lemma-attr-values">
            {lemma.antonyms.map((r) => (
              <LemmaRefChip key={r.synset + r.lemma} data={r} onClick={() => onNavigate(r.synset)} />
            ))}
          </span>
        </div>
      )}
    </div>
  );
}

function SynsetBlock({ ss, onNavigate }: { ss: Synset; onNavigate: (id: string) => void }) {
  const hasLemmaDetails = ss.lemmas.some((l) => l.count || l.antonyms?.length);
  return (
    <div className="detail__synset-block">
      <div className="detail__lemmas">
        <div className="synset__row">
          <span className={`synset__lang${ss.lang !== "en" ? ` synset__lang--${ss.lang}` : ""}`}>{ss.lang.toUpperCase()}</span>
          <span className={`synset__words${ss.lang !== "en" ? ` synset__words--${ss.lang}` : ""} detail__words`}>
            {ss.lemmas.map((l, i) => (
              <span key={l.name}>
                {l.name.replace(/_/g, " ")}
                {l.count ? <sup className="detail__freq">{l.count}</sup> : null}
                {i < ss.lemmas.length - 1 ? ", " : ""}
              </span>
            ))}
          </span>
        </div>
      </div>

      {ss.def && (
        <div className="detail__defs">
          <p className="detail__def">
            <span className={`synset__lang${ss.lang !== "en" ? ` synset__lang--${ss.lang}` : ""}`}>{ss.lang.toUpperCase()}</span>
            "{ss.def}"
          </p>
        </div>
      )}

      {ss.examples && ss.examples.length > 0 && (
        <div className="detail__examples">
          <ul className="detail__example-group">
            <span className={`synset__lang${ss.lang !== "en" ? ` synset__lang--${ss.lang}` : ""}`}>{ss.lang.toUpperCase()}</span>
            {ss.examples.map((ex, i) => (
              <li key={i} className="detail__example">{ex}</li>
            ))}
          </ul>
        </div>
      )}

      {hasLemmaDetails && (
        <div className="detail__lemma-details">
          <div className="detail__section-title">Lemma details</div>
          {ss.lemmas.map((l) => (
            <LemmaBlock key={l.name} lemma={l} lang={ss.lang} onNavigate={onNavigate} />
          ))}
        </div>
      )}
    </div>
  );
}

export function SynsetDetail({ synsetId, onNavigate, onBack, backLabel }: Props) {
  const [ssMap, setSsMap] = useState<Map<string, Synset> | null>(null);
  const [byILI, setByILI] = useState<Map<string, Synset[]> | null>(null);

  useEffect(() => {
    Promise.all([loadSynsetMap(), loadSynsetsByILI()]).then(([map, ili]) => {
      setSsMap(map);
      setByILI(ili);
    });
  }, []);

  if (!ssMap || !byILI) {
    return <div className="detail"><p className="status">Loading…</p></div>;
  }

  const ss = ssMap.get(synsetId);
  if (!ss) {
    return (
      <div className="detail">
        <button className="detail__back" onClick={onBack}>← {backLabel}</button>
        <p className="status">Synset not found.</p>
      </div>
    );
  }

  const iliGroup = ss.ili ? (byILI.get(ss.ili) ?? [ss]) : [ss];
  const linked = iliGroup.filter((s) => s.id !== ss.id);

  return (
    <div className="detail">
      <button className="detail__back" onClick={onBack}>← {backLabel}</button>

      <div className="detail__card">
        <div className="detail__meta">
          <span className={`synset__pos synset__pos--${ss.pos}`}>{POS_FULL[ss.pos]}</span>
          <span className="detail__id">{ss.id}</span>
          {ss.lexname && <span className="detail__lexname">{ss.lexname.replace(".", " · ")}</span>}
        </div>

        <SynsetBlock ss={ss} onNavigate={onNavigate} />

        {linked.length > 0 && (
          <div className="detail__linked">
            <div className="detail__section-title">In other languages</div>
            {linked.map((s) => (
              <div key={s.id} className="detail__linked-entry" onClick={() => onNavigate(s.id)} role="button" tabIndex={0}>
                <SynsetBlock ss={s} onNavigate={onNavigate} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
