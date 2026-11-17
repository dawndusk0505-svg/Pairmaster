import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  User,
  onAuthStateChanged,
  signInAnonymously,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
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
export const SUPER_ADMIN_EMAIL = 'yui1218.cc@gmail.com';
export const ANONYMOUS_DISPLAY_NAME = '唔知邊個(unknown)';
export const DEFAULT_ADMIN_SPIRIT_NAME = '蜜桃粉兔';
export const SPIRIT_CHARACTER_OPTIONS = CANDY_SPIRIT_ITEMS.map((item) => ({
  id: item.id,
  name: item.name,
  symbol: item.symbol,
  imageUrl: item.imageUrl,
}));

function isSuperAdminEmail(email: string | null | undefined): boolean {
  return (email ?? '').trim().toLowerCase() === SUPER_ADMIN_EMAIL;
}

export function getHongKongDateString(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Hong_Kong',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export function addDaysToHkDate(dateStr: string, days: number): string {
  const baseMs = Date.parse(`${dateStr}T12:00:00+08:00`);
  if (Number.isNaN(baseMs)) return getHongKongDateString();
  return getHongKongDateString(new Date(baseMs + days * 86400 * 1000));
}

export function getHongKongDayTimestamps(dateStr: string): {
  activateAt: Timestamp;
  expireAt: Timestamp;
} {
  const startMs = Date.parse(`${dateStr}T00:00:00+08:00`);
  const safeStartMs = Number.isNaN(startMs)
    ? Date.parse(`${getHongKongDateString()}T00:00:00+08:00`)
    : startMs;
  const endMs = safeStartMs + 86400 * 1000;
  return {
    activateAt: Timestamp.fromMillis(safeStartMs),
    expireAt: Timestamp.fromMillis(endMs),
  };
}

export function getMsUntilHongKongMidnight(now: Date = new Date()): number {
  const hkParts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Hong_Kong',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(now);

  const hour = Number(hkParts.find((p) => p.type === 'hour')?.value ?? 0) % 24;
  const minute = Number(hkParts.find((p) => p.type === 'minute')?.value ?? 0);
  const second = Number(hkParts.find((p) => p.type === 'second')?.value ?? 0);

  const elapsedSec = hour * 3600 + minute * 60 + second;
  return Math.max(1000, (86400 - elapsedSec) * 1000);
}

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

function sanitizePhotoDataUrl(val: unknown): string | undefined {
  if (typeof val !== 'string') return undefined;
  const trimmed = val.trim();
  if (
    trimmed.length >= 30 &&
    trimmed.length <= 250000 &&
    (trimmed.startsWith('data:image/jpeg;base64,') ||
      trimmed.startsWith('data:image/png;base64,') ||
      trimmed.startsWith('data:image/webp;base64,'))
  ) {
    return trimmed;
  }
  return undefined;
}

const DEVICE_STORAGE_KEY = 'pairmaster_device_id_v1';
const VISIT_SESSION_KEY = 'pairmaster_visit_counted_v1';

function getOrCreateDeviceId(): string {
  const fallbackId = `dev_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  if (typeof window === 'undefined') return fallbackId;
  try {
    const existing = localStorage.getItem(DEVICE_STORAGE_KEY);
    if (existing && ID_REGEX.test(existing) && existing.length >= 8 && existing.length <= 64) {
      return existing;
    }
    const rawUuid =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID().replace(/-/g, '')
        : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
    const nextId = sanitizeId(`dev_${rawUuid}`, 64, fallbackId);
    localStorage.setItem(DEVICE_STORAGE_KEY, nextId);
    return nextId;
  } catch {
    return fallbackId;
  }
}

function detectDeviceInfo(): { deviceLabel: string; deviceType: 'mobile' | 'tablet' | 'desktop' } {
  if (typeof navigator === 'undefined') {
    return { deviceLabel: '網頁裝置', deviceType: 'desktop' };
  }
  const ua = navigator.userAgent || '';
  const maxTouch = navigator.maxTouchPoints || 0;

  let deviceType: 'mobile' | 'tablet' | 'desktop' = 'desktop';
  let osName = '電腦';

  if (/iPad/i.test(ua) || (/Macintosh/i.test(ua) && maxTouch > 1)) {
    deviceType = 'tablet';
    osName = 'iPad';
  } else if (/iPhone/i.test(ua)) {
    deviceType = 'mobile';
    osName = 'iPhone';
  } else if (/Android/i.test(ua)) {
    if (/Mobile/i.test(ua)) {
      deviceType = 'mobile';
      osName = 'Android 手機';
    } else {
      deviceType = 'tablet';
      osName = 'Android 平板';
    }
  } else if (/Windows/i.test(ua)) {
    deviceType = 'desktop';
    osName = 'Windows';
  } else if (/Macintosh|Mac OS X/i.test(ua)) {
    deviceType = 'desktop';
    osName = 'Mac';
  } else if (/CrOS/i.test(ua)) {
    deviceType = 'desktop';
    osName = 'Chromebook';
  } else if (/Linux/i.test(ua)) {
    deviceType = 'desktop';
    osName = 'Linux';
  }

  let browserName = '瀏覽器';
  if (/MicroMessenger/i.test(ua)) {
    browserName = '微信內建';
  } else if (/Line\//i.test(ua)) {
    browserName = 'LINE 內建';
  } else if (/FBAN|FBAV|Instagram/i.test(ua)) {
    browserName = 'App 內建';
  } else if (/Edg|EdgiOS|EdgA/i.test(ua)) {
    browserName = 'Edge';
  } else if (/CriOS|Chrome/i.test(ua)) {
    browserName = 'Chrome';
  } else if (/FxiOS|Firefox/i.test(ua)) {
    browserName = 'Firefox';
  } else if (/Safari/i.test(ua)) {
    browserName = 'Safari';
  }

  return {
    deviceLabel: clampString(`${osName} · ${browserName}`, 60, '網頁裝置'),
    deviceType,
  };
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

export interface DailyNotice {
  id: 'birthday' | 'confession';
  type: 'birthday' | 'confession';
  activeDate: string;
  recipientName: string;
  senderName: string;
  message: string;
  photoDataUrl?: string;
  isActive: boolean;
}

export interface AdminUserRecord {
  uid: string;
  note: string;
}

export interface NoticeRequestRecord {
  id: string;
  requesterUid: string;
  type: 'birthday' | 'confession';
  targetDate: string;
  recipientName: string;
  senderName: string;
  message: string;
  photoDataUrl?: string;
  contactNote?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAtMs: number;
  reviewedAtMs?: number;
}

export interface ScheduledNoticeRecord {
  id: string;
  type: 'birthday' | 'confession';
  targetDate: string;
  recipientName: string;
  senderName: string;
  message: string;
  photoDataUrl?: string;
  isActive: boolean;
}

export interface VisitorRecord {
  id: string;
  deviceId: string;
  lastAuthUid: string;
  displayName: string;
  isSignedInUser: boolean;
  deviceLabel: string;
  deviceType: 'mobile' | 'tablet' | 'desktop';
  visitCount: number;
  firstSeenAtMs: number;
  lastSeenAtMs: number;
}

export interface SubmitNoticeRequestInput {
  type: 'birthday' | 'confession';
  targetDate: string;
  recipientName: string;
  senderName: string;
  message: string;
  photoDataUrl?: string;
  contactNote?: string;
}

interface SaveDailyNoticeInput {
  type: 'birthday' | 'confession';
  recipientName: string;
  senderName: string;
  message: string;
  photoDataUrl?: string;
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
  isVerifiedGoogleUser: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  gameDisplayName: string;
  authReady: boolean;
  isAuthBusy: boolean;
  cloudError: string | null;
  clearCloudError: () => void;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
  updateMyGameDisplayName: (newName: string) => Promise<void>;
  adminUpdateLeaderboardDisplayName: (entryId: string, newName: string) => Promise<void>;
  adminDeleteLeaderboardEntry: (entryId: string) => Promise<void>;
  scoresMap: Record<string, CloudUserScore>;
  getCloudHighScore: (gameMode: 'flip' | 'link', difficultyId: string, themeId: string) => number;
  leaderboardEntries: CloudLeaderboardEntry[];
  leaderboardLoading: boolean;
  leaderboardError: string | null;
  anonAuthDisabled: boolean;
  getPublicStageBest: (
    gameMode: 'flip' | 'link',
    difficultyId: string,
    themeId: string
  ) => CloudLeaderboardEntry | null;
  saveGameScore: (input: SaveGameScoreInput) => Promise<'cloud' | 'anonymous' | 'local'>;
  cloudCustomTheme: MatchTheme | null;
  saveCustomTheme: (theme: MatchTheme) => Promise<void>;
  compatibilityLogs: CloudCompatibilityLog[];
  saveCompatibilityLog: (
    result: CompatibilityResult,
    relationType: 'love' | 'friend' | 'work' | 'creative'
  ) => Promise<void>;
  deleteCompatibilityLog: (logId: string) => Promise<void>;
  todayHkDate: string;
  todayBirthdayNotice: DailyNotice | null;
  todayConfessionNotice: DailyNotice | null;
  saveDailyNotice: (input: SaveDailyNoticeInput) => Promise<void>;
  clearDailyNotice: (type: 'birthday' | 'confession') => Promise<void>;
  adminUsers: AdminUserRecord[];
  addAuthorizedAdmin: (uid: string, note: string) => Promise<void>;
  removeAuthorizedAdmin: (uid: string) => Promise<void>;
  bookedSlotIds: string[];
  isDateSlotBooked: (type: 'birthday' | 'confession', targetDate: string) => boolean;
  myNoticeRequests: NoticeRequestRecord[];
  pendingNoticeRequests: NoticeRequestRecord[];
  scheduledNotices: ScheduledNoticeRecord[];
  submitNoticeRequest: (input: SubmitNoticeRequestInput) => Promise<'submitted' | 'need_google'>;
  approveNoticeRequest: (req: NoticeRequestRecord) => Promise<void>;
  rejectNoticeRequest: (requestId: string) => Promise<void>;
  cancelScheduledNotice: (type: 'birthday' | 'confession', targetDate: string) => Promise<void>;
  currentDeviceId: string;
  visitors: VisitorRecord[];
  adminRenameVisitor: (deviceId: string, newName: string) => Promise<void>;
  adminDeleteVisitor: (deviceId: string) => Promise<void>;
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
  const [leaderboardEntries, setLeaderboardEntries] = useState<CloudLeaderboardEntry[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(true);
  const [leaderboardError, setLeaderboardError] = useState<string | null>(null);
  const [anonAuthDisabled, setAnonAuthDisabled] = useState(false);
  const [cloudCustomTheme, setCloudCustomTheme] = useState<MatchTheme | null>(null);
  const [compatibilityLogs, setCompatibilityLogs] = useState<CloudCompatibilityLog[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [profileDisplayName, setProfileDisplayName] = useState<string>('');
  const [adminUsers, setAdminUsers] = useState<AdminUserRecord[]>([]);
  const [rawNotices, setRawNotices] = useState<DailyNotice[]>([]);
  const [todayScheduledBirthday, setTodayScheduledBirthday] = useState<DailyNotice | null>(null);
  const [todayScheduledConfession, setTodayScheduledConfession] = useState<DailyNotice | null>(null);
  const [bookedSlotIds, setBookedSlotIds] = useState<string[]>([]);
  const [myNoticeRequests, setMyNoticeRequests] = useState<NoticeRequestRecord[]>([]);
  const [pendingNoticeRequests, setPendingNoticeRequests] = useState<NoticeRequestRecord[]>([]);
  const [scheduledNotices, setScheduledNotices] = useState<ScheduledNoticeRecord[]>([]);
  const [visitors, setVisitors] = useState<VisitorRecord[]>([]);
  const [todayHkDate, setTodayHkDate] = useState<string>(() => getHongKongDateString());

  const currentDeviceIdRef = useRef<string>(getOrCreateDeviceId());
  const lastRecordedVisitorSigRef = useRef<string>('');
  const anonVisitAttemptedRef = useRef<boolean>(false);
  const profileEnsuredUidRef = useRef<string | null>(null);
  const resolvedProfileNameRef = useRef<string>('');
  const syncedLbTargetRef = useRef<Record<string, string>>({});
  const inFlightProfileRef = useRef<{ uid: string; promise: Promise<string> } | null>(null);

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

  const syncOwnLeaderboardDisplayName = useCallback(
    async (uid: string, nextDisplayName: string, onlyReplaceNames?: string[]) => {
      const lbPath = 'leaderboard';
      try {
        const snap = await getDocs(
          query(collection(db, lbPath), where('userId', '==', uid), limit(100))
        );
        const tasks: Promise<void>[] = [];
        snap.forEach((docSnap) => {
          const curName = String(docSnap.data().displayName ?? '');
          const shouldUpdate = onlyReplaceNames
            ? onlyReplaceNames.includes(curName) && curName !== nextDisplayName
            : curName !== nextDisplayName;
          if (shouldUpdate) {
            tasks.push(
              updateDoc(doc(db, lbPath, docSnap.id), {
                displayName: nextDisplayName,
                updatedAt: serverTimestamp(),
              })
            );
          }
        });
        if (tasks.length > 0) {
          await Promise.all(tasks);
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, lbPath);
      }
    },
    []
  );

  const ensureUserProfile = useCallback(
    async (currentUser: User): Promise<string> => {
      if (currentUser.isAnonymous || !currentUser.emailVerified) {
        return ANONYMOUS_DISPLAY_NAME;
      }
      if (profileEnsuredUidRef.current === currentUser.uid && resolvedProfileNameRef.current) {
        return resolvedProfileNameRef.current;
      }
      if (inFlightProfileRef.current?.uid === currentUser.uid) {
        return inFlightProfileRef.current.promise;
      }

      const run = (async (): Promise<string> => {
        const path = `users/${currentUser.uid}`;
        const userRef = doc(db, 'users', currentUser.uid);
        const rawGoogleName = clampString(currentUser.displayName, 60, '糖果玩家');
        const isSuper = isSuperAdminEmail(currentUser.email);
        const defaultName = isSuper ? DEFAULT_ADMIN_SPIRIT_NAME : rawGoogleName;
        const photoURL = currentUser.photoURL ? currentUser.photoURL.slice(0, 500) : '';

        try {
          const snap = await getDoc(userRef);
          let finalName = defaultName;

          if (!snap.exists()) {
            const payload: Record<string, unknown> = {
              uid: currentUser.uid,
              displayName: defaultName,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            };
            if (photoURL) payload.photoURL = photoURL;

            await setDoc(userRef, payload);
            if (isSuper) {
              void syncOwnLeaderboardDisplayName(currentUser.uid, defaultName).catch(() => {
                // non-blocking migration
              });
            }
          } else {
            const existing = snap.data();
            const existingName =
              typeof existing.displayName === 'string' ? existing.displayName.trim() : '';

            // Auto-migrate super admin from real Google / org name to spirit character name,
            // while preserving any custom or spirit character name chosen later.
            const needsSuperMigration =
              isSuper &&
              (!existingName ||
                existingName === rawGoogleName ||
                existingName === '糖果玩家' ||
                existingName.toLowerCase().includes('champion edu'));

            finalName = needsSuperMigration
              ? DEFAULT_ADMIN_SPIRIT_NAME
              : existingName || defaultName;

            const updates: Record<string, unknown> = {};
            if (existingName !== finalName) {
              updates.displayName = finalName;
            }
            if (photoURL && existing.photoURL !== photoURL) {
              updates.photoURL = photoURL;
            }
            if (Object.keys(updates).length > 0) {
              updates.updatedAt = serverTimestamp();
              await updateDoc(userRef, updates);
            }

            if (isSuper) {
              void syncOwnLeaderboardDisplayName(currentUser.uid, finalName).catch(() => {
                // non-blocking migration
              });
            }
          }

          profileEnsuredUidRef.current = currentUser.uid;
          resolvedProfileNameRef.current = finalName;
          setProfileDisplayName(finalName);
          setCloudError(null);
          return finalName;
        } catch (error) {
          handleFirestoreError(error, OperationType.WRITE, path);
          return defaultName;
        } finally {
          if (inFlightProfileRef.current?.uid === currentUser.uid) {
            inFlightProfileRef.current = null;
          }
        }
      })();

      inFlightProfileRef.current = { uid: currentUser.uid, promise: run };
      return run;
    },
    [syncOwnLeaderboardDisplayName]
  );

  useEffect(() => {
    const syncDate = () => {
      const next = getHongKongDateString();
      setTodayHkDate((prev) => (prev !== next ? next : prev));
    };
    const intervalId = setInterval(syncDate, 15000);
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') syncDate();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', syncDate);
    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', syncDate);
    };
  }, []);

  // Public listener for daily Birthday Blessing & Confession Board (auto-filtered by todayHkDate)
  useEffect(() => {
    const noticesPath = 'dailyNotices';
    const noticesQuery = query(
      collection(db, noticesPath),
      where('isActive', '==', true),
      limit(5)
    );
    const unsub = onSnapshot(
      noticesQuery,
      (snapshot) => {
        const list: DailyNotice[] = [];
        snapshot.forEach((d) => {
          const data = d.data();
          if (data.type === 'birthday' || data.type === 'confession') {
            list.push({
              id: data.type,
              type: data.type,
              activeDate: String(data.activeDate ?? ''),
              recipientName: String(data.recipientName ?? ''),
              senderName: String(data.senderName ?? ''),
              message: String(data.message ?? ''),
              photoDataUrl: sanitizePhotoDataUrl(data.photoDataUrl),
              isActive: Boolean(data.isActive),
            });
          }
        });
        setRawNotices(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, noticesPath);
      }
    );
    return () => unsub();
  }, []);

  // Public listener for shared global leaderboard (visible to all visitors & logged-in players)
  useEffect(() => {
    const lbPath = 'leaderboard';
    const lbQuery = query(
      collection(db, lbPath),
      where('isPublic', '==', true),
      limit(200)
    );
    const unsub = onSnapshot(
      lbQuery,
      (snapshot) => {
        const list: CloudLeaderboardEntry[] = snapshot.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            userId: String(data.userId ?? ''),
            displayName: String(data.displayName ?? ANONYMOUS_DISPLAY_NAME),
            gameMode: data.gameMode === 'link' ? 'link' : 'flip',
            themeId: String(data.themeId ?? ''),
            themeName: String(data.themeName ?? '糖果萌星'),
            difficultyId: String(data.difficultyId ?? 'medium'),
            highScore: Number(data.highScore ?? 0),
            bestTimeSec: Number(data.bestTimeSec ?? 0),
            stars: Number(data.stars ?? 1),
            isPublic: Boolean(data.isPublic),
          };
        });
        setLeaderboardEntries(list);
        setLeaderboardLoading(false);
        setLeaderboardError(null);
      },
      (error) => {
        setLeaderboardLoading(false);
        setLeaderboardError('暫時未能讀取雲端全服榜，請檢查網絡或稍後再試。');
        try {
          handleFirestoreError(error, OperationType.LIST, lbPath);
        } catch {
          // already logged cleanly
        }
      }
    );
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthReady(true);
      if (!currentUser || currentUser.isAnonymous || !currentUser.emailVerified) {
        profileEnsuredUidRef.current = null;
        resolvedProfileNameRef.current = '';
        syncedLbTargetRef.current = {};
        inFlightProfileRef.current = null;
        setProfileDisplayName('');
        setScoresMap({});
        setCloudCustomTheme(null);
        setCompatibilityLogs([]);
        setIsAdmin(false);
        setAdminUsers([]);
      } else {
        if (isSuperAdminEmail(currentUser.email)) {
          setIsAdmin(true);
        } else {
          getDoc(doc(db, 'admins', currentUser.uid))
            .then((snap) => setIsAdmin(snap.exists()))
            .catch(() => setIsAdmin(false));
        }
        ensureUserProfile(currentUser).catch((err) => {
          reportFriendlyError(err);
        });
      }
    });
    return () => unsub();
  }, [ensureUserProfile, reportFriendlyError]);

  // Public listener for booked future/current quota slots (spoiler-free)
  useEffect(() => {
    const slotsPath = 'reservedSlots';
    const slotsQuery = query(
      collection(db, slotsPath),
      where('isBooked', '==', true),
      limit(200)
    );
    const unsub = onSnapshot(
      slotsQuery,
      (snapshot) => {
        setBookedSlotIds(snapshot.docs.map((d) => d.id));
      },
      (error) => {
        try {
          handleFirestoreError(error, OperationType.LIST, slotsPath);
        } catch {
          // non-blocking
        }
      }
    );
    return () => unsub();
  }, []);

  // Public time-gated fetch for pre-scheduled notices matching todayHkDate
  useEffect(() => {
    let cancelled = false;
    const loadScheduledToday = async (noticeType: 'birthday' | 'confession') => {
      const slotId = `${noticeType}_${todayHkDate}`;
      try {
        const snap = await getDoc(doc(db, 'scheduledNotices', slotId));
        if (cancelled) return;
        if (snap.exists()) {
          const data = snap.data();
          if (data.isActive && String(data.targetDate) === todayHkDate) {
            const parsed: DailyNotice = {
              id: noticeType,
              type: noticeType,
              activeDate: todayHkDate,
              recipientName: String(data.recipientName ?? ''),
              senderName: String(data.senderName ?? ''),
              message: String(data.message ?? ''),
              photoDataUrl: sanitizePhotoDataUrl(data.photoDataUrl),
              isActive: true,
            };
            if (noticeType === 'birthday') setTodayScheduledBirthday(parsed);
            else setTodayScheduledConfession(parsed);
            return;
          }
        }
        if (noticeType === 'birthday') setTodayScheduledBirthday(null);
        else setTodayScheduledConfession(null);
      } catch {
        if (!cancelled) {
          if (noticeType === 'birthday') setTodayScheduledBirthday(null);
          else setTodayScheduledConfession(null);
        }
      }
    };

    void loadScheduledToday('birthday');
    void loadScheduledToday('confession');
    return () => {
      cancelled = true;
    };
  }, [todayHkDate, bookedSlotIds]);

  // Requester's own submitted notice requests (visible to anonymous or Google users)
  useEffect(() => {
    if (!authReady || !user) {
      setMyNoticeRequests([]);
      return;
    }

    const reqPath = 'noticeRequests';
    const reqQuery = query(
      collection(db, reqPath),
      where('requesterUid', '==', user.uid),
      limit(20)
    );
    const unsub = onSnapshot(
      reqQuery,
      (snapshot) => {
        const list: NoticeRequestRecord[] = snapshot.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            requesterUid: String(data.requesterUid ?? ''),
            type: data.type === 'confession' ? 'confession' : 'birthday',
            targetDate: String(data.targetDate ?? ''),
            recipientName: String(data.recipientName ?? ''),
            senderName: String(data.senderName ?? ''),
            message: String(data.message ?? ''),
            photoDataUrl: sanitizePhotoDataUrl(data.photoDataUrl),
            contactNote: typeof data.contactNote === 'string' ? data.contactNote : undefined,
            status:
              data.status === 'approved' || data.status === 'rejected' ? data.status : 'pending',
            createdAtMs:
              data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : Date.now(),
            reviewedAtMs:
              data.reviewedAt instanceof Timestamp ? data.reviewedAt.toMillis() : undefined,
          };
        });
        list.sort((a, b) => b.createdAtMs - a.createdAtMs);
        setMyNoticeRequests(list);
      },
      (error) => {
        try {
          handleFirestoreError(error, OperationType.LIST, reqPath);
        } catch {
          // non-blocking
        }
      }
    );
    return () => unsub();
  }, [authReady, user]);

  // Unique-per-device visitor tracking (same device updates its single /visitors/{deviceId} row)
  useEffect(() => {
    if (!authReady || isAuthBusy) return;

    let cancelled = false;
    const trackCurrentDevice = async () => {
      let activeUser = auth.currentUser ?? user;
      if (!activeUser) {
        if (anonAuthDisabled || anonVisitAttemptedRef.current) return;
        anonVisitAttemptedRef.current = true;
        try {
          const anonCred = await signInAnonymously(auth);
          activeUser = anonCred.user;
          if (!cancelled) setAnonAuthDisabled(false);
        } catch (anonErr) {
          const errCode = (anonErr as { code?: string })?.code || '';
          if (
            errCode === 'auth/operation-not-allowed' ||
            errCode === 'auth/admin-restricted-operation'
          ) {
            if (!cancelled) setAnonAuthDisabled(true);
          }
          return;
        }
      }

      if (!activeUser || cancelled) return;
      const isVerifiedGoogle = !activeUser.isAnonymous && activeUser.emailVerified;
      if (!activeUser.isAnonymous && !activeUser.emailVerified) return;
      if (isVerifiedGoogle && !profileDisplayName) return;

      const resolvedName = isVerifiedGoogle
        ? clampString(profileDisplayName, 60, DEFAULT_ADMIN_SPIRIT_NAME)
        : ANONYMOUS_DISPLAY_NAME;
      const sig = `${activeUser.uid}::${resolvedName}`;
      if (lastRecordedVisitorSigRef.current === sig) return;
      lastRecordedVisitorSigRef.current = sig;

      const deviceId = currentDeviceIdRef.current;
      const { deviceLabel, deviceType } = detectDeviceInfo();
      const visitorRef = doc(db, 'visitors', deviceId);

      let alreadyCountedSession = false;
      try {
        alreadyCountedSession = sessionStorage.getItem(VISIT_SESSION_KEY) === '1';
      } catch {
        alreadyCountedSession = false;
      }

      try {
        const snap = await getDoc(visitorRef);
        if (cancelled) return;
        if (!snap.exists()) {
          await setDoc(visitorRef, {
            deviceId,
            lastAuthUid: activeUser.uid,
            displayName: resolvedName,
            isSignedInUser: isVerifiedGoogle,
            deviceLabel,
            deviceType,
            visitCount: 1,
            firstSeenAt: serverTimestamp(),
            lastSeenAt: serverTimestamp(),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        } else {
          const existing = snap.data();
          const prevCount = Math.max(1, Math.min(1000000, Number(existing.visitCount ?? 1)));
          const nextCount = alreadyCountedSession ? prevCount : Math.min(1000000, prevCount + 1);
          const preservedName =
            typeof existing.displayName === 'string' && existing.displayName.trim()
              ? existing.displayName.trim()
              : ANONYMOUS_DISPLAY_NAME;
          const nextDisplayName = isVerifiedGoogle ? resolvedName : preservedName;
          const nextSignedInFlag = isVerifiedGoogle ? true : Boolean(existing.isSignedInUser);

          await updateDoc(visitorRef, {
            lastAuthUid: activeUser.uid,
            displayName: nextDisplayName,
            isSignedInUser: nextSignedInFlag,
            deviceLabel,
            deviceType,
            visitCount: nextCount,
            lastSeenAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
        try {
          sessionStorage.setItem(VISIT_SESSION_KEY, '1');
        } catch {
          // ignore sessionStorage failure
        }
      } catch {
        // non-blocking analytics write
        if (lastRecordedVisitorSigRef.current === sig) {
          lastRecordedVisitorSigRef.current = '';
        }
      }
    };

    void trackCurrentDevice();
    return () => {
      cancelled = true;
    };
  }, [authReady, isAuthBusy, user, profileDisplayName, anonAuthDisabled]);

  // Super Admin listeners: delegated admin UIDs + pending noticeRequests + scheduledNotices + visitors
  useEffect(() => {
    if (!authReady || !user || user.isAnonymous || !user.emailVerified) {
      setAdminUsers([]);
      setPendingNoticeRequests([]);
      setScheduledNotices([]);
      setVisitors([]);
      return;
    }
    if (!isSuperAdminEmail(user.email)) {
      setAdminUsers([]);
      setPendingNoticeRequests([]);
      setScheduledNotices([]);
      setVisitors([]);
      return;
    }

    const adminsQuery = query(collection(db, 'admins'), where('uid', '>', ''));
    const unsubAdmins = onSnapshot(
      adminsQuery,
      (snapshot) => {
        const list: AdminUserRecord[] = snapshot.docs.map((d) => ({
          uid: String(d.data().uid ?? d.id),
          note: String(d.data().note ?? '授權管理員'),
        }));
        setAdminUsers(list);
      },
      () => {
        setAdminUsers([]);
      }
    );

    const pendingQuery = query(
      collection(db, 'noticeRequests'),
      where('status', '==', 'pending'),
      limit(100)
    );
    const unsubPending = onSnapshot(
      pendingQuery,
      (snapshot) => {
        const list: NoticeRequestRecord[] = snapshot.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            requesterUid: String(data.requesterUid ?? ''),
            type: data.type === 'confession' ? 'confession' : 'birthday',
            targetDate: String(data.targetDate ?? ''),
            recipientName: String(data.recipientName ?? ''),
            senderName: String(data.senderName ?? ''),
            message: String(data.message ?? ''),
            photoDataUrl: sanitizePhotoDataUrl(data.photoDataUrl),
            contactNote: typeof data.contactNote === 'string' ? data.contactNote : undefined,
            status: 'pending',
            createdAtMs:
              data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : Date.now(),
          };
        });
        // Sort strictly earliest-submitted first so admin can tell who was 1st for each date
        list.sort((a, b) => a.createdAtMs - b.createdAtMs);
        setPendingNoticeRequests(list);
      },
      () => {
        setPendingNoticeRequests([]);
      }
    );

    const scheduledQuery = query(
      collection(db, 'scheduledNotices'),
      where('targetDate', '>', ''),
      limit(100)
    );
    const unsubScheduled = onSnapshot(
      scheduledQuery,
      (snapshot) => {
        const list: ScheduledNoticeRecord[] = snapshot.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            type: data.type === 'confession' ? 'confession' : 'birthday',
            targetDate: String(data.targetDate ?? ''),
            recipientName: String(data.recipientName ?? ''),
            senderName: String(data.senderName ?? ''),
            message: String(data.message ?? ''),
            photoDataUrl: sanitizePhotoDataUrl(data.photoDataUrl),
            isActive: Boolean(data.isActive),
          };
        });
        list.sort((a, b) => a.targetDate.localeCompare(b.targetDate));
        setScheduledNotices(list);
      },
      () => {
        setScheduledNotices([]);
      }
    );

    const visitorsQuery = query(
      collection(db, 'visitors'),
      where('deviceId', '>', ''),
      limit(300)
    );
    const unsubVisitors = onSnapshot(
      visitorsQuery,
      (snapshot) => {
        const list: VisitorRecord[] = snapshot.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            deviceId: String(data.deviceId ?? d.id),
            lastAuthUid: String(data.lastAuthUid ?? ''),
            displayName: String(data.displayName ?? ANONYMOUS_DISPLAY_NAME),
            isSignedInUser: Boolean(data.isSignedInUser),
            deviceLabel: String(data.deviceLabel ?? '網頁裝置'),
            deviceType:
              data.deviceType === 'mobile' || data.deviceType === 'tablet'
                ? data.deviceType
                : 'desktop',
            visitCount: Number(data.visitCount ?? 1),
            firstSeenAtMs:
              data.firstSeenAt instanceof Timestamp ? data.firstSeenAt.toMillis() : Date.now(),
            lastSeenAtMs:
              data.lastSeenAt instanceof Timestamp ? data.lastSeenAt.toMillis() : Date.now(),
          };
        });
        list.sort((a, b) => b.lastSeenAtMs - a.lastSeenAtMs);
        setVisitors(list);
      },
      () => {
        setVisitors([]);
      }
    );

    return () => {
      unsubAdmins();
      unsubPending();
      unsubScheduled();
      unsubVisitors();
    };
  }, [authReady, user]);

  // Attach Firestore listeners ONLY when auth is ready and user is authenticated & verified
  useEffect(() => {
    if (!authReady || !user || user.isAnonymous || !user.emailVerified) return;

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

  // Reactive sync: ensure any loaded leaderboard rows belonging to the signed-in user
  // immediately reflect their current gameDisplayName (e.g., migrating legacy org/Google names)
  useEffect(() => {
    if (!authReady || !user || user.isAnonymous || !user.emailVerified || !profileDisplayName) {
      return;
    }
    const staleEntries = leaderboardEntries.filter(
      (entry) =>
        entry.userId === user.uid &&
        entry.displayName !== profileDisplayName &&
        syncedLbTargetRef.current[entry.id] !== profileDisplayName
    );
    if (staleEntries.length === 0) return;

    staleEntries.forEach((entry) => {
      syncedLbTargetRef.current[entry.id] = profileDisplayName;
      void updateDoc(doc(db, 'leaderboard', entry.id), {
        displayName: profileDisplayName,
        updatedAt: serverTimestamp(),
      }).catch(() => {
        delete syncedLbTargetRef.current[entry.id];
      });
    });
  }, [authReady, user, profileDisplayName, leaderboardEntries]);

  const getPublicStageBest = useCallback(
    (gameMode: 'flip' | 'link', difficultyId: string, themeId: string): CloudLeaderboardEntry | null => {
      const safeMode = sanitizeId(gameMode, 8, 'flip');
      const safeDiff = sanitizeId(difficultyId, 32, 'medium');
      const safeTheme = sanitizeId(themeId, 40, 'candy-spirits');
      let best: CloudLeaderboardEntry | null = null;
      for (const entry of leaderboardEntries) {
        if (
          entry.gameMode === safeMode &&
          entry.difficultyId === safeDiff &&
          entry.themeId === safeTheme
        ) {
          if (
            !best ||
            entry.highScore > best.highScore ||
            (entry.highScore === best.highScore && entry.bestTimeSec < best.bestTimeSec)
          ) {
            best = entry;
          }
        }
      }
      if (best && user && !user.isAnonymous && user.emailVerified && best.userId === user.uid && profileDisplayName) {
        return { ...best, displayName: profileDisplayName };
      }
      return best;
    },
    [leaderboardEntries, user, profileDisplayName]
  );

  const saveGameScore = useCallback(
    async (input: SaveGameScoreInput): Promise<'cloud' | 'anonymous' | 'local'> => {
      try {
        let activeUser = auth.currentUser ?? user;
        const isGoogleAccount = Boolean(
          activeUser && !activeUser.isAnonymous && activeUser.emailVerified
        );

        if (!activeUser) {
          try {
            const anonCred = await signInAnonymously(auth);
            activeUser = anonCred.user;
            setAnonAuthDisabled(false);
          } catch (anonErr) {
            const errCode = (anonErr as { code?: string })?.code || '';
            if (
              errCode === 'auth/operation-not-allowed' ||
              errCode === 'auth/admin-restricted-operation'
            ) {
              setAnonAuthDisabled(true);
              return 'local';
            }
            throw anonErr;
          }
        }

        if (!activeUser) return 'local';

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
        let displayName = ANONYMOUS_DISPLAY_NAME;

        if (isGoogleAccount) {
          const resolvedName = await ensureUserProfile(activeUser);
          displayName = clampString(
            resolvedName,
            60,
            isSuperAdminEmail(activeUser.email) ? DEFAULT_ADMIN_SPIRIT_NAME : '糖果玩家'
          );

          const scoreDocId = `${safeMode}_${safeDifficultyId}_${safeThemeId}`;
          const scorePath = `users/${activeUser.uid}/scores/${scoreDocId}`;
          const scoreRef = doc(db, 'users', activeUser.uid, 'scores', scoreDocId);

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
              userId: activeUser.uid,
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
        }

        // Sync personal best to public leaderboard entry (Google user or 匿名玩家)
        const lbDocId = `${activeUser.uid}_${safeMode}_${safeDifficultyId}_${safeThemeId}`;
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
              userId: activeUser.uid,
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
        } else {
          const existingData = existingLbSnap.data();
          const shouldUpdateScore = safeScore > prevLbHigh;
          const shouldSyncName = existingData.displayName !== displayName;
          if (shouldUpdateScore) {
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
          } else if (shouldSyncName) {
            try {
              await updateDoc(lbRef, {
                displayName,
                updatedAt: serverTimestamp(),
              });
            } catch (err) {
              handleFirestoreError(err, OperationType.UPDATE, lbPath);
            }
          }
        }

        return isGoogleAccount ? 'cloud' : 'anonymous';
      } catch (err) {
        reportFriendlyError(err);
        return 'local';
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

  const upsertScheduledAndSlot = useCallback(
    async (params: {
      type: 'birthday' | 'confession';
      targetDate: string;
      recipientName: string;
      senderName: string;
      message: string;
      photoDataUrl?: string;
      adminUid: string;
    }) => {
      const slotId = `${params.type}_${params.targetDate}`;
      const { activateAt, expireAt } = getHongKongDayTimestamps(params.targetDate);
      const safePhoto = sanitizePhotoDataUrl(params.photoDataUrl);

      // 1. Upsert scheduledNotices/{slotId}
      const schedPath = `scheduledNotices/${slotId}`;
      const schedRef = doc(db, 'scheduledNotices', slotId);
      let existingSchedSnap;
      try {
        existingSchedSnap = await getDoc(schedRef);
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, schedPath);
      }

      if (!existingSchedSnap?.exists()) {
        try {
          const payload: Record<string, unknown> = {
            type: params.type,
            targetDate: params.targetDate,
            recipientName: params.recipientName,
            senderName: params.senderName,
            message: params.message,
            isActive: true,
            activateAt,
            expireAt,
            updatedBy: params.adminUid,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          };
          if (safePhoto) payload.photoDataUrl = safePhoto;
          await setDoc(schedRef, payload);
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, schedPath);
        }
      } else {
        try {
          await updateDoc(schedRef, {
            recipientName: params.recipientName,
            senderName: params.senderName,
            message: params.message,
            photoDataUrl: safePhoto ?? '',
            isActive: true,
            activateAt,
            expireAt,
            updatedBy: params.adminUid,
            updatedAt: serverTimestamp(),
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, schedPath);
        }
      }

      // 2. Upsert reservedSlots/{slotId}
      const slotPath = `reservedSlots/${slotId}`;
      const slotRef = doc(db, 'reservedSlots', slotId);
      let existingSlotSnap;
      try {
        existingSlotSnap = await getDoc(slotRef);
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, slotPath);
      }

      if (!existingSlotSnap?.exists()) {
        try {
          await setDoc(slotRef, {
            slotId,
            type: params.type,
            targetDate: params.targetDate,
            isBooked: true,
            createdAt: serverTimestamp(),
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, slotPath);
        }
      } else {
        try {
          await updateDoc(slotRef, { isBooked: true });
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, slotPath);
        }
      }
    },
    []
  );

  const publishDailyNoticeDoc = useCallback(
    async (params: {
      type: 'birthday' | 'confession';
      activeDate: string;
      recipientName: string;
      senderName: string;
      message: string;
      photoDataUrl?: string;
      adminUid: string;
    }) => {
      const noticeId = params.type === 'confession' ? 'confession' : 'birthday';
      const path = `dailyNotices/${noticeId}`;
      const noticeRef = doc(db, 'dailyNotices', noticeId);
      const safePhoto = sanitizePhotoDataUrl(params.photoDataUrl);

      let existingSnap;
      try {
        existingSnap = await getDoc(noticeRef);
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, path);
      }

      if (!existingSnap?.exists()) {
        try {
          const payload: Record<string, unknown> = {
            type: noticeId,
            activeDate: params.activeDate,
            recipientName: params.recipientName,
            senderName: params.senderName,
            message: params.message,
            isActive: true,
            updatedBy: params.adminUid,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          };
          if (safePhoto) payload.photoDataUrl = safePhoto;
          await setDoc(noticeRef, payload);
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, path);
        }
      } else {
        try {
          await updateDoc(noticeRef, {
            activeDate: params.activeDate,
            recipientName: params.recipientName,
            senderName: params.senderName,
            message: params.message,
            photoDataUrl: safePhoto ?? '',
            isActive: true,
            updatedBy: params.adminUid,
            updatedAt: serverTimestamp(),
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, path);
        }
      }
    },
    []
  );

  const saveDailyNotice = useCallback(
    async (input: SaveDailyNoticeInput) => {
      if (!user || user.isAnonymous || !user.emailVerified || !isAdmin) return;

      const noticeId = input.type === 'confession' ? 'confession' : 'birthday';
      const activeDate = getHongKongDateString();
      const recipientName = clampString(input.recipientName, 40, '今日壽星');
      const senderName = clampString(
        input.senderName,
        40,
        noticeId === 'confession' ? ANONYMOUS_DISPLAY_NAME : '神秘祝福者'
      );
      const message = clampString(input.message, 10000, '祝你每日開心甜甜蜜蜜！');
      const photoDataUrl = sanitizePhotoDataUrl(input.photoDataUrl);

      try {
        await publishDailyNoticeDoc({
          type: noticeId,
          activeDate,
          recipientName,
          senderName,
          message,
          photoDataUrl,
          adminUid: user.uid,
        });
        await upsertScheduledAndSlot({
          type: noticeId,
          targetDate: activeDate,
          recipientName,
          senderName,
          message,
          photoDataUrl,
          adminUid: user.uid,
        });
      } catch (err) {
        reportFriendlyError(err);
        throw err;
      }
    },
    [user, isAdmin, publishDailyNoticeDoc, upsertScheduledAndSlot, reportFriendlyError]
  );

  const clearDailyNotice = useCallback(
    async (type: 'birthday' | 'confession') => {
      if (!user || user.isAnonymous || !user.emailVerified || !isAdmin) return;
      const noticeId = type === 'confession' ? 'confession' : 'birthday';
      const currentHk = getHongKongDateString();
      const slotId = `${noticeId}_${currentHk}`;
      const path = `dailyNotices/${noticeId}`;
      try {
        await deleteDoc(doc(db, 'dailyNotices', noticeId));
        try {
          await deleteDoc(doc(db, 'reservedSlots', slotId));
        } catch {
          // ignore if missing
        }
        try {
          await deleteDoc(doc(db, 'scheduledNotices', slotId));
        } catch {
          // ignore if missing
        }
      } catch (err) {
        try {
          handleFirestoreError(err, OperationType.DELETE, path);
        } catch (wrapped) {
          reportFriendlyError(wrapped);
          throw wrapped;
        }
      }
    },
    [user, isAdmin, reportFriendlyError]
  );

  const todayBirthdayNotice =
    rawNotices.find((n) => n.type === 'birthday' && n.isActive && n.activeDate === todayHkDate) ??
    todayScheduledBirthday ??
    null;
  const todayConfessionNotice =
    rawNotices.find((n) => n.type === 'confession' && n.isActive && n.activeDate === todayHkDate) ??
    todayScheduledConfession ??
    null;

  const isDateSlotBooked = useCallback(
    (type: 'birthday' | 'confession', targetDate: string) => {
      const slotId = `${type}_${targetDate}`;
      if (bookedSlotIds.includes(slotId)) return true;
      if (targetDate === todayHkDate) {
        if (type === 'birthday' && todayBirthdayNotice) return true;
        if (type === 'confession' && todayConfessionNotice) return true;
      }
      return false;
    },
    [bookedSlotIds, todayHkDate, todayBirthdayNotice, todayConfessionNotice]
  );

  const submitNoticeRequest = useCallback(
    async (input: SubmitNoticeRequestInput): Promise<'submitted' | 'need_google'> => {
      let activeUser = auth.currentUser ?? user;
      if (!activeUser) {
        try {
          const anonCred = await signInAnonymously(auth);
          activeUser = anonCred.user;
          setAnonAuthDisabled(false);
        } catch (anonErr) {
          const errCode = (anonErr as { code?: string })?.code || '';
          if (
            errCode === 'auth/operation-not-allowed' ||
            errCode === 'auth/admin-restricted-operation'
          ) {
            setAnonAuthDisabled(true);
            return 'need_google';
          }
          reportFriendlyError(anonErr);
          throw anonErr;
        }
      }

      if (!activeUser) return 'need_google';

      const safeType: 'birthday' | 'confession' =
        input.type === 'confession' ? 'confession' : 'birthday';
      const safeDate = /^\d{4}-\d{2}-\d{2}$/.test(input.targetDate)
        ? input.targetDate
        : getHongKongDateString();
      const recipientName = clampString(input.recipientName, 40, '今日主角');
      const senderName = clampString(input.senderName, 40, ANONYMOUS_DISPLAY_NAME);
      const message = clampString(input.message, 10000, '祝福你每日開心快樂！');
      const safePhoto = sanitizePhotoDataUrl(input.photoDataUrl);
      const cleanContact = (input.contactNote ?? '').trim().slice(0, 80);

      const reqId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const path = `noticeRequests/${reqId}`;

      const payload: Record<string, unknown> = {
        requesterUid: activeUser.uid,
        type: safeType,
        targetDate: safeDate,
        recipientName,
        senderName,
        message,
        status: 'pending',
        createdAt: serverTimestamp(),
      };
      if (safePhoto) {
        payload.photoDataUrl = safePhoto;
      }
      if (cleanContact) {
        payload.contactNote = cleanContact;
      }

      try {
        await setDoc(doc(db, 'noticeRequests', reqId), payload);
        return 'submitted';
      } catch (err) {
        try {
          handleFirestoreError(err, OperationType.CREATE, path);
        } catch (wrapped) {
          reportFriendlyError(wrapped);
          throw wrapped;
        }
        return 'submitted';
      }
    },
    [user, reportFriendlyError]
  );

  const approveNoticeRequest = useCallback(
    async (req: NoticeRequestRecord) => {
      if (!user || user.isAnonymous || !user.emailVerified || !isSuperAdminEmail(user.email)) {
        return;
      }

      const recipientName = clampString(req.recipientName, 40, '今日主角');
      const senderName = clampString(req.senderName, 40, ANONYMOUS_DISPLAY_NAME);
      const message = clampString(req.message, 10000, '祝你幸福快樂！');
      const photoDataUrl = sanitizePhotoDataUrl(req.photoDataUrl);
      const currentHk = getHongKongDateString();

      try {
        await upsertScheduledAndSlot({
          type: req.type,
          targetDate: req.targetDate,
          recipientName,
          senderName,
          message,
          photoDataUrl,
          adminUid: user.uid,
        });

        if (req.targetDate === currentHk) {
          await publishDailyNoticeDoc({
            type: req.type,
            activeDate: currentHk,
            recipientName,
            senderName,
            message,
            photoDataUrl,
            adminUid: user.uid,
          });
        }

        const reqPath = `noticeRequests/${req.id}`;
        try {
          await updateDoc(doc(db, 'noticeRequests', req.id), {
            status: 'approved',
            reviewedAt: serverTimestamp(),
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, reqPath);
        }
      } catch (err) {
        reportFriendlyError(err);
        throw err;
      }
    },
    [user, upsertScheduledAndSlot, publishDailyNoticeDoc, reportFriendlyError]
  );

  const rejectNoticeRequest = useCallback(
    async (requestId: string) => {
      if (!user || user.isAnonymous || !user.emailVerified || !isSuperAdminEmail(user.email)) {
        return;
      }
      const safeReqId = sanitizeId(requestId, 128, '');
      if (!safeReqId) return;

      const reqPath = `noticeRequests/${safeReqId}`;
      try {
        await updateDoc(doc(db, 'noticeRequests', safeReqId), {
          status: 'rejected',
          reviewedAt: serverTimestamp(),
        });
      } catch (err) {
        try {
          handleFirestoreError(err, OperationType.UPDATE, reqPath);
        } catch (wrapped) {
          reportFriendlyError(wrapped);
          throw wrapped;
        }
      }
    },
    [user, reportFriendlyError]
  );

  const cancelScheduledNotice = useCallback(
    async (type: 'birthday' | 'confession', targetDate: string) => {
      if (!user || user.isAnonymous || !user.emailVerified || !isAdmin) return;
      const slotId = `${type}_${targetDate}`;
      try {
        try {
          await deleteDoc(doc(db, 'scheduledNotices', slotId));
        } catch {
          // ignore
        }
        try {
          await deleteDoc(doc(db, 'reservedSlots', slotId));
        } catch {
          // ignore
        }
        if (targetDate === getHongKongDateString()) {
          try {
            await deleteDoc(doc(db, 'dailyNotices', type));
          } catch {
            // ignore
          }
        }
      } catch (err) {
        reportFriendlyError(err);
        throw err;
      }
    },
    [user, isAdmin, reportFriendlyError]
  );

  const addAuthorizedAdmin = useCallback(
    async (targetUid: string, note: string) => {
      if (!user || user.isAnonymous || !user.emailVerified || !isSuperAdminEmail(user.email)) {
        return;
      }
      const safeUid = sanitizeId(targetUid, 128, '');
      if (!safeUid) throw new Error('Invalid UID format');
      const path = `admins/${safeUid}`;
      try {
        await setDoc(doc(db, 'admins', safeUid), {
          uid: safeUid,
          note: clampString(note, 60, '授權管理員'),
          createdAt: serverTimestamp(),
        });
      } catch (err) {
        try {
          handleFirestoreError(err, OperationType.CREATE, path);
        } catch (wrapped) {
          reportFriendlyError(wrapped);
          throw wrapped;
        }
      }
    },
    [user, reportFriendlyError]
  );

  const removeAuthorizedAdmin = useCallback(
    async (targetUid: string) => {
      if (!user || user.isAnonymous || !user.emailVerified || !isSuperAdminEmail(user.email)) {
        return;
      }
      const safeUid = sanitizeId(targetUid, 128, '');
      if (!safeUid) return;
      const path = `admins/${safeUid}`;
      try {
        await deleteDoc(doc(db, 'admins', safeUid));
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

  const updateMyGameDisplayName = useCallback(
    async (newName: string) => {
      if (!user || user.isAnonymous || !user.emailVerified) return;
      const safeName = clampString(newName, 60, ANONYMOUS_DISPLAY_NAME);
      const userPath = `users/${user.uid}`;
      try {
        await ensureUserProfile(user);
        try {
          await updateDoc(doc(db, 'users', user.uid), {
            displayName: safeName,
            updatedAt: serverTimestamp(),
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, userPath);
        }
        resolvedProfileNameRef.current = safeName;
        setProfileDisplayName(safeName);
        await syncOwnLeaderboardDisplayName(user.uid, safeName);
      } catch (err) {
        reportFriendlyError(err);
        throw err;
      }
    },
    [user, ensureUserProfile, syncOwnLeaderboardDisplayName, reportFriendlyError]
  );

  const adminUpdateLeaderboardDisplayName = useCallback(
    async (entryId: string, newName: string) => {
      if (!user || user.isAnonymous || !user.emailVerified || !isAdmin) return;
      const safeEntryId = sanitizeId(entryId, 128, '');
      if (!safeEntryId) return;
      const safeName = clampString(newName, 60, ANONYMOUS_DISPLAY_NAME);
      const lbPath = `leaderboard/${safeEntryId}`;

      try {
        try {
          await updateDoc(doc(db, 'leaderboard', safeEntryId), {
            displayName: safeName,
            updatedAt: serverTimestamp(),
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, lbPath);
        }

        const matchedEntry = leaderboardEntries.find((e) => e.id === safeEntryId);
        if (matchedEntry && matchedEntry.userId === user.uid) {
          try {
            await updateDoc(doc(db, 'users', user.uid), {
              displayName: safeName,
              updatedAt: serverTimestamp(),
            });
            resolvedProfileNameRef.current = safeName;
            setProfileDisplayName(safeName);
          } catch {
            // non-blocking self profile sync
          }
        }
      } catch (err) {
        reportFriendlyError(err);
        throw err;
      }
    },
    [user, isAdmin, leaderboardEntries, reportFriendlyError]
  );

  const adminDeleteLeaderboardEntry = useCallback(
    async (entryId: string) => {
      if (!user || user.isAnonymous || !user.emailVerified || !isAdmin) return;
      const safeEntryId = sanitizeId(entryId, 128, '');
      if (!safeEntryId) return;
      const lbPath = `leaderboard/${safeEntryId}`;

      try {
        await deleteDoc(doc(db, 'leaderboard', safeEntryId));
      } catch (err) {
        try {
          handleFirestoreError(err, OperationType.DELETE, lbPath);
        } catch (wrapped) {
          reportFriendlyError(wrapped);
          throw wrapped;
        }
      }
    },
    [user, isAdmin, reportFriendlyError]
  );

  const adminRenameVisitor = useCallback(
    async (deviceId: string, newName: string) => {
      if (!user || user.isAnonymous || !user.emailVerified || !isSuperAdminEmail(user.email)) {
        return;
      }
      const safeDeviceId = sanitizeId(deviceId, 64, '');
      if (!safeDeviceId) return;
      const safeName = clampString(newName, 60, ANONYMOUS_DISPLAY_NAME);
      const path = `visitors/${safeDeviceId}`;
      try {
        await updateDoc(doc(db, 'visitors', safeDeviceId), {
          displayName: safeName,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        try {
          handleFirestoreError(err, OperationType.UPDATE, path);
        } catch (wrapped) {
          reportFriendlyError(wrapped);
          throw wrapped;
        }
      }
    },
    [user, reportFriendlyError]
  );

  const adminDeleteVisitor = useCallback(
    async (deviceId: string) => {
      if (!user || user.isAnonymous || !user.emailVerified || !isSuperAdminEmail(user.email)) {
        return;
      }
      const safeDeviceId = sanitizeId(deviceId, 64, '');
      if (!safeDeviceId) return;
      const path = `visitors/${safeDeviceId}`;
      try {
        await deleteDoc(doc(db, 'visitors', safeDeviceId));
      } catch (err) {
        try {
          handleFirestoreError(err, OperationType.DELETE, path);
        } catch (wrapped) {
          reportFriendlyError(wrapped);
          throw wrapped;
        }
      }
    },
    [user, reportFriendlyError]
  );

  const isVerifiedGoogleUser = Boolean(user && !user.isAnonymous && user.emailVerified);
  const isSuperAdmin = Boolean(isVerifiedGoogleUser && isSuperAdminEmail(user?.email));
  const gameDisplayName = isVerifiedGoogleUser && user
    ? profileDisplayName ||
      (isSuperAdminEmail(user.email)
        ? DEFAULT_ADMIN_SPIRIT_NAME
        : clampString(user.displayName, 60, '糖果玩家'))
    : ANONYMOUS_DISPLAY_NAME;

  return (
    <FirebaseContext.Provider
      value={{
        user,
        isVerifiedGoogleUser,
        isAdmin: isVerifiedGoogleUser && isAdmin,
        isSuperAdmin,
        gameDisplayName,
        authReady,
        isAuthBusy,
        cloudError,
        clearCloudError,
        signInWithGoogle,
        signOutUser,
        updateMyGameDisplayName,
        adminUpdateLeaderboardDisplayName,
        adminDeleteLeaderboardEntry,
        scoresMap,
        getCloudHighScore,
        leaderboardEntries,
        leaderboardLoading,
        leaderboardError,
        anonAuthDisabled,
        getPublicStageBest,
        saveGameScore,
        cloudCustomTheme,
        saveCustomTheme,
        compatibilityLogs,
        saveCompatibilityLog,
        deleteCompatibilityLog,
        todayHkDate,
        todayBirthdayNotice,
        todayConfessionNotice,
        saveDailyNotice,
        clearDailyNotice,
        adminUsers,
        addAuthorizedAdmin,
        removeAuthorizedAdmin,
        bookedSlotIds,
        isDateSlotBooked,
        myNoticeRequests,
        pendingNoticeRequests,
        scheduledNotices,
        submitNoticeRequest,
        approveNoticeRequest,
        rejectNoticeRequest,
        cancelScheduledNotice,
        currentDeviceId: currentDeviceIdRef.current,
        visitors,
        adminRenameVisitor,
        adminDeleteVisitor,
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
