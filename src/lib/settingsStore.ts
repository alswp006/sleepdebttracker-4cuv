import type {
  UserSettings,
  SleepTypeResult,
  RewardUnlock,
  SaveResult,
} from "@/lib/types";
import { safeGet, safeSet } from "@/lib/storage";

const SETTINGS_KEY = "sdt.settings";
const SLEEP_TYPE_KEY = "sdt.sleepType";
const REWARD_UNLOCK_KEY = "sdt.rewardUnlock";

const MIN_TARGET_SLEEP_MIN = 360;
const MAX_TARGET_SLEEP_MIN = 600;

const DEFAULT_SETTINGS: UserSettings = { targetSleepMin: 480, onboarded: false };

export function getSettings(): UserSettings {
  return safeGet<UserSettings>(SETTINGS_KEY, DEFAULT_SETTINGS);
}

export function saveSettings(settings: UserSettings): SaveResult {
  const clamped: UserSettings = {
    ...settings,
    targetSleepMin: Math.max(
      MIN_TARGET_SLEEP_MIN,
      Math.min(MAX_TARGET_SLEEP_MIN, settings.targetSleepMin)
    ),
  };
  return safeSet(SETTINGS_KEY, clamped);
}

export function getSleepType(): SleepTypeResult | null {
  return safeGet<SleepTypeResult | null>(SLEEP_TYPE_KEY, null);
}

export function saveSleepType(result: SleepTypeResult): SaveResult {
  return safeSet(SLEEP_TYPE_KEY, result);
}

export function getRewardUnlock(): RewardUnlock {
  return safeGet<RewardUnlock>(REWARD_UNLOCK_KEY, {});
}

export function setRewardUnlock(
  kind: "report" | "plan",
  date: string
): SaveResult {
  const unlock = getRewardUnlock();
  unlock[kind] = date;
  return safeSet(REWARD_UNLOCK_KEY, unlock);
}
