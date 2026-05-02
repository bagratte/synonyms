import { useState, useEffect, useCallback } from "react";
import { loadSynsets } from "../data/loader";
import type { Card, Lang, LangFilter, Option, Synset } from "../data/types";
import { LANGS } from "../data/types";

const OPTIONS_COUNT = 6;
const MAX_CORRECT = 5; // at most 5 correct, so there's always ≥1 distractor slot

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function getLemmas(ss: Synset, filter: LangFilter): { word: string; lang: Lang }[] {
  const result: { word: string; lang: Lang }[] = [];
  for (const lang of LANGS) {
    if (!filter[lang]) continue;
    for (const l of ss[lang] ?? []) result.push({ word: l.name, lang });
  }
  return result;
}

function buildCard(
  synsets: Synset[],
  filter: LangFilter,
  byPos: Map<string, Synset[]>,
  byHypernym: Map<string, Synset[]>
): Card | null {
  // Eligible synsets: have at least 2 lemmas in the active language(s)
  const eligible = synsets.filter((ss) => getLemmas(ss, filter).length >= 2);
  if (eligible.length === 0) return null;

  const ss = pickRandom(eligible);
  const lemmas = shuffle(getLemmas(ss, filter));

  // Pick prompt word
  const promptEntry = lemmas[0];
  const remaining = lemmas.slice(1);

  // Correct answers: remaining lemmas from same synset, capped randomly
  const maxCorrect = Math.min(remaining.length, MAX_CORRECT, OPTIONS_COUNT - 1);
  const numCorrect = Math.floor(Math.random() * maxCorrect) + 1;
  const correctWords = remaining.slice(0, numCorrect);

  // Distractors: prefer semantic siblings (co-hyponyms), fall back to same-POS
  const numDistractors = OPTIONS_COUNT - correctWords.length;
  const usedWords = new Set([promptEntry.word, ...correctWords.map((l) => l.word)]);
  const distractors: Option[] = [];

  // Build sibling pool: synsets sharing a hypernym with ss, same POS
  const siblingSet = new Set<Synset>();
  for (const hId of ss.hypernyms ?? []) {
    for (const sibling of byHypernym.get(hId) ?? []) {
      if (sibling.id !== ss.id && sibling.pos === ss.pos) siblingSet.add(sibling);
    }
  }
  const siblings = shuffle([...siblingSet]);
  const siblingIds = new Set(siblings.map((s) => s.id));
  const fallback = shuffle((byPos.get(ss.pos) ?? []).filter((s) => !siblingIds.has(s.id)));
  const candidatePool = [...siblings, ...fallback];

  for (const candidate of candidatePool) {
    if (distractors.length >= numDistractors) break;
    if (candidate.id === ss.id) continue;
    const candidateLemmas = getLemmas(candidate, filter).filter(
      (l) => !usedWords.has(l.word)
    );
    if (candidateLemmas.length === 0) continue;
    const chosen = pickRandom(candidateLemmas);
    usedWords.add(chosen.word);
    distractors.push({ ...chosen, correct: false });
  }

  const options: Option[] = shuffle([
    ...correctWords.map((l) => ({ ...l, correct: true })),
    ...distractors,
  ]);

  const lang = promptEntry.lang;
  return {
    prompt: promptEntry.word,
    promptLang: lang,
    synsetId: ss.id,
    options,
    def: ss.def[lang],
    examples: ss.examples?.[lang],
  };
}

export function useGame(filter: LangFilter) {
  const [synsets, setSynsets] = useState<Synset[] | null>(null);
  const [byPos, setByPos] = useState<Map<string, Synset[]>>(new Map());
  const [byHypernym, setByHypernym] = useState<Map<string, Synset[]>>(new Map());
  const [card, setCard] = useState<Card | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    loadSynsets().then((data) => {
      const posMap = new Map<string, Synset[]>();
      const hypMap = new Map<string, Synset[]>();
      for (const ss of data) {
        const posList = posMap.get(ss.pos) ?? [];
        posList.push(ss);
        posMap.set(ss.pos, posList);
        for (const hId of ss.hypernyms ?? []) {
          const hList = hypMap.get(hId) ?? [];
          hList.push(ss);
          hypMap.set(hId, hList);
        }
      }
      setSynsets(data);
      setByPos(posMap);
      setByHypernym(hypMap);
    });
  }, []);

  const nextCard = useCallback(() => {
    if (!synsets) return;
    setCard(buildCard(synsets, filter, byPos, byHypernym));
    setSelected(new Set());
    setSubmitted(false);
  }, [synsets, filter, byPos, byHypernym]);

  useEffect(() => {
    if (synsets) nextCard();
  }, [synsets, filter]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = useCallback((word: string) => {
    if (submitted) return;
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(word) ? next.delete(word) : next.add(word);
      return next;
    });
  }, [submitted]);

  const submit = useCallback(() => {
    if (selected.size === 0 || submitted) return;
    setSubmitted(true);
  }, [selected, submitted]);

  return { card, selected, submitted, toggle, submit, nextCard, loading: !synsets };
}
