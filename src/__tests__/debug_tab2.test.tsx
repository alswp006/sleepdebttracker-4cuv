import { describe, it, vi } from "vitest";
import React from "react";
import { screen } from "@testing-library/react";
import { mockTds, mockAppsInToss, mockTossRewardAd } from "@/__tests__/__helpers__/mocks";
import { renderWithRouter } from "@/__tests__/__helpers__/test-utils";

mockTds();
mockAppsInToss();
mockTossRewardAd();

vi.mock("@/lib/settingsStore", () => ({
  getSettings: () => ({ targetSleepMin: 480, onboarded: true }),
  saveSettings: () => ({ ok: true }),
  getSleepType: () => null,
  saveSleepType: () => ({ ok: true }),
  getRewardUnlock: () => ({}),
  setRewardUnlock: () => ({ ok: true }),
}));

import { FloatingTabBar } from "@/components/FloatingTabBar";
import Home from "@/pages/Home";
void Home;

const TAB_ITEMS = [
  { label: "홈", path: "/" },
  { label: "리포트", path: "/report" },
  { label: "플랜", path: "/plan" },
  { label: "설정", path: "/settings" },
];

describe("debug2", () => {
  it("report active", () => {
    renderWithRouter(React.createElement(FloatingTabBar, { items: TAB_ITEMS }), {
      initialEntries: ["/report"],
    });
    screen.debug();
  });
});
