import type { Synset } from "./types";

let cache: Synset[] | null = null;
let mapCache: Map<string, Synset> | null = null;

export async function loadSynsets(): Promise<Synset[]> {
  if (cache) return cache;
  const res = await fetch("/synsets.json");
  cache = await res.json();
  return cache!;
}

export async function loadSynsetMap(): Promise<Map<string, Synset>> {
  if (mapCache) return mapCache;
  const synsets = await loadSynsets();
  mapCache = new Map(synsets.map((ss) => [ss.id, ss]));
  return mapCache;
}
