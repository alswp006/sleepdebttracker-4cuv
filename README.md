# SleepDebtTracker

앱인토스 (Vite + React + TDS) 수면 부채를 누적 계산하고, 주말 몰아자기 회복 플랜을 제시하는 수면 건강 관리 앱 평균 6시간 자는 직장인은 매주 7-14시간의 수면 부채가 쌓인다. 하지만 '얼마나 모자란지'를 수치로 본 적이 없어 심각성을 인식 못 한다.

## Tech Stack

- React 18.0.0
- TypeScript
- Vitest

## Routes

| Path | Description |
|------|-------------|
| `/Home` | Home |
| `/PlanPage` | PlanPage |
| `/RecordPage` | RecordPage |
| `/ReportPage` | ReportPage |
| `/SettingsPage` | SettingsPage |
| `/SleepTypePage` | SleepTypePage |

## Getting Started

```bash
pnpm install
pnpm dev
```

## Development

```bash
pnpm typecheck    # Type checking
pnpm test         # Run tests
pnpm build        # Production build
```

## Design Documents

See `.ai-factory/` directory for full design artifacts:
- `prd.md` — Product Requirements Document
- `spec.md` — Technical Specification
- `task.md` — Epic/Task Breakdown

---
Built with [AI Factory](https://github.com/alswp006/ai-factory) · Last synced: 2026-07-30
