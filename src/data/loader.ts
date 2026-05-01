import type { Synset } from "./types";

let cache: Synset[] | null = null;

export async function loadSynsets(): Promise<Synset[]> {
  if (cache) return cache;
  const res = await fetch("/synsets.json");
  cache = await res.json();
  return cache!;
}
