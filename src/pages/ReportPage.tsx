import { useState } from "react";
import { Top, Paragraph, Spacing, Asset, Toast } from "@toss/tds-mobile";
import { useWeeklyReport } from "@/hooks/useWeeklyReport";
import { useReward } from "@/hooks/useReward";
import { ScreenScaffold } from "@/components/ScreenScaffold";
import { Card } from "@/components/Card";
import { MiniBar } from "@/components/MiniBar";
import { Amount } from "@/components/Amount";
import { EmptyState, LoadingState } from "@/components/StateView";
import { TossRewardAd } from "@/components/TossRewardAd";
import { AdSlot } from "@/components/AdSlot";
import { FloatingTabBar } from "@/components/FloatingTabBar";

const TAB_ITEMS = [
  { label: "홈", path: "/" },
  { label: "리포트", path: "/report" },
  { label: "플랜", path: "/plan" },
  { label: "설정", path: "/settings" },
];

function formatMinutesToHM(totalMin: number): string {
  const clamped = Math.max(0, Math.round(totalMin));
  const hours = Math.floor(clamped / 60);
  const minutes = clamped % 60;
  return `${hours}시간 ${minutes}분`;
}

function WeeklyChart({ weeklyDeficits }: { weeklyDeficits: number[] }) {
  const maxVal = Math.max(...weeklyDeficits, 1);
  return (
    <Card testId="weekly-chart">
      <Paragraph.Text typography="st11">최근 7일 부채</Paragraph.Text>
      <Spacing size={12} />
      <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
        {weeklyDeficits.map((value, i) => (
          <MiniBar key={i} ratio={value / maxVal} />
        ))}
      </div>
    </Card>
  );
}

function WeeklySummary({ totalDeficitMin }: { totalDeficitMin: number }) {
  return (
    <Card testId="weekly-summary">
      <Paragraph.Text typography="st11">주간 합계</Paragraph.Text>
      <Spacing size={4} />
      <Amount value={totalDeficitMin} unit="분" typography="t2" />
      <Spacing size={4} />
      <Paragraph.Text typography="st13">{formatMinutesToHM(totalDeficitMin)}</Paragraph.Text>
    </Card>
  );
}

export default function ReportPage() {
  const { loading, recordCount, weeklyDeficits, totalDeficitMin } = useWeeklyReport();
  const { unlockedToday, unlock } = useReward("report");
  const [adErrorOpen, setAdErrorOpen] = useState(false);

  const top = <Top title={<Top.TitleParagraph>주간 리포트</Top.TitleParagraph>} />;

  if (loading) {
    return (
      <ScreenScaffold top={top}>
        <LoadingState rows={4} />
      </ScreenScaffold>
    );
  }

  const isEmpty = recordCount === 0;

  return (
    <ScreenScaffold top={top}>
      {isEmpty ? (
        <EmptyState
          icon={<Asset.ContentIcon name="iconChartLineRegular" alt="리포트" style={{ width: 32, height: 32 }} />}
          title="기록이 쌓이면 리포트를 볼 수 있어요"
        />
      ) : unlockedToday ? (
        <>
          <WeeklyChart weeklyDeficits={weeklyDeficits} />
          <Spacing size={12} />
          <WeeklySummary totalDeficitMin={totalDeficitMin} />
        </>
      ) : (
        <TossRewardAd
          slotId={import.meta.env.VITE_TOSS_AD_SLOT_ID ?? ""}
          buttonText="리포트 보기"
          onRewarded={unlock}
          onError={() => setAdErrorOpen(true)}
        >
          <WeeklyChart weeklyDeficits={weeklyDeficits} />
          <Spacing size={12} />
          <WeeklySummary totalDeficitMin={totalDeficitMin} />
        </TossRewardAd>
      )}

      <Spacing size={24} />
      <AdSlot adGroupId={import.meta.env.VITE_TOSS_AD_GROUP_ID ?? ""} />

      <Toast
        open={adErrorOpen}
        text="광고를 불러오지 못했어요. 잠시 후 다시 시도해주세요"
        position="bottom"
        onClose={() => setAdErrorOpen(false)}
      />

      <FloatingTabBar items={TAB_ITEMS} />
    </ScreenScaffold>
  );
}
