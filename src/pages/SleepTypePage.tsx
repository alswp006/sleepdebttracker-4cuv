import { useState } from "react";
import { Top, ListRow, Paragraph, Spacing, Chip, ChipItem, Button, Badge } from "@toss/tds-mobile";
import { generateHapticFeedback } from "@apps-in-toss/web-framework";
import { getSleepType, saveSleepType } from "@/lib/settingsStore";
import { calcSleepType } from "@/lib/calc";
import type { SleepTypeResult } from "@/lib/types";
import { ScreenScaffold } from "@/components/ScreenScaffold";
import { Card } from "@/components/Card";
import { SubmitFooter } from "@/components/BottomCTA";

const QUESTIONS = [
  "아침에 눈뜨자마자 몸이 가볍게 움직여요",
  "저녁 9시 이후에 오히려 집중이 잘돼요",
  "주말에도 평소와 비슷한 시간에 잠에서 깨요",
  "밤늦게 활동해도 다음날 컨디션이 괜찮아요",
  "약속은 오전보다 오후 늦게 잡는 게 편해요",
];

const TYPE_LABEL: Record<SleepTypeResult["type"], string> = {
  morning: "아침형",
  evening: "저녁형",
  intermediate: "중간형",
};

const TYPE_DESC: Record<SleepTypeResult["type"], string> = {
  morning: "아침에 컨디션이 가장 좋은 편이에요",
  evening: "저녁에 집중력이 오르는 편이에요",
  intermediate: "아침저녁 컨디션 차이가 크지 않은 편이에요",
};

type Direction = "morning" | "evening";

function safeHaptic(type: "success" | "tickWeak") {
  try {
    Promise.resolve(generateHapticFeedback({ type })).catch(() => {});
  } catch {
    /* WebView 밖에서는 throw — 무시 */
  }
}

export default function SleepTypePage() {
  const [result, setResult] = useState<SleepTypeResult | null>(() => getSleepType());
  const [answers, setAnswers] = useState<Array<Direction | null>>(
    Array(QUESTIONS.length).fill(null),
  );

  const answeredCount = answers.filter((a) => a !== null).length;
  const complete = answeredCount === QUESTIONS.length;

  const top = <Top title={<Top.TitleParagraph>수면 유형 진단</Top.TitleParagraph>} />;

  const selectAnswer = (index: number, direction: Direction) => {
    safeHaptic("tickWeak");
    setAnswers((prev) => {
      const next = [...prev];
      next[index] = direction;
      return next;
    });
  };

  const handleSubmit = () => {
    const score = answers.filter((a) => a === "morning").length * 20;
    const next: SleepTypeResult = { type: calcSleepType(score), score, answeredAt: Date.now() };
    saveSleepType(next);
    setResult(next);
  };

  const restart = () => {
    setAnswers(Array(QUESTIONS.length).fill(null));
    setResult(null);
  };

  if (result) {
    return (
      <ScreenScaffold top={top}>
        <Card testId="type-result-card">
          <Paragraph.Text typography="t2">{TYPE_LABEL[result.type]}</Paragraph.Text>
          <Spacing size={8} />
          <Badge size="medium" variant="weak" color="blue">
            {`${result.score}점`}
          </Badge>
          <Spacing size={8} />
          <Paragraph.Text typography="st4">{TYPE_DESC[result.type]}</Paragraph.Text>
        </Card>
        <Spacing size={12} />
        <Paragraph.Text typography="st11" color="secondary">
          통계 기반 참고용이에요
        </Paragraph.Text>
        <Spacing size={20} />
        <Button variant="weak" display="block" onClick={restart}>
          다시 진단하기
        </Button>
      </ScreenScaffold>
    );
  }

  return (
    <ScreenScaffold
      top={top}
      bottom={<SubmitFooter label="결과 보기" onClick={handleSubmit} disabled={!complete} />}
    >
      <Paragraph.Text typography="st11" color="secondary">
        {`${answeredCount}/${QUESTIONS.length}`}
      </Paragraph.Text>
      <Spacing size={12} />
      {QUESTIONS.map((question, i) => (
        <div key={question}>
          <ListRow
            contents={<ListRow.Texts type="1RowTypeA" top={question} />}
            right={
              <Chip>
                <ChipItem
                  selected={answers[i] === "morning"}
                  onClick={() => selectAnswer(i, "morning")}
                >
                  아침형이에요
                </ChipItem>
                <ChipItem
                  selected={answers[i] === "evening"}
                  onClick={() => selectAnswer(i, "evening")}
                >
                  저녁형이에요
                </ChipItem>
              </Chip>
            }
          />
          <Spacing size={8} />
        </div>
      ))}
    </ScreenScaffold>
  );
}
