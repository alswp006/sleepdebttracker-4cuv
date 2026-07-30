import { useState } from "react";
import { getRewardUnlock, setRewardUnlock } from "@/lib/settingsStore";

function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}

export function useReward(kind: "report" | "plan") {
  const [unlockedToday, setUnlockedToday] = useState(
    () => getRewardUnlock()[kind] === todayStr()
  );

  function unlock() {
    setRewardUnlock(kind, todayStr());
    setUnlockedToday(true);
  }

  return { unlockedToday, unlock };
}
