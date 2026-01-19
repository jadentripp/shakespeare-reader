import { describe, it, expect, beforeEach, beforeAll, mock } from "bun:test";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import * as matchers from "@testing-library/jest-dom/matchers";
import React from "react";

expect.extend(matchers);

describe("AppearancePanel", () => {
  beforeAll(() => {
    global.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
    if (!Element.prototype.scrollIntoView) {
      Element.prototype.scrollIntoView = () => {};
    }
  });

  beforeEach(() => {
    cleanup();
  });

  const defaultProps = {
    fontFamily: "serif",
    lineHeight: 1.6,
    margin: 40,
    onFontFamilyChange: mock(),
    onLineHeightChange: mock(),
    onMarginChange: mock(),
  };

  it("renders correctly with default props", () => {
    render(<AppearancePanel {...defaultProps} />);
    expect(screen.getByText(/Reader Appearance/i)).toBeInTheDocument();
    expect(screen.getByText(/Typeface/i)).toBeInTheDocument();
    expect(screen.getByText(/Line Spacing/i)).toBeInTheDocument();
    expect(screen.getByText(/Page Margins/i)).toBeInTheDocument();
  });

  it("calls onFontFamilyChange when font selection changes", async () => {
    render(<AppearancePanel {...defaultProps} />);
    const trigger = screen.getByRole("combobox");
    fireEvent.click(trigger);
    const option = await screen.findByText("System Sans");
    fireEvent.click(option);
    expect(defaultProps.onFontFamilyChange).toHaveBeenCalledWith("sans-serif");
  });

  it("renders sliders for line height and margin", () => {
    render(<AppearancePanel {...defaultProps} />);
    const sliders = screen.getAllByRole("slider");
    expect(sliders).toHaveLength(2);
  });
});

import AppearancePanel from "../components/AppearancePanel";
