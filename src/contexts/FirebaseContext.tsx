import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  limit,
  Timestamp,
} from 'firebase/firestore';
import {
  auth,
  db,
  googleProvider,
  handleFirestoreError,
  OperationType,
} from '../firebase';
import { CANDY_SPIRIT_ITEMS, MatchTheme, ThemeItem } from '../data/matchThemes';
import { CompatibilityResult } from '../utils/compatibilityCalc';

// Constants synchronized verbatim with firebase-blueprint.json & firestore.rules
const ID_REGEX = /^[a-zA-Z0-9_\-]+$/;
const MBTI_REGEX = /^[EI][SN][TF][JP]$/;

function clampString(val: string | undefined | null, maxLen: number, fallback: string): string {
  const trimmed = (val ?? '').trim();
  if (!trimmed) return fallback;
  return trimmed.slice(0, maxLen);
}

function sanitizeId(val: string | undefined | null, maxLen: number, fallback: string): string {
  const cleaned = (val ?? '').replace(/[^a-zA-Z0-9_\-]/g, '-').slice(0, maxLen);
  if (!cleaned || !ID_REGEX.test(cleaned)) return fallback;
  return cleaned;
}

export interface CloudUserScore {
  id: string;
  userId: string;
  gameMode: 'flip' | 'link';
  themeId: string;
  themeName: string;
  difficultyId: string;
  highScore: number;
  bestTimeSec: number;
  maxCombo?: number;
  stars: number;
}

export interface CloudCompatibilityLog {
  id: string;
  userId: string;
  personAName: string;
  personAZodiac: string;
  personAMbti: string;
  personBName: string;
  personBZodiac: string;
  personBMbti: string;
  relationType: 'love' | 'friend' | 'work' | 'creative';
  overallScore: number;
  verdict: string;
  createdAtMs: number;
}

export interface CloudLeaderboardEntry {
  id: string;
  userId: string;
  displayName: string;
  gameMode: 'flip' | 'link';
  themeId: string;
  themeName: string;
  difficultyId: string;
  highScore: number;
  bestTimeSec: number;
  stars: number;
  isPublic: boolean;
}

interface SaveGameScoreInput {
  gameMode: 'flip' | 'link';
  themeId: string;
  themeName: string;
  difficultyId: string;
  score: number;
  timeSec: number;
  maxCombo?: number;
  stars: number;
}

interface FirebaseContextValue {
  user: User | null;
  authReady: boolean;
  isAuthBusy: boolean;
  cloudError: string | null;
  clearCloudError: () => void;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
  scoresMap: Record<string, CloudUserScore>;
  getCloudHighScore: (gameMode: 'flip' | 'link', difficultyId: string, themeId: string) => number;
  saveGameScore: (input: SaveGameScoreInput) => Promise<void>;
  cloudCustomTheme: MatchTheme | null;
  saveCustomTheme: (theme: MatchTheme) => Promise<void>;
  compatibilityLogs: CloudCompatibilityLog[];
  saveCompatibilityLog: (
    result: CompatibilityResult,
    relationType: 'love' | 'friend' | 'work' | 'creative'
  ) => Promise<void>;
  deleteCompatibilityLog: (logId: string) => Promise<void>;
}

const FirebaseContext = createContext<FirebaseContextValue | null>(null);

function rehydrateThemeItems(rawItems: unknown[]): ThemeItem[] {
  const spiritById = new Map(CANDY_SPIRIT_ITEMS.map((s) => [s.id, s]));
  const spiritByName = new Map(CANDY_SPIRIT_ITEMS.map((s) => [s.name, s]));

  return rawItems
    .filter((it): it is Record<string, unknown> => Boolean(it && typeof it === 'object'))
    .map((it, idx) => {
      const id = typeof it.id === 'string' ? it.id : `custom_${idx}`;
      const name = typeof it.name === 'string' ? it.name : '糖果夥伴';
      const symbol = typeof it.symbol === 'string' ? it.symbol : '🍬';
      const color = typeof it.color === 'string' ? it.color : 'text-pink-500';
      const spiritRefId = typeof it.spiritRefId === 'string' ? it.spiritRefId : undefined;

      const matchedSpirit =
        (spiritRefId ? spiritById.get(spiritRefId) : undefined) || spiritByName.get(name);

      return {
        id,
        name,
        symbol,
        color,
        imageUrl: matchedSpirit?.imageUrl,
      };
    });
}

function serializeThemeItems(items: ThemeItem[]) {
  const spiritByName = new Map(CANDY_SPIRIT_ITEMS.map((s) => [s.name, s.id]));
  const spiritByImg = new Map(
    CANDY_SPIRIT_ITEMS.filter((s) => s.imageUrl).map((s) => [s.imageUrl!, s.id])
  );

  return items.slice(0, 24).map((it, idx) => {
    const spiritRefId =
      (it.imageUrl ? spiritByImg.get(it.imageUrl) : undefined) || spiritByName.get(it.name);

    const serialized: {
      id: string;
      name: string;
      symbol: string;
      color: string;
      spiritRefId?: string;
    } = {
      id: sanitizeId(it.id, 64, `item_${idx}`),
      name: clampString(it.name, 40, '萌趣公仔'),
      symbol: clampString(it.symbol, 16, '🌸'),
      color: clampString(it.color, 40, 'text-pink-500'),
    };
    if (spiritRefId) {
      serialized.spiritRefId = clampString(spiritRefId, 32, 'cs1');
    }
    return serialized;
  });
}

export const FirebaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [isAuthBusy, setIsAuthBusy] = useState(false);
  const [cloudError, setCloudError] = useState<string | null>(null);

  const [scoresMap, setScoresMap] = useState<Record<string, CloudUserScore>>({});
  const [cloudCustomTheme, setCloudCustomTheme] = useState<MatchTheme | null>(null);
  const [compatibilityLogs, setCompatibilityLogs] = useState<CloudCompatibilityLog[]>([]);

  const profileEnsuredUidRef = useRef<string | null>(null);
  const inFlightProfileRef = useRef<{ uid: string; promise: Promise<void> } | null>(null);

  const clearCloudError = useCallback(() => setCloudError(null), []);

  const reportFriendlyError = useCallback((err: unknown) => {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('Quota exceeded')) {
      setCloudError('今日 Firebase 免費讀寫額度已達上限，明日會自動重設；本地遊戲依然可正常遊玩！');
    } else if (msg.includes('popup-closed-by-user') || msg.includes('cancelled-popup-request')) {
      // User closed login popup intentionally, no noisy alert needed
    } else if (msg.includes('popup-blocked')) {
      setCloudError('瀏覽器攔截了 Google 登入視窗，請允許彈出視窗後再試一次。');
    } else if (
      msg.includes('client is offline') ||
      msg.includes('unavailable') ||
      msg.includes('network-request-failed')
    ) {
      setCloudError('暫時未能連線到雲端伺服器（請檢查網絡或 VPN 設定），本地記錄仍安全保存。');
    } else {
      setCloudError('雲端同步暫時未能完成，請稍後再試（本地記錄仍安全保存）。');
    }
  }, []);

  const ensureUserProfile = useCallback(async (currentUser: User) => {
    if (!currentUser.emailVerified) return;
    if (profileEnsuredUidRef.current === currentUser.uid) return;
    if (inFlightProfileRef.current?.uid === currentUser.uid) {
      return inFlightProfileRef.current.promise;
    }

    const run = (async () => {
      const path = `users/${currentUser.uid}`;
      const userRef = doc(db, 'users', currentUser.uid);
      const displayName = clampString(currentUser.displayName, 60, '糖果玩家');
      const photoURL = currentUser.photoURL ? currentUser.photoURL.slice(0, 500) : '';

      try {
        const snap = await getDoc(userRef);
        if (!snap.exists()) {
          const payload: Record<string, unknown> = {
            uid: currentUser.uid,
            displayName,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          };
          if (photoURL) payload.photoURL = photoURL;

          await setDoc(userRef, payload);
        } else {
          const existing = snap.data();
          if (existing.displayName !== displayName || (photoURL && existing.photoURL !== photoURL)) {
            const updates: Record<string, unknown> = {
              displayName,
              updatedAt: serverTimestamp(),
            };
            if (photoURL) updates.photoURL = photoURL;
            await updateDoc(userRef, updates);
          }
        }
        profileEnsuredUidRef.current = currentUser.uid;
        setCloudError(null);
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, path);
      } finally {
        if (inFlightProfileRef.current?.uid === currentUser.uid) {
          inFlightProfileRef.current = null;
        }
      }
    })();

    inFlightProfileRef.current = { uid: currentUser.uid, promise: run };
    return run;
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthReady(true);
      if (!currentUser) {
        profileEnsuredUidRef.current = null;
        inFlightProfileRef.current = null;
        setScoresMap({});
        setCloudCustomTheme(null);
        setCompatibilityLogs([]);
      } else if (currentUser.emailVerified) {
        ensureUserProfile(currentUser).catch((err) => {
          reportFriendlyError(err);
        });
      }
    });
    return () => unsub();
  }, [ensureUserProfile, reportFriendlyError]);

  // Attach Firestore listeners ONLY when auth is ready and user is authenticated & verified
  useEffect(() => {
    if (!authReady || !user || !user.emailVerified) return;

    const scoresPath = `users/${user.uid}/scores`;
    const scoresQuery = query(
      collection(db, 'users', user.uid, 'scores'),
      where('userId', '==', user.uid)
    );
    const unsubScores = onSnapshot(
      scoresQuery,
      (snapshot) => {
        const nextMap: Record<string, CloudUserScore> = {};
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          nextMap[docSnap.id] = {
            id: docSnap.id,
            userId: String(data.userId ?? user.uid),
            gameMode: data.gameMode === 'link' ? 'link' : 'flip',
            themeId: String(data.themeId ?? ''),
            themeName: String(data.themeName ?? ''),
            difficultyId: String(data.difficultyId ?? ''),
            highScore: Number(data.highScore ?? 0),
            bestTimeSec: Number(data.bestTimeSec ?? 0),
            maxCombo: typeof data.maxCombo === 'number' ? data.maxCombo : undefined,
            stars: Number(data.stars ?? 1),
          };
        });
        setScoresMap(nextMap);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, scoresPath);
      }
    );

    const customThemePath = `users/${user.uid}/customThemes`;
    const customThemeQuery = query(
      collection(db, 'users', user.uid, 'customThemes'),
      where('userId', '==', user.uid),
      limit(1)
    );
    const unsubThemes = onSnapshot(
      customThemeQuery,
      (snapshot) => {
        if (snapshot.empty) {
          setCloudCustomTheme(null);
          return;
        }
        const data = snapshot.docs[0].data();
        const rawItems = Array.isArray(data.items) ? data.items : [];
        const hydrated = rehydrateThemeItems(rawItems);
        if (hydrated.length >= 6) {
          const restored: MatchTheme = {
            id: 'custom-theme',
            name: String(data.name ?? '自訂糖果隊'),
            enName: 'Custom Sweet Deck',
            description: '雲端同步的自訂糖果色公仔牌組',
            icon: String(data.icon ?? '🎨'),
            items: hydrated,
          };
          setCloudCustomTheme(restored);
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, customThemePath);
      }
    );

    const logsPath = `users/${user.uid}/compatibilityLogs`;
    const logsQuery = query(
      collection(db, 'users', user.uid, 'compatibilityLogs'),
      where('userId', '==', user.uid),
      limit(30)
    );
    const unsubLogs = onSnapshot(
      logsQuery,
      (snapshot) => {
        const list: CloudCompatibilityLog[] = snapshot.docs.map((d) => {
          const data = d.data();
          const ts = data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : Date.now();
          return {
            id: d.id,
            userId: String(data.userId ?? user.uid),
            personAName: String(data.personAName ?? ''),
            personAZodiac: String(data.personAZodiac ?? ''),
            personAMbti: String(data.personAMbti ?? 'INFJ'),
            personBName: String(data.personBName ?? ''),
            personBZodiac: String(data.personBZodiac ?? ''),
            personBMbti: String(data.personBMbti ?? 'ENFP'),
            relationType: (data.relationType as CloudCompatibilityLog['relationType']) || 'love',
            overallScore: Number(data.overallScore ?? 0),
            verdict: String(data.verdict ?? ''),
            createdAtMs: ts,
          };
        });
        list.sort((a, b) => b.createdAtMs - a.createdAtMs);
        setCompatibilityLogs(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, logsPath);
      }
    );

    return () => {
      unsubScores();
      unsubThemes();
      unsubLogs();
    };
  }, [authReady, user]);

  const signInWithGoogle = useCallback(async () => {
    setIsAuthBusy(true);
    setCloudError(null);
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      if (cred.user && !cred.user.emailVerified) {
        setCloudError('您的 Google 帳號電郵尚未完成驗證，暫時無法寫入雲端存檔。');
      } else if (cred.user) {
        await ensureUserProfile(cred.user);
      }
    } catch (err) {
      reportFriendlyError(err);
    } finally {
      setIsAuthBusy(false);
    }
  }, [ensureUserProfile, reportFriendlyError]);

  const signOutUser = useCallback(async () => {
    setIsAuthBusy(true);
    try {
      await signOut(auth);
    } catch (err) {
      reportFriendlyError(err);
    } finally {
      setIsAuthBusy(false);
    }
  }, [reportFriendlyError]);

  const getCloudHighScore = useCallback(
    (gameMode: 'flip' | 'link', difficultyId: string, themeId: string) => {
      const key = `${sanitizeId(gameMode, 8, 'flip')}_${sanitizeId(difficultyId, 32, 'medium')}_${sanitizeId(themeId, 40, 'candy-spirits')}`;
      return scoresMap[key]?.highScore ?? 0;
    },
    [scoresMap]
  );

  const saveGameScore = useCallback(
    async (input: SaveGameScoreInput) => {
      if (!user || !user.emailVerified) return;

      try {
        await ensureUserProfile(user);
        const safeMode: 'flip' | 'link' = input.gameMode === 'link' ? 'link' : 'flip';
        const safeDifficultyId = sanitizeId(input.difficultyId, 32, 'medium');
        const safeThemeId = sanitizeId(input.themeId, 40, 'candy-spirits');
        const safeThemeName = clampString(input.themeName, 60, '糖果萌星');
        const safeScore = Math.min(1000000, Math.max(0, Math.round(input.score)));
        const safeTime = Math.min(86400, Math.max(0, Math.round(input.timeSec)));
        const safeStars = Math.min(3, Math.max(1, Math.round(input.stars)));
        const safeCombo =
          typeof input.maxCombo === 'number'
            ? Math.min(500, Math.max(1, Math.round(input.maxCombo)))
            : undefined;
        const displayName = clampString(user.displayName, 60, '糖果玩家');

        const scoreDocId = `${safeMode}_${safeDifficultyId}_${safeThemeId}`;
        const scorePath = `users/${user.uid}/scores/${scoreDocId}`;
        const scoreRef = doc(db, 'users', user.uid, 'scores', scoreDocId);

        let existingScoreSnap;
        try {
          existingScoreSnap = await getDoc(scoreRef);
        } catch (err) {
          handleFirestoreError(err, OperationType.GET, scorePath);
        }

        const prevHigh = existingScoreSnap?.exists()
          ? Number(existingScoreSnap.data().highScore ?? 0)
          : 0;

        if (!existingScoreSnap?.exists()) {
          const payload: Record<string, unknown> = {
            userId: user.uid,
            gameMode: safeMode,
            themeId: safeThemeId,
            themeName: safeThemeName,
            difficultyId: safeDifficultyId,
            highScore: safeScore,
            bestTimeSec: safeTime,
            stars: safeStars,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          };
          if (safeCombo !== undefined) payload.maxCombo = safeCombo;
          try {
            await setDoc(scoreRef, payload);
          } catch (err) {
            handleFirestoreError(err, OperationType.CREATE, scorePath);
          }
        } else if (safeScore > prevHigh) {
          const updates: Record<string, unknown> = {
            themeName: safeThemeName,
            highScore: safeScore,
            bestTimeSec: safeTime,
            stars: safeStars,
            updatedAt: serverTimestamp(),
          };
          if (safeCombo !== undefined) updates.maxCombo = safeCombo;
          try {
            await updateDoc(scoreRef, updates);
          } catch (err) {
            handleFirestoreError(err, OperationType.UPDATE, scorePath);
          }
        }

        // Sync personal best to public leaderboard entry
        const lbDocId = `${user.uid}_${safeMode}_${safeDifficultyId}_${safeThemeId}`;
        const lbPath = `leaderboard/${lbDocId}`;
        const lbRef = doc(db, 'leaderboard', lbDocId);

        let existingLbSnap;
        try {
          existingLbSnap = await getDoc(lbRef);
        } catch (err) {
          handleFirestoreError(err, OperationType.GET, lbPath);
        }

        const prevLbHigh = existingLbSnap?.exists()
          ? Number(existingLbSnap.data().highScore ?? 0)
          : 0;

        if (!existingLbSnap?.exists()) {
          try {
            await setDoc(lbRef, {
              userId: user.uid,
              displayName,
              gameMode: safeMode,
              themeId: safeThemeId,
              themeName: safeThemeName,
              difficultyId: safeDifficultyId,
              highScore: safeScore,
              bestTimeSec: safeTime,
              stars: safeStars,
              isPublic: true,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
          } catch (err) {
            handleFirestoreError(err, OperationType.CREATE, lbPath);
          }
        } else if (safeScore > prevLbHigh) {
          try {
            await updateDoc(lbRef, {
              displayName,
              themeName: safeThemeName,
              highScore: safeScore,
              bestTimeSec: safeTime,
              stars: safeStars,
              isPublic: true,
              updatedAt: serverTimestamp(),
            });
          } catch (err) {
            handleFirestoreError(err, OperationType.UPDATE, lbPath);
          }
        }
      } catch (err) {
        reportFriendlyError(err);
      }
    },
    [user, ensureUserProfile, reportFriendlyError]
  );

  const saveCustomTheme = useCallback(
    async (theme: MatchTheme) => {
      if (!user || !user.emailVerified) return;
      if (theme.items.length < 6) return;

      try {
        await ensureUserProfile(user);
        const themeDocId = 'primary';
        const path = `users/${user.uid}/customThemes/${themeDocId}`;
        const themeRef = doc(db, 'users', user.uid, 'customThemes', themeDocId);

        const safeName = clampString(theme.name, 40, '我的專屬糖果隊');
        const safeIcon = clampString(theme.icon, 12, '🎨');
        const safeItems = serializeThemeItems(theme.items);

        let existingSnap;
        try {
          existingSnap = await getDoc(themeRef);
        } catch (err) {
          handleFirestoreError(err, OperationType.GET, path);
        }

        if (!existingSnap?.exists()) {
          try {
            await setDoc(themeRef, {
              userId: user.uid,
              name: safeName,
              icon: safeIcon,
              items: safeItems,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
          } catch (err) {
            handleFirestoreError(err, OperationType.CREATE, path);
          }
        } else {
          try {
            await updateDoc(themeRef, {
              name: safeName,
              icon: safeIcon,
              items: safeItems,
              updatedAt: serverTimestamp(),
            });
          } catch (err) {
            handleFirestoreError(err, OperationType.UPDATE, path);
          }
        }
      } catch (err) {
        reportFriendlyError(err);
      }
    },
    [user, ensureUserProfile, reportFriendlyError]
  );

  const saveCompatibilityLog = useCallback(
    async (
      result: CompatibilityResult,
      relationType: 'love' | 'friend' | 'work' | 'creative'
    ) => {
      if (!user || !user.emailVerified) return;

      try {
        await ensureUserProfile(user);
        const logId = `log_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        const path = `users/${user.uid}/compatibilityLogs/${logId}`;
        const logRef = doc(db, 'users', user.uid, 'compatibilityLogs', logId);

        const safeMbtiA = MBTI_REGEX.test(result.personA.mbti) ? result.personA.mbti : 'INFJ';
        const safeMbtiB = MBTI_REGEX.test(result.personB.mbti) ? result.personB.mbti : 'ENFP';

        try {
          await setDoc(logRef, {
            userId: user.uid,
            personAName: clampString(result.personA.name, 40, '搭檔 A'),
            personAZodiac: clampString(result.personA.zodiac, 16, '金牛座'),
            personAMbti: safeMbtiA,
            personBName: clampString(result.personB.name, 40, '搭檔 B'),
            personBZodiac: clampString(result.personB.zodiac, 16, '天蠍座'),
            personBMbti: safeMbtiB,
            relationType,
            overallScore: Math.min(100, Math.max(0, Math.round(result.overallScore))),
            verdict: clampString(result.verdict, 60, '心靈契合'),
            createdAt: serverTimestamp(),
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, path);
        }
      } catch (err) {
        reportFriendlyError(err);
      }
    },
    [user, ensureUserProfile, reportFriendlyError]
  );

  const deleteCompatibilityLog = useCallback(
    async (logId: string) => {
      if (!user || !user.emailVerified) return;
      const safeLogId = sanitizeId(logId, 128, '');
      if (!safeLogId) return;

      const path = `users/${user.uid}/compatibilityLogs/${safeLogId}`;
      try {
        await deleteDoc(doc(db, 'users', user.uid, 'compatibilityLogs', safeLogId));
      } catch (err) {
        try {
          handleFirestoreError(err, OperationType.DELETE, path);
        } catch (wrapped) {
          reportFriendlyError(wrapped);
        }
      }
    },
    [user, reportFriendlyError]
  );

  return (
    <FirebaseContext.Provider
      value={{
        user,
        authReady,
        isAuthBusy,
        cloudError,
        clearCloudError,
        signInWithGoogle,
        signOutUser,
        scoresMap,
        getCloudHighScore,
        saveGameScore,
        cloudCustomTheme,
        saveCustomTheme,
        compatibilityLogs,
        saveCompatibilityLog,
        deleteCompatibilityLog,
      }}
    >
      {children}
    </FirebaseContext.Provider>
  );
};

export function useFirebase(): FirebaseContextValue {
  const ctx = useContext(FirebaseContext);
  if (!ctx) {
    throw new Error('useFirebase must be used inside FirebaseProvider');
  }
  return ctx;
}
