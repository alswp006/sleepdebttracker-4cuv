import { useState } from "react";
import { Top, ListRow, Paragraph, Spacing, Toast, Asset } from "@toss/tds-mobile";
import { useDashboard } from "@/hooks/useDashboard";
import { useReward } from "@/hooks/useReward";
import { calcWeekendRecoveryPlan } from "@/lib/calc";
import { ScreenScaffold } from "@/components/ScreenScaffold";
import { Card } from "@/components/Card";
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

function PlanCards({ saturdayMin, sundayMin }: { saturdayMin: number; sundayMin: number }) {
  return (
    <>
      <Card testId="plan-card">
        <ListRow
          contents={<ListRow.Texts type="2RowTypeA" top="토요일" bottom={`+${saturdayMin}분`} />}
        />
      </Card>
      <Spacing size={12} />
      <Card testId="plan-card">
        <ListRow
          contents={<ListRow.Texts type="2RowTypeA" top="일요일" bottom={`+${sundayMin}분`} />}
        />
      </Card>
      <Spacing size={12} />
      <Paragraph.Text typography="st11" color="secondary">
        통계 기반 참고용이에요
      </Paragraph.Text>
      <Spacing size={24} />
      <AdSlot adGroupId={import.meta.env.VITE_TOSS_AD_GROUP_ID ?? ""} />
    </>
  );
}

export default function PlanPage() {
  const { loading, totalDebt } = useDashboard();
  const { unlockedToday, unlock } = useReward("plan");
  const [adErrorOpen, setAdErrorOpen] = useState(false);

  const top = <Top title={<Top.TitleParagraph>회복 플랜</Top.TitleParagraph>} />;

  if (loading) {
    return (
      <ScreenScaffold top={top}>
        <LoadingState rows={4} />
      </ScreenScaffold>
    );
  }

  const { saturdayMin, sundayMin } = calcWeekendRecoveryPlan(totalDebt);

  return (
    <ScreenScaffold top={top}>
      {totalDebt === 0 ? (
        <EmptyState
          icon={<Asset.ContentIcon name="iconMoonRegular" alt="수면 부채 없음" style={{ width: 32, height: 32 }} />}
          title="수면 부채가 없어요! 지금 패턴을 유지하세요"
        />
      ) : unlockedToday ? (
        <PlanCards saturdayMin={saturdayMin} sundayMin={sundayMin} />
      ) : (
        <TossRewardAd
          slotId={import.meta.env.VITE_TOSS_AD_SLOT_ID ?? ""}
          buttonText="플랜 보기"
          onRewarded={unlock}
          onError={() => setAdErrorOpen(true)}
        >
          <PlanCards saturdayMin={saturdayMin} sundayMin={sundayMin} />
        </TossRewardAd>
      )}

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
