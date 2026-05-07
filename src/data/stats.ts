const STATS_KEY = "synsetStats";

export interface SynsetStats {
  seen: number;
  correctFound: number;
  correctMissed: number;
  wrongPicked: number;
  lastSeen: number;
}

export type StatsMap = Record<string, SynsetStats>;

export function loadStats(): StatsMap {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveStats(stats: StatsMap): void {
  localStorage.setItem(STATS_KEY, JSON.stringify(stats));
}

export function getPerformance(s: SynsetStats | undefined): number {
  if (!s) return 0;
  const denom = s.correctFound + s.correctMissed + 2 * s.wrongPicked;
  return denom === 0 ? 0 : s.correctFound / denom;
}

export function getWeight(s: SynsetStats | undefined): number {
  return 1 - getPerformance(s);
}

export function recordResult(
  stats: StatsMap,
  synsetId: string,
  correctFound: number,
  correctMissed: number,
  wrongPicked: number
): StatsMap {
  const prev = stats[synsetId] ?? { seen: 0, correctFound: 0, correctMissed: 0, wrongPicked: 0, lastSeen: 0 };
  return {
    ...stats,
    [synsetId]: {
      seen: prev.seen + 1,
      correctFound: prev.correctFound + correctFound,
      correctMissed: prev.correctMissed + correctMissed,
      wrongPicked: prev.wrongPicked + wrongPicked,
      lastSeen: Date.now(),
    },
  };
}
