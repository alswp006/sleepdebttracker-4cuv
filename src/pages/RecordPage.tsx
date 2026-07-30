import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Top,
  ListRow,
  BottomSheet,
  Paragraph,
  Spacing,
  Button,
  Toast,
  AlertDialog,
} from "@toss/tds-mobile";
import { generateHapticFeedback } from "@apps-in-toss/web-framework";
import type { RouteState } from "@/lib/types";
import { useTodayRecord } from "@/hooks/useTodayRecord";
import { saveRecord } from "@/lib/records";
import { updateStreak } from "@/lib/streak";
import { calcSleepMin, calcDeficit, TARGET_SLEEP_MIN } from "@/lib/calc";
import { formatNumber } from "@/lib/utils";
import { ScreenScaffold } from "@/components/ScreenScaffold";
import { SubmitFooter } from "@/components/BottomCTA";
import { Card } from "@/components/Card";

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, "0"));

type SheetTarget = "bed" | "wake" | null;

function safeHaptic(type: "tickWeak" | "success") {
  try {
    Promise.resolve(generateHapticFeedback({ type })).catch(() => {});
  } catch {
    /* WebView 밖(브라우저/검수자 PC/jsdom)에서는 throw — 무시 */
  }
}

export default function RecordPage() {
  const navigate = useNavigate();
  const today = useTodayRecord();

  const [bedTime, setBedTime] = useState(today.bedTime);
  const [wakeTime, setWakeTime] = useState(today.wakeTime);
  const isEdit = today.isEdit;

  const [sheetTarget, setSheetTarget] = useState<SheetTarget>(null);
  const [draftHour, setDraftHour] = useState("00");
  const [draftMinute, setDraftMinute] = useState("00");

  const [error, setError] = useState("");
  const [quotaOpen, setQuotaOpen] = useState(false);
  const [toastOpen, setToastOpen] = useState(false);

  function openSheet(target: "bed" | "wake") {
    const current = target === "bed" ? bedTime : wakeTime;
    const [h, m] = current ? current.split(":") : ["00", "00"];
    setDraftHour(h);
    setDraftMinute(m);
    setSheetTarget(target);
  }

  function confirmSheet() {
    const value = `${draftHour}:${draftMinute}`;
    if (sheetTarget === "bed") setBedTime(value);
    if (sheetTarget === "wake") setWakeTime(value);
    setSheetTarget(null);
    setError("");
    safeHaptic("tickWeak");
  }

  let deficitPreview: number | null = null;
  if (bedTime && wakeTime) {
    try {
      const actualSleepMin = calcSleepMin(bedTime, wakeTime);
      deficitPreview = calcDeficit(TARGET_SLEEP_MIN, actualSleepMin);
    } catch {
      deficitPreview = null;
    }
  }

  function handleSubmit() {
    if (!bedTime || !wakeTime) {
      setError("취침·기상 시간을 모두 선택해주세요");
      return;
    }

    try {
      const result = saveRecord({ date: today.date, bedTime, wakeTime });
      if (!result.ok) {
        setQuotaOpen(true);
        return;
      }
      updateStreak(today.date);
      setError("");
      safeHaptic("success");
      setToastOpen(true);
      navigate("/", { state: { savedDate: today.date } as RouteState["/"] });
    } catch {
      setError("수면 시간을 확인해주세요");
    }
  }

  return (
    <ScreenScaffold
      top={<Top title={<Top.TitleParagraph>오늘 수면 기록</Top.TitleParagraph>} />}
      bottom={<SubmitFooter label={isEdit ? "수정하기" : "저장하기"} onClick={handleSubmit} />}
    >
      <Spacing size={16} />
      <ListRow
        data-testid="bedtime-row"
        onClick={() => openSheet("bed")}
        contents={
          <ListRow.Texts
            type="2RowTypeA"
            top="취침 시간"
            bottom={bedTime || "취침 시간을 선택해주세요"}
          />
        }
        right={<Paragraph.Text typography="st11">변경</Paragraph.Text>}
      />
      <ListRow
        data-testid="waketime-row"
        onClick={() => openSheet("wake")}
        contents={
          <ListRow.Texts
            type="2RowTypeA"
            top="기상 시간"
            bottom={wakeTime || "기상 시간을 선택해주세요"}
          />
        }
        right={<Paragraph.Text typography="st11">변경</Paragraph.Text>}
      />

      {deficitPreview !== null && (
        <>
          <Spacing size={20} />
          <Card testId="deficit-preview">
            <Paragraph.Text typography="t2">
              {`오늘 부채 ${formatNumber(deficitPreview)}분`}
            </Paragraph.Text>
          </Card>
        </>
      )}

      {error && (
        <>
          <Spacing size={12} />
          <Paragraph.Text typography="st12">{error}</Paragraph.Text>
        </>
      )}

      <BottomSheet open={sheetTarget !== null} onClose={() => setSheetTarget(null)}>
        <BottomSheet.Header>{sheetTarget === "bed" ? "취침 시간" : "기상 시간"}</BottomSheet.Header>
        <div style={{ display: "flex", gap: 8, padding: "16px 0" }}>
          <select
            data-testid="hour-select"
            value={draftHour}
            onChange={(e) => setDraftHour(e.target.value)}
          >
            {HOURS.map((h) => (
              <option key={h} value={h}>
                {h}
              </option>
            ))}
          </select>
          <select
            data-testid="minute-select"
            value={draftMinute}
            onChange={(e) => setDraftMinute(e.target.value)}
          >
            {MINUTES.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
        <Button variant="fill" display="block" data-testid="sheet-confirm" onClick={confirmSheet}>
          확인
        </Button>
      </BottomSheet>

      <AlertDialog
        open={quotaOpen}
        title="저장 공간이 부족해요"
        description="오래된 기록을 정리해주세요"
        onClose={() => setQuotaOpen(false)}
        alertButton={
          <AlertDialog.AlertButton onClick={() => setQuotaOpen(false)}>
            닫기
          </AlertDialog.AlertButton>
        }
      />

      <Toast open={toastOpen} text="기록이 저장됐어요" position="bottom" />
    </ScreenScaffold>
  );
}
