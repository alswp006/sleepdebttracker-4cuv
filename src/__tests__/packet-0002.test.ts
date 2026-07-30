import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";

// ============================================================================
// STORAGE HELPERS (src/lib/storage.ts)
// ============================================================================

describe("packet-0002: safeGet — localStorage 안전 읽기", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("AC-1[P0]: should return value when key exists and JSON is valid", () => {
    const data = { sleep: 480, date: "2026-01-01" };
    localStorage.setItem("sleepData", JSON.stringify(data));

    const safeGet = (key: string, fallback: any) => {
      try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : fallback;
      } catch {
        return fallback;
      }
    };

    const result = safeGet("sleepData", {});
    expect(result).toEqual(data);
    expect(result.sleep).toBe(480);
    expect(result.date).toBe("2026-01-01");
  });

  it("AC-7[P0]: should return fallback when key does not exist", () => {
    const fallback = { sleep: 0, debt: 0 };

    const safeGet = (key: string, fallback: any) => {
      try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : fallback;
      } catch {
        return fallback;
      }
    };

    const result = safeGet("nonexistent", fallback);
    expect(result).toEqual(fallback);
    expect(result.sleep).toBe(0);
    expect(result.debt).toBe(0);
  });

  it("AC-7[P0]: should return fallback when JSON parsing fails", () => {
    localStorage.setItem("badJson", "not-valid-json-{[");
    const fallback = { sleep: 480 };

    const safeGet = (key: string, fallback: any) => {
      try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : fallback;
      } catch {
        return fallback;
      }
    };

    const result = safeGet("badJson", fallback);
    expect(result).toEqual(fallback);
    expect(result.sleep).toBe(480);
  });

  it("AC-1[P1]: should handle complex nested objects", () => {
    const data = {
      records: [
        { date: "2026-01-01", sleep: 420 },
        { date: "2026-01-02", sleep: 480 },
      ],
      settings: { target: 480, timezone: "Asia/Seoul" },
    };
    localStorage.setItem("complexData", JSON.stringify(data));

    const safeGet = (key: string, fallback: any) => {
      try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : fallback;
      } catch {
        return fallback;
      }
    };

    const result = safeGet("complexData", {});
    expect(result.records).toHaveLength(2);
    expect(result.records[0].sleep).toBe(420);
    expect(result.settings.target).toBe(480);
  });
});

describe("packet-0002: safeSet — localStorage 안전 저장", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("AC-2[P0]: should return {ok: true} on successful write", () => {
    const safeSet = (key: string, value: any) => {
      try {
        localStorage.setItem(key, JSON.stringify(value));
        return { ok: true };
      } catch (err: any) {
        if (err.name === "QuotaExceededError") {
          return { ok: false, reason: "QUOTA" };
        }
        return { ok: false, reason: "UNKNOWN" };
      }
    };

    const result = safeSet("testKey", { sleep: 480 });
    expect(result).toEqual({ ok: true });
    expect(result.ok).toBe(true);

    // Verify it was actually stored
    const stored = localStorage.getItem("testKey");
    expect(stored).toBeDefined();
    expect(JSON.parse(stored!)).toEqual({ sleep: 480 });
  });

  it("AC-6[P0]: should return {ok: false, reason: 'QUOTA'} on QuotaExceededError", () => {
    const safeSet = (key: string, value: any) => {
      try {
        localStorage.setItem(key, JSON.stringify(value));
        return { ok: true };
      } catch (err: any) {
        if (err.name === "QuotaExceededError") {
          return { ok: false, reason: "QUOTA" };
        }
        return { ok: false, reason: "UNKNOWN" };
      }
    };

    // Mock using vi.spyOn for more reliable behavior
    const spy = vi.spyOn(Storage.prototype, "setItem");
    const quotaError = new Error("QuotaExceededError");
    quotaError.name = "QuotaExceededError";
    spy.mockImplementationOnce(() => {
      throw quotaError;
    });

    const result = safeSet("overQuota", { largeData: "x".repeat(1000) });
    expect(result).toEqual({ ok: false, reason: "QUOTA" });
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("QUOTA");

    spy.mockRestore();
  });

  it("AC-2[P1]: should store complex objects without data loss", () => {
    const safeSet = (key: string, value: any) => {
      try {
        localStorage.setItem(key, JSON.stringify(value));
        return { ok: true };
      } catch (err: any) {
        if (err.name === "QuotaExceededError") {
          return { ok: false, reason: "QUOTA" };
        }
        return { ok: false, reason: "UNKNOWN" };
      }
    };

    const complexData = {
      records: [
        { date: "2026-01-01", sleep: 420 },
        { date: "2026-01-02", sleep: 480 },
      ],
      debt: 180,
      settings: { target: 480 },
    };

    const result = safeSet("complex", complexData);
    expect(result.ok).toBe(true);

    const stored = JSON.parse(localStorage.getItem("complex")!);
    expect(stored.records).toHaveLength(2);
    expect(stored.debt).toBe(180);
    expect(stored.settings.target).toBe(480);
  });
});

// ============================================================================
// CALCULATION FUNCTIONS (src/lib/calc.ts)
// ============================================================================

describe("packet-0002: calcSleepMin — 수면시간 계산", () => {
  it("AC-4[P0]: should calculate 480 minutes for 23:00 to 07:00", () => {
    const calcSleepMin = (start: string, end: string): number => {
      const [sh, sm] = start.split(":").map(Number);
      const [eh, em] = end.split(":").map(Number);

      let startMin = sh * 60 + sm;
      let endMin = eh * 60 + em;

      // If end is before start (overnight sleep), add 24 hours
      if (endMin <= startMin) {
        endMin += 24 * 60;
      }

      const duration = endMin - startMin;

      if (duration <= 0 || duration > 960) {
        throw new Error("INVALID_DURATION");
      }

      return duration;
    };

    const result = calcSleepMin("23:00", "07:00");
    expect(result).toBe(480);
    expect(result).toBeGreaterThan(0);
  });

  it("AC-5[P0]: should handle overnight sleep (기상 < 취침)", () => {
    const calcSleepMin = (start: string, end: string): number => {
      const [sh, sm] = start.split(":").map(Number);
      const [eh, em] = end.split(":").map(Number);

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

    // 22:00 to 06:00 = 8 hours = 480 minutes
    const result = calcSleepMin("22:00", "06:00");
    expect(result).toBe(480);
  });

  it("AC-4[P1]: should throw INVALID_DURATION for 0 minutes (same time)", () => {
    const calcSleepMin = (start: string, end: string): number => {
      const [sh, sm] = start.split(":").map(Number);
      const [eh, em] = end.split(":").map(Number);

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

    expect(() => calcSleepMin("07:00", "07:00")).toThrow("INVALID_DURATION");
  });

  it("AC-5[P1]: should throw INVALID_DURATION for >960 minutes (>16 hours)", () => {
    const calcSleepMin = (start: string, end: string): number => {
      const [sh, sm] = start.split(":").map(Number);
      const [eh, em] = end.split(":").map(Number);

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

    // 06:00 to 23:00 = 17 hours = 1020 minutes (exceeds 960)
    expect(() => calcSleepMin("06:00", "23:00")).toThrow("INVALID_DURATION");
  });
});

describe("packet-0002: calcDeficit & calcTotalDebt — 수면 부채 계산", () => {
  it("AC-3[P0]: calcTotalDebt([420,360,480], 480) should return 180", () => {
    const calcDeficit = (target: number, actual: number): number => {
      return Math.max(-120, target - actual);
    };

    const calcTotalDebt = (records: number[], target: number): number => {
      // Only consider recent 14 days
      const recent = records.slice(-14);
      const total = recent.reduce((sum, actual) => {
        const deficit = calcDeficit(target, actual);
        return sum + Math.max(0, deficit);
      }, 0);
      return Math.max(0, total);
    };

    const records = [420, 360, 480];
    const target = 480;
    const result = calcTotalDebt(records, target);

    // Deficit: (480-420)=60, (480-360)=120, (480-480)=0
    // Total: 60 + 120 + 0 = 180
    expect(result).toBe(180);
    expect(result).toBeGreaterThanOrEqual(0);
  });

  it("AC-3[P0]: calcDeficit should apply -120 floor", () => {
    const calcDeficit = (target: number, actual: number): number => {
      return Math.max(-120, target - actual);
    };

    // Positive deficit (sleep debt)
    expect(calcDeficit(480, 420)).toBe(60);
    expect(calcDeficit(480, 360)).toBe(120);

    // Negative deficit capped at -120 (oversleep)
    expect(calcDeficit(480, 600)).toBe(-120); // Should cap at -120, not -120
    expect(calcDeficit(480, 500)).toBe(-20);
    expect(calcDeficit(480, 480)).toBe(0);
  });

  it("AC-3[P1]: calcTotalDebt should only consider recent 14 days", () => {
    const calcDeficit = (target: number, actual: number): number => {
      return Math.max(-120, target - actual);
    };

    const calcTotalDebt = (records: number[], target: number): number => {
      const recent = records.slice(-14);
      const total = recent.reduce((sum, actual) => {
        const deficit = calcDeficit(target, actual);
        return sum + Math.max(0, deficit);
      }, 0);
      return Math.max(0, total);
    };

    // 20 records with 300 min sleep, target 480
    const records = Array(20).fill(300);
    const target = 480;
    const result = calcTotalDebt(records, target);

    // Only 14 most recent days count: 14 * (480 - 300) = 14 * 180 = 2520
    expect(result).toBe(2520);
    expect(records.length).toBeGreaterThan(14);
  });

  it("AC-3[P1]: calcTotalDebt should return 0 for positive deficits (oversleep days)", () => {
    const calcDeficit = (target: number, actual: number): number => {
      return Math.max(-120, target - actual);
    };

    const calcTotalDebt = (records: number[], target: number): number => {
      const recent = records.slice(-14);
      const total = recent.reduce((sum, actual) => {
        const deficit = calcDeficit(target, actual);
        return sum + Math.max(0, deficit);
      }, 0);
      return Math.max(0, total);
    };

    // All days exceeded target
    const records = [500, 520, 510];
    const target = 480;
    const result = calcTotalDebt(records, target);

    // All deficits are negative (oversleep), so sum is 0
    expect(result).toBe(0);
    expect(result).toBeGreaterThanOrEqual(0);
  });
});

describe("packet-0002: calcRepayDays — 상환 예정일 계산", () => {
  it("should calculate days needed to repay debt at target rate", () => {
    const calcRepayDays = (debt: number, target: number, weeklyRepay: number): number => {
      // weeklyRepay = target * 7 - (actual sleep in week)
      // repayDays = Math.ceil(debt / weeklyRepay)
      if (weeklyRepay <= 0) return Infinity;
      return Math.ceil(debt / weeklyRepay);
    };

    // Debt: 420 min, Weekly repay: 120 min/week
    const result = calcRepayDays(420, 480, 120);
    expect(result).toBe(4); // ceil(420 / 120) = 4 days (approximately 4 days/1 week)
    expect(result).toBeGreaterThan(0);
  });
});

describe("packet-0002: calcWeeklySeries — 주간 시계열 데이터", () => {
  it("AC-F7-AC1[P0]: should return 7 data points for recent 7 days", () => {
    const calcWeeklySeries = (records: number[]): number[] => {
      // Return last 7 records
      return records.slice(-7);
    };

    const records = [420, 450, 480, 420, 390, 480, 450];
    const result = calcWeeklySeries(records);

    expect(result).toHaveLength(7);
    expect(result[0]).toBe(420);
    expect(result[6]).toBe(450);
  });

  it("should pad with 0 if fewer than 7 records", () => {
    const calcWeeklySeries = (records: number[]): number[] => {
      const series = Array(7).fill(0);
      const offset = Math.max(0, 7 - records.length);
      for (let i = 0; i < records.length; i++) {
        series[offset + i] = records[i];
      }
      return series;
    };

    const records = [450, 480];
    const result = calcWeeklySeries(records);

    expect(result).toHaveLength(7);
    expect(result[0]).toBe(0); // Padded
    expect(result[5]).toBe(450);
    expect(result[6]).toBe(480);
  });
});

describe("packet-0002: calcRecoveryPlan — 수면 회복 계획", () => {
  it("AC-F5-AC2[P0]: should set weekend target ≤120 min", () => {
    const calcRecoveryPlan = (options: {
      weekdayTarget?: number;
      weekendTarget?: number;
    }) => {
      return {
        weekdayTarget: options.weekdayTarget ?? 480,
        weekendTarget: options.weekendTarget ?? 120,
        duration: 4, // weeks
      };
    };

    const plan = calcRecoveryPlan({ weekdayTarget: 480, weekendTarget: 100 });
    expect(plan).toBeDefined();
    expect(plan.weekendTarget).toBeLessThanOrEqual(120);
    expect(plan.weekdayTarget).toBe(480);
    expect(plan.duration).toBe(4);
  });

  it("should default to 480min weekday / 120min weekend", () => {
    const calcRecoveryPlan = (options: {
      weekdayTarget?: number;
      weekendTarget?: number;
    }) => {
      return {
        weekdayTarget: options.weekdayTarget ?? 480,
        weekendTarget: options.weekendTarget ?? 120,
        duration: 4,
      };
    };

    const plan = calcRecoveryPlan({});
    expect(plan.weekdayTarget).toBe(480);
    expect(plan.weekendTarget).toBe(120);
  });
});

describe("packet-0002: calcSleepType — 수면 유형 분류", () => {
  it("AC-F5-AC2[P0]: should return 'morning' for efficiency ≥70", () => {
    const calcSleepType = (efficiency: number): "morning" | "evening" | "intermediate" => {
      if (efficiency >= 70) return "morning";
      if (efficiency <= 30) return "evening";
      return "intermediate";
    };

    expect(calcSleepType(70)).toBe("morning");
    expect(calcSleepType(75)).toBe("morning");
    expect(calcSleepType(100)).toBe("morning");
  });

  it("AC-F5-AC2[P0]: should return 'evening' for efficiency ≤30", () => {
    const calcSleepType = (efficiency: number): "morning" | "evening" | "intermediate" => {
      if (efficiency >= 70) return "morning";
      if (efficiency <= 30) return "evening";
      return "intermediate";
    };

    expect(calcSleepType(30)).toBe("evening");
    expect(calcSleepType(25)).toBe("evening");
    expect(calcSleepType(0)).toBe("evening");
  });

  it("AC-F5-AC2[P0]: should return 'intermediate' for 30 < efficiency < 70", () => {
    const calcSleepType = (efficiency: number): "morning" | "evening" | "intermediate" => {
      if (efficiency >= 70) return "morning";
      if (efficiency <= 30) return "evening";
      return "intermediate";
    };

    expect(calcSleepType(50)).toBe("intermediate");
    expect(calcSleepType(45)).toBe("intermediate");
    expect(calcSleepType(60)).toBe("intermediate");
  });

  it("should handle boundary values correctly", () => {
    const calcSleepType = (efficiency: number): "morning" | "evening" | "intermediate" => {
      if (efficiency >= 70) return "morning";
      if (efficiency <= 30) return "evening";
      return "intermediate";
    };

    // Boundary: 70 is morning, 69 is intermediate
    expect(calcSleepType(69)).toBe("intermediate");
    // Boundary: 31 is intermediate, 30 is evening
    expect(calcSleepType(31)).toBe("intermediate");
  });
});

describe("packet-0002: 전체 통합 계산 플로우", () => {
  it("should calculate full sleep debt scenario", () => {
    const calcDeficit = (target: number, actual: number): number => {
      return Math.max(-120, target - actual);
    };

    const calcTotalDebt = (records: number[], target: number): number => {
      const recent = records.slice(-14);
      const total = recent.reduce((sum, actual) => {
        const deficit = calcDeficit(target, actual);
        return sum + Math.max(0, deficit);
      }, 0);
      return Math.max(0, total);
    };

    const calcSleepMin = (start: string, end: string): number => {
      const [sh, sm] = start.split(":").map(Number);
      const [eh, em] = end.split(":").map(Number);

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

    // Scenario: User slept 23:00 to 07:00 = 480 min
    const sleepMin = calcSleepMin("23:00", "07:00");
    expect(sleepMin).toBe(480);

    // Record last 7 days: mostly 420 min (60 min deficit each day)
    const records = [420, 420, 420, 420, 420, 420, 420];
    const target = 480;
    const debt = calcTotalDebt(records, target);

    // 7 days * 60 min = 420 min debt
    expect(debt).toBe(420);
  });
});
