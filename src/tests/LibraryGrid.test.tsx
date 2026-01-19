// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { LibraryGrid } from "../components/library/LibraryGrid";

describe("LibraryGrid", () => {
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
    expect(container?.className).toContain("flex-col"); // I plan to change space-y-3 to flex-col gap-4
  });
});
