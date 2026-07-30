# SPEC — SleepDebtTracker

## Common Principles

- **플랫폼**: 앱인토스 (Vite + React + TypeScript + TDS `@toss/tds-mobile` + react-router-dom), 데이터는 localStorage.
- **인증**: 토스 세션 자동 제공. 별도 로그인 함수 호출 없음. 사용자 식별 필요 시 `getIsTossLoginIntegratedService()`로 확인만.
- **UI 규칙**: 모든 화면은 TDS 컴포넌트로 조립. 여백은 TDS `Spacing`(size 필수)만 사용. 하단 탭 네비는 템플릿 제공 `src/components/FloatingTabBar` 사용. 색상은 `var(--tds-color-*)` 또는 TDS 컴포넌트만 — HEX 하드코딩 금지(다크모드 필수).
- **터치 타깃**: 모든 인터랙티브 요소 ≥ 44px.
- **광고**: 배너 `<AdSlot adGroupId={import.meta.env.VITE_TOSS_AD_GROUP_ID} />`, 보상형 `<TossRewardAd slotId={import.meta.env.VITE_TOSS_AD_SLOT_ID}>{children}</TossRewardAd>`. 콘텐츠와 겹치지 않게 섹션 사이/결과 뒤 배치.
- **AI 고지**: 본 앱의 회복 플랜/부채 계산/유형 진단은 **규칙 기반 결정론적 계산**(생성형 AI 아님). 따라서 생성형 AI 고지 의무 대상 아님(Assumptions에 명시). 향후 LLM 도입 시 고지 AC 추가 필요.
- **금지 사항**: 외부 URL 이동(`window.location.href`/`window.open`), 외부 분석 솔루션(GA/Amplitude), 앱 설치 유도, console.error/CORS 에러 0개. Android 7+, iOS 16+ 호환.

### 계산 규칙(전역 상수)

- `TARGET_SLEEP_MIN` = 기본 480분(8시간), 설정에서 360~600분 조절 가능.
- **일일 부채(deficitMin)** = `max(-120, TARGET_SLEEP_MIN - actualSleepMin)` (하루 초과 상쇄는 최대 120분까지만 인정).
- **누적 부채(totalDebtMin)** = 최근 14일 `deficitMin` 합계, 하한 0.
- **상환 예상일**: 하루 최대 상환 가능치 = `TARGET_SLEEP_MIN`의 25%(=120분 기본). `ceil(totalDebtMin / maxRepayPerDay)`일. totalDebtMin=0이면 "부채 없음".
- **수면 시간 계산**: 기상 < 취침이면 익일 기상으로 간주(+24h). 결과가 0분 또는 >960분(16h)이면 입력 거부.

---

## Data Models

### SleepRecord — 일일 수면 기록
```typescript
interface SleepRecord {
  id: string;              // `${date}` (YYYY-MM-DD, 하루 1건 upsert)
  date: string;            // "2026-07-31"
  bedTime: string;         // "23:30" (HH:mm, 24h)
  wakeTime: string;        // "06:30"
  actualSleepMin: number;  // 420 (계산 결과, 0<x<=960)
  deficitMin: number;      // 60 (TARGET - actual, -120 하한)
  createdAt: number;       // epoch ms
}
```

### UserSettings — 설정
```typescript
interface UserSettings {
  targetSleepMin: number;  // 480 (360~600)
  onboarded: boolean;      // 최초 진입 안내 완료 여부
}
```

### StreakState — 연속 기록 스트릭
```typescript
interface StreakState {
  current: number;         // 연속 일수 5
  best: number;            // 최고 기록 12
  lastCheckDate: string;   // "2026-07-31"
}
```

### SleepTypeResult — 수면 유형 진단 결과
```typescript
interface SleepTypeResult {
  type: 'morning' | 'evening' | 'intermediate';
  score: number;           // 0~100 (합산 점수)
  answeredAt: number;      // epoch ms
}
```

### localStorage 키 / 데이터 형태 / 용량

| Key | Shape | 크기 추정 |
|---|---|---|
| `sdt.records` | `SleepRecord[]` | 1건 ≈ 160B × 365일 ≈ 58KB/년 |
| `sdt.settings` | `UserSettings` | ≈ 60B |
| `sdt.streak` | `StreakState` | ≈ 80B |
| `sdt.sleepType` | `SleepTypeResult \| null` | ≈ 80B |
| `sdt.rewardUnlock` | `{ report?: string; plan?: string }` (해금된 date 캐시) | ≈ 60B |

**총합**: 1년 사용 시 < 60KB. 5MB 한도 대비 여유 충분. 저장은 템플릿 localStorage helper로 try/catch 래핑, `QuotaExceededError` 방어.

---

## Feature List

### F1. 데이터 레이어 & 스토리지 (Data + Storage)

- **Description**: 수면 기록·설정·스트릭·유형 결과를 localStorage에 저장/조회하는 순수 로직 레이어와 부채 계산 유틸을 제공한다. UI를 포함하지 않으며 모든 화면 기능이 이 레이어를 통해 데이터에 접근한다. 계산 규칙(전역 상수)을 단일 모듈로 캡슐화한다.
- **Data**: SleepRecord, UserSettings, StreakState, SleepTypeResult
- **API**: 없음 (내부 로컬 전용)
- **Requirements**:
- AC-1 [E][P0]: Scenario: 기록 저장(upsert)
  Given 기존 기록이 없는 date "2026-07-31"
  When `saveRecord({ date:"2026-07-31", bedTime:"23:30", wakeTime:"06:30" })` 호출
  Then `sdt.records`에 `actualSleepMin:420, deficitMin:60` 항목이 추가되고 저장 후 배열 length가 1 증가함
- AC-2 [E][P0]: Scenario: 같은 날짜 덮어쓰기
  Given date "2026-07-31" 기록이 이미 존재
  When 같은 date로 `saveRecord` 재호출
  Then 배열 length는 유지되고 해당 항목만 갱신됨(중복 생성 없음)
- AC-3 [U][P0]: Scenario: 부채 계산 정확성
  Given `targetSleepMin:480`, 기록 actualSleepMin `[420, 360, 480]`
  When `calcTotalDebt()` 호출
  Then 결과는 `60 + 120 + 0 = 180`분
- AC-4 [E][P1]: Scenario: 익일 기상 처리
  Given `bedTime:"23:00", wakeTime:"07:00"`
  When 수면 시간 계산
  Then `actualSleepMin` = 480
- AC-5 [W][P1]: Scenario: 비정상 수면 시간 거부
  Given `bedTime:"22:00", wakeTime:"22:00"` (0분) 또는 17시간 초과
  When `saveRecord` 호출
  Then `Error("INVALID_DURATION")` throw, 저장되지 않음
- AC-6 [W][P1]: Scenario: 저장 용량 초과
  Given localStorage `setItem`이 `QuotaExceededError` 발생
  When `saveRecord` 호출
  Then throw 없이 `{ ok:false, reason:"QUOTA" }` 반환하고 콘솔 에러 미출력
- AC-7 [S][P1]: Scenario: 데이터 없을 때 초기값
  Given `sdt.records` 키 미존재(첫 실행)
  When `getRecords()` 호출
  Then 빈 배열 `[]` 반환(예외 없음)

---

### F2. 수면 기록 입력 (취침/기상 시간)

- **Description**: 사용자가 오늘의 취침·기상 시간을 입력하면 실제 수면 시간과 일일 부채를 계산해 저장하고 대시보드로 이동한다. 하루 1건 원칙으로 재입력 시 덮어쓴다. 모바일 시간 입력에 최적화한다.
- **Data**: SleepRecord, StreakState(체크인 갱신 연동은 F6)
- **API**: 없음
- **Requirements**:
- AC-1 [E][P0]: Scenario: 기록 저장 성공
  Given 토스 로그인 유저, 오늘 "2026-07-31"
  When 입력 폼에서 `{ bedTime:"23:30", wakeTime:"06:30" }` 제출
  Then localStorage 저장 후 TDS Toast "기록이 저장됐어요" 표시되고 `navigate('/', { state:{ savedDate:"2026-07-31" } })`
- AC-2 [E][P0]: Scenario: 부족분 미리보기
  Given `targetSleepMin:480`
  When bedTime/wakeTime 입력이 완료됨(`22:30`~`05:30`)
  Then 저장 전 "오늘 부채 60분" 요약이 화면에 표시됨(실시간 계산)
- AC-3 [W][P1]: Scenario: 미입력 제출 거부
  Given bedTime 또는 wakeTime 미선택
  When 제출 버튼 탭
  Then TDS 에러 문구 "취침·기상 시간을 모두 선택해주세요" 표시, 저장 안 됨
- AC-4 [W][P1]: Scenario: 비정상 시간 거부
  Given `bedTime:"07:00", wakeTime:"07:00"` (수면 0분)
  When 제출
  Then 에러 문구 "수면 시간을 확인해주세요" 표시, 저장 안 됨
- AC-5 [S][P1]: Scenario: 오늘 기록 존재 시 편집 모드
  Given 오늘 기록이 이미 있음
  When 입력 화면 진입
  Then 폼에 기존 값이 프리필되고 버튼 라벨이 "수정하기"로 표시됨
- AC-6 [U][P1]: Scenario: 모바일 키보드/시간 선택
  Given 시간 입력 필드
  Then TDS BottomSheet 기반 시간 선택 UI 사용(직접 텍스트 키보드 입력 대신), 포커스 시 화면 상단이 가려지지 않음
- AC-7 [W][P1]: Scenario: 저장 실패 처리
  Given F1 저장이 `{ ok:false, reason:"QUOTA" }` 반환
  When 제출
  Then AlertDialog "저장 공간이 부족해요. 오래된 기록을 정리해주세요" 표시, 화면 유지

---

### F3. 수면 부채 대시보드 (홈)

- **Description**: 누적 수면 부채(분/시간), 상환 예상일, 오늘 기록 여부를 한눈에 보여주는 홈 화면이다. 핵심 숫자를 히어로로 강조하고 하위 액션(기록하기/리포트/플랜)으로 진입한다. 앱의 첫 진입 화면이다.
- **Data**: SleepRecord, UserSettings, StreakState
- **API**: 없음
- **Requirements**:
- AC-1 [U][P0]: Scenario: 누적 부채 표시
  Given 기록 `actualSleepMin [420,360]`, target 480
  When 홈 진입
  Then 히어로에 "3시간 0분"(=180분) 부채가 CountUp으로 표시됨
- AC-2 [U][P0]: Scenario: 상환 예상일 표시
  Given totalDebtMin 180, maxRepayPerDay 120
  When 홈 진입
  Then "회복까지 약 2일" 카드가 표시됨
- AC-3 [S][P1]: Scenario: 빈 상태
  Given 기록 0건
  When 홈 진입
  Then `Asset.ContentIcon`과 "첫 수면을 기록해보세요" 안내 + "기록하기" 버튼(display block) 표시, 히어로는 "0분"
- AC-4 [S][P1]: Scenario: 로딩 상태
  Given localStorage 조회 진행 중
  When 홈 렌더
  Then TDS 스켈레톤/로딩 인디케이터 표시 후 데이터로 교체
- AC-5 [E][P0]: Scenario: 기록 화면 진입
  Given 홈
  When "오늘 기록하기" 버튼 탭(≥44px)
  Then `navigate('/record')`
- AC-6 [U][P1]: Scenario(레이아웃): 카드 위계
  Given 홈 렌더
  Then `data-testid="debt-hero"` SummaryHero 1개와 `data-testid="repay-card"`, `data-testid="streak-card"` Card 2개가 존재하고 부채 값은 강조 타이포(t2~t3)로 표기됨
- AC-7 [O][P2]: Scenario: 최근 추이 스파크라인
  Given 기록 3건 이상
  Then 최근 7일 부채 추이가 Sparkline으로 히어로 하단에 표시됨
- AC-8 [U][P1]: Scenario: 콘솔 에러 0개
  Given 프로덕션 빌드 홈 로드
  Then console.error 출력 0건

---

### F4. 주간 수면 부채 리포트 (차트, 리워드 게이팅)

- **Description**: 최근 7일 수면 시간과 일일 부채를 차트로 시각화한 주간 리포트를 제공한다. 리포트 열람 전 보상형 광고를 1회 시청해야 하며, 당일 해금은 캐시된다. 고CPM 전환 지점이다.
- **Data**: SleepRecord, `sdt.rewardUnlock`
- **API**: 없음
- **Requirements**:
- AC-1 [E][P0]: Scenario: 리워드 광고 후 리포트 공개
  Given 오늘 리포트 미해금
  When "주간 리포트 보기" 탭 → `TossRewardAd` 시청 완료
  Then 리포트 차트가 렌더되고 `sdt.rewardUnlock.report = "2026-07-31"` 저장됨
- AC-2 [S][P0]: Scenario: 당일 재열람 광고 생략
  Given `sdt.rewardUnlock.report === 오늘`
  When 리포트 화면 진입
  Then 광고 없이 즉시 차트 표시
- AC-3 [U][P0]: Scenario: 주간 차트 데이터 정확성
  Given 최근 7일 `deficitMin [60,120,0,60,60,0,60]`
  When 리포트 렌더
  Then 막대 7개(MiniBar/차트)가 각 값에 비례해 표시되고 합계 "6시간 0분"(360분)이 표기됨
- AC-4 [S][P1]: Scenario: 데이터 부족 빈 상태
  Given 최근 7일 기록 0건
  When 리포트 진입
  Then `Asset.ContentIcon` + "기록이 쌓이면 리포트를 볼 수 있어요"(광고 트리거 미노출)
- AC-5 [W][P1]: Scenario: 광고 로드 실패
  Given `TossRewardAd` 로드/시청 실패
  When "리포트 보기" 탭
  Then Toast "광고를 불러오지 못했어요. 잠시 후 다시 시도해주세요" 표시, 리포트 미공개, 화면 유지
- AC-6 [S][P1]: Scenario: 차트 로딩
  Given 리포트 계산 중
  Then 차트 영역 스켈레톤 표시 후 렌더
- AC-7 [U][P1]: Scenario(레이아웃): 리포트 카드
  Given 리포트 렌더
  Then `data-testid="weekly-chart"` 차트 Card 1개와 `data-testid="weekly-summary"` 요약 Card(주간 합계 강조)가 존재
- AC-8 [U][P1]: Scenario: 배너 광고 배치
  Then 리포트 콘텐츠 하단(차트 아래, 콘텐츠와 미겹침)에 `<AdSlot />` 1개 배치

---

### F5. 주말 회복 수면 플랜 (리워드 게이팅)

- **Description**: 누적 부채와 목표 수면을 바탕으로 주말 이틀에 걸친 몰아자기 권장 취침/기상 시간과 회복량을 규칙 기반으로 산출해 제안한다. 결과는 보상형 광고 시청 후 공개된다. 하루 최대 회복량(120분)을 넘지 않도록 안전 상한을 둔다.
- **Data**: SleepRecord, UserSettings, `sdt.rewardUnlock`
- **API**: 없음
- **Requirements**:
- AC-1 [E][P0]: Scenario: 광고 후 플랜 공개
  Given totalDebtMin 180, 오늘 plan 미해금
  When "회복 플랜 보기" 탭 → `TossRewardAd` 완료
  Then 토·일 권장 수면(예: 토 +120분, 일 +60분) 카드가 표시되고 `sdt.rewardUnlock.plan = 오늘` 저장
- AC-2 [U][P0]: Scenario: 회복량 상한 준수
  Given totalDebtMin 600
  When 플랜 계산
  Then 하루 권장 추가 수면은 120분을 초과하지 않음
- AC-3 [S][P1]: Scenario: 부채 없음
  Given totalDebtMin 0
  When 플랜 진입
  Then 광고 트리거 대신 "수면 부채가 없어요! 지금 패턴을 유지하세요" 안내 표시
- AC-4 [W][P1]: Scenario: 광고 실패
  Given `TossRewardAd` 실패
  When "플랜 보기" 탭
  Then Toast "광고를 불러오지 못했어요" 표시, 플랜 미공개
- AC-5 [S][P1]: Scenario: 로딩
  Given 플랜 계산 중
  Then 스켈레톤 표시 후 결과 렌더
- AC-6 [U][P1]: Scenario(레이아웃): 플랜 카드
  Given 플랜 공개
  Then `data-testid="plan-card"` Card 2개(토/일)와 각 카드에 권장 취침·기상·추가 회복 분이 강조 타이포로 표기됨
- AC-7 [U][P1]: Scenario: 규칙 기반 고지
  Given 플랜 결과 표시
  Then 하단에 "개인 맞춤 통계 기반 계산 결과예요"(의료 진단 아님) 안내 문구 표시

---

### F6. 연속 기록 스트릭 (일일 체크인)

- **Description**: 매일 수면 기록 시 연속 기록 일수를 갱신해 동기를 부여한다. 하루라도 건너뛰면 current를 1로 리셋하고, 최고 기록(best)은 유지한다. 홈과 전용 배지에 노출한다.
- **Data**: StreakState, SleepRecord
- **API**: 없음
- **Requirements**:
- AC-1 [E][P0]: Scenario: 연속 기록 증가
  Given `lastCheckDate="2026-07-30", current=4`
  When "2026-07-31" 기록 저장
  Then `current=5`, `lastCheckDate="2026-07-31"`, best는 `max(best,5)`로 갱신
- AC-2 [E][P0]: Scenario: 하루 건너뛰면 리셋
  Given `lastCheckDate="2026-07-29"`(어제 아님), current=10, best=10
  When "2026-07-31" 기록 저장
  Then `current=1`, `best=10` 유지
- AC-3 [S][P1]: Scenario: 같은 날 재기록 시 유지
  Given `lastCheckDate="2026-07-31", current=5`
  When 같은 날 재저장
  Then current 변동 없음(5 유지)
- AC-4 [S][P1]: Scenario: 최초 기록
  Given StreakState 미존재
  When 첫 기록 저장
  Then `current=1, best=1, lastCheckDate=오늘`
- AC-5 [E][P2]: Scenario: 마일스톤 축하
  Given current가 7의 배수 도달
  When 기록 저장 후 홈 진입
  Then Toast "7일 연속 기록! 🎉" 1회 표시
- AC-6 [U][P1]: Scenario(레이아웃): 스트릭 배지
  Given 홈 렌더
  Then `data-testid="streak-card"`에 "🔥 {current}일 연속" 텍스트와 최고 기록 표기

---

### F7. 수면 유형 진단 테스트 (아침형/저녁형)

- **Description**: 5문항 규칙 기반 설문으로 아침형/저녁형/중간형을 진단하고 결과를 저장·재열람한다. 점수 합산으로 유형을 결정하며 결과는 캐시되어 재진입 시 즉시 표시된다.
- **Data**: SleepTypeResult
- **API**: 없음
- **Requirements**:
- AC-1 [E][P0]: Scenario: 진단 완료
  Given 5문항 모두 응답(각 0~20점, 합 0~100)
  When 마지막 문항 응답 후 "결과 보기" 탭
  Then 합산 점수로 유형 결정(≥70 아침형 / ≤30 저녁형 / 그 외 중간형)되고 `sdt.sleepType` 저장
- AC-2 [S][P0]: Scenario: 결과 재열람
  Given `sdt.sleepType` 존재
  When 진단 화면 진입
  Then 설문 없이 저장된 결과 카드 즉시 표시 + "다시 진단하기" 버튼 노출
- AC-3 [W][P1]: Scenario: 미완료 제출 방지
  Given 문항 중 1개 이상 미응답
  When "결과 보기" 탭 시도
  Then 버튼 비활성 또는 Toast "모든 문항에 답해주세요" 표시, 결과 미생성
- AC-4 [S][P1]: Scenario: 진행률 표시
  Given 3/5 문항 응답
  Then TDS 진행 인디케이터에 "3/5" 표시
- AC-5 [U][P1]: Scenario(레이아웃): 결과 카드
  Given 결과 표시
  Then `data-testid="type-result-card"` Card에 유형명(t2~t3 강조)·점수·한 줄 설명이 포함됨
- AC-6 [E][P2]: Scenario: 결과 기반 목표 제안
  Given 유형 결정됨
  When 결과 화면
  Then "권장 취침 시간대: 23:00" 형태 안내 표시(설정 반영은 사용자가 선택)

---

## Screen Definitions

### S1. 홈 / 대시보드 — `/`
- **TDS 컴포넌트**: `ScreenScaffold`(골격), `Top`(타이틀), SummaryHero(부채 히어로+CountUp), `Card`(상환/스트릭), `Sparkline`(추이), TDS `Button`(display block, "오늘 기록하기"), `Asset.ContentIcon`(빈 상태), `FloatingTabBar`(하단 네비).
- **상태**: 로딩=스켈레톤 / 빈=ContentIcon+CTA / 에러=AlertDialog "데이터를 불러오지 못했어요".
- **터치**: 기록/리포트/플랜 버튼 ≥ 44px.
- **Navigation contract**:
  - Incoming: `location.state = { savedDate: string } | null`
  - Outgoing: "오늘 기록하기" → `navigate('/record')`; "리포트" → `navigate('/report')`; "플랜" → `navigate('/plan')`; "유형 진단" → `navigate('/sleep-type')`.
- **Layout contract**: ScreenScaffold로 감쌈. `data-testid="debt-hero"` SummaryHero + `data-testid="repay-card"`, `data-testid="streak-card"` Card. 부채 값 t2~t3 강조.

### S2. 수면 기록 입력 — `/record`
- **TDS 컴포넌트**: `ScreenScaffold`, `Top`, `ListRow`(취침/기상 항목), `BottomSheet`(시간 선택), `Paragraph.Text`(부족분 미리보기), `SubmitFooter`+TDS `Button`(하단 고정 "저장하기"/"수정하기"), `Toast`, `AlertDialog`(저장 실패).
- **상태**: 로딩=버튼 비활성+스피너 / 빈=신규 폼 / 에러=인라인 에러 문구.
- **폼/키보드**: 시간은 BottomSheet 휠 선택(텍스트 키보드 미사용) → 키보드 가림 없음.
- **터치**: ListRow 항목 및 저장 버튼 ≥ 44px.
- **Navigation contract**:
  - Incoming: `location.state = null` (오늘 기록 존재 시 화면 내부에서 F1 조회로 프리필)
  - Outgoing: 저장 성공 → `navigate('/', { state:{ savedDate: string } })`
- **Layout contract**: SubmitFooter 하단 고정 1차 액션. 미리보기는 `data-testid="deficit-preview"`.

### S3. 주간 리포트 — `/report`
- **TDS 컴포넌트**: `ScreenScaffold`, `Top`, `TossRewardAd`(게이트), `Card`(차트/요약), MiniBar 또는 차트, `AdSlot`(배너), `Asset.ContentIcon`(빈).
- **상태**: 로딩=차트 스켈레톤 / 빈=ContentIcon+안내 / 에러=Toast(광고 실패).
- **터치**: "리포트 보기" 버튼 ≥ 44px.
- **Navigation contract**:
  - Incoming: `location.state = null`
  - Outgoing: 없음(탭 네비로 이동). 뒤로가기 → `navigate('/')`.
- **Layout contract**: `data-testid="weekly-chart"`, `data-testid="weekly-summary"` Card. 배너는 차트 하단 미겹침.

### S4. 회복 플랜 — `/plan`
- **TDS 컴포넌트**: `ScreenScaffold`, `Top`, `TossRewardAd`, `Card`(토/일 플랜), `Paragraph.Text`(규칙 기반 안내), `Toast`.
- **상태**: 로딩=스켈레톤 / 빈(부채 0)=안내 / 에러=Toast.
- **Navigation contract**: Incoming `location.state = null`; Outgoing 없음.
- **Layout contract**: `data-testid="plan-card"` Card 2개, 회복 분 강조 타이포.

### S5. 수면 유형 진단 — `/sleep-type`
- **TDS 컴포넌트**: `ScreenScaffold`, `Top`, `ListRow`+`Chip`(선택지), 진행 인디케이터, `Card`(결과), TDS `Button`("결과 보기"/"다시 진단하기").
- **상태**: 로딩=결과 조회 스켈레톤 / 빈=설문 시작 / 에러=Toast.
- **Navigation contract**: Incoming `location.state = null`; Outgoing 없음.
- **Layout contract**: `data-testid="type-result-card"` Card, 유형명 t2~t3.

### S6. 온보딩/설정 (최초 1회 안내 + 목표 수면 조절) — `/settings`
- **TDS 컴포넌트**: `ScreenScaffold`, `ListRow`, `BottomSheet`(목표 시간 선택), `Switch`, TDS `Button`.
- **Navigation contract**: Incoming `location.state = null`; Outgoing: 저장 → `navigate('/')`.
- 참고: 단순 설정 화면 — 데이터 시각화/히어로 생략.

---

## API Contract

외부 API 없음 (모든 데이터 localStorage 전용). 향후 크로스 디바이스 동기화 요구 시 별도 Railway 서버 설계 필요(현 MVP 범위 외). CORS/외부 로깅/외부 도메인 이탈 없음.

---

## Assumptions

1. 부채/플랜/유형 진단은 **결정론적 규칙 기반 계산**이며 생성형 AI가 아니다 → 생성형 AI 고지 의무 대상 아님. 향후 LLM 도입 시 AI 사전 고지·결과물 라벨 AC를 추가한다.
2. 수면 시간은 사용자 수동 입력(웨어러블/헬스킷 연동 없음 — 네이티브 모듈 미사용, MVP 범위).
3. 하루 1건 기록 원칙(낮잠 별도 기록 없음).
4. 누적 부채 집계 윈도우는 최근 14일(그 이전 부채는 자연 소멸 처리).
5. 프로모션 리워드(`grantPromotionReward`)는 현 MVP 미사용. 사용 시 `amount ≤ 5000` 검증 필수.
6. 광고 그룹/슬롯 ID는 앱인토스 콘솔에서 env로 주입(`VITE_TOSS_AD_GROUP_ID`, `VITE_TOSS_AD_SLOT_ID`).
7. 의료/진단 서비스가 아니며 결과에 "통계 기반 참고용" 고지를 표기한다.

## Open Questions

1. 목표 수면 시간 기본값을 8시간(480분) 고정으로 할지, 유형 진단 결과에 따라 자동 제안할지?
2. 리워드 광고 게이팅을 리포트·플랜 **양쪽 모두**에 둘지, 하나만 둘지(광고 피로도 vs 수익)?
3. 초과 수면(하루 목표 초과)의 부채 상쇄 상한을 120분으로 둘지, 더 넉넉히 둘지?
4. 14일 윈도우가 적정한지, 사용자가 조절 가능하게 할지?
5. 스트릭 리셋 기준을 "달력상 하루 결측"으로 할지, 유예(1일 프리즈) 기능을 둘지?

---

원하시면 이 SPEC을 기반으로 **work packet 분할**(F1~F7 → 코딩 패킷)까지 이어서 진행하겠습니다.