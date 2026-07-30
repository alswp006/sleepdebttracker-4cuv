import { describe, it } from "vitest";
import React from "react";
import { screen, fireEvent } from "@testing-library/react";
import { Routes, Route, useLocation } from "react-router-dom";
import { mockTds, mockAppsInToss } from "@/__tests__/__helpers__/mocks";
import { renderWithRouter, seedLocalStorage } from "@/__tests__/__helpers__/test-utils";
import { getSettings } from "@/lib/settingsStore";

mockTds();
mockAppsInToss();

import Home from "@/pages/Home";
import SettingsPage from "@/pages/SettingsPage";

function MiniApp() {
  const location = useLocation();
  console.log("MiniApp render, pathname:", location.pathname, "onboarded:", getSettings().onboarded);
  if (!getSettings().onboarded && location.pathname !== "/settings") {
    return <SettingsPage />;
  }
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/settings" element={<SettingsPage />} />
    </Routes>
  );
}

describe("probe6", () => {
  it("tab click navigates through real App logic", () => {
    seedLocalStorage({ "sdt.settings": { targetSleepMin: 480, onboarded: true } });
    renderWithRouter(React.createElement(MiniApp), { initialEntries: ["/"] });
    console.log("before html contains 설정:", document.body.textContent?.includes("설정"));
    fireEvent.click(screen.getByRole("tab", { name: "설정" }));
    console.log("after html:", document.body.textContent?.slice(0, 200));
  });
});
