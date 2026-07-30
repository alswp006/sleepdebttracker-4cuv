import { describe, it, expect, beforeEach } from "vitest";
import React from "react";
import { screen, cleanup } from "@testing-library/react";
import { mockAll } from "@/__tests__/__helpers__/mocks";
import { renderWithRouter } from "@/__tests__/__helpers__/test-utils";
import fs from "node:fs";
import path from "node:path";

mockAll();

import App from "@/App";

// Onboarding is gated in App.tsx: `!getSettings().onboarded` renders SettingsPage
// regardless of path. Seed onboarded=true so route tests exercise the real Routes.
function seedOnboarded() {
  localStorage.setItem(
    "sdt.settings",
    JSON.stringify({ targetSleepMin: 480, onboarded: true }),
  );
}

const APP_SOURCE = fs.readFileSync(
  path.resolve(__dirname, "../App.tsx"),
  "utf-8",
);

describe("라우팅 와이어링 + Provider 연결 + 통합 폴리시", () => {
  beforeEach(() => {
    seedOnboarded();
  });

  it("AC-1[P0]: App.tsx가 6개 페이지 Route를 모두 정의한다 (정적 소스 검사)", () => {
    expect(APP_SOURCE).toMatch(/<Route\s+path="\/"\s+element=\{<Home/);
    expect(APP_SOURCE).toMatch(/<Route\s+path="\/record"\s+element=\{<RecordPage/);
    expect(APP_SOURCE).toMatch(/<Route\s+path="\/sleep-type"\s+element=\{<SleepTypePage/);
    expect(APP_SOURCE).toMatch(/<Route\s+path="\/report"\s+element=\{<ReportPage/);
    expect(APP_SOURCE).toMatch(/<Route\s+path="\/plan"\s+element=\{<PlanPage/);
    expect(APP_SOURCE).toMatch(/<Route\s+path="\/settings"\s+element=\{<SettingsPage/);
  });

  it("AC-1[P0]: 각 경로가 대응하는 페이지의 고유 타이틀을 렌더한다", () => {
    renderWithRouter(React.createElement(App), { initialEntries: ["/record"] });
    expect(screen.getByText("오늘 수면 기록")).toBeInTheDocument();
    cleanup();

    renderWithRouter(React.createElement(App), { initialEntries: ["/report"] });
    expect(screen.getByText("주간 리포트")).toBeInTheDocument();
    cleanup();

    renderWithRouter(React.createElement(App), { initialEntries: ["/plan"] });
    expect(screen.getByText("회복 플랜")).toBeInTheDocument();
    cleanup();

    renderWithRouter(React.createElement(App), { initialEntries: ["/sleep-type"] });
    expect(screen.getByText("수면 유형 진단")).toBeInTheDocument();
    cleanup();

    const { container: settingsContainer } = renderWithRouter(
      React.createElement(App),
      { initialEntries: ["/settings"] },
    );
    expect(settingsContainer.querySelector("h1")?.textContent).toBe("설정");
  });

  it("AC-2[P0]: navigate() 대상 경로(/, /record, /report, /plan, /settings)가 모두 Route로 존재한다", () => {
    const navigateTargets = ["/", "/record", "/report", "/plan", "/settings"];
    const routePaths = [...APP_SOURCE.matchAll(/<Route\s+path="([^"]+)"/g)].map(
      (m) => m[1],
    );
    for (const target of navigateTargets) {
      expect(routePaths).toContain(target);
    }
    expect(routePaths.length).toBeGreaterThanOrEqual(6);
  });

  it("AC-3[P0]: main.tsx가 TDSMobileAITProvider와 BrowserRouter로 App을 감싸는 배선을 유지한다", () => {
    const mainSource = fs.readFileSync(
      path.resolve(__dirname, "../main.tsx"),
      "utf-8",
    );
    expect(mainSource).toMatch(/@AI:ANCHOR/);
    expect(mainSource).toMatch(/<TDSMobileAITProvider>/);
    expect(mainSource).toMatch(/<BrowserRouter>/);
    expect(mainSource).toMatch(/<App\s*\/>/);
  });

  it("AC-4[P0]: 온보딩 완료 상태에서 '/' 경로 접근 시 Home이 정상 렌더링된다(흰 화면 아님)", () => {
    const { container } = renderWithRouter(React.createElement(App), {
      initialEntries: ["/"],
    });
    expect(screen.getByText("수면 부채")).toBeInTheDocument();
    expect(container.textContent).not.toBe("");
  });

  it("AC-4: 온보딩 미완료 상태에서는 경로와 무관하게 설정 화면을 먼저 보여준다", () => {
    localStorage.removeItem("sdt.settings");
    const { container } = renderWithRouter(React.createElement(App), {
      initialEntries: ["/report"],
    });
    expect(container.querySelector("h1")?.textContent).toBe("설정");
    expect(screen.queryByText("주간 리포트")).not.toBeInTheDocument();
  });

  it("존재하지 않는 경로로 진입해도 크래시하지 않는다", () => {
    expect(() =>
      renderWithRouter(React.createElement(App), {
        initialEntries: ["/does-not-exist"],
      }),
    ).not.toThrow();
  });
});
