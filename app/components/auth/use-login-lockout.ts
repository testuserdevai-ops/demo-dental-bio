"use client";

import {
  type RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

const MAX_ATTEMPTS = 3;
const LOCKOUT_DURATION_MS = 60_000;
const ATTEMPTS_STORAGE_KEY = "loginAttempts";
const END_TIME_STORAGE_KEY = "lockoutEndTime";

function secondsUntil(endTime: number) {
  return Math.max(0, Math.ceil((endTime - Date.now()) / 1_000));
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
  const attemptsRef = useRef(0);
  const lockoutEndRef = useRef<number | null>(null);
  const [lockoutEndTime, setLockoutEndTime] = useState<number | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const isLocked = lockoutEndTime !== null && remainingSeconds > 0;

  const clearLockout = useCallback(() => {
    attemptsRef.current = 0;
    lockoutEndRef.current = null;
    setLockoutEndTime(null);
    setRemainingSeconds(0);
    localStorage.removeItem(ATTEMPTS_STORAGE_KEY);
    localStorage.removeItem(END_TIME_STORAGE_KEY);
  }, []);

  useEffect(() => {
    const savedAttempts = Number(
      localStorage.getItem(ATTEMPTS_STORAGE_KEY) ?? 0,
    );
    const savedEndTime = Number(
      localStorage.getItem(END_TIME_STORAGE_KEY) ?? 0,
    );
    attemptsRef.current = Number.isFinite(savedAttempts) ? savedAttempts : 0;

    if (Number.isFinite(savedEndTime) && savedEndTime > Date.now()) {
      lockoutEndRef.current = savedEndTime;
      setLockoutEndTime(savedEndTime);
      setRemainingSeconds(secondsUntil(savedEndTime));
      return;
    }

    if (savedEndTime || attemptsRef.current >= MAX_ATTEMPTS) clearLockout();
  }, [clearLockout]);

  useEffect(() => {
    if (lockoutEndTime === null) return;

    const updateCountdown = () => {
      const nextRemainingSeconds = secondsUntil(lockoutEndTime);
      if (nextRemainingSeconds === 0) {
        clearLockout();
        return;
      }
      setRemainingSeconds(nextRemainingSeconds);
    };
    const timer = window.setInterval(updateCountdown, 1_000);
    return () => window.clearInterval(timer);
  }, [clearLockout, lockoutEndTime]);

  useEffect(() => {
    if (!isLocked) return;
    queueMicrotask(() => alertRef.current?.focus());
  }, [alertRef, isLocked]);

  const recordFailure = useCallback(() => {
    if (lockoutEndRef.current !== null && lockoutEndRef.current > Date.now()) {
      return true;
    }

    const nextAttempts = attemptsRef.current + 1;
    attemptsRef.current = nextAttempts;
    localStorage.setItem(ATTEMPTS_STORAGE_KEY, String(nextAttempts));
    if (nextAttempts < MAX_ATTEMPTS) return false;

    const lockoutEnd = Date.now() + LOCKOUT_DURATION_MS;
    lockoutEndRef.current = lockoutEnd;
    setLockoutEndTime(lockoutEnd);
    setRemainingSeconds(secondsUntil(lockoutEnd));
    localStorage.setItem(END_TIME_STORAGE_KEY, String(lockoutEnd));
    return true;
  }, []);

  return {
    isLocked,
    remainingSeconds,
    recordFailure,
    clearLockout,
  };
}
