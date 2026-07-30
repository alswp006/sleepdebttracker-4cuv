import { useEffect, useState } from "react";
import { getRecords } from "@/lib/records";
import { calcWeeklySeries } from "@/lib/calc";

interface WeeklyReportData {
  loading: boolean;
  recordCount: number;
  weeklyDeficits: number[];
  totalDeficitMin: number;
}

export function useWeeklyReport(): WeeklyReportData {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Omit<WeeklyReportData, "loading">>({
    recordCount: 0,
    weeklyDeficits: Array(7).fill(0),
    totalDeficitMin: 0,
  });

  useEffect(() => {
    const records = getRecords();
    const weeklyDeficits = calcWeeklySeries(records.map((r) => r.deficitMin));
    const totalDeficitMin = weeklyDeficits.reduce((sum, v) => sum + v, 0);
    setData({ recordCount: records.length, weeklyDeficits, totalDeficitMin });
    setLoading(false);
  }, []);

  return { loading, ...data };
}
