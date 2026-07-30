import { Routes, Route, useLocation } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import Home from './pages/Home';
import RecordPage from './pages/RecordPage';
import SleepTypePage from './pages/SleepTypePage';
import ReportPage from './pages/ReportPage';
import PlanPage from './pages/PlanPage';
import SettingsPage from './pages/SettingsPage';
import { getSettings } from '@/lib/settingsStore';

// Dev-only TDS Gallery route — `import.meta.env.DEV` is statically replaced
// (true in dev, false in prod) so the entire import + Route is tree-shaken
// from production builds. Verify with: `grep -r "TdsGallery" dist/` → empty.
const DevTdsGallery = import.meta.env.DEV
  ? lazy(() => import('./pages/__TdsGallery'))
  : null;

export default function App() {
  const location = useLocation();

  // 최초 진입 분기: 온보딩 미완료면 어느 경로로 들어와도 설정(온보딩)을 먼저 보여준다.
  // Navigate 리다이렉트 대신 SettingsPage를 직접 렌더 — 설정 저장(onboarded=true) 시
  // 자연스럽게 요청 경로가 드러난다. /settings 경로 자체는 정상 흐름으로 통과시킨다.
  if (!getSettings().onboarded && location.pathname !== '/settings') {
    return <SettingsPage />;
  }

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/record" element={<RecordPage />} />
      <Route path="/sleep-type" element={<SleepTypePage />} />
      <Route path="/report" element={<ReportPage />} />
      <Route path="/plan" element={<PlanPage />} />
      <Route path="/settings" element={<SettingsPage />} />
      {DevTdsGallery && (
        <Route
          path="/__tds-gallery"
          element={
            <Suspense fallback={null}>
              <DevTdsGallery />
            </Suspense>
          }
        />
      )}
    </Routes>
  );
}
