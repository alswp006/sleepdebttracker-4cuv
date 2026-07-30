import { describe, it, expect } from "vitest";
import type {
  SleepRecord,
  UserSettings,
  StreakState,
  SleepTypeResult,
  RewardUnlock,
  SaveResult,
  RouteState,
  LS_KEYS,
} from "@/lib/types";

describe("AC-1: SleepRecord interface", () => {
  it("should define SleepRecord with all required fields", () => {
    const record: SleepRecord = {
      id: "sleep-001",
      date: "2026-07-31",
      bedTime: "23:30",
      wakeTime: "07:00",
      actualSleepMin: 450,
      deficitMin: 30,
      createdAt: 1722384000000,
    };

    expect(record.id).toBe("sleep-001");
    expect(record.date).toBe("2026-07-31");
    expect(record.bedTime).toBe("23:30");
    expect(record.wakeTime).toBe("07:00");
    expect(record.actualSleepMin).toBe(450);
    expect(record.deficitMin).toBe(30);
    expect(record.createdAt).toBe(1722384000000);
    expect(typeof record.id).toBe("string");
    expect(typeof record.actualSleepMin).toBe("number");
    expect(typeof record.createdAt).toBe("number");
  });

  it("should accept various valid SleepRecord values", () => {
    const record1: SleepRecord = {
      id: "rec-1",
      date: "2026-01-01",
      bedTime: "00:00",
      wakeTime: "06:00",
      actualSleepMin: 0,
      deficitMin: 480,
      createdAt: 1,
    };

    const record2: SleepRecord = {
      id: "rec-2",
      date: "2026-12-31",
      bedTime: "22:00",
      wakeTime: "08:00",
      actualSleepMin: 600,
      deficitMin: 0,
      createdAt: 9999999999999,
    };

    expect(record1.actualSleepMin).toBe(0);
    expect(record2.actualSleepMin).toBe(600);
    expect(record1.deficitMin).toBe(480);
    expect(record2.deficitMin).toBe(0);
  });
});

describe("AC-2: UserSettings interface", () => {
  it("should define UserSettings with targetSleepMin and onboarded fields", () => {
    const settings: UserSettings = {
      targetSleepMin: 480,
      onboarded: false,
    };

    expect(settings.targetSleepMin).toBe(480);
    expect(settings.onboarded).toBe(false);
    expect(typeof settings.targetSleepMin).toBe("number");
    expect(typeof settings.onboarded).toBe("boolean");
  });

  it("should accept various valid UserSettings values", () => {
    const settings1: UserSettings = {
      targetSleepMin: 360,
      onboarded: true,
    };

    const settings2: UserSettings = {
      targetSleepMin: 540,
      onboarded: false,
    };

    expect(settings1.targetSleepMin).toBe(360);
    expect(settings1.onboarded).toBe(true);
    expect(settings2.targetSleepMin).toBe(540);
    expect(settings2.onboarded).toBe(false);
  });
});

describe("AC-3: StreakState interface", () => {
  it("should define StreakState with current, best, and lastCheckDate fields", () => {
    const streak: StreakState = {
      current: 5,
      best: 10,
      lastCheckDate: "2026-07-31",
    };

    expect(streak.current).toBe(5);
    expect(streak.best).toBe(10);
    expect(streak.lastCheckDate).toBe("2026-07-31");
    expect(typeof streak.current).toBe("number");
    expect(typeof streak.best).toBe("number");
    expect(typeof streak.lastCheckDate).toBe("string");
  });

  it("should accept zero and boundary values for streak counts", () => {
    const streak1: StreakState = {
      current: 0,
      best: 0,
      lastCheckDate: "2026-01-01",
    };

    const streak2: StreakState = {
      current: 1000,
      best: 1000,
      lastCheckDate: "2026-12-31",
    };

    expect(streak1.current).toBe(0);
    expect(streak1.best).toBe(0);
    expect(streak2.current).toBe(1000);
    expect(streak2.best).toBe(1000);
  });
});

describe("AC-4: SleepTypeResult interface", () => {
  it("should define SleepTypeResult with type, score, and answeredAt fields", () => {
    const result: SleepTypeResult = {
      type: "morning",
      score: 75,
      answeredAt: 1722384000000,
    };

    expect(result.type).toBe("morning");
    expect(result.score).toBe(75);
    expect(result.answeredAt).toBe(1722384000000);
    expect(typeof result.type).toBe("string");
    expect(typeof result.score).toBe("number");
    expect(typeof result.answeredAt).toBe("number");
  });

  it("should accept all three sleep type variants with various scores", () => {
    const resultMorning: SleepTypeResult = {
      type: "morning",
      score: 100,
      answeredAt: 1000,
    };

    const resultEvening: SleepTypeResult = {
      type: "evening",
      score: 50,
      answeredAt: 2000,
    };

    const resultIntermediate: SleepTypeResult = {
      type: "intermediate",
      score: 0,
      answeredAt: 3000,
    };

    expect(resultMorning.type).toBe("morning");
    expect(resultEvening.type).toBe("evening");
    expect(resultIntermediate.type).toBe("intermediate");
    expect(resultMorning.score).toBe(100);
    expect(resultEvening.score).toBe(50);
    expect(resultIntermediate.score).toBe(0);
  });
});

describe("AC-5: RewardUnlock interface", () => {
  it("should define RewardUnlock with optional report and plan fields", () => {
    const reward1: RewardUnlock = {
      report: "sleep-quality-report-123",
      plan: "recovery-plan-456",
    };

    expect(reward1.report).toBe("sleep-quality-report-123");
    expect(reward1.plan).toBe("recovery-plan-456");
  });

  it("should accept RewardUnlock with only report field", () => {
    const reward: RewardUnlock = {
      report: "report-data",
    };

    expect(reward.report).toBe("report-data");
    expect(reward.plan).toBeUndefined();
  });

  it("should accept RewardUnlock with only plan field", () => {
    const reward: RewardUnlock = {
      plan: "plan-data",
    };

    expect(reward.plan).toBe("plan-data");
    expect(reward.report).toBeUndefined();
  });

  it("should accept RewardUnlock with no optional fields", () => {
    const reward: RewardUnlock = {};

    expect(reward.report).toBeUndefined();
    expect(reward.plan).toBeUndefined();
  });
});

describe("AC-6: SaveResult discriminated union type", () => {
  it("should accept SaveResult success case {ok:true}", () => {
    const result: SaveResult = { ok: true };

    expect(result.ok).toBe(true);
    expect("reason" in result).toBe(false);
  });

  it("should accept SaveResult failure with QUOTA reason", () => {
    const result: SaveResult = { ok: false, reason: "QUOTA" };

    expect(result.ok).toBe(false);
    expect(result.reason).toBe("QUOTA");
  });

  it("should accept SaveResult failure with INVALID_DURATION reason", () => {
    const result: SaveResult = {
      ok: false,
      reason: "INVALID_DURATION",
    };

    expect(result.ok).toBe(false);
    expect(result.reason).toBe("INVALID_DURATION");
  });

  it("should distinguish between success and failure branches", () => {
    const success: SaveResult = { ok: true };
    const failureQuota: SaveResult = { ok: false, reason: "QUOTA" };
    const failureDuration: SaveResult = {
      ok: false,
      reason: "INVALID_DURATION",
    };

    expect(success.ok).toBe(true);
    expect(failureQuota.ok).toBe(false);
    expect(failureDuration.ok).toBe(false);
    expect(failureQuota.reason).toBe("QUOTA");
    expect(failureDuration.reason).toBe("INVALID_DURATION");
  });
});

describe("AC-7: RouteState per-route definition", () => {
  it("should accept RouteState for / with optional savedDate", () => {
    const state1: RouteState["/"] = { savedDate: "2026-07-31" };
    const state2: RouteState["/"] = undefined;

    expect(state1.savedDate).toBe("2026-07-31");
    expect(state2).toBeUndefined();
  });

  it("should accept RouteState for /record route (undefined state)", () => {
    const state: RouteState["/record"] = undefined;

    expect(state).toBeUndefined();
  });

  it("should accept RouteState for /report route (undefined state)", () => {
    const state: RouteState["/report"] = undefined;

    expect(state).toBeUndefined();
  });

  it("should accept RouteState for /plan route (undefined state)", () => {
    const state: RouteState["/plan"] = undefined;

    expect(state).toBeUndefined();
  });

  it("should accept RouteState for /sleep-type route (undefined state)", () => {
    const state: RouteState["/sleep-type"] = undefined;

    expect(state).toBeUndefined();
  });

  it("should accept RouteState for /settings route (undefined state)", () => {
    const state: RouteState["/settings"] = undefined;

    expect(state).toBeUndefined();
  });

  it("should enforce type contracts for home navigation with savedDate", () => {
    const validHomeState: RouteState["/"] = { savedDate: "2026-07-31" };
    const undefinedHomeState: RouteState["/"] = undefined;

    expect(validHomeState).toEqual({ savedDate: "2026-07-31" });
    expect(undefinedHomeState).toBeUndefined();
  });
});

describe("AC-8: LS_KEYS constant union type", () => {
  it("should define LS_KEYS with all five storage keys", () => {
    const keys: LS_KEYS[] = [
      "sdt.records",
      "sdt.settings",
      "sdt.streak",
      "sdt.sleepType",
      "sdt.rewardUnlock",
    ];

    expect(keys).toHaveLength(5);
    expect(keys).toContain("sdt.records");
    expect(keys).toContain("sdt.settings");
    expect(keys).toContain("sdt.streak");
    expect(keys).toContain("sdt.sleepType");
    expect(keys).toContain("sdt.rewardUnlock");
  });

  it("should accept each LS_KEYS constant individually", () => {
    const recordsKey: LS_KEYS = "sdt.records";
    const settingsKey: LS_KEYS = "sdt.settings";
    const streakKey: LS_KEYS = "sdt.streak";
    const sleepTypeKey: LS_KEYS = "sdt.sleepType";
    const rewardUnlockKey: LS_KEYS = "sdt.rewardUnlock";

    expect(recordsKey).toBe("sdt.records");
    expect(settingsKey).toBe("sdt.settings");
    expect(streakKey).toBe("sdt.streak");
    expect(sleepTypeKey).toBe("sdt.sleepType");
    expect(rewardUnlockKey).toBe("sdt.rewardUnlock");
  });

  it("should enforce LS_KEYS type constraints (only valid keys allowed)", () => {
    const validKey: LS_KEYS = "sdt.records";

    expect(validKey).toMatch(/^sdt\./);
    expect(validKey).toBe("sdt.records");
  });
});
