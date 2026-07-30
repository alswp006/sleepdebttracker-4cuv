import { describe, it } from "vitest";
import React from "react";
import { screen, fireEvent } from "@testing-library/react";
import { Routes, Route, useLocation } from "react-router-dom";
import { renderWithRouter } from "@/__tests__/__helpers__/test-utils";
import { FloatingTabBar } from "@/components/FloatingTabBar";

const TAB_ITEMS = [
  { label: "홈", path: "/" },
  { label: "설정", path: "/settings" },
];

function HomeLike() {
  return (
    <div>
      <div data-testid="page">home</div>
      <FloatingTabBar items={TAB_ITEMS} />
    </div>
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

describe("probe5", () => {
  it("tab click navigates through Routes", () => {
    renderWithRouter(React.createElement(MiniApp), { initialEntries: ["/"] });
    console.log("before:", screen.getByTestId("page").textContent);
    fireEvent.click(screen.getByRole("tab", { name: "설정" }));
    console.log("after:", screen.getByTestId("page").textContent);
  });
});
