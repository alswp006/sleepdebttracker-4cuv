// TDD: Placeholder for implementation
// Should return: {date, bedTime, wakeTime, actualSleepMin, deficitMin, isEdit}

export function useTodayRecord() {
  // Implementation pending
  return {
    date: new Date().toISOString().split("T")[0],
    bedTime: "",
    wakeTime: "",
    actualSleepMin: 0,
    deficitMin: 0,
    isEdit: false,
  };
}
