import type { StreakState } from "@/lib/types";
import { safeGet, safeSet } from "@/lib/storage";

const STREAK_KEY = "sdt.streak";

const DEFAULT_STREAK: StreakState = { current: 0, best: 0, lastCheckDate: "" };

function dayDiff(lastDate: string, checkDate: string): number {
  const last = new Date(lastDate);
  const check = new Date(checkDate);
  return Math.floor((check.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));
}

export function getStreak(): StreakState {
  return safeGet<StreakState>(STREAK_KEY, DEFAULT_STREAK);
}

export function updateStreak(today: string): StreakState {
  const streak = getStreak();

  if (!streak.lastCheckDate) {
    const initial: StreakState = { current: 1, best: 1, lastCheckDate: today };
    safeSet(STREAK_KEY, initial);
    return initial;
  }

  const diff = dayDiff(streak.lastCheckDate, today);

  if (diff === 1) {
    streak.current += 1;
    streak.best = Math.max(streak.best, streak.current);
  } else if (diff > 1) {
    streak.current = 1;
  }
  // diff === 0 (same day) or diff < 0: no change to current/best

  streak.lastCheckDate = today;
  safeSet(STREAK_KEY, streak);
  return streak;
}
