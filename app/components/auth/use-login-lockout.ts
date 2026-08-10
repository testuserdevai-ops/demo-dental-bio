"use client";

import {
  type RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

const MAX_ATTEMPTS = 3;
const LOCKOUT_DURATION_MS = 60_000;
const ATTEMPTS_STORAGE_KEY = "loginAttempts";
const END_TIME_STORAGE_KEY = "lockoutEndTime";

function secondsUntil(endTime: number) {
  return Math.max(0, Math.ceil((endTime - Date.now()) / 1_000));
}

type RestoredLockout = {
  attempts: number;
  lockoutEndTime: number | null;
};

const EMPTY_LOCKOUT: RestoredLockout = { attempts: 0, lockoutEndTime: null };
let lockoutSnapshot = EMPTY_LOCKOUT;
const lockoutListeners = new Set<() => void>();

function readStoredLockout(): RestoredLockout {
  const savedAttempts = Number(localStorage.getItem(ATTEMPTS_STORAGE_KEY) ?? 0);
  const attempts = Number.isFinite(savedAttempts) ? savedAttempts : 0;
  const savedEndTime = Number(localStorage.getItem(END_TIME_STORAGE_KEY) ?? 0);

  if (Number.isFinite(savedEndTime) && savedEndTime > Date.now()) {
    return { attempts, lockoutEndTime: savedEndTime };
  }

  return { attempts: savedEndTime ? 0 : attempts, lockoutEndTime: null };
}

function notifyLockoutListeners() {
  lockoutListeners.forEach((listener) => listener());
}

function syncStoredLockout() {
  if (typeof window === "undefined") return;

  const restoredLockout = readStoredLockout();
  const hasInvalidPersistedLockout =
    restoredLockout.lockoutEndTime === null &&
    (localStorage.getItem(END_TIME_STORAGE_KEY) !== null ||
      restoredLockout.attempts >= MAX_ATTEMPTS);
  if (hasInvalidPersistedLockout) {
    localStorage.removeItem(ATTEMPTS_STORAGE_KEY);
    localStorage.removeItem(END_TIME_STORAGE_KEY);
  }
  lockoutSnapshot = hasInvalidPersistedLockout
    ? EMPTY_LOCKOUT
    : restoredLockout;
  notifyLockoutListeners();
}

function subscribeToLockout(listener: () => void) {
  lockoutListeners.add(listener);
  if (lockoutListeners.size === 1) {
    queueMicrotask(syncStoredLockout);
  }

  return () => lockoutListeners.delete(listener);
}

function getLockoutSnapshot() {
  return lockoutSnapshot;
}

function persistLockout(snapshot: RestoredLockout) {
  lockoutSnapshot = snapshot;
  if (snapshot.lockoutEndTime === null) {
    if (snapshot.attempts === 0) {
      localStorage.removeItem(ATTEMPTS_STORAGE_KEY);
    } else {
      localStorage.setItem(ATTEMPTS_STORAGE_KEY, String(snapshot.attempts));
    }
    localStorage.removeItem(END_TIME_STORAGE_KEY);
  } else {
    localStorage.setItem(ATTEMPTS_STORAGE_KEY, String(snapshot.attempts));
    localStorage.setItem(END_TIME_STORAGE_KEY, String(snapshot.lockoutEndTime));
  }
  notifyLockoutListeners();
}

export interface LoginLockoutState {
  isLocked: boolean;
  remainingSeconds: number;
  recordFailure: () => boolean;
  clearLockout: () => void;
}

export function useLoginLockout(
  alertRef: RefObject<HTMLElement | null>,
): LoginLockoutState {
  const restoredLockout = useSyncExternalStore(
    subscribeToLockout,
    getLockoutSnapshot,
    () => EMPTY_LOCKOUT,
  );
  const lockoutEndTime = restoredLockout.lockoutEndTime;
  const [, setCountdownTick] = useState(0);
  const hasFocusedLockoutRef = useRef(false);
  const remainingSeconds = lockoutEndTime ? secondsUntil(lockoutEndTime) : 0;
  const isLocked = lockoutEndTime !== null && remainingSeconds > 0;

  const clearLockout = useCallback(() => {
    persistLockout(EMPTY_LOCKOUT);
  }, []);

  useEffect(() => {
    if (lockoutEndTime === null) return;

    const updateCountdown = () => {
      const nextRemainingSeconds = secondsUntil(lockoutEndTime);
      if (nextRemainingSeconds === 0) {
        clearLockout();
        return;
      }
      setCountdownTick((tick) => tick + 1);
    };
    const timer = window.setInterval(updateCountdown, 1_000);
    return () => window.clearInterval(timer);
  }, [clearLockout, lockoutEndTime]);

  useEffect(() => {
    if (!isLocked) {
      hasFocusedLockoutRef.current = false;
      return;
    }
    if (hasFocusedLockoutRef.current) return;
    hasFocusedLockoutRef.current = true;
    queueMicrotask(() => alertRef.current?.focus());
  }, [alertRef, isLocked]);

  const recordFailure = useCallback(() => {
    if (
      lockoutSnapshot.lockoutEndTime !== null &&
      lockoutSnapshot.lockoutEndTime > Date.now()
    ) {
      return true;
    }

    const nextAttempts = lockoutSnapshot.attempts + 1;
    if (nextAttempts < MAX_ATTEMPTS) {
      persistLockout({ attempts: nextAttempts, lockoutEndTime: null });
      return false;
    }

    const lockoutEnd = Date.now() + LOCKOUT_DURATION_MS;
    persistLockout({ attempts: nextAttempts, lockoutEndTime: lockoutEnd });
    return true;
  }, []);

  return {
    isLocked,
    remainingSeconds,
    recordFailure,
    clearLockout,
  };
}
