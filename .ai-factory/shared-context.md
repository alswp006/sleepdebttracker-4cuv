# Shared Context (auto-generated — do NOT modify)


## Shared Types Contract (IMPORT these, do NOT redefine)
```typescript
// Sleep tracking domain entities
export interface SleepRecord {
  id: string;
  date: string;
  bedTime: string;
  wakeTime: string;
  actualSleepMin: number;
  deficitMin: number;
  createdAt: number;
}

export interface UserSettings {
  targetSleepMin: number;
  onboarded: boolean;
}

export interface StreakState {
  current: number;
  best: number;
  lastCheckDate: string;
}

export interface SleepTypeResult {
  type: "morning" | "evening" | "intermediate";
  score: number;
  answeredAt: number;
}

export interface RewardUnlock {
  report?: string;
  plan?: string;
}

// Result type for save operations
export type SaveResult =
  | { ok: true }
  | { ok: false; reason: "QUOTA" | "INVALID_DURATION" };

// Navigation state shape per route
export interface RouteState {
  "/": { savedDate: string } | undefined;
  "/record": undefined;
  "/report": undefined;
  "/plan": undefined;
  "/sleep-type": undefined;
  "/settings": undefined;
}

// Storage key constants
export type LS_KEYS =
  | "sdt.records"
  | "sdt.settings"
  | "sdt.streak"
  | "sdt.sleepType"
  | "sdt.rewardUnlock";

```

## Existing Codebase (import and use these — do NOT recreate)
### File Tree (src/)
  App.tsx
  components/
    AdSlot.tsx
    Amount.tsx
    BottomCTA.tsx
    Card.tsx
    CountUp.tsx
    FloatingTabBar.tsx
    MiniBar.tsx
    PageShell.tsx
    ScreenScaffold.tsx
    Sparkline.tsx
    StateView.tsx
    SummaryHero.tsx
    TossPurchase.tsx
    TossRewardAd.tsx
  hooks/
  lib/
    calc.ts
    records.ts
    settingsStore.ts
    storage.ts
    streak.ts
    types.ts
    utils.ts
  main.tsx
  pages/
    Home.tsx
    __TdsGallery.tsx
  styles/
    globals.css
    reward-ad.css
  types/
  vite-env.d.ts

### Exports (src/lib/)
- calc.ts: export const TARGET_SLEEP_MIN = 480; export const MAX_OVER_OFFSET = 120; export const DEBT_WINDOW_DAYS = 14; export const maxRepayPerDay = TARGET_SLEEP_MIN * 0.25; export function calcSleepMin(bedTime: string, wakeTime: string): number; export function calcDeficit(target: number, actual: number): number; export function calcTotalDebt(records: number[], target: number): number; export function calcRepayDays( debt: number, target: number, weeklyRepay: number ): number
- records.ts: export function getRecords(): SleepRecord[]; export function getRecordByDate(date: string): SleepRecord | null; export function saveRecord(input:
- settingsStore.ts: export function getSettings(): UserSettings; export function saveSettings(settings: UserSettings): SaveResult; export function getSleepType(): SleepTypeResult | null; export function saveSleepType(result: SleepTypeResult): SaveResult; export function getRewardUnlock(): RewardUnlock; export function setRewardUnlock( kind: "report" | "plan", date: string ): SaveResult
- storage.ts: export function getItem<T>(key: string): T | null; export function setItem<T>(key: string, value: T): void; export function removeItem(key: string): void; export function safeGet<T>(key: string, fallback: T): T; export function safeSet<T>(key: string, value: T): SaveResult
- streak.ts: export function getStreak(): StreakState; export function updateStreak(today: string): StreakState
- types.ts: export interface SleepRecord; export interface UserSettings; export interface StreakState; export interface SleepTypeResult; export interface RewardUnlock; export type SaveResult = |; export interface RouteState; export type LS_KEYS = | "sdt.records" | "sdt.settings" | "sdt.streak" | "sdt.sleepType" | "sdt.rewardUnlock"
- utils.ts: export function cn(...classes: (string | boolean | undefined | null)[]): string; export function formatNumber(n: number): string; export function formatCurrency(n: number, currency = 'KRW'): string

### Components (src/components/)
- AdSlot.tsx: AdSlot
- Amount.tsx: Amount
- BottomCTA.tsx: SubmitFooter, ButtonStack
- Card.tsx: Card
- CountUp.tsx: CountUp
- FloatingTabBar.tsx: FloatingTabBar
- MiniBar.tsx: MiniBar
- PageShell.tsx: PageShell
- ScreenScaffold.tsx: ScreenScaffold
- Sparkline.tsx: Sparkline
- StateView.tsx: EmptyState, LoadingState
- SummaryHero.tsx: SummaryHero
- TossPurchase.tsx: TossPurchase
- TossRewardAd.tsx: TossRewardAd

### Module Dependencies (import graph)
  lib/records.ts → imports: lib/types, lib/storage, lib/calc
  lib/settingsStore.ts → imports: lib/types, lib/storage
  lib/storage.ts → imports: lib/types
  lib/streak.ts → imports: lib/types, lib/storage
CRITICAL: Before creating any new function, type, or component, check the list above. If something similar exists, import and use it.

## Already Implemented (do NOT duplicate or overwrite)
- 0001: 전역 타입 & RouteState 계약 정의 (files: src/lib/types.ts)
- 0002: localStorage 안전 헬퍼 + 계산 모듈 (files: src/lib/storage.ts, src/lib/calc.ts)
- 0003: 도메인 CRUD: 기록·스트릭·설정/유형/리워드 (files: src/lib/records.ts, src/lib/streak.ts, src/lib/settingsStore.ts)