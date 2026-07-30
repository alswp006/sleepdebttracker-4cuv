export const TARGET_SLEEP_MIN = 480;
export const MAX_OVER_OFFSET = 120;
export const DEBT_WINDOW_DAYS = 14;
export const maxRepayPerDay = TARGET_SLEEP_MIN * 0.25;

export function calcSleepMin(bedTime: string, wakeTime: string): number {
  const [sh, sm] = bedTime.split(":").map(Number);
  const [eh, em] = wakeTime.split(":").map(Number);

  const startMin = sh * 60 + sm;
  let endMin = eh * 60 + em;

  if (endMin <= startMin) {
    endMin += 24 * 60;
  }

  const duration = endMin - startMin;

  if (duration <= 0 || duration > 960) {
    throw new Error("INVALID_DURATION");
  }

  return duration;
}

export function calcDeficit(target: number, actual: number): number {
  return Math.max(-MAX_OVER_OFFSET, target - actual);
}

export function calcTotalDebt(records: number[], target: number): number {
  const recent = records.slice(-DEBT_WINDOW_DAYS);
  const total = recent.reduce((sum, actual) => {
    const deficit = calcDeficit(target, actual);
    return sum + Math.max(0, deficit);
  }, 0);
  return Math.max(0, total);
}

export function calcRepayDays(
  debt: number,
  target: number,
  weeklyRepay: number
): number {
  if (weeklyRepay <= 0) return Infinity;
  return Math.ceil(debt / weeklyRepay);
}

export function calcWeeklySeries(records: number[]): number[] {
  const series = Array(7).fill(0);
  const offset = Math.max(0, 7 - records.length);
  const recent = records.slice(-7);
  for (let i = 0; i < recent.length; i++) {
    series[offset + i] = recent[i];
  }
  return series;
}

export interface RecoveryPlan {
  weekdayTarget: number;
  weekendTarget: number;
  duration: number;
}

export function calcRecoveryPlan(options: {
  weekdayTarget?: number;
  weekendTarget?: number;
}): RecoveryPlan {
  return {
    weekdayTarget: options.weekdayTarget ?? TARGET_SLEEP_MIN,
    weekendTarget: Math.min(options.weekendTarget ?? MAX_OVER_OFFSET, MAX_OVER_OFFSET),
    duration: 4,
  };
}

export function calcSleepType(
  efficiency: number
): "morning" | "evening" | "intermediate" {
  if (efficiency >= 70) return "morning";
  if (efficiency <= 30) return "evening";
  return "intermediate";
}
