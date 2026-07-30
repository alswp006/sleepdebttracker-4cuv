// Sleep tracking domain entities
export interface SleepRecord {
  id: string;
  date: string;
  bedTime: string;
  wakeTime: string;
  actualSleepMin: number;
  deficitMin: number;
  createdAt: number;
}

export interface UserSettings {
  targetSleepMin: number;
  onboarded: boolean;
}

export interface StreakState {
  current: number;
  best: number;
  lastCheckDate: string;
}

export interface SleepTypeResult {
  type: "morning" | "evening" | "intermediate";
  score: number;
  answeredAt: number;
}

export interface RewardUnlock {
  report?: string;
  plan?: string;
}

// Result type for save operations
export type SaveResult =
  | { ok: true }
  | { ok: false; reason: "QUOTA" | "INVALID_DURATION" };

// Navigation state shape per route
export interface RouteState {
  "/": { savedDate: string } | undefined;
  "/record": undefined;
  "/report": undefined;
  "/plan": undefined;
  "/sleep-type": undefined;
  "/settings": undefined;
}

// Storage key constants
export type LS_KEYS =
  | "sdt.records"
  | "sdt.settings"
  | "sdt.streak"
  | "sdt.sleepType"
  | "sdt.rewardUnlock";
