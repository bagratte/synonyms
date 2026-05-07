import type { Synset } from "./types";

let cache: Synset[] | null = null;
let mapCache: Map<string, Synset> | null = null;
let iliCache: Map<string, Synset[]> | null = null;

export async function loadSynsets(): Promise<Synset[]> {
  if (cache) return cache;
  const res = await fetch(`${import.meta.env.BASE_URL}synsets.json`);
  cache = await res.json();
  return cache!;
}

export async function loadSynsetMap(): Promise<Map<string, Synset>> {
  if (mapCache) return mapCache;
  const synsets = await loadSynsets();
  mapCache = new Map(synsets.map((ss) => [ss.id, ss]));
  return mapCache;
}

export async function loadSynsetsByILI(): Promise<Map<string, Synset[]>> {
  if (iliCache) return iliCache;
  const synsets = await loadSynsets();
  iliCache = new Map();
  for (const ss of synsets) {
    if (!ss.ili) continue;
    const list = iliCache.get(ss.ili) ?? [];
    list.push(ss);
    iliCache.set(ss.ili, list);
  }
  return iliCache;
}
