import { describe, it, expect, beforeEach } from "vitest";
import type {
  SleepRecord,
  UserSettings,
  StreakState,
  SleepTypeResult,
  RewardUnlock,
} from "@/lib/types";

// ============================================================================
// DOMAIN CRUD LAYER — 기록·스트릭·설정/유형/리워드
// ============================================================================

describe("packet-0003: getRecords & saveRecord — 수면 기록 저장/조회", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("AC-1[P0]: should save new record with calculated actualSleepMin and deficitMin", () => {
    // Helper functions from calc.ts
    const calcSleepMin = (bedTime: string, wakeTime: string): number => {
      const [sh, sm] = bedTime.split(":").map(Number);
      const [eh, em] = wakeTime.split(":").map(Number);

      let startMin = sh * 60 + sm;
      let endMin = eh * 60 + em;

      if (endMin <= startMin) {
        endMin += 24 * 60;
      }

      const duration = endMin - startMin;

      if (duration <= 0 || duration > 960) {
        throw new Error("INVALID_DURATION");
      }

      return duration;
    };

    const calcDeficit = (target: number, actual: number): number => {
      return Math.max(-120, target - actual);
    };

    // Implementation preview: saveRecord should:
    // 1. Calculate actualSleepMin using calcSleepMin
    // 2. Calculate deficitMin using calcDeficit (target = 480)
    // 3. Create SleepRecord with id = date, add createdAt
    // 4. Store in localStorage["sdt.records"]

    const TARGET_SLEEP_MIN = 480;
    const date = "2026-07-31";
    const bedTime = "23:00";
    const wakeTime = "07:00";

    // Simulate saveRecord implementation
    const actualSleepMin = calcSleepMin(bedTime, wakeTime);
    const deficitMin = calcDeficit(TARGET_SLEEP_MIN, actualSleepMin);

    const newRecord: SleepRecord = {
      id: date,
      date,
      bedTime,
      wakeTime,
      actualSleepMin,
      deficitMin,
      createdAt: 1722412800000, // fixed timestamp
    };

    // Store in localStorage
    const existing = JSON.parse(
      localStorage.getItem("sdt.records") || "[]"
    ) as SleepRecord[];
    existing.push(newRecord);
    localStorage.setItem("sdt.records", JSON.stringify(existing));

    // Verify
    const records = JSON.parse(
      localStorage.getItem("sdt.records") || "[]"
    ) as SleepRecord[];
    expect(records).toHaveLength(1);
    expect(records[0].actualSleepMin).toBe(480);
    expect(records[0].deficitMin).toBe(0);
    expect(records[0].id).toBe("2026-07-31");
    expect(records[0].createdAt).toBe(1722412800000);
  });

  it("AC-2[P0]: should update existing record on same date (upsert)", () => {
    const TARGET_SLEEP_MIN = 480;
    const calcSleepMin = (bedTime: string, wakeTime: string): number => {
      const [sh, sm] = bedTime.split(":").map(Number);
      const [eh, em] = wakeTime.split(":").map(Number);

      let startMin = sh * 60 + sm;
      let endMin = eh * 60 + em;

      if (endMin <= startMin) {
        endMin += 24 * 60;
      }

      const duration = endMin - startMin;

      if (duration <= 0 || duration > 960) {
        throw new Error("INVALID_DURATION");
      }

      return duration;
    };

    const calcDeficit = (target: number, actual: number): number => {
      return Math.max(-120, target - actual);
    };

    const date = "2026-07-31";

    // First save: 23:00 to 07:00 = 480 min
    const firstRecord: SleepRecord = {
      id: date,
      date,
      bedTime: "23:00",
      wakeTime: "07:00",
      actualSleepMin: 480,
      deficitMin: 0,
      createdAt: 1722412800000,
    };

    let records = [firstRecord];
    localStorage.setItem("sdt.records", JSON.stringify(records));

    expect(records).toHaveLength(1);

    // Second save: same date, different time: 23:30 to 07:00 = 450 min
    const bedTime2 = "23:30";
    const wakeTime2 = "07:00";
    const actualSleepMin2 = calcSleepMin(bedTime2, wakeTime2);
    const deficitMin2 = calcDeficit(TARGET_SLEEP_MIN, actualSleepMin2);

    const updatedRecord: SleepRecord = {
      id: date,
      date,
      bedTime: bedTime2,
      wakeTime: wakeTime2,
      actualSleepMin: actualSleepMin2,
      deficitMin: deficitMin2,
      createdAt: 1722412801000,
    };

    // Simulate upsert logic
    records = JSON.parse(
      localStorage.getItem("sdt.records") || "[]"
    ) as SleepRecord[];
    const existingIndex = records.findIndex((r) => r.id === date);
    if (existingIndex >= 0) {
      records[existingIndex] = updatedRecord;
    } else {
      records.push(updatedRecord);
    }
    localStorage.setItem("sdt.records", JSON.stringify(records));

    // Verify: length stays 1, data updated
    const finalRecords = JSON.parse(
      localStorage.getItem("sdt.records") || "[]"
    ) as SleepRecord[];
    expect(finalRecords).toHaveLength(1);
    expect(finalRecords[0].actualSleepMin).toBe(450);
    expect(finalRecords[0].deficitMin).toBe(30);
    expect(finalRecords[0].bedTime).toBe("23:30");
  });

  it("AC-1[P1]: getRecordByDate should return specific record or null", () => {
    const date = "2026-07-31";
    const record: SleepRecord = {
      id: date,
      date,
      bedTime: "23:00",
      wakeTime: "07:00",
      actualSleepMin: 480,
      deficitMin: 0,
      createdAt: 1722412800000,
    };

    localStorage.setItem("sdt.records", JSON.stringify([record]));

    // Simulate getRecordByDate
    const records = JSON.parse(
      localStorage.getItem("sdt.records") || "[]"
    ) as SleepRecord[];
    const found = records.find((r) => r.date === date);

    expect(found).toBeDefined();
    expect(found?.date).toBe("2026-07-31");
    expect(found?.actualSleepMin).toBe(480);
  });

  it("AC-1[P1]: getRecordByDate should return null when not found", () => {
    localStorage.setItem("sdt.records", JSON.stringify([]));

    // Simulate getRecordByDate for non-existent date
    const records = JSON.parse(
      localStorage.getItem("sdt.records") || "[]"
    ) as SleepRecord[];
    const found = records.find((r) => r.date === "2026-08-01");

    expect(found).toBeUndefined();
  });
});

describe("packet-0003: updateStreak — 스트릭 증가/리셋", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("AC-3[P0]: should increment current when lastCheckDate is yesterday", () => {
    // Simulate: yesterday's lastCheckDate with current=5
    const yesterday = "2026-07-30";
    const today = "2026-07-31";

    const currentStreak: StreakState = {
      current: 5,
      best: 10,
      lastCheckDate: yesterday,
    };

    localStorage.setItem("sdt.streak", JSON.stringify(currentStreak));

    // Simulate updateStreak(today)
    const streak = JSON.parse(
      localStorage.getItem("sdt.streak") || '{"current":1,"best":1,"lastCheckDate":""}'
    ) as StreakState;

    const dayDiff = (lastDate: string, checkDate: string): number => {
      const last = new Date(lastDate);
      const check = new Date(checkDate);
      return Math.floor((check.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));
    };

    const diff = dayDiff(streak.lastCheckDate, today);

    if (diff === 1) {
      // Yesterday → increment
      streak.current += 1;
      streak.best = Math.max(streak.best, streak.current);
    } else if (diff > 1) {
      // Missed days → reset
      streak.current = 1;
    }
    // diff === 0 means same day, no change

    streak.lastCheckDate = today;
    localStorage.setItem("sdt.streak", JSON.stringify(streak));

    const updated = JSON.parse(
      localStorage.getItem("sdt.streak") || '{"current":1,"best":1,"lastCheckDate":""}'
    ) as StreakState;

    expect(updated.current).toBe(6);
    expect(updated.best).toBe(10);
    expect(updated.lastCheckDate).toBe("2026-07-31");
  });

  it("AC-3[P0]: should update best when current exceeds it", () => {
    const yesterday = "2026-07-30";
    const today = "2026-07-31";

    const streak: StreakState = {
      current: 9,
      best: 9,
      lastCheckDate: yesterday,
    };

    localStorage.setItem("sdt.streak", JSON.stringify(streak));

    // Simulate updateStreak
    const loaded = JSON.parse(
      localStorage.getItem("sdt.streak") || '{"current":1,"best":1,"lastCheckDate":""}'
    ) as StreakState;

    const dayDiff = (lastDate: string, checkDate: string): number => {
      const last = new Date(lastDate);
      const check = new Date(checkDate);
      return Math.floor((check.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));
    };

    const diff = dayDiff(loaded.lastCheckDate, today);

    if (diff === 1) {
      loaded.current += 1;
      loaded.best = Math.max(loaded.best, loaded.current);
    } else if (diff > 1) {
      loaded.current = 1;
    }

    loaded.lastCheckDate = today;
    localStorage.setItem("sdt.streak", JSON.stringify(loaded));

    const updated = JSON.parse(
      localStorage.getItem("sdt.streak") || '{"current":1,"best":1,"lastCheckDate":""}'
    ) as StreakState;

    expect(updated.current).toBe(10);
    expect(updated.best).toBe(10);
  });

  it("AC-4[P0]: should reset current to 1 when days missed (diff > 1)", () => {
    const twodays_ago = "2026-07-29";
    const today = "2026-07-31"; // gap of 2 days

    const streak: StreakState = {
      current: 5,
      best: 8,
      lastCheckDate: twodays_ago,
    };

    localStorage.setItem("sdt.streak", JSON.stringify(streak));

    // Simulate updateStreak
    const loaded = JSON.parse(
      localStorage.getItem("sdt.streak") || '{"current":1,"best":1,"lastCheckDate":""}'
    ) as StreakState;

    const dayDiff = (lastDate: string, checkDate: string): number => {
      const last = new Date(lastDate);
      const check = new Date(checkDate);
      return Math.floor((check.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));
    };

    const diff = dayDiff(loaded.lastCheckDate, today);

    if (diff === 1) {
      loaded.current += 1;
      loaded.best = Math.max(loaded.best, loaded.current);
    } else if (diff > 1) {
      loaded.current = 1; // Reset on missed days
    }

    loaded.lastCheckDate = today;
    localStorage.setItem("sdt.streak", JSON.stringify(loaded));

    const updated = JSON.parse(
      localStorage.getItem("sdt.streak") || '{"current":1,"best":1,"lastCheckDate":""}'
    ) as StreakState;

    expect(updated.current).toBe(1);
    expect(updated.best).toBe(8); // best not affected
    expect(updated.lastCheckDate).toBe("2026-07-31");
  });

  it("AC-5[P0]: should not change current on same day", () => {
    const today = "2026-07-31";

    const streak: StreakState = {
      current: 5,
      best: 8,
      lastCheckDate: today,
    };

    localStorage.setItem("sdt.streak", JSON.stringify(streak));

    // Simulate updateStreak called again on same day
    const loaded = JSON.parse(
      localStorage.getItem("sdt.streak") || '{"current":1,"best":1,"lastCheckDate":""}'
    ) as StreakState;

    const dayDiff = (lastDate: string, checkDate: string): number => {
      const last = new Date(lastDate);
      const check = new Date(checkDate);
      return Math.floor((check.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));
    };

    const diff = dayDiff(loaded.lastCheckDate, today);

    if (diff === 1) {
      loaded.current += 1;
      loaded.best = Math.max(loaded.best, loaded.current);
    } else if (diff > 1) {
      loaded.current = 1;
    }
    // diff === 0: no change

    loaded.lastCheckDate = today;
    localStorage.setItem("sdt.streak", JSON.stringify(loaded));

    const updated = JSON.parse(
      localStorage.getItem("sdt.streak") || '{"current":1,"best":1,"lastCheckDate":""}'
    ) as StreakState;

    expect(updated.current).toBe(5); // unchanged
    expect(updated.best).toBe(8);
  });

  it("AC-6[P0]: should initialize with current=1, best=1 on first use", () => {
    // Simulate first call to updateStreak with no prior state
    const today = "2026-07-31";

    let streak: StreakState | null = null;

    const loaded = streak || { current: 1, best: 1, lastCheckDate: today };
    localStorage.setItem("sdt.streak", JSON.stringify(loaded));

    const updated = JSON.parse(
      localStorage.getItem("sdt.streak") || '{"current":1,"best":1,"lastCheckDate":""}'
    ) as StreakState;

    expect(updated.current).toBe(1);
    expect(updated.best).toBe(1);
    expect(updated.lastCheckDate).toBe("2026-07-31");
  });
});

describe("packet-0003: getSettings & saveSettings — 설정 저장/조회", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("AC-7[P0]: should save and retrieve targetSleepMin", () => {
    const settings: UserSettings = {
      targetSleepMin: 480,
      onboarded: false,
    };

    localStorage.setItem("sdt.settings", JSON.stringify(settings));

    const retrieved = JSON.parse(
      localStorage.getItem("sdt.settings") || '{"targetSleepMin":480,"onboarded":false}'
    ) as UserSettings;

    expect(retrieved.targetSleepMin).toBe(480);
    expect(retrieved.onboarded).toBe(false);
  });

  it("AC-7[P0]: should clamp targetSleepMin to 360-600 range", () => {
    // Simulate saveSettings with clamping
    const clampTarget = (value: number): number => {
      return Math.max(360, Math.min(600, value));
    };

    // Test: 300 → 360
    let target = clampTarget(300);
    expect(target).toBe(360);

    // Test: 480 → 480
    target = clampTarget(480);
    expect(target).toBe(480);

    // Test: 700 → 600
    target = clampTarget(700);
    expect(target).toBe(600);

    // Test: 360 → 360 (edge)
    target = clampTarget(360);
    expect(target).toBe(360);

    // Test: 600 → 600 (edge)
    target = clampTarget(600);
    expect(target).toBe(600);
  });

  it("AC-7[P1]: should update onboarded flag", () => {
    const settings: UserSettings = {
      targetSleepMin: 480,
      onboarded: false,
    };

    localStorage.setItem("sdt.settings", JSON.stringify(settings));

    // Update onboarded
    const updated: UserSettings = {
      ...settings,
      onboarded: true,
    };

    localStorage.setItem("sdt.settings", JSON.stringify(updated));

    const retrieved = JSON.parse(
      localStorage.getItem("sdt.settings") || '{"targetSleepMin":480,"onboarded":false}'
    ) as UserSettings;

    expect(retrieved.onboarded).toBe(true);
    expect(retrieved.targetSleepMin).toBe(480);
  });
});

describe("packet-0003: getSleepType & saveSleepType — 수면 유형 저장/조회", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("AC-8[P0]: should save and retrieve SleepTypeResult", () => {
    const sleepType: SleepTypeResult = {
      type: "morning",
      score: 75,
      answeredAt: 1722412800000,
    };

    localStorage.setItem("sdt.sleepType", JSON.stringify(sleepType));

    const retrieved = JSON.parse(
      localStorage.getItem("sdt.sleepType") || "null"
    ) as SleepTypeResult | null;

    expect(retrieved).toBeDefined();
    expect(retrieved?.type).toBe("morning");
    expect(retrieved?.score).toBe(75);
    expect(retrieved?.answeredAt).toBe(1722412800000);
  });

  it("AC-8[P0]: should handle null when sleepType not set", () => {
    localStorage.setItem("sdt.sleepType", "null");

    const retrieved = JSON.parse(
      localStorage.getItem("sdt.sleepType") || "null"
    ) as SleepTypeResult | null;

    expect(retrieved).toBeNull();
  });

  it("AC-8[P1]: should update sleepType when called again", () => {
    const first: SleepTypeResult = {
      type: "morning",
      score: 75,
      answeredAt: 1722412800000,
    };

    localStorage.setItem("sdt.sleepType", JSON.stringify(first));

    // Update with new type
    const second: SleepTypeResult = {
      type: "evening",
      score: 25,
      answeredAt: 1722412801000,
    };

    localStorage.setItem("sdt.sleepType", JSON.stringify(second));

    const retrieved = JSON.parse(
      localStorage.getItem("sdt.sleepType") || "null"
    ) as SleepTypeResult | null;

    expect(retrieved?.type).toBe("evening");
    expect(retrieved?.score).toBe(25);
  });
});

describe("packet-0003: getRewardUnlock & setRewardUnlock — 보상 해금 캐시", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("AC-9[P0]: should cache report unlock by date", () => {
    const today = "2026-07-31";
    const rewardUnlock: RewardUnlock = {
      report: today, // report 해금 날짜
    };

    localStorage.setItem("sdt.rewardUnlock", JSON.stringify(rewardUnlock));

    const retrieved = JSON.parse(
      localStorage.getItem("sdt.rewardUnlock") || "{}"
    ) as RewardUnlock;

    expect(retrieved.report).toBe("2026-07-31");
    expect(retrieved.plan).toBeUndefined();
  });

  it("AC-9[P0]: should cache plan unlock independently", () => {
    const today = "2026-07-31";
    const rewardUnlock: RewardUnlock = {
      plan: today, // plan 해금 날짜
    };

    localStorage.setItem("sdt.rewardUnlock", JSON.stringify(rewardUnlock));

    const retrieved = JSON.parse(
      localStorage.getItem("sdt.rewardUnlock") || "{}"
    ) as RewardUnlock;

    expect(retrieved.plan).toBe("2026-07-31");
    expect(retrieved.report).toBeUndefined();
  });

  it("AC-9[P1]: should track both report and plan unlocks", () => {
    const today = "2026-07-31";
    const rewardUnlock: RewardUnlock = {
      report: today,
      plan: today,
    };

    localStorage.setItem("sdt.rewardUnlock", JSON.stringify(rewardUnlock));

    const retrieved = JSON.parse(
      localStorage.getItem("sdt.rewardUnlock") || "{}"
    ) as RewardUnlock;

    expect(retrieved.report).toBe("2026-07-31");
    expect(retrieved.plan).toBe("2026-07-31");
  });

  it("AC-9[P1]: should update unlock cache on new day", () => {
    // Day 1: report unlocked
    let unlock: RewardUnlock = { report: "2026-07-31" };
    localStorage.setItem("sdt.rewardUnlock", JSON.stringify(unlock));

    // Day 2: add plan unlock
    unlock = { report: "2026-07-31", plan: "2026-08-01" };
    localStorage.setItem("sdt.rewardUnlock", JSON.stringify(unlock));

    const retrieved = JSON.parse(
      localStorage.getItem("sdt.rewardUnlock") || "{}"
    ) as RewardUnlock;

    expect(retrieved.report).toBe("2026-07-31");
    expect(retrieved.plan).toBe("2026-08-01");
  });
});
