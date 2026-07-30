# Sprint Contract: 라우터 배선 & 하단 네비 & 최초 진입 분기

## 목표
react-router-dom으로 6개 라우트를 App.tsx에 연결, FloatingTabBar(홈/리포트/플랜/설정 4탭)를 배선, 최초 진입 시 /settings 온보딩으로 분기.

## 만들 항목
1. **src/App.tsx** — BrowserRouter + Routes로 6개 경로 정의 (/, /record, /report, /plan, /sleep-type, /settings)
2. **src/components/FloatingTabBar.tsx** 배선 — /, /report, /plan, /settings 4탭만 표시, /record는 탭 숨김
3. **최초 진입 분기 로직** — UserSettings의 `onboarded===false`이면 useEffect에서 /settings으로 리다이렉트

## 사용 타입 (src/lib/types.ts import)
- `UserSettings` (targetSleepMin, onboarded)
- `RouteState` (타입 안전 내비게이션용)

## 검증 방법
1. `npm run dev` → 각 탭(/,/report,/plan,/settings) 클릭 시 페이지 전환
2. `/record` 직접 접근 → FloatingTabBar 없음, 타이틀만
3. localStorage에서 onboarded=false 삭제 후 새로고침 → /settings으로 리다이렉트
4. 각 페이지 조회 후 콘솔에 unhandled promise rejection 없음 (SDK try/catch 필수)

## 절대 금지
- main.tsx 수정 (@AI:ANCHOR 보호)
- 페이지 파일 이동/삭제 (기존 Home.tsx 등은 유지)
- FloatingTabBar 컴포넌트 재구현 (이미 존재하는 파일 재사용)
