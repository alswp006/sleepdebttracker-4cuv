import { useState } from "react";
import { Top, Paragraph, Spacing, Button, Toast } from "@toss/tds-mobile";
import { generateHapticFeedback } from "@apps-in-toss/web-framework";
import { getSettings, saveSettings } from "@/lib/settingsStore";
import type { UserSettings } from "@/lib/types";
import { ScreenScaffold } from "@/components/ScreenScaffold";
import { Card } from "@/components/Card";
import { FloatingTabBar } from "@/components/FloatingTabBar";

const TAB_ITEMS = [
  { label: "홈", path: "/" },
  { label: "리포트", path: "/report" },
  { label: "플랜", path: "/plan" },
  { label: "설정", path: "/settings" },
];

const MIN_TARGET_SLEEP_MIN = 360;
const MAX_TARGET_SLEEP_MIN = 600;
const STEP_MIN = 10;

function safeHaptic(type: "success" | "tickWeak") {
  try {
    Promise.resolve(generateHapticFeedback({ type })).catch(() => {});
  } catch {
    /* WebView 밖에서는 throw — 무시 */
  }
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<UserSettings>(() => getSettings());
  const [target, setTarget] = useState(settings.targetSleepMin);
  const [toastOpen, setToastOpen] = useState(false);

  const hours = Math.floor(target / 60);
  const mins = target % 60;

  const decrease = () => {
    safeHaptic("tickWeak");
    setTarget((prev) => Math.max(MIN_TARGET_SLEEP_MIN, prev - STEP_MIN));
  };

  const increase = () => {
    safeHaptic("tickWeak");
    setTarget((prev) => Math.min(MAX_TARGET_SLEEP_MIN, prev + STEP_MIN));
  };

  const handleSave = () => {
    safeHaptic("success");
    const next: UserSettings = { targetSleepMin: target, onboarded: settings.onboarded };
    saveSettings(next);
    setSettings(next);
    setToastOpen(true);
  };

  const handleOnboardingConfirm = () => {
    safeHaptic("success");
    const next: UserSettings = { targetSleepMin: target, onboarded: true };
    saveSettings(next);
    setSettings(next);
  };

  return (
    <ScreenScaffold top={<Top title={<Top.TitleParagraph>설정</Top.TitleParagraph>} />}>
      {!settings.onboarded && (
        <>
          <Card testId="onboarding-card">
            <Paragraph.Text typography="t5">
              수면 부채를 기록하고 회복 플랜을 받아보세요
            </Paragraph.Text>
            <Spacing size={4} />
            <Paragraph.Text typography="st11" color="secondary">
              목표 수면 시간은 아래에서 언제든 바꿀 수 있어요
            </Paragraph.Text>
            <Spacing size={16} />
            <Button
              variant="fill"
              display="block"
              style={{ minHeight: 44 }}
              onClick={handleOnboardingConfirm}
            >
              확인
            </Button>
          </Card>
          <Spacing size={16} />
        </>
      )}

      <Card>
        <Paragraph.Text typography="st11" color="secondary">
          목표 수면 시간
        </Paragraph.Text>
        <Spacing size={8} />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <Button
            data-testid="target-decrease"
            variant="weak"
            style={{ minWidth: 44, minHeight: 44 }}
            onClick={decrease}
          >
            −10분
          </Button>
          <div
            data-testid="target-value"
            style={{ display: "flex", flexDirection: "column", alignItems: "center" }}
          >
            <Paragraph.Text typography="t3">{`${hours}시간 ${mins}분`}</Paragraph.Text>
            <Paragraph.Text typography="st13" color="secondary">{`목표 ${target}분`}</Paragraph.Text>
          </div>
          <Button
            data-testid="target-increase"
            variant="weak"
            style={{ minWidth: 44, minHeight: 44 }}
            onClick={increase}
          >
            +10분
          </Button>
        </div>
      </Card>

      <Spacing size={16} />

      <Button
        variant="fill"
        display="block"
        style={{ minHeight: 44 }}
        onClick={handleSave}
      >
        저장
      </Button>

      <Spacing size={24} />

      <Toast
        open={toastOpen}
        text="목표를 저장했어요"
        position="bottom"
        onClose={() => setToastOpen(false)}
      />

      <FloatingTabBar items={TAB_ITEMS} />
    </ScreenScaffold>
  );
}
