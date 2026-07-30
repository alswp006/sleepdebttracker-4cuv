import { useEffect, useState } from "react";
import type { SleepRecord, StreakState } from "@/lib/types";
import { getRecords } from "@/lib/records";
import { getStreak } from "@/lib/streak";
import { getSettings } from "@/lib/settingsStore";
import { calcTotalDebt, calcRepayDays, calcWeeklySeries, maxRepayPerDay } from "@/lib/calc";

interface DashboardData {
  loading: boolean;
  totalDebt: number;
  repayDays: number;
  weeklySeries: number[];
  streak: StreakState;
  records: SleepRecord[];
}

export function useDashboard(): DashboardData {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Omit<DashboardData, "loading">>({
    totalDebt: 0,
    repayDays: 0,
    weeklySeries: [],
    streak: { current: 0, best: 0, lastCheckDate: "" },
    records: [],
  });

  useEffect(() => {
    const records = getRecords();
    const streak = getStreak();
    const settings = getSettings();
    const actualMinutes = records.map((r) => r.actualSleepMin);

    const totalDebt = calcTotalDebt(actualMinutes, settings.targetSleepMin);
    const repayDays = calcRepayDays(totalDebt, settings.targetSleepMin, maxRepayPerDay);
    const weeklySeries = calcWeeklySeries(actualMinutes);

    setData({ totalDebt, repayDays, weeklySeries, streak, records });
    setLoading(false);
  }, []);

  return { loading, ...data };
}
