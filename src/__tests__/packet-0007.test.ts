import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { screen, fireEvent } from "@testing-library/react";
import { mockAll } from "@/__tests__/__helpers__/mocks";
import { renderWithRouter } from "@/__tests__/__helpers__/test-utils";

// ============================================================================
// PACKET 0007: 주간 리포트 페이지 (`/report`, 리워드 게이팅)
// ============================================================================
// 최근 7일 부채 차트 + 주간 합계를 리워드 광고 게이팅 뒤에 제공한다.
// useReward('report')로 당일 해금 여부를 판정하고, 미해금이면 TossRewardAd
// 시청 완료 시 차트를 공개하고 unlock()을 저장한다. 광고 실패는 Toast로
// 안내하고 화면은 그대로 유지한다(리포트 미공개). 데이터 계산은
// useWeeklyReport 훅에 위임(Home/useDashboard와 동일한 분리 패턴)하고,
// 이 패킷은 ReportPage의 조립/분기 로직만 격리 테스트한다.

mockAll();

const mockUseWeeklyReport = vi.fn();
vi.mock("@/hooks/useWeeklyReport", () => ({
  useWeeklyReport: () => mockUseWeeklyReport(),
}));

const mockUnlock = vi.fn();
const mockUseReward = vi.fn();
vi.mock("@/hooks/useReward", () => ({
  useReward: (kind: string) => mockUseReward(kind),
}));

// TossRewardAd 재구현: 실제 컴포넌트와 동일한 계약(onRewarded 시 children으로
// 스왑)을 유지하되, onError 트리거용 버튼을 추가로 노출해 광고 실패 분기를
// 결정론적으로 재현한다(실제 SDK 타이머에 의존하지 않음).
vi.mock("@/components/TossRewardAd", () => ({
  TossRewardAd: (props: any) => {
    const [unlocked, setUnlocked] = React.useState(false);
    if (unlocked) return props.children;
    return React.createElement(
      "div",
      { "data-testid": "reward-gate" },
      React.createElement(
        "button",
        {
          onClick: () => {
            setUnlocked(true);
            props.onRewarded?.();
          },
        },
        props.buttonText ?? "주간 리포트 보기",
      ),
      React.createElement(
        "button",
        { "data-testid": "simulate-ad-error", onClick: () => props.onError?.() },
        "광고 실패 시뮬레이션",
      ),
    );
  },
}));

import ReportPage from "@/pages/ReportPage";

interface WeeklyReportShape {
  loading: boolean;
  recordCount: number;
  weeklyDeficits: number[];
  totalDeficitMin: number;
}

function setWeeklyReport(overrides: Partial<WeeklyReportShape> = {}) {
  const value: WeeklyReportShape = {
    loading: false,
    recordCount: 7,
    weeklyDeficits: [60, 60, 60, 60, 60, 60, 60],
    totalDeficitMin: 420,
    ...overrides,
  };
  mockUseWeeklyReport.mockReturnValue(value);
  return value;
}

function setReward(overrides: { unlockedToday?: boolean } = {}) {
  mockUseReward.mockReturnValue({
    unlockedToday: overrides.unlockedToday ?? false,
    unlock: mockUnlock,
  });
}

describe("주간 리포트 페이지 (`/report`, 리워드 게이팅)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setWeeklyReport();
    setReward({ unlockedToday: false });
  });

  // ── AC-1[P0]: 미해금 → TossRewardAd 시청 완료 시 차트 공개 + unlock 저장 ──
  describe("AC-1[P0]: 오늘 미해금이면 광고 게이트를 보여주고 시청 완료 시 차트를 공개한다", () => {
    it("미해금 상태에서는 weekly-chart가 숨겨지고 '리포트 보기' 버튼이 노출된다", () => {
      renderWithRouter(React.createElement(ReportPage));

      expect(screen.queryByTestId("weekly-chart")).toBeNull();
      const cta = screen.getByRole("button", { name: /리포트 보기/ });
      expect(cta.tagName).toBe("BUTTON");
    });

    it("광고 시청 완료 버튼을 누르면 차트가 렌더되고 unlock()이 정확히 1회 호출된다", () => {
      renderWithRouter(React.createElement(ReportPage));

      fireEvent.click(screen.getByRole("button", { name: /리포트 보기/ }));

      expect(screen.getByTestId("weekly-chart")).not.toBeNull();
      expect(mockUnlock).toHaveBeenCalledTimes(1);
    });
  });

  // ── AC-2[P0]: 당일 재열람 — 광고 없이 즉시 차트 ──
  describe("AC-2[P0]: getRewardUnlock().report===오늘이면 광고 없이 즉시 차트를 표시한다", () => {
    it("이미 해금된 상태로 진입하면 reward-gate 없이 weekly-chart가 바로 보이고 unlock은 호출되지 않는다", () => {
      setReward({ unlockedToday: true });
      renderWithRouter(React.createElement(ReportPage));

      expect(screen.queryByTestId("reward-gate")).toBeNull();
      expect(screen.getByTestId("weekly-chart")).not.toBeNull();
      expect(mockUnlock).not.toHaveBeenCalled();
    });
  });

  // ── AC-3[P0]: 주간 차트 데이터 정확성 — 막대 7개 비례 + 합계 '6시간 0분' ──
  describe("AC-3[P0]: 막대 7개가 값에 비례해 표시되고 주간 합계가 정확히 표기된다", () => {
    it("deficitMin [60,120,0,60,60,0,60] → 막대 7개 + 합계 '6시간 0분'(360분)", () => {
      setReward({ unlockedToday: true });
      setWeeklyReport({
        recordCount: 7,
        weeklyDeficits: [60, 120, 0, 60, 60, 0, 60],
        totalDeficitMin: 360,
      });
      renderWithRouter(React.createElement(ReportPage));

      const chart = screen.getByTestId("weekly-chart");
      const bars = chart.querySelectorAll('[role="progressbar"]');
      expect(bars).toHaveLength(7);

      const values = Array.from(bars).map((b) => Number(b.getAttribute("aria-valuenow")));
      expect(values[1]).toBeGreaterThan(values[0]); // 120분 > 60분
      expect(values[2]).toBeLessThan(values[0]); // 0분 < 60분
      expect(values[0]).toBe(values[3]); // 60분 === 60분

      expect(screen.getByTestId("weekly-summary").textContent).toContain("6시간 0분");
    });
  });

  // ── AC-4[P1]: 최근 7일 기록 0건 → 빈 상태, 광고 트리거 미노출 ──
  describe("AC-4[P1]: 최근 7일 기록이 0건이면 빈 상태를 보여주고 광고 트리거는 노출하지 않는다", () => {
    it("recordCount가 0이면 안내 문구가 보이고 리포트 보기 버튼/reward-gate가 없다", () => {
      setWeeklyReport({ recordCount: 0, weeklyDeficits: [0, 0, 0, 0, 0, 0, 0], totalDeficitMin: 0 });
      renderWithRouter(React.createElement(ReportPage));

      expect(screen.getByText("기록이 쌓이면 리포트를 볼 수 있어요")).not.toBeNull();
      expect(screen.queryByTestId("reward-gate")).toBeNull();
      expect(screen.queryByRole("button", { name: /리포트 보기/ })).toBeNull();
      expect(screen.queryByTestId("weekly-chart")).toBeNull();
    });
  });

  // ── AC-5[P1]: 광고 실패 → Toast, 미공개, 화면 유지 ──
  describe("AC-5[P1]: 광고 로드/시청 실패 시 Toast로 안내하고 리포트는 공개하지 않는다", () => {
    it("광고 실패 시 Toast 문구가 뜨고 weekly-chart는 렌더되지 않으며 unlock은 호출되지 않는다", () => {
      renderWithRouter(React.createElement(ReportPage));

      fireEvent.click(screen.getByTestId("simulate-ad-error"));

      const toast = screen.getByRole("status");
      expect(toast.textContent).toContain("광고를 불러오지 못했어요");
      expect(toast.textContent).toContain("잠시 후 다시 시도해주세요");
      expect(screen.queryByTestId("weekly-chart")).toBeNull();
      expect(mockUnlock).not.toHaveBeenCalled();
    });
  });

  // ── AC-6[P1]: 계산 중 차트 스켈레톤 ──
  describe("AC-6[P1]: 리포트 계산 중에는 차트 대신 스켈레톤을 보여준다", () => {
    it("loading=true면 aria-busy 스켈레톤을 표시하고 weekly-chart/reward-gate는 렌더하지 않는다", () => {
      setWeeklyReport({ loading: true });
      const { container } = renderWithRouter(React.createElement(ReportPage));

      expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
      expect(screen.queryByTestId("weekly-chart")).toBeNull();
      expect(screen.queryByTestId("reward-gate")).toBeNull();
    });
  });

  // ── AC-7[P1]: 레이아웃 — weekly-chart/weekly-summary 카드 + AdSlot 1개 + 버튼 중첩 없음 ──
  describe("AC-7[P1]: 레이아웃 골격 검증", () => {
    it("weekly-chart/weekly-summary Card와 배너 AdSlot 1개가 차트 하단에 존재하고 버튼 중첩이 없다", () => {
      setReward({ unlockedToday: true });
      const { container } = renderWithRouter(React.createElement(ReportPage));

      const summary = screen.getByTestId("weekly-summary");
      const adSlots = container.querySelectorAll("[data-ad-group-id]");
      expect(adSlots).toHaveLength(1);
      expect(
        summary.compareDocumentPosition(adSlots[0]) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();

      container.querySelectorAll("button").forEach((btn) => {
        expect(btn.querySelector("button")).toBeNull();
      });
    });
  });
});
