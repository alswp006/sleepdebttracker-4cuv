import { describe, it, expect } from "vitest";
import React from "react";
import { screen } from "@testing-library/react";
import { renderWithRouter } from "@/__tests__/__helpers__/test-utils";
import { FloatingTabBar } from "@/components/FloatingTabBar";

const TAB_ITEMS = [
  { label: "홈", path: "/" },
  { label: "리포트", path: "/report" },
];

describe("debug", () => {
  it("report active", () => {
    renderWithRouter(React.createElement(FloatingTabBar, { items: TAB_ITEMS }), {
      initialEntries: ["/report"],
    });
    screen.debug();
  });
});
