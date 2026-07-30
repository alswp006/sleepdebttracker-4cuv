import { useState, useEffect } from "react";
import type { SleepRecord, StreakState } from "@/lib/types";

// TDD: Placeholder for implementation
// Should return: {loading, totalDebt, repayDays, weeklySeries, streak, records}

export function useDashboard() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  // Implementation pending
  return {
    loading: true,
    totalDebt: 0,
    repayDays: 0,
    weeklySeries: [],
    streak: { current: 0, best: 0, lastCheckDate: "" },
    records: [],
  };
}
