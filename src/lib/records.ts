import type { SleepRecord, SaveResult } from "@/lib/types";
import { safeGet, safeSet } from "@/lib/storage";
import { calcSleepMin, calcDeficit, TARGET_SLEEP_MIN } from "@/lib/calc";

const RECORDS_KEY = "sdt.records";

export function getRecords(): SleepRecord[] {
  return safeGet<SleepRecord[]>(RECORDS_KEY, []);
}

export function getRecordByDate(date: string): SleepRecord | null {
  return getRecords().find((r) => r.date === date) ?? null;
}

export function saveRecord(input: {
  date: string;
  bedTime: string;
  wakeTime: string;
}): SaveResult {
  const actualSleepMin = calcSleepMin(input.bedTime, input.wakeTime);
  const deficitMin = calcDeficit(TARGET_SLEEP_MIN, actualSleepMin);

  const record: SleepRecord = {
    id: input.date,
    date: input.date,
    bedTime: input.bedTime,
    wakeTime: input.wakeTime,
    actualSleepMin,
    deficitMin,
    createdAt: Date.now(),
  };

  const records = getRecords();
  const existingIndex = records.findIndex((r) => r.id === input.date);
  if (existingIndex >= 0) {
    records[existingIndex] = record;
  } else {
    records.push(record);
  }

  return safeSet(RECORDS_KEY, records);
}
