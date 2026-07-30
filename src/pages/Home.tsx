import { useEffect, useState } from 'react';
import { Top, Paragraph, Spacing, Button, Toast } from '@toss/tds-mobile';
import { useLocation, useNavigate } from 'react-router-dom';
import { generateHapticFeedback } from '@apps-in-toss/web-framework';
import type { RouteState } from '@/lib/types';
import { useDashboard } from '@/hooks/useDashboard';
import { ScreenScaffold } from '../components/ScreenScaffold';
import { SummaryHero } from '../components/SummaryHero';
import { CountUp } from '../components/CountUp';
import { Card } from '../components/Card';
import { Sparkline } from '../components/Sparkline';
import { EmptyState, LoadingState } from '../components/StateView';
import { FloatingTabBar } from '../components/FloatingTabBar';
import { AdSlot } from '../components/AdSlot';

const TAB_ITEMS = [
  { label: '홈', path: '/' },
  { label: '리포트', path: '/report' },
  { label: '플랜', path: '/plan' },
  { label: '설정', path: '/settings' },
];

function formatMinutesToHM(totalMin: number): string {
  const clamped = Math.max(0, Math.round(totalMin));
  const hours = Math.floor(clamped / 60);
  const minutes = clamped % 60;
  return `${hours}시간 ${minutes}분`;
}

function safeHaptic() {
  try {
    Promise.resolve(generateHapticFeedback({ type: 'success' })).catch(() => {});
  } catch {
    /* WebView 밖에서는 throw — 무시 */
  }
}

export default function Home() {
  const navigate = useNavigate();
  const location = useLocation();
  const { loading, totalDebt, repayDays, weeklySeries, streak, records } = useDashboard();

  const [showCelebration, setShowCelebration] = useState(false);

  useEffect(() => {
    const state = (location.state as RouteState['/']) ?? undefined;
    if (state?.savedDate && streak.current > 0 && streak.current % 7 === 0) {
      setShowCelebration(true);
    }
    // 진입 시 1회만 판정 — 이후 재렌더에는 재실행하지 않는다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const goToRecord = () => {
    safeHaptic();
    navigate('/record');
  };

  if (loading) {
    return (
      <ScreenScaffold top={<Top title={<Top.TitleParagraph>수면 부채</Top.TitleParagraph>} />}>
        <LoadingState rows={4} />
      </ScreenScaffold>
    );
  }

  const isEmpty = records.length === 0;

  return (
    <ScreenScaffold top={<Top title={<Top.TitleParagraph>수면 부채</Top.TitleParagraph>} />}>
      <SummaryHero
        testId="debt-hero"
        label="누적 수면 부채"
        value={<CountUp value={totalDebt} typography="t2" format={formatMinutesToHM} />}
        caption="최근 14일 기준"
      />

      {!isEmpty && records.length >= 3 && (
        <>
          <Spacing size={16} />
          <Sparkline data={weeklySeries} />
        </>
      )}

      <Spacing size={16} />

      {isEmpty ? (
        <EmptyState
          title="첫 수면을 기록해보세요"
          description="취침·기상 시각만 입력하면 부채가 계산돼요"
          action={
            <Button variant="weak" display="block" onClick={goToRecord}>
              기록하기
            </Button>
          }
        />
      ) : (
        <>
          <Card testId="repay-card">
            <Paragraph.Text typography="st11">회복 예상</Paragraph.Text>
            <Spacing size={4} />
            <Paragraph.Text typography="t5">
              {Number.isFinite(repayDays) ? `회복까지 약 ${repayDays}일` : '회복까지 남은 기간을 계산할 수 없어요'}
            </Paragraph.Text>
          </Card>

          <Spacing size={12} />

          <Card testId="streak-card">
            <Paragraph.Text typography="st11">연속 기록</Paragraph.Text>
            <Spacing size={4} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Paragraph.Text typography="t5">🔥 {streak.current}일 연속</Paragraph.Text>
              <Paragraph.Text typography="st13">최고 {streak.best}일</Paragraph.Text>
            </div>
          </Card>

          <Spacing size={16} />

          <Button variant="fill" size="large" display="block" onClick={goToRecord}>
            오늘 기록하기
          </Button>
        </>
      )}

      <Spacing size={24} />
      <AdSlot adGroupId={import.meta.env.VITE_TOSS_AD_GROUP_ID ?? ''} />
      <Spacing size={16} />

      <Toast
        open={showCelebration}
        text={`${streak.current}일 연속 기록을 달성했어요`}
        position="bottom"
        onClose={() => setShowCelebration(false)}
      />

      <FloatingTabBar items={TAB_ITEMS} />
    </ScreenScaffold>
  );
}
