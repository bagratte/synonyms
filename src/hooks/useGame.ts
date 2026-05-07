import { useState, useEffect, useCallback } from "react";
import { loadSynsets, loadSynsetsByILI } from "../data/loader";
import type { Card, Lang, LangFilter, Option, Synset } from "../data/types";

const OPTIONS_COUNT = 6;
const MAX_CORRECT = 5;

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

function getLemmas(group: Synset[], filter: LangFilter): { word: string; lang: Lang; synsetId: string }[] {
  return group.flatMap((ss) =>
    filter[ss.lang] ? ss.lemmas.map((l) => ({ word: l.name, lang: ss.lang, synsetId: ss.id })) : []
  );
}

function buildCard(
  synsets: Synset[],
  filter: LangFilter,
  byPos: Map<string, Synset[]>,
  byHypernym: Map<string, Synset[]>,
  byILI: Map<string, Synset[]>
): Card | null {
  function getGroup(ss: Synset): Synset[] {
    return ss.ili ? (byILI.get(ss.ili) ?? [ss]) : [ss];
  }

  const eligible = synsets.filter((ss) => getLemmas(getGroup(ss), filter).length >= 2);
  if (eligible.length === 0) return null;

  const ss = pickRandom(eligible);
  const group = getGroup(ss);
  const lemmas = shuffle(getLemmas(group, filter));

  const promptEntry = lemmas[0];
  const remaining = lemmas.slice(1);

  const maxCorrect = Math.min(remaining.length, MAX_CORRECT, OPTIONS_COUNT - 1);
  const numCorrect = Math.floor(Math.random() * maxCorrect) + 1;
  const correctWords = remaining.slice(0, numCorrect);

  const numDistractors = OPTIONS_COUNT - correctWords.length;
  const usedWords = new Set([promptEntry.word, ...correctWords.map((l) => l.word)]);
  const groupIds = new Set(group.map((s) => s.id));

  // Collect hypernyms from all synsets in the group (mainly OEWN will have them)
  const allHypernyms = new Set<string>();
  for (const s of group) {
    for (const hId of s.hypernyms ?? []) allHypernyms.add(hId);
  }

  // Sibling pool: co-hyponyms sharing a hypernym, same POS, not in current group
  const siblingSet = new Set<Synset>();
  for (const hId of allHypernyms) {
    for (const sibling of byHypernym.get(hId) ?? []) {
      if (sibling.pos === ss.pos && !groupIds.has(sibling.id)) siblingSet.add(sibling);
    }
  }

  // Deduplicate sibling groups by ILI: one entry per ILI group
  const seenILI = new Set<string>();
  const siblingGroups: Synset[][] = [];
  for (const sibling of shuffle([...siblingSet])) {
    const key = sibling.ili ?? sibling.id;
    if (!seenILI.has(key)) {
      seenILI.add(key);
      siblingGroups.push(getGroup(sibling));
    }
  }

  // Fallback: same POS, not already in sibling groups or current group
  const siblingIds = new Set(siblingGroups.flat().map((s) => s.id));
  const fallbackGroups = shuffle(
    (byPos.get(ss.pos) ?? []).filter((s) => !groupIds.has(s.id) && !siblingIds.has(s.id))
  ).map(getGroup);

  const distractors: Option[] = [];
  for (const candidateGroup of [...siblingGroups, ...fallbackGroups]) {
    if (distractors.length >= numDistractors) break;
    const candidateLemmas = getLemmas(candidateGroup, filter).filter((l) => !usedWords.has(l.word));
    if (candidateLemmas.length === 0) continue;
    const chosen = pickRandom(candidateLemmas);
    usedWords.add(chosen.word);
    distractors.push({ ...chosen, correct: false });
  }

  const options: Option[] = shuffle([
    ...correctWords.map((l) => ({ ...l, correct: true })),
    ...distractors,
  ]);

  return {
    prompt: promptEntry.word,
    promptLang: promptEntry.lang,
    synsetId: ss.id,
    options,
    def: ss.def,
    examples: ss.examples,
  };
}

export function useGame(filter: LangFilter) {
  const [synsets, setSynsets] = useState<Synset[] | null>(null);
  const [byPos, setByPos] = useState<Map<string, Synset[]>>(new Map());
  const [byHypernym, setByHypernym] = useState<Map<string, Synset[]>>(new Map());
  const [byILI, setByILI] = useState<Map<string, Synset[]>>(new Map());
  const [card, setCard] = useState<Card | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    Promise.all([loadSynsets(), loadSynsetsByILI()]).then(([data, iliMap]) => {
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
      setByILI(iliMap);
    });
  }, []);

  const nextCard = useCallback(() => {
    if (!synsets) return;
    setCard(buildCard(synsets, filter, byPos, byHypernym, byILI));
    setSelected(new Set());
    setSubmitted(false);
  }, [synsets, filter, byPos, byHypernym, byILI]);

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
