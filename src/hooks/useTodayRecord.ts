import { useState } from "react";
import { getRecordByDate } from "@/lib/records";

function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}

export function useTodayRecord() {
  const [date] = useState(todayStr);
  const [record] = useState(() => getRecordByDate(date));

  return {
    date,
    bedTime: record?.bedTime ?? "",
    wakeTime: record?.wakeTime ?? "",
    actualSleepMin: record?.actualSleepMin ?? 0,
    deficitMin: record?.deficitMin ?? 0,
    isEdit: record !== null,
  };
}
