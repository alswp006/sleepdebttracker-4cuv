import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { mockTds, mockAppsInToss } from "@/__tests__/__helpers__/mocks";
import { renderWithRouter, seedLocalStorage } from "@/__tests__/__helpers__/test-utils";

// ============================================================================
// PACKET 0012: 광고 배치 & 리워드 게이팅 검증 & 최종 UX 폴리시
// ============================================================================
// AdSlot 배너를 홈/리포트/플랜 하단에 콘텐츠와 겹치지 않게 배치하고, 라우트 이동 시
// 잔존 없이 정리되는지 확인한다. TossRewardAd 게이팅 + 당일 캐시 생략 흐름을
// report/plan에서 검증하고, HEX 하드코딩 0건·safe-area·haptic·console.error 0건의
// 최종 UX 폴리시를 점검한다.
//
// NOTE: mockRouter()는 여기서 쓰지 않는다 — AC-1의 "라우트 이동 후 잔존 없음"은
// 실제 MemoryRouter + useNavigate로 페이지 언마운트를 검증해야 한다.
mockTds();
mockAppsInToss();

import App from "@/App";
import Home from "@/pages/Home";
import ReportPage from "@/pages/ReportPage";
import PlanPage from "@/pages/PlanPage";
import { FloatingTabBar } from "@/components/FloatingTabBar";
import { generateHapticFeedback } from "@apps-in-toss/web-framework";

function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}

function yesterdayStr(): string {
  return new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split("T")[0];
}

// 부채(deficit)가 있는 기록 하나를 심어 Home/Report/Plan이 "비어있지 않은" 상태로
// 렌더되게 한다 (target 480분 대비 300분 수면 → 180분 부채).
function seedOneDeficitRecord() {
  seedLocalStorage({
    "sdt.records": [
      {
        id: "2026-07-30",
        date: "2026-07-30",
        bedTime: "01:00",
        wakeTime: "06:00",
        actualSleepMin: 300,
        deficitMin: 180,
        createdAt: Date.now(),
      },
    ],
  });
}

describe("광고 배치 & 리워드 게이팅 검증 & 최종 UX 폴리시", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── AC-1[P0]: AdSlot 배치 (콘텐츠 미겹침) ──
  describe("AC-1[P0]: AdSlot이 홈/리포트/플랜 하단에 콘텐츠와 겹치지 않게 배치된다", () => {
    it("홈/리포트/플랜 페이지는 각각 AdSlot(VITE_TOSS_AD_GROUP_ID) 배너 컨테이너를 렌더한다", () => {
      seedOneDeficitRecord();
      seedLocalStorage({ "sdt.rewardUnlock": { report: todayStr(), plan: todayStr() } });

      const { container: homeContainer, unmount: unmountHome } = renderWithRouter(
        React.createElement(Home),
      );
      const homeAds = homeContainer.querySelectorAll("[data-ad-group-id]");
      expect(homeAds.length).toBeGreaterThan(0);
      unmountHome();

      const { container: reportContainer, unmount: unmountReport } = renderWithRouter(
        React.createElement(ReportPage),
      );
      const reportAds = reportContainer.querySelectorAll("[data-ad-group-id]");
      expect(reportAds.length).toBeGreaterThan(0);
      unmountReport();

      const { container: planContainer } = renderWithRouter(React.createElement(PlanPage));
      const planAds = planContainer.querySelectorAll("[data-ad-group-id]");
      expect(planAds.length).toBeGreaterThan(0);
    });

    it("AdSlot은 핵심 콘텐츠(카드/차트) 다음에 위치해 겹치지 않는다", () => {
      seedOneDeficitRecord();
      const { container } = renderWithRouter(React.createElement(Home));
      const heroCard = screen.getByTestId("debt-hero");
      const adSlot = container.querySelector("[data-ad-group-id]");
      expect(adSlot).not.toBeNull();
      // DOCUMENT_POSITION_FOLLOWING(4) — heroCard가 문서상 adSlot보다 앞에 온다.
      const relation = heroCard.compareDocumentPosition(adSlot as Node);
      expect((relation & Node.DOCUMENT_POSITION_FOLLOWING) !== 0).toBe(true);
    });
  });

  describe("AC-1[P0]: 라우트를 벗어나면 이전 페이지의 AdSlot이 잔존하지 않는다", () => {
    it("'/'에서 '/settings'로 이동하면 홈의 AdSlot이 문서에서 사라진다", async () => {
      seedOneDeficitRecord();
      seedLocalStorage({ "sdt.settings": { targetSleepMin: 480, onboarded: true } });

      const { container } = renderWithRouter(React.createElement(App), {
        initialEntries: ["/"],
      });
      expect(container.querySelectorAll("[data-ad-group-id]").length).toBeGreaterThan(0);

      const settingsTab = screen.getByRole("tab", { name: "설정" });
      fireEvent.click(settingsTab);

      await waitFor(() => {
        expect(screen.getAllByRole("heading", { name: "설정" }).length).toBeGreaterThan(0);
      });
      expect(container.querySelectorAll("[data-ad-group-id]").length).toBe(0);
    });
  });

  // ── AC-2[P0]: 리워드 게이팅 + 당일 캐시 생략 ──
  describe("AC-2[P0]: TossRewardAd 게이팅과 당일 해금 캐시 생략이 report/plan에서 동작한다", () => {
    it("리포트: 당일 리워드 캐시가 없으면 콘텐츠가 광고 게이트 뒤에 숨는다", () => {
      seedOneDeficitRecord();
      seedLocalStorage({ "sdt.rewardUnlock": {} });

      renderWithRouter(React.createElement(ReportPage));

      expect(screen.getByRole("button", { name: "리포트 보기" })).toBeInTheDocument();
      expect(screen.queryByTestId("weekly-chart")).toBeNull();
      expect(screen.queryByTestId("weekly-summary")).toBeNull();
    });

    it("리포트: 당일 날짜로 캐시된 리워드 언락이 있으면 광고 게이트 없이 콘텐츠가 바로 보인다", () => {
      seedOneDeficitRecord();
      seedLocalStorage({ "sdt.rewardUnlock": { report: todayStr() } });

      renderWithRouter(React.createElement(ReportPage));

      expect(screen.getByTestId("weekly-chart")).toBeInTheDocument();
      expect(screen.getByTestId("weekly-summary")).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "리포트 보기" })).toBeNull();
    });

    it("플랜: 어제 날짜로 캐시된 리워드 언락은 당일로 인정되지 않아 다시 광고 게이트가 뜬다", () => {
      seedLocalStorage({
        "sdt.records": [
          {
            id: "2026-07-30",
            date: "2026-07-30",
            bedTime: "01:00",
            wakeTime: "06:00",
            actualSleepMin: 300,
            deficitMin: 180,
            createdAt: Date.now(),
          },
        ],
        "sdt.rewardUnlock": { plan: yesterdayStr() },
      });

      renderWithRouter(React.createElement(PlanPage));

      expect(screen.getByRole("button", { name: "플랜 보기" })).toBeInTheDocument();
      expect(screen.queryAllByTestId("plan-card")).toHaveLength(0);
    });
  });

  // ── AC-3: HEX 하드코딩 금지 + safe-area ──
  describe("AC-3: HEX 색상 하드코딩이 없고, 하단 고정 요소에 safe-area 패딩이 적용된다", () => {
    it("FloatingTabBar/ButtonStack 등 하단 고정 요소는 var(--toss-safe-area-bottom)을 패딩에 포함한다", () => {
      const { container } = renderWithRouter(
        React.createElement(FloatingTabBar, {
          items: [
            { label: "홈", path: "/" },
            { label: "리포트", path: "/report" },
          ],
        }),
      );
      const tablist = container.querySelector('[role="tablist"]') as HTMLElement;
      expect(tablist).not.toBeNull();
      expect(tablist.style.padding).toContain("var(--toss-safe-area-bottom)");
      expect(tablist.style.position).toBe("fixed");
    });

    it("src/ 전역에 HEX 색상 리터럴(#RGB/#RRGGBB)이 하드코딩되어 있지 않다", () => {
      const fs = require("node:fs") as typeof import("node:fs");
      const path = require("node:path") as typeof import("node:path");

      function collectFiles(dir: string): string[] {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        return entries.flatMap((entry) => {
          const full = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            if (entry.name === "__tests__") return [];
            return collectFiles(full);
          }
          if (/\.(tsx?|css)$/.test(entry.name)) return [full];
          return [];
        });
      }

      const srcDir = path.resolve(__dirname, "..");
      const files = collectFiles(srcDir);
      const hexPattern = /#[0-9a-fA-F]{3,8}\b/;
      const offenders = files.filter((file) => hexPattern.test(fs.readFileSync(file, "utf-8")));

      expect(offenders).toEqual([]);
      expect(files.length).toBeGreaterThan(0);
    });
  });

  // ── AC-4: 햅틱 + console.error 0건 ──
  describe("AC-4: 주요 CTA는 success 햅틱, 탭 전환은 tickWeak 햅틱을 발화하고 콘솔 에러가 없다", () => {
    it("홈의 1차 CTA('오늘 기록하기') 클릭 시 success 햅틱이, 탭 클릭 시 tickWeak 햅틱이 발화된다", () => {
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      seedOneDeficitRecord();

      renderWithRouter(React.createElement(Home));
      fireEvent.click(screen.getByRole("button", { name: "오늘 기록하기" }));
      expect(generateHapticFeedback).toHaveBeenCalledWith({ type: "success" });

      fireEvent.click(screen.getByRole("tab", { name: "리포트" }));
      expect(generateHapticFeedback).toHaveBeenCalledWith({ type: "tickWeak" });

      expect(errorSpy).not.toHaveBeenCalled();
      errorSpy.mockRestore();
    });
  });

  // ── AC-5: 최종 빌드/번들 제한 ──
  describe("AC-5: 번들 100MB 제한을 위해 무거운 라이브러리를 사용하지 않는다", () => {
    it("package.json dependencies에 D3/Three.js 등 금지된 무거운 차트/3D 라이브러리가 없다", () => {
      const fs = require("node:fs") as typeof import("node:fs");
      const path = require("node:path") as typeof import("node:path");
      const pkg = JSON.parse(
        fs.readFileSync(path.resolve(__dirname, "../../package.json"), "utf-8"),
      );
      const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
      const forbidden = ["d3", "three", "chart.js", "recharts", "moment"];

      const found = forbidden.filter((name) => Object.prototype.hasOwnProperty.call(allDeps, name));
      expect(found).toEqual([]);
      expect(Object.keys(allDeps).length).toBeGreaterThan(0);
    });
  });
});
