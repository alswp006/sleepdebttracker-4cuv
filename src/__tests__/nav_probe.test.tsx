import { describe, it } from "vitest";
import React from "react";
import { mockTds } from "@/__tests__/__helpers__/mocks";
import { renderWithRouter } from "@/__tests__/__helpers__/test-utils";
import { screen } from "@testing-library/react";
import { useLocation } from "react-router-dom";

mockTds();

function Probe() {
  const loc = useLocation();
  return <div data-testid="loc">{loc.pathname}</div>;
}

function readLoc() {
  return screen.getByTestId("loc").textContent;
}

describe("nature", () => {
  it("A render at /plan", () => {
    renderWithRouter(React.createElement(Probe), { initialEntries: ["/plan"] });
    console.log("A location:", readLoc());
  });
  it("B render at /report", () => {
    renderWithRouter(React.createElement(Probe), { initialEntries: ["/report"] });
    console.log("B location:", readLoc(), "-> body navs:", document.querySelectorAll("[data-testid=loc]").length);
  });
  it("C render at /", () => {
    renderWithRouter(React.createElement(Probe), { initialEntries: ["/"] });
    console.log("C location:", readLoc());
  });
});
