import { describe, it, expect, beforeEach } from "bun:test";
import { render, screen, cleanup } from "@testing-library/react";
import { LibraryGrid } from "../components/library/LibraryGrid";
import React from "react";

describe("LibraryGrid", () => {
  beforeEach(() => {
    cleanup();
  });

  it("should render children in grid variant", () => {
    render(
      <LibraryGrid variant="grid">
        <div data-testid="child">Child</div>
      </LibraryGrid>
    );
    const container = screen.getByTestId("child").parentElement;
    expect(container?.className).toContain("grid");
  });

  it("should render children in list variant", () => {
    render(
      <LibraryGrid variant="list">
        <div data-testid="child">Child</div>
      </LibraryGrid>
    );
    const container = screen.getByTestId("child").parentElement;
    expect(container?.className).toContain("flex-col");
  });
});
