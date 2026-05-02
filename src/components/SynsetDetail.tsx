import { useState, useEffect } from "react";
import { loadSynsetMap } from "../data/loader";
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

function LemmaBlock({ lemma, onNavigate }: { lemma: Lemma; onNavigate: (id: string) => void }) {
  if (!lemma.count && !lemma.antonyms?.length) return null;

  return (
    <div className="detail__lemma">
      <div className="detail__lemma-header">
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

export function SynsetDetail({ synsetId, onNavigate, onBack, backLabel }: Props) {
  const [ssMap, setSsMap] = useState<Map<string, Synset> | null>(null);

  useEffect(() => {
    loadSynsetMap().then(setSsMap);
  }, []);

  if (!ssMap) {
    return (
      <div className="detail">
        <p className="status">Loading…</p>
      </div>
    );
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

  const allLemmas = [...(ss.en ?? []), ...(ss.it ?? [])];
  const hasLemmaDetails = allLemmas.some((l) => l.count || l.antonyms?.length);

  return (
    <div className="detail">
      <button className="detail__back" onClick={onBack}>← {backLabel}</button>

      <div className="detail__card">
        <div className="detail__meta">
          <span className={`synset__pos synset__pos--${ss.pos}`}>{POS_FULL[ss.pos]}</span>
          <span className="detail__id">{ss.id}</span>
          <span className="detail__lexname">{ss.lexname.replace(".", " · ")}</span>
        </div>

        <div className="detail__lemmas">
          {ss.en && ss.en.length > 0 && (
            <div className="synset__row">
              <span className="synset__lang">EN</span>
              <span className="synset__words detail__words">
                {ss.en.map((l, i) => (
                  <span key={l.name}>
                    {l.name.replace(/_/g, " ")}
                    {l.count ? <sup className="detail__freq">{l.count}</sup> : null}
                    {i < ss.en!.length - 1 ? ", " : ""}
                  </span>
                ))}
              </span>
            </div>
          )}
          {ss.it && ss.it.length > 0 && (
            <div className="synset__row">
              <span className="synset__lang synset__lang--it">IT</span>
              <span className="synset__words synset__words--it detail__words">
                {ss.it.map((l, i) => (
                  <span key={l.name}>
                    {l.name.replace(/_/g, " ")}
                    {l.count ? <sup className="detail__freq">{l.count}</sup> : null}
                    {i < ss.it!.length - 1 ? ", " : ""}
                  </span>
                ))}
              </span>
            </div>
          )}
        </div>

        <p className="detail__def">"{ss.def}"</p>

        {ss.examples && ss.examples.length > 0 && (
          <ul className="detail__examples">
            {ss.examples.map((ex, i) => (
              <li key={i} className="detail__example">{ex}</li>
            ))}
          </ul>
        )}

        {hasLemmaDetails && (
          <div className="detail__lemma-details">
            <div className="detail__section-title">Lemma details</div>
            {allLemmas.map((l) => (
              <LemmaBlock key={l.name} lemma={l} onNavigate={onNavigate} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
