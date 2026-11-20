import { useState, useEffect, useCallback } from 'react';
import { CANDY_SPIRIT_ITEMS } from '../data/matchThemes';
import { useFirebase } from '../contexts/FirebaseContext';

export interface KingdomProgressState {
  candyCoins: number;
  unlockedCardIds: string[];
  unlockedPairIds: string[];
  bestTowerFloor: number;
  mergedMaxTier: number;
  mergedSources?: string[];
}

const PROGRESS_EVENT = 'pairmaster-kingdom-progress-updated';
const LAST_UID_KEY = 'pairmaster_kingdom_last_uid_v1';
const STARTER_CARDS = ['cs1', 'cs2', 'cs3'];
const INITIAL_COINS = 120;

function getStorageKey(uid?: string | null): string {
  return `pairmaster_kingdom_progress_v1_${uid || 'guest'}`;
}

function hasStoredProgress(uid?: string | null): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(getStorageKey(uid)) !== null;
  } catch {
    return false;
  }
}

function readProgress(uid?: string | null): KingdomProgressState {
  const defaultState: KingdomProgressState = {
    candyCoins: INITIAL_COINS,
    unlockedCardIds: [...STARTER_CARDS],
    unlockedPairIds: [],
    bestTowerFloor: 0,
    mergedMaxTier: 0,
    mergedSources: [],
  };
  if (typeof window === 'undefined') return defaultState;
  try {
    const raw = localStorage.getItem(getStorageKey(uid));
    if (!raw) return defaultState;
    const parsed = JSON.parse(raw) as Partial<KingdomProgressState>;
    const validIds = new Set(CANDY_SPIRIT_ITEMS.map((i) => i.id));
    const unlockedSet = new Set([
      ...STARTER_CARDS,
      ...(Array.isArray(parsed.unlockedCardIds) ? parsed.unlockedCardIds.filter((id) => validIds.has(id)) : []),
    ]);
    return {
      candyCoins: typeof parsed.candyCoins === 'number' && parsed.candyCoins >= 0 ? Math.floor(parsed.candyCoins) : INITIAL_COINS,
      unlockedCardIds: Array.from(unlockedSet),
      unlockedPairIds: Array.isArray(parsed.unlockedPairIds) ? parsed.unlockedPairIds : [],
      bestTowerFloor: typeof parsed.bestTowerFloor === 'number' ? Math.max(0, parsed.bestTowerFloor) : 0,
      mergedMaxTier: typeof parsed.mergedMaxTier === 'number' ? Math.max(0, parsed.mergedMaxTier) : 0,
      mergedSources: Array.isArray(parsed.mergedSources) ? parsed.mergedSources.filter((s): s is string => typeof s === 'string') : [],
    };
  } catch {
    return defaultState;
  }
}

function writeProgress(uid: string | null | undefined, next: KingdomProgressState) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(getStorageKey(uid), JSON.stringify(next));
    window.dispatchEvent(new CustomEvent(PROGRESS_EVENT, { detail: { uid: uid || 'guest' } }));
  } catch {
    // ignore storage quota errors
  }
}

function migrateProgressIntoUid(targetUid: string): KingdomProgressState {
  const targetExists = hasStoredProgress(targetUid);
  let targetState = readProgress(targetUid);

  if (typeof window === 'undefined') return targetState;

  let prevUid: string | null = null;
  try {
    prevUid = localStorage.getItem(LAST_UID_KEY);
    if (prevUid !== targetUid) {
      localStorage.setItem(LAST_UID_KEY, targetUid);
    }
  } catch {
    prevUid = null;
  }

  const candidateSources = ['guest', prevUid].filter(
    (src): src is string => Boolean(src && src !== targetUid)
  );
  const uniqueSources = Array.from(new Set(candidateSources));

  let changed = false;
  const mergedSources = new Set(targetState.mergedSources || []);

  for (const srcUid of uniqueSources) {
    if (!hasStoredProgress(srcUid) || mergedSources.has(srcUid)) continue;
    const srcState = readProgress(srcUid);
    const hasMeaningfulProgress =
      srcState.candyCoins !== INITIAL_COINS ||
      srcState.unlockedCardIds.length > STARTER_CARDS.length ||
      srcState.unlockedPairIds.length > 0 ||
      srcState.bestTowerFloor > 0 ||
      srcState.mergedMaxTier > 0;

    mergedSources.add(srcUid);

    if (!hasMeaningfulProgress && targetExists) {
      changed = true;
      continue;
    }

    if (!targetExists && !changed) {
      targetState = {
        ...srcState,
        mergedSources: Array.from(new Set([...(srcState.mergedSources || []), ...mergedSources])),
      };
      changed = true;
    } else {
      const bonusDelta = Math.max(0, srcState.candyCoins - INITIAL_COINS);
      targetState = {
        candyCoins: Math.min(999999, targetState.candyCoins + bonusDelta),
        unlockedCardIds: Array.from(new Set([...targetState.unlockedCardIds, ...srcState.unlockedCardIds])),
        unlockedPairIds: Array.from(new Set([...targetState.unlockedPairIds, ...srcState.unlockedPairIds])),
        bestTowerFloor: Math.max(targetState.bestTowerFloor, srcState.bestTowerFloor),
        mergedMaxTier: Math.max(targetState.mergedMaxTier, srcState.mergedMaxTier),
        mergedSources: Array.from(mergedSources),
      };
      changed = true;
    }
  }

  if (changed) {
    targetState = { ...targetState, mergedSources: Array.from(mergedSources) };
    writeProgress(targetUid, targetState);
  }

  return targetState;
}

export function useKingdomProgress() {
  const { user } = useFirebase();
  const uid = user?.uid || 'guest';
  const [progress, setProgress] = useState<KingdomProgressState>(() => migrateProgressIntoUid(uid));

  useEffect(() => {
    setProgress(migrateProgressIntoUid(uid));
  }, [uid]);

  useEffect(() => {
    const onSync = () => {
      setProgress(readProgress(uid));
    };
    window.addEventListener(PROGRESS_EVENT, onSync);
    return () => window.removeEventListener(PROGRESS_EVENT, onSync);
  }, [uid]);

  const updateProgress = useCallback(
    (updater: (prev: KingdomProgressState) => KingdomProgressState) => {
      const current = readProgress(uid);
      const next = updater(current);
      writeProgress(uid, next);
      setProgress(next);
      return next;
    },
    [uid]
  );

  const earnCoins = useCallback(
    (amount: number) => {
      if (amount <= 0) return;
      updateProgress((prev) => ({
        ...prev,
        candyCoins: Math.min(999999, prev.candyCoins + Math.round(amount)),
      }));
    },
    [updateProgress]
  );

  const unlockCardWithCoins = useCallback(
    (itemId: string, cost: number = 80): boolean => {
      const current = readProgress(uid);
      if (current.unlockedCardIds.includes(itemId)) return true;
      if (current.candyCoins < cost) return false;
      updateProgress((prev) => ({
        ...prev,
        candyCoins: prev.candyCoins - cost,
        unlockedCardIds: prev.unlockedCardIds.includes(itemId)
          ? prev.unlockedCardIds
          : [...prev.unlockedCardIds, itemId],
      }));
      return true;
    },
    [uid, updateProgress]
  );

  const unlockCardFree = useCallback(
    (itemId: string): boolean => {
      const current = readProgress(uid);
      if (current.unlockedCardIds.includes(itemId)) return false;
      updateProgress((prev) => ({
        ...prev,
        unlockedCardIds: prev.unlockedCardIds.includes(itemId)
          ? prev.unlockedCardIds
          : [...prev.unlockedCardIds, itemId],
      }));
      return true;
    },
    [uid, updateProgress]
  );

  const pullGachaCard = useCallback(
    (cost: number = 60): { itemId: string; isNew: boolean; refundCoins: number } | null => {
      const current = readProgress(uid);
      if (current.candyCoins < cost) return null;

      const locked = CANDY_SPIRIT_ITEMS.filter((i) => !current.unlockedCardIds.includes(i.id));
      let chosenId: string;
      let isNew = false;
      let refundCoins = 0;

      if (locked.length > 0) {
        // 80% chance to draw a new card when unowned cards remain
        const drawNew = Math.random() < 0.8 || current.unlockedCardIds.length < 6;
        if (drawNew) {
          chosenId = locked[Math.floor(Math.random() * locked.length)].id;
          isNew = true;
        } else {
          const allIds = CANDY_SPIRIT_ITEMS.map((i) => i.id);
          chosenId = allIds[Math.floor(Math.random() * allIds.length)];
          isNew = !current.unlockedCardIds.includes(chosenId);
          if (!isNew) refundCoins = 20;
        }
      } else {
        const allIds = CANDY_SPIRIT_ITEMS.map((i) => i.id);
        chosenId = allIds[Math.floor(Math.random() * allIds.length)];
        refundCoins = 30;
      }

      updateProgress((prev) => ({
        ...prev,
        candyCoins: prev.candyCoins - cost + refundCoins,
        unlockedCardIds: prev.unlockedCardIds.includes(chosenId)
          ? prev.unlockedCardIds
          : [...prev.unlockedCardIds, chosenId],
      }));

      return { itemId: chosenId, isNew, refundCoins };
    },
    [uid, updateProgress]
  );

  const recordCpPairCleared = useCallback(
    (pairId: string) => {
      updateProgress((prev) => ({
        ...prev,
        unlockedPairIds: prev.unlockedPairIds.includes(pairId)
          ? prev.unlockedPairIds
          : [...prev.unlockedPairIds, pairId],
      }));
    },
    [updateProgress]
  );

  const recordTowerFloor = useCallback(
    (floor: number) => {
      updateProgress((prev) => ({
        ...prev,
        bestTowerFloor: Math.max(prev.bestTowerFloor, floor),
      }));
    },
    [updateProgress]
  );

  const recordMergeTier = useCallback(
    (tier: number) => {
      updateProgress((prev) => ({
        ...prev,
        mergedMaxTier: Math.max(prev.mergedMaxTier, tier),
      }));
    },
    [updateProgress]
  );

  return {
    progress,
    earnCoins,
    unlockCardWithCoins,
    unlockCardFree,
    pullGachaCard,
    recordCpPairCleared,
    recordTowerFloor,
    recordMergeTier,
  };
}
