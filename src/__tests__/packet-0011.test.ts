import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { screen } from "@testing-library/react";
import { mockTds, mockAppsInToss, mockTossRewardAd } from "@/__tests__/__helpers__/mocks";
import { renderWithRouter } from "@/__tests__/__helpers__/test-utils";

// ============================================================================
// PACKET 0011: 라우터 배선 & 하단 네비 & 최초 진입 분기
// ============================================================================
// react-router-dom 6개 라우트 연결 + FloatingTabBar(홈/리포트/플랜/설정) 배선
// + /record는 탭 미표시 + 최초 진입(onboarded=false) 시 /settings 분기.
//
// NOTE: mockRouter() (useNavigate/useLocation 고정 스텁)는 여기서 쓰지 않는다 —
// 이 패킷은 실제 경로별 라우팅/리다이렉트를 검증해야 하므로 진짜 MemoryRouter +
// 진짜 useLocation/useNavigate가 필요하다. TDS/SDK/광고 게이트만 목킹한다.
mockTds();
mockAppsInToss();
mockTossRewardAd();

const mockGetSettings = vi.fn();
const mockSaveSettings = vi.fn();
const mockGetSleepType = vi.fn();
const mockSaveSleepType = vi.fn();
const mockGetRewardUnlock = vi.fn();
const mockSetRewardUnlock = vi.fn();

vi.mock("@/lib/settingsStore", () => ({
  getSettings: (...args: unknown[]) => mockGetSettings(...args),
  saveSettings: (...args: unknown[]) => mockSaveSettings(...args),
  getSleepType: (...args: unknown[]) => mockGetSleepType(...args),
  saveSleepType: (...args: unknown[]) => mockSaveSleepType(...args),
  getRewardUnlock: (...args: unknown[]) => mockGetRewardUnlock(...args),
  setRewardUnlock: (...args: unknown[]) => mockSetRewardUnlock(...args),
}));

import App from "@/App";
import { FloatingTabBar } from "@/components/FloatingTabBar";

const TAB_ITEMS = [
  { label: "홈", path: "/" },
  { label: "리포트", path: "/report" },
  { label: "플랜", path: "/plan" },
  { label: "설정", path: "/settings" },
];

function renderAppAt(path: string) {
  return renderWithRouter(React.createElement(App), { initialEntries: [path] });
}

// Top mock은 title(=Top.TitleParagraph, 그 자체가 h1)을 또 다른 h1으로 감싸므로
// 동일 텍스트의 heading이 2개(중첩) 나온다 — 존재 여부만 판정.
function headingCount(name: string): number {
  return screen.queryAllByRole("heading", { name }).length;
}

describe("라우터 배선 & 하단 네비 & 최초 진입 분기", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // 온보딩 완료 상태를 기본값으로 — 개별 테스트에서 override
    mockGetSettings.mockReturnValue({ targetSleepMin: 480, onboarded: true });
    mockSaveSettings.mockReturnValue({ ok: true });
    mockGetSleepType.mockReturnValue(null);
    mockSaveSleepType.mockReturnValue({ ok: true });
    mockGetRewardUnlock.mockReturnValue({});
    mockSetRewardUnlock.mockReturnValue({ ok: true });
  });

  // ── AC-1[P0]: 6개 라우트가 각각 대응 페이지를 렌더한다 ──
  describe("AC-1[P0]: 6개 경로가 각각 올바른 페이지 컴포넌트를 렌더한다", () => {
    it("'/' → Home('수면 부채' 타이틀)", () => {
      renderAppAt("/");
      expect(headingCount("수면 부채")).toBeGreaterThan(0);
    });

    it("'/record' → RecordPage('오늘 수면 기록' 타이틀)", () => {
      renderAppAt("/record");
      expect(headingCount("오늘 수면 기록")).toBeGreaterThan(0);
    });

    it("'/sleep-type' → SleepTypePage('수면 유형 진단' 타이틀)", () => {
      renderAppAt("/sleep-type");
      expect(headingCount("수면 유형 진단")).toBeGreaterThan(0);
    });

    it("'/report' → ReportPage('주간 리포트' 타이틀)", () => {
      renderAppAt("/report");
      expect(headingCount("주간 리포트")).toBeGreaterThan(0);
    });

    it("'/plan' → PlanPage('회복 플랜' 타이틀)", () => {
      renderAppAt("/plan");
      expect(headingCount("회복 플랜")).toBeGreaterThan(0);
    });

    it("'/settings' → SettingsPage('설정' 타이틀)", () => {
      renderAppAt("/settings");
      expect(headingCount("설정")).toBeGreaterThan(0);
    });
  });

  // ── AC-2[P0]: FloatingTabBar 4탭 + /record 탭 미표시 ──
  describe("AC-2[P0]: FloatingTabBar는 홈/리포트/플랜/설정 4탭을 표시하고 활성탭을 컬러 틴트로 구분하며, /record는 탭을 표시하지 않는다", () => {
    it("4개 탭(홈/리포트/플랜/설정)이 role=tab으로 렌더된다", () => {
      renderWithRouter(React.createElement(FloatingTabBar, { items: TAB_ITEMS }), {
        initialEntries: ["/"],
      });
      const tabs = screen.getAllByRole("tab");
      expect(tabs).toHaveLength(4);
      expect(tabs.map((t) => t.getAttribute("aria-label"))).toEqual([
        "홈",
        "리포트",
        "플랜",
        "설정",
      ]);
    });

    it("현재 경로가 '/report'면 '리포트' 탭만 aria-selected=true다(컬러 틴트, 솔리드 알약 아님)", () => {
      renderWithRouter(React.createElement(FloatingTabBar, { items: TAB_ITEMS }), {
        initialEntries: ["/report"],
      });
      screen.debug();
      const reportTab = screen.getByRole("tab", { name: "리포트" });
      const homeTab = screen.getByRole("tab", { name: "홈" });
      expect(reportTab.getAttribute("aria-selected")).toBe("true");
      expect(homeTab.getAttribute("aria-selected")).toBe("false");
    });

    it("'/record' 화면에는 role=tablist 하단 네비가 렌더되지 않는다(풀스크린)", () => {
      renderAppAt("/record");
      expect(screen.queryByRole("tablist")).toBeNull();
    });

    it("'/' 화면에는 role=tablist 하단 네비가 렌더된다", () => {
      renderAppAt("/");
      const tablist = screen.getByRole("tablist");
      expect(tablist).not.toBeNull();
      expect(screen.getAllByRole("tab")).toHaveLength(4);
    });
  });

  // ── AC-3[P0]: 최초 진입(onboarded=false) 시 /settings 분기 ──
  describe("AC-3[P0]: getSettings().onboarded===false인 최초 진입은 /settings로 분기하고, onboarded===true면 요청한 경로를 그대로 렌더한다", () => {
    it("onboarded:false 상태에서 '/'에 접근하면 SettingsPage('설정' 타이틀)가 렌더된다", () => {
      mockGetSettings.mockReturnValue({ targetSleepMin: 480, onboarded: false });
      renderAppAt("/");
      expect(headingCount("설정")).toBeGreaterThan(0);
      expect(headingCount("수면 부채")).toBe(0);
    });

    it("onboarded:false 상태에서 '/report'에 접근해도 SettingsPage로 분기된다(임의 경로도 온보딩 우선)", () => {
      mockGetSettings.mockReturnValue({ targetSleepMin: 480, onboarded: false });
      renderAppAt("/report");
      expect(headingCount("설정")).toBeGreaterThan(0);
      expect(headingCount("주간 리포트")).toBe(0);
    });

    it("onboarded:true 상태에서는 '/'가 그대로 Home으로 렌더된다(리다이렉트 없음)", () => {
      mockGetSettings.mockReturnValue({ targetSleepMin: 480, onboarded: true });
      renderAppAt("/");
      expect(headingCount("수면 부채")).toBeGreaterThan(0);
    });
  });

  // ── AC-4: main.tsx 미수정 (Provider/Router는 main.tsx에서만 선언) ──
  describe("AC-4: main.tsx(@AI:ANCHOR)는 수정되지 않고, Router/Provider 배선은 App.tsx가 아닌 main.tsx에만 존재한다", () => {
    it("main.tsx는 TDSMobileAITProvider + BrowserRouter로 App을 감싸는 원본 배선을 그대로 유지한다", () => {
      const fs = require("node:fs") as typeof import("node:fs");
      const path = require("node:path") as typeof import("node:path");
      const mainSrc = fs.readFileSync(
        path.resolve(__dirname, "../main.tsx"),
        "utf-8",
      );
      expect(mainSrc).toContain("@AI:ANCHOR");
      expect(mainSrc).toContain("TDSMobileAITProvider");
      expect(mainSrc).toContain("BrowserRouter");
    });

    it("App.tsx는 자체적으로 BrowserRouter를 다시 선언하지 않는다(중복 라우터 방지)", () => {
      const fs = require("node:fs") as typeof import("node:fs");
      const path = require("node:path") as typeof import("node:path");
      const appSrc = fs.readFileSync(path.resolve(__dirname, "../App.tsx"), "utf-8");
      expect(appSrc).not.toContain("BrowserRouter");
    });
  });

  // ── AC-5[P0]: 통합 — navigate 대상 전부에 Route가 있고, 모든 라우트가 크래시 없이 렌더된다 ──
  describe("AC-5[P0]: 6개 라우트 전체가 크래시 없이 렌더되고, 앱 진입부터 흰 화면이 없다", () => {
    it.each([
      ["/", "수면 부채"],
      ["/record", "오늘 수면 기록"],
      ["/sleep-type", "수면 유형 진단"],
      ["/report", "주간 리포트"],
      ["/plan", "회복 플랜"],
      ["/settings", "설정"],
    ])("경로 %s는 크래시 없이 렌더되고 #root에 콘텐츠가 존재한다", (path, expectedText) => {
      const { container } = renderAppAt(path as string);
      expect(container.textContent).not.toBe("");
      expect(headingCount(expectedText as string)).toBeGreaterThan(0);
    });

    it("정의되지 않은 경로(/unknown)에 접근해도 앱이 크래시하지 않는다", () => {
      const { container } = renderAppAt("/unknown");
      expect(container).not.toBeNull();
    });
  });
});
