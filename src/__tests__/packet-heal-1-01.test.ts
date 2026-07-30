import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { screen } from "@testing-library/react";
import { mockTds, mockAppsInToss, mockTossRewardAd } from "@/__tests__/__helpers__/mocks";
import { renderWithRouter } from "@/__tests__/__helpers__/test-utils";

// ============================================================================
// PACKET heal-1-01: 라우팅·엔트리 배선을 0013 단일 소스로 수렴시키고 0011 중복 제거
// ============================================================================
// 0013에서 확정된 App.tsx(라우터 트리) / main.tsx(Provider+BrowserRouter) /
// FloatingTabBar 배선이 프로젝트 전체에서 유일한 정의(single source of truth)임을
// 정적 검사로 고정하고, 0011이 의도했던 "최초 진입(onboarded=false) 시 온보딩/설정
// 분기"가 그 단일 배선 위에 실제로 살아있는지 회귀 테스트로 잠근다.
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

function renderAppAt(path: string) {
  return renderWithRouter(React.createElement(App), { initialEntries: [path] });
}

function headingCount(name: string): number {
  return screen.queryAllByRole("heading", { name }).length;
}

function readSrcFile(relPath: string): string {
  const fs = require("node:fs") as typeof import("node:fs");
  const path = require("node:path") as typeof import("node:path");
  return fs.readFileSync(path.resolve(__dirname, "..", relPath), "utf-8");
}

function readSrcFileAbs(absPath: string): string {
  const fs = require("node:fs") as typeof import("node:fs");
  return fs.readFileSync(absPath, "utf-8");
}

function collectSrcFiles(): string[] {
  const fs = require("node:fs") as typeof import("node:fs");
  const path = require("node:path") as typeof import("node:path");
  const srcDir = path.resolve(__dirname, "..");

  function walk(dir: string): string[] {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    return entries.flatMap((entry) => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "__tests__") return [];
        return walk(full);
      }
      if (/\.tsx?$/.test(entry.name)) return [full];
      return [];
    });
  }

  return walk(srcDir);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetSettings.mockReturnValue({ targetSleepMin: 480, onboarded: true });
  mockSaveSettings.mockReturnValue({ ok: true });
  mockGetSleepType.mockReturnValue(null);
  mockSaveSleepType.mockReturnValue({ ok: true });
  mockGetRewardUnlock.mockReturnValue({});
  mockSetRewardUnlock.mockReturnValue({ ok: true });
});

describe("라우팅·엔트리 배선을 0013 단일 소스로 수렴시키고 0011 중복 제거", () => {
  // ── AC-1[P0]: 라우터/네비/Provider가 단 한 곳에서만 정의된다 ──
  describe("AC-1[P0]: 라우터·Provider·하단 네비 배선이 프로젝트 전체에서 정확히 한 곳에서만 정의된다", () => {
    it("main.tsx에만 BrowserRouter/TDSMobileAITProvider가 있고, App.tsx는 BrowserRouter를 재선언하지 않는다", () => {
      const mainSrc = readSrcFile("main.tsx");
      const appSrc = readSrcFile("App.tsx");

      expect(mainSrc).toContain("BrowserRouter");
      expect(mainSrc).toContain("TDSMobileAITProvider");
      expect(appSrc).not.toContain("BrowserRouter");
      expect(appSrc).not.toContain("TDSMobileAITProvider");
    });

    it("<Routes>/<Route path= 정의는 App.tsx 한 파일에만 존재한다(중복 라우터 트리 없음)", () => {
      const files = collectSrcFiles();
      const filesWithRouteDefs = files.filter((f) => {
        const content = readSrcFileAbs(f);
        return /<Routes[\s>]/.test(content) || /<Route\s+path=/.test(content);
      });

      const relative = filesWithRouteDefs.map((f) => f.split("/src/")[1]);
      expect(relative).toEqual(["App.tsx"]);
      expect(relative.length).toBe(1);
    });

    it("FloatingTabBar(하단 탭 네비) 컴포넌트는 src/components/FloatingTabBar.tsx 한 곳에서만 export되고, 별도의 router.tsx 파일은 존재하지 않는다", () => {
      const fs = require("node:fs") as typeof import("node:fs");
      const path = require("node:path") as typeof import("node:path");

      const files = collectSrcFiles();
      const filesDefiningTabBar = files.filter((f) => {
        const content = readSrcFileAbs(f);
        return /export\s+(function|const)\s+FloatingTabBar/.test(content);
      });
      const relative = filesDefiningTabBar.map((f) => f.split("/src/")[1]);
      expect(relative).toEqual(["components/FloatingTabBar.tsx"]);

      expect(fs.existsSync(path.resolve(__dirname, "..", "router.tsx"))).toBe(false);
    });
  });

  // ── AC-2[P0]: 6개 라우트가 모두 마운트되고 하단 탭은 한 번만 렌더된다 ──
  describe("AC-2[P0]: 6개 라우트가 각각 정상 마운트되고, 화면마다 role=tablist 하단 네비가 최대 1번만 렌더된다", () => {
    it.each([
      ["/", "수면 부채"],
      ["/record", "오늘 수면 기록"],
      ["/sleep-type", "수면 유형 진단"],
      ["/report", "주간 리포트"],
      ["/plan", "회복 플랜"],
      ["/settings", "설정"],
    ])("경로 %s는 크래시 없이 마운트되고 하단 탭바는 최대 1개만 렌더된다", (path, expectedTitle) => {
      const { container } = renderAppAt(path as string);

      expect(container.textContent).not.toBe("");
      expect(headingCount(expectedTitle as string)).toBeGreaterThan(0);

      const tablists = screen.queryAllByRole("tablist");
      expect(tablists.length).toBeLessThanOrEqual(1);
    });

    it("'/'에서는 하단 탭바가 정확히 1번 렌더되고 4개 탭(홈/리포트/플랜/설정)을 갖는다", () => {
      renderAppAt("/");
      const tablists = screen.getAllByRole("tablist");
      expect(tablists.length).toBe(1);
      expect(screen.getAllByRole("tab")).toHaveLength(4);
    });
  });

  // ── AC-3[P0]: onboarded=false 최초 진입 시 온보딩/설정 경로로 분기 ──
  describe("AC-3[P0]: getSettings().onboarded===false인 최초 진입은 어떤 경로로 들어와도 설정(온보딩) 화면으로 분기한다", () => {
    it("onboarded:false 상태에서 '/'에 접근하면 설정 화면이 렌더되고 홈 화면은 렌더되지 않는다", () => {
      mockGetSettings.mockReturnValue({ targetSleepMin: 480, onboarded: false });
      renderAppAt("/");
      expect(headingCount("설정")).toBeGreaterThan(0);
      expect(headingCount("수면 부채")).toBe(0);
    });

    it("onboarded:false 상태에서 '/report'에 접근해도 설정 화면으로 분기된다(임의 경로도 온보딩 우선)", () => {
      mockGetSettings.mockReturnValue({ targetSleepMin: 480, onboarded: false });
      renderAppAt("/report");
      expect(headingCount("설정")).toBeGreaterThan(0);
      expect(headingCount("주간 리포트")).toBe(0);
    });

    it("onboarded:true 상태에서는 리다이렉트 없이 요청한 경로가 그대로 렌더된다", () => {
      mockGetSettings.mockReturnValue({ targetSleepMin: 480, onboarded: true });
      renderAppAt("/plan");
      expect(headingCount("회복 플랜")).toBeGreaterThan(0);
      expect(headingCount("설정")).toBe(0);
    });
  });
});
