import { describe, it } from "vitest";
import React from "react";
import { screen, fireEvent } from "@testing-library/react";
import { mockTds, mockAppsInToss } from "@/__tests__/__helpers__/mocks";
import { renderWithRouter, seedLocalStorage } from "@/__tests__/__helpers__/test-utils";

mockTds();
mockAppsInToss();

import App from "@/App";

describe("probe2", () => {
  it("click nav", () => {
    seedLocalStorage({ "sdt.settings": { targetSleepMin: 480, onboarded: true } });
    renderWithRouter(React.createElement(App), { initialEntries: ["/"] });
    const tab = screen.getByRole("tab", { name: "설정" });
    console.log("before click, tab html:", tab.outerHTML);
    fireEvent.click(tab);
    screen.debug(undefined, 2000);
  });
});
