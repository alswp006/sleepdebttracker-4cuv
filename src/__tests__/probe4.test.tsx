import { describe, it } from "vitest";
import React from "react";
import { screen, fireEvent } from "@testing-library/react";
import { renderWithRouter } from "@/__tests__/__helpers__/test-utils";
import { FloatingTabBar } from "@/components/FloatingTabBar";
import { useLocation } from "react-router-dom";

const TAB_ITEMS = [
  { label: "홈", path: "/" },
  { label: "설정", path: "/settings" },
];

function Wrapper() {
  const loc = useLocation();
  return (
    <div>
      <div data-testid="loc">{loc.pathname}</div>
      <FloatingTabBar items={TAB_ITEMS} />
    </div>
  );
}

describe("probe4", () => {
  it("tab click navigates", () => {
    renderWithRouter(React.createElement(Wrapper), { initialEntries: ["/"] });
    console.log("before:", screen.getByTestId("loc").textContent);
    fireEvent.click(screen.getByRole("tab", { name: "설정" }));
    console.log("after:", screen.getByTestId("loc").textContent);
  });
});
