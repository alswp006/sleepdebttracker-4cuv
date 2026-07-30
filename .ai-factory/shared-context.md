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
    storage.ts
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
- storage.ts: export function getItem<T>(key: string): T | null; export function setItem<T>(key: string, value: T): void; export function removeItem(key: string): void
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
CRITICAL: Before creating any new function, type, or component, check the list above. If something similar exists, import and use it.

## Already Implemented (do NOT duplicate or overwrite)
- 0001: 전역 타입 & RouteState 계약 정의 (files: src/lib/types.ts)