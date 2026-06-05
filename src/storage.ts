import type { RoundRecord, StoredStats } from './types';

const STORAGE_KEY = 'hit-confirm-lab:stats';

export function createEmptyStats(): StoredStats {
  return {
    bestReactionTimeMs: null,
    reactionTimes: [],
    totalRounds: 0,
    successCount: 0,
    wrongPressCount: 0,
    falseStartCount: 0,
    missedCount: 0,
    correctNoPressCount: 0,
    recent: [],
  };
}

export function loadStats(): StoredStats {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return createEmptyStats();
  }

  try {
    return normalizeStats(JSON.parse(raw));
  } catch {
    return createEmptyStats();
  }
}

export function saveStats(stats: StoredStats): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
}

export function resetStats(): StoredStats {
  const empty = createEmptyStats();
  saveStats(empty);
  return empty;
}

export function addRecord(stats: StoredStats, record: RoundRecord): StoredStats {
  const next: StoredStats = {
    ...stats,
    totalRounds: stats.totalRounds + 1,
    recent: [record, ...stats.recent].slice(0, 10),
    reactionTimes:
      record.result === 'success' && record.reactionTimeMs !== null
        ? [...stats.reactionTimes, record.reactionTimeMs]
        : stats.reactionTimes,
  };

  if (record.result === 'success') {
    next.successCount += 1;
    next.bestReactionTimeMs =
      record.reactionTimeMs === null
        ? next.bestReactionTimeMs
        : Math.min(next.bestReactionTimeMs ?? Number.POSITIVE_INFINITY, record.reactionTimeMs);
  }

  if (record.result === 'wrongPress') {
    next.wrongPressCount += 1;
  }

  if (record.result === 'falseStart') {
    next.falseStartCount += 1;
  }

  if (record.result === 'missed') {
    next.missedCount += 1;
  }

  if (record.result === 'correctNoPress') {
    next.correctNoPressCount += 1;
  }

  saveStats(next);
  return next;
}

function normalizeStats(value: unknown): StoredStats {
  const empty = createEmptyStats();
  if (!value || typeof value !== 'object') {
    return empty;
  }

  const candidate = value as Partial<StoredStats>;
  return {
    bestReactionTimeMs: typeof candidate.bestReactionTimeMs === 'number' ? candidate.bestReactionTimeMs : null,
    reactionTimes: Array.isArray(candidate.reactionTimes)
      ? candidate.reactionTimes.filter((time): time is number => typeof time === 'number')
      : [],
    totalRounds: toNumber(candidate.totalRounds),
    successCount: toNumber(candidate.successCount),
    wrongPressCount: toNumber(candidate.wrongPressCount),
    falseStartCount: toNumber(candidate.falseStartCount),
    missedCount: toNumber(candidate.missedCount),
    correctNoPressCount: toNumber(candidate.correctNoPressCount),
    recent: Array.isArray(candidate.recent) ? candidate.recent.slice(0, 10) : [],
  };
}

function toNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}
