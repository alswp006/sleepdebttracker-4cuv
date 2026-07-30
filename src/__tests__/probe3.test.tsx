import { describe, it } from "vitest";
import React from "react";
import { screen, fireEvent } from "@testing-library/react";
import { renderWithRouter } from "@/__tests__/__helpers__/test-utils";
import { useNavigate, useLocation } from "react-router-dom";

function Probe() {
  const navigate = useNavigate();
  const loc = useLocation();
  return (
    <div>
      <div data-testid="loc">{loc.pathname}</div>
      <button onClick={() => navigate("/settings")}>go</button>
    </div>
  );
}

describe("probe3", () => {
  it("navigate updates location", () => {
    renderWithRouter(React.createElement(Probe), { initialEntries: ["/"] });
    console.log("before:", screen.getByTestId("loc").textContent);
    fireEvent.click(screen.getByText("go"));
    console.log("after:", screen.getByTestId("loc").textContent);
  });
});
