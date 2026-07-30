# TASK — SleepDebtTracker

전체 SPEC(F1~F7, 50 ACs)을 코딩 세션 단위 패킷으로 분할했습니다. 데이터 레이어 우선, 페이지 후순위 원칙을 엄격히 적용했으며, 모든 태스크에 Description / DoD / Covers / Files / Depends on을 명시했습니다.

---

## Epic 1. Data Layer (타입 → 스토리지 → 계산 → 도메인)

> **Risk Assessment**
> - **Complexity**: Medium
> - **Risk factors**: (1) 부채 계산 규칙(익일 기상 +24h, -120 상쇄 상한, 14일 윈도우)이 여러 모듈에 흩어지면 페이지마다 결과가 달라짐. (2) `QuotaExceededError`를 throw로 처리하면 UI 크래시. (3) 스트릭 리셋/증가 경계 로직 버그.
> - **Mitigation**: 계산 규칙을 `calc.ts` 단일 모듈로 캡슐화(Task 1.3)해 모든 페이지가 동일 함수 사용. 스토리지 원시함수(Task 1.2)에서 try/catch + `{ok,reason}` 반환 규약을 먼저 확정한 뒤 도메인 CRUD(1.4~1.6)를 쌓아 페이지가 계산·저장을 재구현하지 못하게 강제.

### Task 1.1 — 전역 타입 & RouteState 정의
- Description: 모든 엔티티 인터페이스와 페이지 간 네비게이션 데이터 계약(RouteState), 저장 결과 타입, LS 키 상수 타입을 순수 타입으로 정의한다. 런타임 코드 없음.
- DoD:
  - `SleepRecord`, `UserSettings`, `StreakState`, `SleepTypeResult`, `RewardUnlock`(`{report?:string; plan?:string}`), `SaveResult`(`{ok:true}|{ok:false;reason:'QUOTA'|'INVALID_DURATION'}`) 정의.
  - `RouteState` 정의: `{ "/": { savedDate: string } | undefined; "/record": undefined; "/report": undefined; "/plan": undefined; "/sleep-type": undefined; "/settings": undefined; }`
  - `LS_KEYS` 상수 유니온(`sdt.records`/`sdt.settings`/`sdt.streak`/`sdt.sleepType`/`sdt.rewardUnlock`) 타입 정의.
  - `tsc --noEmit` 통과, 앱 컴파일 유지.
- Covers: [foundational — RouteState 계약 + 전 엔티티 타입 기반; 직접 매핑 AC 없음]
- Files: [`src/lib/types.ts`]
- Depends on: none

### Task 1.2 — localStorage 원시 헬퍼 (안전 get/set)
- Description: 제네릭 `safeGet<T>(key, fallback)` / `safeSet(key, value): SaveResult`를 구현한다. 파싱 실패·미존재 시 fallback 반환, 저장 실패 시 throw 없이 결과 객체 반환.
- DoD:
  - `safeGet`: 키 미존재/파싱오류 시 fallback 반환, 예외 미발생 → F1-AC7.
  - `safeSet`: `QuotaExceededError` catch 후 `{ok:false, reason:'QUOTA'}` 반환, `console.error` 미출력 → F1-AC6.
  - 성공 시 `{ok:true}` 반환. 앱 컴파일 유지.
- Covers: [F1-AC6, F1-AC7]
- Files: [`src/lib/storage.ts`]
- Depends on: Task 1.1

### Task 1.3 — 계산 모듈 (수면시간·부채·상환·플랜·유형점수)
- Description: SPEC "계산 규칙(전역 상수)"을 결정론적 순수 함수로 캡슐화한다. UI/스토리지 접근 없음.
- DoD:
  - 상수 `TARGET_SLEEP_MIN=480`, `MAX_OVER_OFFSET=120`, `DEBT_WINDOW_DAYS=14`, `maxRepayPerDay=target*0.25`.
  - `calcSleepMin(bedTime, wakeTime)`: 기상<취침 시 +24h. `"23:00"→"07:00"`=480 → F1-AC4. 결과 0분 또는 >960분이면 `Error("INVALID_DURATION")` throw → F1-AC5.
  - `calcDeficit(actual, target)` = `max(-120, target-actual)`.
  - `calcTotalDebt(records, target)`: 최근 14일 deficit 합, 하한 0. `[420,360,480]/480 → 180` → F1-AC3.
  - `calcRepayDays(totalDebt)`, `calcWeeklySeries(records)`(최근7일), `calcRecoveryPlan(totalDebt, target)`(토/일 분배, 하루≤120분), `calcSleepType(answers)`(합산 0~100; ≥70 morning/≤30 evening/그외 intermediate) → F7-AC1.
  - `calcRecoveryPlan`은 동일 입력→동일 출력(순수, 캐시 없음) → F5-AC2 계산 근거.
  - 단위 검증 가능(임시 테스트/콘솔), 앱 컴파일 유지.
- Covers: [F1-AC3, F1-AC4, F1-AC5, F5-AC2, F7-AC1]
- Files: [`src/lib/calc.ts`]
- Depends on: Task 1.1

### Task 1.4 — 기록 CRUD & upsert 저장
- Description: 수면 기록 조회/저장 도메인 로직. `saveRecord`는 calc로 파생값 산출 후 같은 date upsert.
- DoD:
  - `getRecords(): SleepRecord[]`, `getRecordByDate(date)`.
  - `saveRecord({date,bedTime,wakeTime}): SaveResult`: `calcSleepMin`+`calcDeficit`로 `actualSleepMin`/`deficitMin` 산출, `id=date`로 저장. 신규 시 length+1, `actualSleepMin:420,deficitMin:60` → F1-AC1.
  - 동일 date 재호출 시 length 유지·항목만 갱신 → F1-AC2.
  - INVALID_DURATION은 calc에서 throw 전파, QUOTA는 `safeSet` 결과 전파.
  - 앱 컴파일 유지.
- Covers: [F1-AC1, F1-AC2]
- Files: [`src/lib/records.ts`]
- Depends on: Task 1.2, Task 1.3

### Task 1.5 — 스트릭 상태 로직 (일일 체크인)
- Description: 기록 저장과 연동되는 연속 기록 상태 갱신 순수/스토리지 로직.
- DoD:
  - `getStreak(): StreakState`(미존재 시 기본값).
  - `updateStreak(todayDate): StreakState`:
    - 어제=`lastCheckDate`면 `current+1`, `best=max(best,current)` → F6-AC1.
    - 어제 아님(결측) → `current=1`, best 유지 → F6-AC2.
    - 같은 날 재호출 → 변동 없음 → F6-AC3.
    - 최초(미존재) → `current=1,best=1,lastCheckDate=오늘` → F6-AC4.
  - 날짜 계산은 문자열 기반(로컬 타임존 이슈 방지). 컴파일 유지.
- Covers: [F6-AC1, F6-AC2, F6-AC3, F6-AC4]
- Files: [`src/lib/streak.ts`]
- Depends on: Task 1.2

### Task 1.6 — 설정·유형·리워드 해금 상태 헬퍼
- Description: 설정/유형결과/리워드 해금 캐시의 조회·저장 헬퍼(경량 store).
- DoD:
  - `getSettings()/saveSettings()`(target 360~600 clamp, onboarded 플래그).
  - `getSleepType()/saveSleepType()` — 결과 저장/재조회(재열람 즉시표시 근거) → F7-AC2 persistence.
  - `getRewardUnlock()/setRewardUnlock(kind, date)` — `report`/`plan` 당일 해금 date 캐시 저장·조회 → F4-AC2 캐시 계층.
  - 모두 `safeGet/safeSet` 기반, 컴파일 유지.
- Covers: [F7-AC2, F4-AC2]
- Files: [`src/lib/settingsStore.ts`]
- Depends on: Task 1.2

---

## Epic 2. API Routes

> **해당 없음** — SPEC "API Contract"에 따라 외부 API 없음(모든 데이터 localStorage 전용). 별도 서버 태스크 생성하지 않음(크로스 디바이스 동기화는 MVP 범위 외).

---

## Epic 3. UI Pages (페이지당 1태스크)

> **Risk Assessment**
> - **Complexity**: High
> - **Risk factors**: (1) 페이지가 `location.state`를 잘못 캐스팅하거나 계산을 재구현하면 페이지 간 값 불일치. (2) 리워드 게이팅(당일 해금)과 광고 실패 분기 누락. (3) TDS 여백을 Tailwind/인라인으로 덮어써 검수 반려. (4) 콘솔 에러.
> - **Mitigation**: 모든 페이지는 Epic 1 헬퍼만 사용(계산/저장 재구현 금지), `location.state`는 Task 1.1 `RouteState`로 캐스팅. 데이터 레이어 완성 후 페이지는 조립만. 간격은 TDS `Spacing`(size 필수)만 사용.

### Task 3.1 — 홈/대시보드 페이지 (`/`)
- Description: 누적 부채 히어로·상환 예상일·스트릭 배지·최근 추이를 조립하는 앱 첫 진입 화면.
- DoD:
  - `ScreenScaffold`+`Top`. `data-testid="debt-hero"` SummaryHero: `calcTotalDebt` 값 CountUp("3시간 0분"=180분), 부채 t2~t3 강조 → F3-AC1, F3-AC6.
  - `data-testid="repay-card"`: "회복까지 약 2일" → F3-AC2.
  - 기록 0건 → `Asset.ContentIcon`+"첫 수면을 기록해보세요"+"기록하기" 버튼(display block), 히어로 "0분" → F3-AC3.
  - 조회 중 스켈레톤 표시 후 교체 → F3-AC4.
  - "오늘 기록하기" 버튼(≥44px) → `navigate('/record')`(`RouteState['/record']`) → F3-AC5.
  - 기록 3건↑ 시 `Sparkline`(최근7일) 히어로 하단 → F3-AC7.
  - `data-testid="streak-card"`: "🔥 {current}일 연속"+최고기록 → F6-AC6.
  - 진입 시 `location.state.savedDate` 존재 & current가 7배수면 Toast "N일 연속 기록! 🎉" 1회 → F6-AC5.
  - 프로덕션 빌드 `console.error` 0건 → F3-AC8.
- Covers: [F3-AC1, F3-AC2, F3-AC3, F3-AC4, F3-AC5, F3-AC6, F3-AC7, F3-AC8, F6-AC5, F6-AC6]
- Files: [`src/pages/HomePage.tsx`]
- Depends on: Task 1.3, Task 1.4, Task 1.5

### Task 3.2 — 수면 기록 입력 페이지 (`/record`)
- Description: 취침/기상 시간 BottomSheet 선택 → 실시간 부족분 미리보기 → 저장/수정 후 홈 이동.
- DoD:
  - `ScreenScaffold`+`Top`+`ListRow`(취침/기상)+`BottomSheet` 휠 시간선택(텍스트 키보드 미사용, 상단 미가림) → F2-AC6.
  - 진입 시 오늘 기록 있으면 `getRecordByDate`로 프리필+버튼 라벨 "수정하기" → F2-AC5.
  - 입력 완료 시 `data-testid="deficit-preview"`에 "오늘 부채 60분" 실시간 표시 → F2-AC2.
  - 미입력 제출 → 인라인 에러 "취침·기상 시간을 모두 선택해주세요" → F2-AC3.
  - 비정상(0분/17h초과) → INVALID_DURATION catch → "수면 시간을 확인해주세요" → F2-AC4.
  - 정상 제출 → `saveRecord`+`updateStreak` → Toast "기록이 저장됐어요" → `navigate('/', {state:{savedDate}})`(RouteState 캐스팅) → F2-AC1.
  - `saveResult.reason==='QUOTA'` → AlertDialog "저장 공간이 부족해요. 오래된 기록을 정리해주세요", 화면 유지 → F2-AC7.
  - `SubmitFooter` 하단 고정 1차 액션, 요소 ≥44px.
- Covers: [F2-AC1, F2-AC2, F2-AC3, F2-AC4, F2-AC5, F2-AC6, F2-AC7]
- Files: [`src/pages/RecordPage.tsx`]
- Depends on: Task 1.4, Task 1.5

### Task 3.3 — 주간 리포트 페이지 (`/report`, 리워드 게이팅)
- Description: 최근 7일 부채 차트+주간 합계. 리워드 광고 게이팅(당일 캐시).
- DoD:
  - 최근7일 기록 0건 → `Asset.ContentIcon`+"기록이 쌓이면 리포트를 볼 수 있어요"(광고 트리거 미노출) → F4-AC4.
  - `getRewardUnlock().report===오늘` → 광고 없이 즉시 차트 → F4-AC2.
  - 미해금 → `<TossRewardAd slotId={import.meta.env.VITE_TOSS_AD_SLOT_ID}>` 시청 완료 시 차트 렌더 + `setRewardUnlock('report', 오늘)` → F4-AC1.
  - 광고 실패 → Toast "광고를 불러오지 못했어요. 잠시 후 다시 시도해주세요", 미공개·화면 유지 → F4-AC5.
  - `data-testid="weekly-chart"` 차트 Card: `calcWeeklySeries` 7개 막대(MiniBar) 값 비례 → F4-AC3.
  - `data-testid="weekly-summary"` Card: 합계 "6시간 0분"(360분) 강조 → F4-AC3, F4-AC7.
  - 계산 중 차트 스켈레톤 → F4-AC6.
  - 차트 하단(미겹침) `<AdSlot adGroupId={import.meta.env.VITE_TOSS_AD_GROUP_ID} />` 1개 → F4-AC8.
  - "리포트 보기" ≥44px.
- Covers: [F4-AC1, F4-AC2, F4-AC3, F4-AC4, F4-AC5, F4-AC6, F4-AC7, F4-AC8]
- Files: [`src/pages/ReportPage.tsx`]
- Depends on: Task 1.3, Task 1.6

### Task 3.4 — 회복 플랜 페이지 (`/plan`, 리워드 게이팅)
- Description: 누적 부채 기반 주말 회복 플랜(토/일) 규칙 산출, 광고 게이팅.
- DoD:
  - `totalDebt===0` → 광고 트리거 대신 "수면 부채가 없어요! 지금 패턴을 유지하세요" → F5-AC3.
  - 미해금 → `<TossRewardAd>` 완료 시 `calcRecoveryPlan` 카드 표시 + `setRewardUnlock('plan', 오늘)` → F5-AC1.
  - 광고 실패 → Toast "광고를 불러오지 못했어요", 미공개 → F5-AC4.
  - 계산 중 스켈레톤 → F5-AC5.
  - `data-testid="plan-card"` Card 2개(토/일), 각 권장 취침·기상·추가 회복분 강조 타이포, 하루 추가수면 ≤120분 → F5-AC2, F5-AC6.
  - 하단 "개인 맞춤 통계 기반 계산 결과예요"(의료 진단 아님) 고지 → F5-AC7.
- Covers: [F5-AC1, F5-AC2, F5-AC3, F5-AC4, F5-AC5, F5-AC6, F5-AC7]
- Files: [`src/pages/PlanPage.tsx`]
- Depends on: Task 1.3, Task 1.6

### Task 3.5 — 수면 유형 진단 페이지 (`/sleep-type`)
- Description: 5문항 규칙 기반 설문 → 유형 진단·저장·재열람.
- DoD:
  - 진입 시 `getSleepType()` 존재하면 설문 생략, 결과 카드 즉시 표시 + "다시 진단하기" → F7-AC2.
  - `ListRow`+`Chip` 선택지, 진행 인디케이터 "3/5" → F7-AC4.
  - 미완료 시 "결과 보기" 비활성 또는 Toast "모든 문항에 답해주세요", 결과 미생성 → F7-AC3.
  - 완료 후 `calcSleepType`으로 유형 결정, `saveSleepType` 저장 → F7-AC1.
  - `data-testid="type-result-card"` Card: 유형명 t2~t3 강조+점수+한 줄 설명 → F7-AC5.
  - 결과 화면에 "권장 취침 시간대: 23:00" 형태 안내(설정 반영은 사용자 선택) → F7-AC6.
- Covers: [F7-AC1, F7-AC2, F7-AC3, F7-AC4, F7-AC5, F7-AC6]
- Files: [`src/pages/SleepTypePage.tsx`]
- Depends on: Task 1.3, Task 1.6

### Task 3.6 — 온보딩/설정 페이지 (`/settings`)
- Description: 최초 1회 안내 + 목표 수면(360~600) 조절 + onboarded 저장. 시각화/히어로 생략(단순 설정).
- DoD:
  - `ScreenScaffold`+`ListRow`+`BottomSheet`(목표 시간 360~600 휠)+`Switch`+TDS `Button`.
  - `saveSettings` 후 `navigate('/')`(RouteState 캐스팅), `onboarded=true` 저장.
  - target 값이 F1/F3 계산(`calcTotalDebt`/`calcRecoveryPlan`)의 입력으로 반영됨을 확인.
  - 요소 ≥44px, 색상은 `var(--tds-color-*)`만 사용(다크모드 준수), 컴파일 유지.
- Covers: [S6 설정/온보딩 화면 — target 입력 제공(F1·F3 계산 소스); 직접 매핑 AC 없음]
- Files: [`src/pages/SettingsPage.tsx`]
- Depends on: Task 1.6

---

## Epic 4. Integration + Landing

> **Risk Assessment**
> - **Complexity**: Low
> - **Risk factors**: (1) 라우트 미등록/state 타입 불일치로 런타임 에러. (2) FloatingTabBar 대신 존재하지 않는 TabBar 사용 시 검수 반려. (3) 최초 진입 시 온보딩 미유도.
> - **Mitigation**: 모든 페이지(Epic 3) 완성 후 마지막에 라우터로 연결, `RouteState` 타입으로 navigate 인자 정적 검증. 하단 네비는 템플릿 `src/components/FloatingTabBar`만 사용.

### Task 4.1 — 라우터 배선 & 하단 네비 & 최초 진입 분기
- Description: 6개 페이지를 react-router로 연결하고 FloatingTabBar를 붙이며 온보딩 미완료 시 설정으로 유도한다.
- DoD:
  - `react-router-dom` `BrowserRouter`+`Routes`에 `/`, `/record`, `/report`, `/plan`, `/sleep-type`, `/settings` 등록.
  - 템플릿 `src/components/FloatingTabBar`로 홈/리포트/플랜/유형/설정 탭 네비 배치(TDS TabBar 미사용).
  - 최초 진입(`settings.onboarded===false`) 시 `/settings`로 유도, 이후 `/`.
  - 앱 프로덕션 빌드 성공, 전 라우트 이동 시 `console.error` 0건.
  - `navigate` 호출 인자가 `RouteState`와 타입 일치(정적 검증 통과).
- Covers: [integration — 전 페이지 라우팅/네비 연결, F3-AC5·F2-AC1의 navigate 대상 라우트 실재화; 직접 매핑 AC 없음]
- Files: [`src/App.tsx`, `src/main.tsx`]
- Depends on: Task 3.1, Task 3.2, Task 3.3, Task 3.4, Task 3.5, Task 3.6

---

## AC Coverage

- **Total ACs in SPEC**: 50 (F1:7, F2:7, F3:8, F4:8, F5:7, F6:6, F7:7)
- **Covered by tasks**: 50
  - **F1** (7): AC1→1.4, AC2→1.4, AC3→1.3, AC4→1.3, AC5→1.3, AC6→1.2, AC7→1.2
  - **F2** (7): AC1~AC7 → 3.2
  - **F3** (8): AC1~AC8 → 3.1
  - **F4** (8): AC2→1.6(store)+3.3(UI); AC1,AC3,AC4,AC5,AC6,AC7,AC8→3.3
  - **F5** (7): AC2→1.3(calc)+3.4(UI); AC1,AC3,AC4,AC5,AC6,AC7→3.4
  - **F6** (6): AC1,AC2,AC3,AC4→1.5; AC5,AC6→3.1
  - **F7** (7): AC1→1.3(scoring)+3.5(UI); AC2→1.6(store)+3.5(UI); AC3,AC4,AC5,AC6→3.5
- **Uncovered**: 0 ✅

> 참고: Task 1.1(types)·3.6(settings)·4.1(routing)은 직접 매핑 AC가 없는 기반/화면/통합 태스크지만, 나머지 태스크가 참조하는 타입·라우트·설정 입력을 제공하므로 필수. 모든 SPEC AC는 최소 1개 태스크의 Covers에 포함되어 **100% 커버리지** 달성.