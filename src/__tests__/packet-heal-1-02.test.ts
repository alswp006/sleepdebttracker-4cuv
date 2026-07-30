import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { mockTds, mockAppsInToss } from "@/__tests__/__helpers__/mocks";
import { renderWithRouter, seedLocalStorage } from "@/__tests__/__helpers__/test-utils";

// ============================================================================
// PACKET heal-1-02: 광고 배치 & 리워드 게이팅 검증을 확정 라우팅 위에 재통합(0012)
// ============================================================================
// 0013으로 확정된 라우팅/레이아웃 위에 AdSlot(배너)·TossRewardAd(리워드 게이팅)이
// 여전히 라우팅 재정의 없이 페이지 내부에서만 동작하는지 재검증한다.
mockTds();
mockAppsInToss();

import Home from "@/pages/Home";
import ReportPage from "@/pages/ReportPage";
import PlanPage from "@/pages/PlanPage";

function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}

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

describe("광고 배치 & 리워드 게이팅 검증을 확정 라우팅 위에 재통합(0012)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── AC-1[P0]: 배너가 env 변수로 렌더되며 HEX/외부 URL 없음 ──
  describe("AC-1[P0]: AdSlot 배너가 SPEC 지정 env 변수로 렌더되고 하드코딩/외부 이탈이 없다", () => {
    it("홈/리포트/플랜은 각각 data-ad-group-id 배너 컨테이너를 렌더한다", () => {
      seedOneDeficitRecord();
      seedLocalStorage({ "sdt.rewardUnlock": { report: todayStr(), plan: todayStr() } });

      const { container: homeContainer, unmount: unmountHome } = renderWithRouter(
        React.createElement(Home),
      );
      expect(homeContainer.querySelectorAll("[data-ad-group-id]").length).toBe(1);
      unmountHome();

      const { container: reportContainer, unmount: unmountReport } = renderWithRouter(
        React.createElement(ReportPage),
      );
      expect(reportContainer.querySelectorAll("[data-ad-group-id]").length).toBe(1);
      unmountReport();

      const { container: planContainer } = renderWithRouter(React.createElement(PlanPage));
      expect(planContainer.querySelectorAll("[data-ad-group-id]").length).toBe(1);
    });

    it("src/ 전역에 window.location.href/window.open을 통한 외부 이탈 및 HEX 색상 하드코딩이 없다", () => {
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
      const contents = files.map((f) => fs.readFileSync(f, "utf-8"));

      const outlinkOffenders = files.filter((_, i) =>
        /window\.location\.href\s*=|window\.open\(/.test(contents[i]),
      );
      const hexOffenders = files.filter((_, i) => /#[0-9a-fA-F]{3,8}\b/.test(contents[i]));

      expect(outlinkOffenders).toEqual([]);
      expect(hexOffenders).toEqual([]);
    });
  });

  // ── AC-2[P0]: 리워드 게이팅 + 당일 캐시 재진입 ──
  describe("AC-2[P0]: /report·/plan이 리워드 해금 전 게이팅되고 캐시로 재진입 시 바로 열린다", () => {
    it("리포트: 캐시 없이 진입하면 콘텐츠가 광고 게이트 뒤에 숨는다", () => {
      seedOneDeficitRecord();
      seedLocalStorage({ "sdt.rewardUnlock": {} });

      renderWithRouter(React.createElement(ReportPage));

      expect(screen.getByRole("button", { name: "리포트 보기" })).toBeInTheDocument();
      expect(screen.queryByTestId("weekly-chart")).toBeNull();
    });

    it("리포트: 당일 rewardUnlock 캐시가 있으면 게이트 없이 콘텐츠가 바로 보인다", () => {
      seedOneDeficitRecord();
      seedLocalStorage({ "sdt.rewardUnlock": { report: todayStr() } });

      renderWithRouter(React.createElement(ReportPage));

      expect(screen.getByTestId("weekly-chart")).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "리포트 보기" })).toBeNull();
    });

    it("플랜: 광고 시청(onRewarded) 후 sdt.rewardUnlock에 오늘 날짜로 캐시가 저장된다", async () => {
      seedOneDeficitRecord();
      seedLocalStorage({ "sdt.rewardUnlock": {} });

      renderWithRouter(React.createElement(PlanPage));

      // mockAppsInToss()의 loadFullScreenAd는 setTimeout(0)으로 onEvent({type:'loaded'})를 발화해야
      // 버튼이 활성화된다(TossRewardAd는 adLoaded 전까지 버튼을 disabled 처리).
      const adButton = await waitFor(() => {
        const btn = screen.getByRole("button", { name: "플랜 보기" });
        expect(btn).not.toBeDisabled();
        return btn;
      });

      // 클릭하면 showFullScreenAd가 호출되고, mock은 setTimeout(0)으로 onEvent({type:'rewarded'})를 발화한다.
      fireEvent.click(adButton);

      await waitFor(() => {
        const stored = JSON.parse(localStorage.getItem("sdt.rewardUnlock") ?? "{}");
        expect(stored.plan).toBe(todayStr());
      });
      expect(screen.getAllByTestId("plan-card").length).toBe(2);
    });
  });

  // ── AC-3: 콘솔 에러 0개 + 광고가 콘텐츠와 겹치지 않음 ──
  describe("AC-3: console.error 0개, 광고가 핵심 콘텐츠와 겹치지 않는다", () => {
    it("홈 렌더 중 console.error가 발생하지 않고 AdSlot이 요약 카드 다음(문서 순서상 뒤)에 위치한다", () => {
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      seedOneDeficitRecord();

      const { container } = renderWithRouter(React.createElement(Home));
      const heroCard = screen.getByTestId("debt-hero");
      const adSlot = container.querySelector("[data-ad-group-id]");

      expect(adSlot).not.toBeNull();
      const relation = heroCard.compareDocumentPosition(adSlot as Node);
      expect((relation & Node.DOCUMENT_POSITION_FOLLOWING) !== 0).toBe(true);
      expect(errorSpy).not.toHaveBeenCalled();

      errorSpy.mockRestore();
    });
  });
});
