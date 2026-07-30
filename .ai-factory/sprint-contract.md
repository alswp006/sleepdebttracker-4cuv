# Packet 0012: 광고 배치 & 리워드 게이팅 재통합

## 목표
0013 확정 라우팅 위에 광고·게이팅을 재배선. 배너는 콘텐츠 겹침 없이 섹션 사이/결과 뒤에 배치, 리워드 게이팅은 `sdt.rewardUnlock` 캐시로 해금 판정.

## 변경 파일
1. **src/pages/report.tsx** — 결과 뒤 `<AdSlot />` + `<TossRewardAd>` 게이팅
2. **src/pages/plan.tsx** — 계획 콘텐츠를 `<TossRewardAd>` 게이팅
3. **src/pages/home.tsx** — 섹션 사이 `<AdSlot />` 배치
4. **src/components/RewardGate.tsx** (신규) — 리워드 해금 상태 확인 + 게이트 UI

## 사용 타입 (src/lib/types.ts import)
- `RewardUnlock` (report?: string, plan?: string)
- `SleepRecord`, `StreakState` (페이지 데이터)

## 검증
1. `pnpm test src/__tests__/packet-0012.test.ts` 통과
2. 각 페이지에서 광고/게이팅 렌더 확인 (흰 화면 아님)
3. 0013 라우팅과 충돌 없음

## 절대 금지
- main.tsx / 라우팅 수정 (@AI:ANCHOR)
- UI 커스텀 (TDS AdSlot/TossRewardAd 기본 스타일만)
- localStorage 키 변경
