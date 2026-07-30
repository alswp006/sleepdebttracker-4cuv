import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { screen, fireEvent } from "@testing-library/react";
import { mockAll, mockNavigate } from "@/__tests__/__helpers__/mocks";
import { renderWithRouter } from "@/__tests__/__helpers__/test-utils";

// ============================================================================
// PACKET 0010: 온보딩/설정 페이지 (`/settings`)
// ============================================================================
// 최초 1회 안내 카드 표시 → 완료 시 onboarded:true 저장.
// 목표 수면 시간(360~600분, 10분 단위)을 "target-decrease"/"target-increase"
// 버튼(data-testid)으로 조절하고(범위 밖은 clamp), "저장" 버튼을 누르면
// saveSettings로 저장 + Toast '목표를 저장했어요' 노출.

mockAll();

const mockGetSettings = vi.fn();
const mockSaveSettings = vi.fn();
vi.mock("@/lib/settingsStore", () => ({
  getSettings: () => mockGetSettings(),
  saveSettings: (...args: unknown[]) => mockSaveSettings(...args),
}));

import SettingsPage from "@/pages/SettingsPage";

describe("온보딩/설정 페이지 (`/settings`)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSettings.mockReturnValue({ targetSleepMin: 480, onboarded: true });
    mockSaveSettings.mockReturnValue({ ok: true });
  });

  // ── AC-1[P0]: 목표 시간 조절 → clamp 저장 + Toast ──
  describe("AC-1[P0]: 목표 수면 시간 조절 UI(360~600분, clamp)로 saveSettings 저장하고 Toast를 띄운다", () => {
    it("초기 480분에서 '+10분' 3회 클릭 후 '저장' 탭 시 saveSettings({targetSleepMin:510,...}) 호출 + Toast '목표를 저장했어요' 표시", () => {
      renderWithRouter(React.createElement(SettingsPage));

      const inc = screen.getByTestId("target-increase");
      fireEvent.click(inc);
      fireEvent.click(inc);
      fireEvent.click(inc);
      fireEvent.click(screen.getByRole("button", { name: "저장" }));

      expect(mockSaveSettings).toHaveBeenCalledTimes(1);
      const saved = mockSaveSettings.mock.calls[0][0];
      expect(saved.targetSleepMin).toBe(510);
      expect(screen.getByText("목표를 저장했어요")).not.toBeNull();
    });

    it("targetSleepMin이 360(하한)일 때 '-10분'을 클릭해도 표시값은 360에서 더 내려가지 않는다(clamp)", () => {
      mockGetSettings.mockReturnValue({ targetSleepMin: 360, onboarded: true });
      renderWithRouter(React.createElement(SettingsPage));

      const dec = screen.getByTestId("target-decrease");
      fireEvent.click(dec);
      fireEvent.click(dec);

      expect(screen.getByTestId("target-value").textContent).toContain("360");
      fireEvent.click(screen.getByRole("button", { name: "저장" }));
      const saved = mockSaveSettings.mock.calls[0][0];
      expect(saved.targetSleepMin).toBe(360);
    });

    it("targetSleepMin이 600(상한)일 때 '+10분'을 클릭해도 표시값은 600을 초과하지 않는다(clamp)", () => {
      mockGetSettings.mockReturnValue({ targetSleepMin: 600, onboarded: true });
      renderWithRouter(React.createElement(SettingsPage));

      const inc = screen.getByTestId("target-increase");
      fireEvent.click(inc);
      fireEvent.click(inc);

      expect(screen.getByTestId("target-value").textContent).toContain("600");
      fireEvent.click(screen.getByRole("button", { name: "저장" }));
      const saved = mockSaveSettings.mock.calls[0][0];
      expect(saved.targetSleepMin).toBe(600);
    });
  });

  // ── AC-2[P0]: 최초 진입 안내 카드 → 완료 시 onboarded:true 저장 ──
  describe("AC-2[P0]: 최초 진입(onboarded:false) 시 안내 카드를 표시하고, 완료 탭 시 onboarded:true를 저장한다", () => {
    it("onboarded:false면 'onboarding-card'가 보이고, '확인' 탭 시 saveSettings({onboarded:true,...}) 호출 후 카드가 사라진다", () => {
      mockGetSettings.mockReturnValue({ targetSleepMin: 480, onboarded: false });
      renderWithRouter(React.createElement(SettingsPage));

      expect(screen.getByTestId("onboarding-card")).not.toBeNull();

      fireEvent.click(screen.getByRole("button", { name: "확인" }));

      expect(mockSaveSettings).toHaveBeenCalledTimes(1);
      const saved = mockSaveSettings.mock.calls[0][0];
      expect(saved.onboarded).toBe(true);
      expect(screen.queryByTestId("onboarding-card")).toBeNull();
    });

    it("onboarded:true면 안내 카드가 렌더되지 않고 목표 조절 UI가 바로 보인다", () => {
      mockGetSettings.mockReturnValue({ targetSleepMin: 480, onboarded: true });
      renderWithRouter(React.createElement(SettingsPage));

      expect(screen.queryByTestId("onboarding-card")).toBeNull();
      expect(screen.getByTestId("target-value")).not.toBeNull();
    });
  });

  // ── AC-3[P1]: 저장된 target을 getSettings로 즉시 반영해 초기 표시 ──
  describe("AC-3[P1]: 마운트 시 getSettings()로 저장된 목표값을 읽어 초기 표시에 즉시 반영한다", () => {
    it("getSettings가 targetSleepMin:420을 반환하면 초기 렌더에서 target-value에 420이 표시된다", () => {
      mockGetSettings.mockReturnValue({ targetSleepMin: 420, onboarded: true });
      renderWithRouter(React.createElement(SettingsPage));

      expect(mockGetSettings).toHaveBeenCalled();
      expect(screen.getByTestId("target-value").textContent).toContain("420");
    });
  });

  // ── AC-4[P1]: 접근성/색상 — 인터랙티브 요소 크기, 버튼 중첩 없음 ──
  describe("AC-4[P1]: 인터랙티브 요소는 44px 이상이고 버튼 중첩이 없다", () => {
    it("target-increase/target-decrease/저장 버튼 모두 min-height 또는 height 스타일이 44px 이상으로 지정된다", () => {
      renderWithRouter(React.createElement(SettingsPage));

      const inc = screen.getByTestId("target-increase");
      const dec = screen.getByTestId("target-decrease");
      const save = screen.getByRole("button", { name: "저장" });

      [inc, dec, save].forEach((el) => {
        const style = el.getAttribute("style") ?? "";
        const minHeight = parseInt(
          style.match(/min-height:\s*(\d+)px/)?.[1] ??
            style.match(/height:\s*(\d+)px/)?.[1] ??
            "0",
          10,
        );
        expect(minHeight).toBeGreaterThanOrEqual(44);
      });
    });

    it("어떤 button도 다른 button을 자식으로 포함하지 않는다(버튼 중첩 없음)", () => {
      const { container } = renderWithRouter(React.createElement(SettingsPage));

      container.querySelectorAll("button").forEach((btn) => {
        expect(btn.querySelector("button")).toBeNull();
      });
    });
  });

  // ── 레이아웃 골격: ScreenScaffold + 전체폭 CTA ──
  describe("레이아웃 골격 검증", () => {
    it("페이지가 렌더되고 '저장' 버튼이 role=button으로 존재한다(전체폭 SubmitFooter/CTA)", () => {
      renderWithRouter(React.createElement(SettingsPage));

      expect(screen.getByRole("button", { name: "저장" })).not.toBeNull();
    });
  });
});
