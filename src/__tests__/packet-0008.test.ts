import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { screen, fireEvent } from "@testing-library/react";
import { mockTds, mockAppsInToss, mockRouter } from "@/__tests__/__helpers__/mocks";
import { renderWithRouter } from "@/__tests__/__helpers__/test-utils";

// ============================================================================
// PACKET 0008: 회복 플랜 페이지 (`/plan`, 리워드 게이팅)
// ============================================================================
// 누적 부채 기반 주말(토/일) 회복 플랜을 규칙 기반으로 산출해 리워드 광고
// 게이팅 뒤에 제공한다. 부채 0이면 광고 트리거 대신 유지 안내를 보여주고,
// 미해금이면 TossRewardAd 완료 후 calcRecoveryPlan 기반 카드(토/일 분배,
// 하루 ≤120분)를 표시하며 setRewardUnlock('plan', 오늘)을 저장한다.
// 광고 실패는 Toast로 안내하고 화면(플랜 미공개)을 유지한다. 총 부채는
// 기존 useDashboard(totalDebt)를 재사용한다(Home과 동일한 계산 소스).

// NOTE: mockAll()의 mockTossRewardAd()는 아래에서 이 파일이 재정의하는
// TossRewardAd 전용 목(리워드 게이트 + 광고 실패 시뮬레이션 버튼)과 충돌하므로
// 이 화면 테스트에 필요한 목만 개별 호출한다(packet-0007과 동일 패턴).
mockTds();
mockAppsInToss();
mockRouter();

const mockUseDashboard = vi.fn();
vi.mock("@/hooks/useDashboard", () => ({
  useDashboard: () => mockUseDashboard(),
}));

const mockUnlock = vi.fn();
const mockUseReward = vi.fn();
vi.mock("@/hooks/useReward", () => ({
  useReward: (kind: string) => mockUseReward(kind),
}));

// TossRewardAd 재구현: onRewarded 시 children으로 스왑 + onError 트리거용 버튼 노출
// (실제 SDK 타이머에 의존하지 않고 광고 실패 분기를 결정론적으로 재현).
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
        props.buttonText ?? "플랜 보기",
      ),
      React.createElement(
        "button",
        { "data-testid": "simulate-ad-error", onClick: () => props.onError?.() },
        "광고 실패 시뮬레이션",
      ),
    );
  },
}));

import PlanPage from "@/pages/PlanPage";

interface DashboardShape {
  loading: boolean;
  totalDebt: number;
  repayDays: number;
  weeklySeries: number[];
  streak: { current: number; best: number; lastCheckDate: string };
  records: unknown[];
}

function setDashboard(overrides: Partial<DashboardShape> = {}) {
  const value: DashboardShape = {
    loading: false,
    totalDebt: 180,
    repayDays: 3,
    weeklySeries: [0, 0, 0, 0, 0, 0, 0],
    streak: { current: 0, best: 0, lastCheckDate: "" },
    records: [],
    ...overrides,
  };
  mockUseDashboard.mockReturnValue(value);
  return value;
}

function setReward(overrides: { unlockedToday?: boolean } = {}) {
  mockUseReward.mockReturnValue({
    unlockedToday: overrides.unlockedToday ?? false,
    unlock: mockUnlock,
  });
}

describe("회복 플랜 페이지 (`/plan`, 리워드 게이팅)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setDashboard();
    setReward({ unlockedToday: false });
  });

  // ── AC-1[P0]: 부채 0 → 광고 트리거 대신 유지 안내 ──
  describe("AC-1[P0]: totalDebt===0이면 광고 트리거 대신 유지 안내를 표시한다", () => {
    it("totalDebt가 0이면 '수면 부채가 없어요! 지금 패턴을 유지하세요' 문구가 보이고 리워드 게이트/플랜 카드는 없다", () => {
      setDashboard({ totalDebt: 0 });
      renderWithRouter(React.createElement(PlanPage));

      expect(screen.getByText("수면 부채가 없어요! 지금 패턴을 유지하세요")).not.toBeNull();
      expect(screen.queryByTestId("reward-gate")).toBeNull();
      expect(screen.queryByRole("button", { name: /플랜 보기/ })).toBeNull();
      expect(screen.queryAllByTestId("plan-card")).toHaveLength(0);
    });
  });

  // ── AC-2[P0]: 미해금 → 광고 완료 시 토/일 분배 플랜 카드 공개 + unlock 저장 ──
  describe("AC-2[P0]: 오늘 미해금이면 광고 게이트를 보여주고 시청 완료 시 토/일 플랜 카드를 공개한다", () => {
    it("미해금 상태에서는 plan-card가 숨겨지고 '플랜 보기' 버튼이 노출된다", () => {
      renderWithRouter(React.createElement(PlanPage));

      expect(screen.queryAllByTestId("plan-card")).toHaveLength(0);
      const cta = screen.getByRole("button", { name: /플랜 보기/ });
      expect(cta.tagName).toBe("BUTTON");
    });

    it("totalDebt 180분 상태에서 광고 시청 완료 시 plan-card 2개(토 120분/일 60분)가 표시되고 unlock()이 1회 호출된다", () => {
      setDashboard({ totalDebt: 180 });
      renderWithRouter(React.createElement(PlanPage));

      fireEvent.click(screen.getByRole("button", { name: /플랜 보기/ }));

      const cards = screen.getAllByTestId("plan-card");
      expect(cards).toHaveLength(2);
      expect(cards[0].textContent).toContain("토요일");
      expect(cards[0].textContent).toContain("120분");
      expect(cards[1].textContent).toContain("일요일");
      expect(cards[1].textContent).toContain("60분");
      expect(mockUnlock).toHaveBeenCalledTimes(1);
    });

    it("totalDebt 600분(상한 초과)이면 토/일 카드 모두 추가 회복 120분을 초과하지 않는다", () => {
      setDashboard({ totalDebt: 600 });
      renderWithRouter(React.createElement(PlanPage));

      fireEvent.click(screen.getByRole("button", { name: /플랜 보기/ }));

      const cards = screen.getAllByTestId("plan-card");
      expect(cards).toHaveLength(2);
      expect(cards[0].textContent).toContain("120분");
      expect(cards[1].textContent).toContain("120분");
      expect(cards[0].textContent).not.toMatch(/1[3-9]\d분|[2-9]\d\d분/);
    });
  });

  // ── AC-3[P1]: 당일 재열람 캐시 — 광고 없이 즉시 플랜 표시 ──
  describe("AC-3[P1]: getRewardUnlock().plan===오늘이면 광고 없이 즉시 플랜을 표시한다", () => {
    it("이미 해금된 상태로 진입하면 reward-gate 없이 plan-card 2개가 바로 보이고 unlock은 호출되지 않는다", () => {
      setReward({ unlockedToday: true });
      renderWithRouter(React.createElement(PlanPage));

      expect(screen.queryByTestId("reward-gate")).toBeNull();
      expect(screen.getAllByTestId("plan-card")).toHaveLength(2);
      expect(mockUnlock).not.toHaveBeenCalled();
    });
  });

  // ── AC-3(광고 실패)[P1]: Toast 안내, 미공개, 화면 유지 ──
  describe("AC-3[P1]: 광고 로드/시청 실패 시 Toast로 안내하고 플랜은 공개하지 않는다", () => {
    it("광고 실패 시 Toast 문구가 뜨고 plan-card는 렌더되지 않으며 unlock은 호출되지 않는다", () => {
      renderWithRouter(React.createElement(PlanPage));

      fireEvent.click(screen.getByTestId("simulate-ad-error"));

      const toast = screen.getByRole("status");
      expect(toast.textContent).toContain("광고를 불러오지 못했어요");
      expect(screen.queryAllByTestId("plan-card")).toHaveLength(0);
      expect(mockUnlock).not.toHaveBeenCalled();
    });
  });

  // ── AC-4[P1]: 규칙 기반 고지 + 레이아웃(배너 1개, 미겹침) ──
  describe("AC-4[P1]: 플랜 하단에 통계 기반 참고용 고지와 배너 광고 1개가 카드 아래 위치한다", () => {
    it("플랜 공개 시 '통계 기반 참고용' 고지 문구와 data-ad-group-id 배너가 정확히 1개 존재하며 plan-card 뒤에 위치한다", () => {
      setReward({ unlockedToday: true });
      const { container } = renderWithRouter(React.createElement(PlanPage));

      expect(screen.getByText(/통계 기반 참고용/)).not.toBeNull();

      const cards = screen.getAllByTestId("plan-card");
      const adSlots = container.querySelectorAll("[data-ad-group-id]");
      expect(adSlots).toHaveLength(1);
      expect(
        cards[cards.length - 1].compareDocumentPosition(adSlots[0]) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    });
  });

  // ── AC-5[P1]: CTA 터치 타겟 + 버튼 중첩 없음 ──
  describe("AC-5[P1]: '플랜 보기' CTA는 실제 button 요소이며 버튼 중첩이 없다", () => {
    it("'플랜 보기' 버튼은 <button> 태그이고 어떤 button도 다른 button을 포함하지 않는다", () => {
      const { container } = renderWithRouter(React.createElement(PlanPage));

      const cta = screen.getByRole("button", { name: /플랜 보기/ });
      expect(cta.tagName).toBe("BUTTON");

      container.querySelectorAll("button").forEach((btn) => {
        expect(btn.querySelector("button")).toBeNull();
      });
    });
  });

  // ── 추가: 계산 중 스켈레톤 표시 (spec S4: 로딩=스켈레톤) ──
  describe("로딩 중에는 게이트/카드 대신 스켈레톤을 보여준다", () => {
    it("loading=true면 aria-busy 스켈레톤을 표시하고 plan-card/reward-gate는 렌더하지 않는다", () => {
      setDashboard({ loading: true });
      const { container } = renderWithRouter(React.createElement(PlanPage));

      expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
      expect(screen.queryAllByTestId("plan-card")).toHaveLength(0);
      expect(screen.queryByTestId("reward-gate")).toBeNull();
    });
  });
});
