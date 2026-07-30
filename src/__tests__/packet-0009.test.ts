import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { screen, fireEvent } from "@testing-library/react";
import { mockAll } from "@/__tests__/__helpers__/mocks";
import { renderWithRouter } from "@/__tests__/__helpers__/test-utils";

// ============================================================================
// PACKET 0009: 수면 유형 진단 페이지 (`/sleep-type`)
// ============================================================================
// 5문항(각 "아침형이에요"/"저녁형이에요" Chip 중 택1, 각 20점/0점) 응답 후
// "결과 보기"를 누르면 합산 점수(0~100)를 calcSleepType으로 판정해
// saveSleepType에 저장한다(≥70 morning/≤30 evening/그 외 intermediate).
// 재방문 시 getSleepType()이 값을 반환하면 설문 없이 결과 카드를 즉시
// 보여주고 "다시 진단하기"로 재응시할 수 있다. 문항 5개는 각각
// `role="listitem"`(ListRow) 이며, 각 listitem 안에 "아침형이에요"/
// "저녁형이에요" Chip(button)이 정확히 1개씩 존재한다 — 5개 문항의 같은
// 방향 Chip은 getAllByRole(... name)로 인덱스 순서대로 조회한다.

mockAll();

const mockGetSleepType = vi.fn();
const mockSaveSleepType = vi.fn();
vi.mock("@/lib/settingsStore", () => ({
  getSleepType: () => mockGetSleepType(),
  saveSleepType: (...args: unknown[]) => mockSaveSleepType(...args),
}));

import SleepTypePage from "@/pages/SleepTypePage";

// 5문항 모두 answers(0~4) 방향으로 응답한다. answers[i] === "morning"이면
// i번째 문항에서 "아침형이에요"(20점) Chip을, "evening"이면 "저녁형이에요"(0점) Chip을 클릭한다.
function answerAll(answers: Array<"morning" | "evening">) {
  const morningChips = screen.getAllByRole("button", { name: "아침형이에요" });
  const eveningChips = screen.getAllByRole("button", { name: "저녁형이에요" });
  answers.forEach((dir, i) => {
    fireEvent.click(dir === "morning" ? morningChips[i] : eveningChips[i]);
  });
}

describe("수면 유형 진단 페이지 (`/sleep-type`)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSleepType.mockReturnValue(null);
    mockSaveSleepType.mockReturnValue({ ok: true });
  });

  // ── AC-1[P0]: 5문항 응답 → calcSleepType 판정 + saveSleepType 저장 ──
  describe("AC-1[P0]: 5문항 모두 응답 후 '결과 보기' 탭 시 합산 점수로 유형을 판정해 저장한다", () => {
    it("5문항 모두 '아침형이에요' 선택(합 100점) → morning 판정, saveSleepType({type:'morning',score:100,...}) 호출", () => {
      renderWithRouter(React.createElement(SleepTypePage));

      answerAll(["morning", "morning", "morning", "morning", "morning"]);
      fireEvent.click(screen.getByRole("button", { name: "결과 보기" }));

      expect(mockSaveSleepType).toHaveBeenCalledTimes(1);
      const saved = mockSaveSleepType.mock.calls[0][0];
      expect(saved.type).toBe("morning");
      expect(saved.score).toBe(100);
    });

    it("5문항 모두 '저녁형이에요' 선택(합 0점) → evening 판정, saveSleepType({type:'evening',score:0,...}) 호출", () => {
      renderWithRouter(React.createElement(SleepTypePage));

      answerAll(["evening", "evening", "evening", "evening", "evening"]);
      fireEvent.click(screen.getByRole("button", { name: "결과 보기" }));

      expect(mockSaveSleepType).toHaveBeenCalledTimes(1);
      const saved = mockSaveSleepType.mock.calls[0][0];
      expect(saved.type).toBe("evening");
      expect(saved.score).toBe(0);
    });

    it("아침형 3 + 저녁형 2 선택(합 60점) → intermediate 판정, saveSleepType({type:'intermediate',score:60,...}) 호출", () => {
      renderWithRouter(React.createElement(SleepTypePage));

      answerAll(["morning", "morning", "morning", "evening", "evening"]);
      fireEvent.click(screen.getByRole("button", { name: "결과 보기" }));

      expect(mockSaveSleepType).toHaveBeenCalledTimes(1);
      const saved = mockSaveSleepType.mock.calls[0][0];
      expect(saved.type).toBe("intermediate");
      expect(saved.score).toBe(60);
    });
  });

  // ── AC-2[P0]: 결과 재열람 — 저장된 결과 있으면 설문 없이 즉시 표시 ──
  describe("AC-2[P0]: getSleepType() 존재 시 설문 없이 저장된 결과 카드를 즉시 표시한다", () => {
    it("getSleepType이 morning/85점 결과를 반환하면 listitem 문항 없이 type-result-card와 '다시 진단하기' 버튼이 바로 보인다", () => {
      mockGetSleepType.mockReturnValue({ type: "morning", score: 85, answeredAt: 1753900000000 });
      renderWithRouter(React.createElement(SleepTypePage));

      expect(screen.queryAllByRole("listitem")).toHaveLength(0);
      const card = screen.getByTestId("type-result-card");
      expect(card.textContent).toContain("85");
      expect(screen.getByRole("button", { name: "다시 진단하기" })).not.toBeNull();
      expect(mockSaveSleepType).not.toHaveBeenCalled();
    });

    it("getSleepType이 null이면 결과 카드 대신 5문항 설문(listitem 5개)이 보인다", () => {
      mockGetSleepType.mockReturnValue(null);
      renderWithRouter(React.createElement(SleepTypePage));

      expect(screen.queryByTestId("type-result-card")).toBeNull();
      expect(screen.getAllByRole("listitem")).toHaveLength(5);
    });
  });

  // ── AC-3[P1]: 미완료 응답 → '결과 보기' 비활성, 결과 미생성 ──
  describe("AC-3[P1]: 문항 중 1개 이상 미응답이면 '결과 보기'가 비활성화되어 결과가 생성되지 않는다", () => {
    it("아무 문항도 응답하지 않은 초기 상태에서 '결과 보기' 버튼이 disabled다", () => {
      renderWithRouter(React.createElement(SleepTypePage));

      const cta = screen.getByRole("button", { name: "결과 보기" });
      expect(cta.hasAttribute("disabled")).toBe(true);
    });

    it("5문항 중 3문항만 응답하면 '결과 보기'가 여전히 disabled이고 saveSleepType이 호출되지 않는다", () => {
      renderWithRouter(React.createElement(SleepTypePage));

      answerAll(["morning", "morning", "evening"]);

      const cta = screen.getByRole("button", { name: "결과 보기" });
      expect(cta.hasAttribute("disabled")).toBe(true);
      expect(mockSaveSleepType).not.toHaveBeenCalled();
    });
  });

  // ── AC-4[P1]: 진행률 표시 "n/5" ──
  describe("AC-4[P1]: 응답한 문항 수를 'n/5' 형태 진행률로 표시한다", () => {
    it("0문항 응답 시 '0/5', 3문항 응답 시 '3/5'가 화면에 표시된다", () => {
      renderWithRouter(React.createElement(SleepTypePage));

      expect(screen.getByText("0/5")).not.toBeNull();

      answerAll(["morning", "evening", "morning"]);

      expect(screen.getByText("3/5")).not.toBeNull();
      expect(screen.queryByText("0/5")).toBeNull();
    });
  });

  // ── AC-5[P1]: 레이아웃 — type-result-card에 유형명/점수/설명 포함 ──
  describe("AC-5[P1]: 결과 카드는 유형명·점수·한 줄 설명을 포함한다", () => {
    it("evening/20점 결과 카드는 '저녁형' 유형명과 '20'점, 설명 텍스트를 함께 포함한다", () => {
      mockGetSleepType.mockReturnValue({ type: "evening", score: 20, answeredAt: 1753900000000 });
      renderWithRouter(React.createElement(SleepTypePage));

      const card = screen.getByTestId("type-result-card");
      expect(card.textContent).toContain("저녁형");
      expect(card.textContent).toContain("20");
      expect(card.textContent?.length).toBeGreaterThan("저녁형20".length);
    });
  });

  // ── 레이아웃 골격: 버튼 중첩 없음 + '통계 기반 참고용' 고지 ──
  describe("레이아웃 골격 검증", () => {
    it("결과 화면에는 '통계 기반 참고용' 고지 문구가 있고 어떤 button도 다른 button을 포함하지 않는다", () => {
      mockGetSleepType.mockReturnValue({ type: "morning", score: 90, answeredAt: 1753900000000 });
      const { container } = renderWithRouter(React.createElement(SleepTypePage));

      expect(screen.getByText(/통계 기반 참고용/)).not.toBeNull();
      container.querySelectorAll("button").forEach((btn) => {
        expect(btn.querySelector("button")).toBeNull();
      });
    });
  });
});
