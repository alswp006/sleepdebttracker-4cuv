import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { screen } from "@testing-library/react";
import type { SleepRecord, StreakState } from "@/lib/types";
import { mockAll, mockNavigate, mockLocation } from "@/__tests__/__helpers__/mocks";
import { renderWithRouter } from "@/__tests__/__helpers__/test-utils";

// ============================================================================
// PACKET 0005: 홈/대시보드 페이지 (`/`)
// ============================================================================
// 누적 부채 히어로 · 상환 예상일 · 스트릭 배지 · 최근 추이를 조립하는 앱 첫 진입 화면.
// useDashboard 훅만 사용 — 계산 재구현 금지. 빈 상태/로딩/스파크라인 분기 처리.
// 저장 직후 진입(location.state.savedDate) + 스트릭 7배수일 때 축하 Toast 1회.

mockAll();

// useDashboard is fully mocked so this packet tests HomePage's rendering/branching
// logic in isolation from the hook (already covered by packet-0004).
const mockUseDashboard = vi.fn();
vi.mock("@/hooks/useDashboard", () => ({
  useDashboard: () => mockUseDashboard(),
}));

import Home from "@/pages/Home";

function makeRecord(date: string, actualSleepMin = 400): SleepRecord {
  return {
    id: date,
    date,
    bedTime: "23:00",
    wakeTime: "07:00",
    actualSleepMin,
    deficitMin: 80,
    createdAt: 1722412800000,
  };
}

const baseStreak: StreakState = { current: 3, best: 5, lastCheckDate: "2026-07-31" };

interface DashboardShape {
  loading: boolean;
  totalDebt: number;
  repayDays: number;
  weeklySeries: number[];
  streak: StreakState;
  records: SleepRecord[];
}

function setDashboard(overrides: Partial<DashboardShape> = {}) {
  const value: DashboardShape = {
    loading: false,
    totalDebt: 0,
    repayDays: 0,
    weeklySeries: [],
    streak: baseStreak,
    records: [],
    ...overrides,
  };
  mockUseDashboard.mockReturnValue(value);
  return value;
}

describe("홈/대시보드 페이지 (`/`)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocation.state = null;
    mockLocation.pathname = "/";
    setDashboard();
  });

  // ── AC-1[P0]: 누적 부채 히어로 (CountUp, '3시간 0분' = 180분) ──
  describe("AC-1[P0]: debt-hero SummaryHero가 누적 부채를 CountUp으로 표시한다", () => {
    it("180분 부채를 '3시간 0분'으로 표시한다", () => {
      setDashboard({ totalDebt: 180, records: [makeRecord("2026-07-30")] });
      renderWithRouter(React.createElement(Home));

      const hero = screen.getByTestId("debt-hero");
      expect(hero).not.toBeNull();
      expect(hero.textContent).toContain("3시간 0분");
    });

    it("125분 부채를 '2시간 5분'으로 표시한다", () => {
      setDashboard({ totalDebt: 125, records: [makeRecord("2026-07-30")] });
      renderWithRouter(React.createElement(Home));

      const hero = screen.getByTestId("debt-hero");
      expect(hero.textContent).toContain("2시간 5분");
    });
  });

  // ── AC-2[P0]: 상환 예상일 카드 + 스트릭 배지 ──
  describe("AC-2[P0]: repay-card / streak-card가 상환 예상일과 스트릭을 표시한다", () => {
    it("상환 예상일이 '회복까지 약 2일'로 표시된다", () => {
      setDashboard({ repayDays: 2, records: [makeRecord("2026-07-30")] });
      renderWithRouter(React.createElement(Home));

      expect(screen.getByTestId("repay-card").textContent).toContain("회복까지 약 2일");
    });

    it("스트릭 카드가 '🔥 4일 연속'과 최고기록(best=9)을 함께 표시한다", () => {
      setDashboard({
        streak: { current: 4, best: 9, lastCheckDate: "2026-07-31" },
        records: [makeRecord("2026-07-30")],
      });
      renderWithRouter(React.createElement(Home));

      const streakCard = screen.getByTestId("streak-card");
      expect(streakCard.textContent).toContain("🔥 4일 연속");
      expect(streakCard.textContent).toContain("9");
    });
  });

  // ── AC-3[P0]: 빈 상태 / 로딩 스켈레톤 ──
  describe("AC-3[P0]: 기록 0건이면 빈 상태, 조회 중이면 스켈레톤을 표시한다", () => {
    it("기록이 0건이면 빈 상태 안내와 '기록하기' 버튼, 히어로 '0분'을 보여준다", () => {
      setDashboard({ totalDebt: 0, records: [] });
      renderWithRouter(React.createElement(Home));

      expect(screen.getByText(/첫 수면을 기록해보세요/).textContent).toContain("첫 수면을 기록해보세요");
      expect(screen.getByRole("button", { name: "기록하기" }).tagName).toBe("BUTTON");
      expect(screen.getByTestId("debt-hero").textContent).toContain("0분");
    });

    it("조회 중(loading=true)에는 스켈레톤을 표시하고 빈 상태 문구는 없다", () => {
      setDashboard({ loading: true, records: [] });
      const { container } = renderWithRouter(React.createElement(Home));

      expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
      expect(screen.queryByText(/첫 수면을 기록해보세요/)).toBeNull();
    });
  });

  // ── AC-4[P0]: '오늘 기록하기' CTA 네비게이션 + 스파크라인(3건 이상) ──
  describe("AC-4[P0]: 오늘 기록하기 CTA가 /record로 이동하고, 기록 3건 이상이면 스파크라인을 그린다", () => {
    it("'오늘 기록하기' 버튼 클릭 시 navigate('/record')가 호출된다", () => {
      setDashboard({ records: [makeRecord("2026-07-30")] });
      renderWithRouter(React.createElement(Home));

      const cta = screen.getByRole("button", { name: "오늘 기록하기" });
      expect(cta.tagName).toBe("BUTTON");
      cta.click();

      expect(mockNavigate).toHaveBeenCalledWith("/record");
    });

    it("기록이 3건 이상이면 최근 7일 스파크라인을 렌더한다", () => {
      setDashboard({
        records: [
          makeRecord("2026-07-28"),
          makeRecord("2026-07-29"),
          makeRecord("2026-07-30"),
        ],
        weeklySeries: [0, 0, 0, 0, 420, 400, 410],
      });
      renderWithRouter(React.createElement(Home));

      expect(screen.getByRole("img", { name: "추이 그래프" }).tagName.toLowerCase()).toBe("svg");
    });

    it("기록이 2건 이하면 스파크라인을 렌더하지 않는다", () => {
      setDashboard({
        records: [makeRecord("2026-07-30")],
        weeklySeries: [0, 0, 0, 0, 0, 0, 400],
      });
      renderWithRouter(React.createElement(Home));

      expect(screen.queryByRole("img", { name: "추이 그래프" })).toBeNull();
    });
  });

  // ── AC-5[P0]: 저장 직후 진입 & 스트릭 7배수 → 축하 Toast 1회, console.error 0건 ──
  describe("AC-5[P0]: savedDate 진입 + 스트릭 7배수면 축하 Toast를 1회만 띄우고 console.error가 없다", () => {
    it("location.state.savedDate가 있고 current=7(7의 배수)이면 Toast가 정확히 1개 뜬다", () => {
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      mockLocation.state = { savedDate: "2026-07-30" } as any;
      setDashboard({
        streak: { current: 7, best: 7, lastCheckDate: "2026-07-31" },
        records: [makeRecord("2026-07-30")],
      });

      renderWithRouter(React.createElement(Home));

      const toasts = screen.getAllByRole("status");
      expect(toasts).toHaveLength(1);
      expect(toasts[0].textContent).toContain("7");
      expect(errorSpy).not.toHaveBeenCalled();

      errorSpy.mockRestore();
    });

    it("savedDate가 없으면(직접 진입) 축하 Toast를 띄우지 않는다", () => {
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      mockLocation.state = null;
      setDashboard({
        streak: { current: 7, best: 7, lastCheckDate: "2026-07-31" },
        records: [makeRecord("2026-07-30")],
      });

      renderWithRouter(React.createElement(Home));

      expect(screen.queryAllByRole("status")).toHaveLength(0);
      expect(errorSpy).not.toHaveBeenCalled();

      errorSpy.mockRestore();
    });

    it("savedDate가 있어도 스트릭이 7의 배수가 아니면 축하 Toast를 띄우지 않는다", () => {
      mockLocation.state = { savedDate: "2026-07-30" } as any;
      setDashboard({
        streak: { current: 5, best: 5, lastCheckDate: "2026-07-31" },
        records: [makeRecord("2026-07-30")],
      });

      renderWithRouter(React.createElement(Home));

      expect(screen.queryAllByRole("status")).toHaveLength(0);
    });
  });

  // ── AC-6: 레이아웃 골격 — 버튼 중첩 없음 ──
  describe("AC-6: 레이아웃 골격 검증", () => {
    it("CTA 버튼 안에 중첩된 <button>이 없다(button>button 무효 HTML 방지)", () => {
      setDashboard({ records: [makeRecord("2026-07-30")] });
      const { container } = renderWithRouter(React.createElement(Home));

      container.querySelectorAll("button").forEach((btn) => {
        expect(btn.querySelector("button")).toBeNull();
      });
    });
  });
});
