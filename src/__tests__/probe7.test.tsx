import { describe, it } from "vitest";
import React from "react";
import { screen, fireEvent } from "@testing-library/react";
import { Routes, Route, useLocation } from "react-router-dom";
import { mockTds, mockAppsInToss } from "@/__tests__/__helpers__/mocks";
import { renderWithRouter } from "@/__tests__/__helpers__/test-utils";

mockTds();
mockAppsInToss();

import { ScreenScaffold } from "@/components/ScreenScaffold";
import { FloatingTabBar } from "@/components/FloatingTabBar";
import { Top } from "@toss/tds-mobile";

const TAB_ITEMS = [
  { label: "홈", path: "/" },
  { label: "설정", path: "/settings" },
];

function HomeLike() {
  return (
    <ScreenScaffold top={<Top title={<Top.TitleParagraph>수면 부채</Top.TitleParagraph>} />}>
      <div>content</div>
      <FloatingTabBar items={TAB_ITEMS} />
    </ScreenScaffold>
  );
}
function SettingsLike() {
  return <div data-testid="page">settings</div>;
}

function MiniApp() {
  const location = useLocation();
  console.log("MiniApp render, pathname:", location.pathname);
  return (
    <Routes>
      <Route path="/" element={<HomeLike />} />
      <Route path="/settings" element={<SettingsLike />} />
    </Routes>
  );
}

describe("probe7", () => {
  it("ScreenScaffold-wrapped tab click navigates", () => {
    renderWithRouter(React.createElement(MiniApp), { initialEntries: ["/"] });
    fireEvent.click(screen.getByRole("tab", { name: "설정" }));
    console.log("after:", document.body.textContent);
  });
});
