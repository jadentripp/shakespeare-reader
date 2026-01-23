import { describe, it, expect, beforeEach, mock } from "bun:test";
import { renderHook, act, cleanup } from "@testing-library/react";
import { useReaderAppearance } from "../lib/appearance";

describe("useReaderAppearance", () => {
  beforeEach(() => {
    localStorage.clear();
    cleanup();
    mock.restore();
  });

  it("should return default values when no data in localStorage", () => {
    const { result } = renderHook(() => useReaderAppearance("test-book"));
    expect(result.current.fontFamily).toContain("EB Garamond");
    expect(result.current.lineHeight).toBe(1.65);
    expect(result.current.margin).toBe(40);
  });

  it("should persist changes to localStorage", () => {
    const { result } = renderHook(() => useReaderAppearance("test-book"));

    act(() => {
      result.current.setFontFamily("sans-serif");
    });
    expect(result.current.fontFamily).toBe("sans-serif");

    const stored = JSON.parse(localStorage.getItem("reader-appearance-test-book") || "{}");
    expect(stored.fontFamily).toBe("sans-serif");
  });

  it("should load data from localStorage on initialization", () => {
    localStorage.setItem("reader-appearance-test-book", JSON.stringify({
      fontFamily: "Georgia",
      lineHeight: 2.0,
      margin: 100,
    }));

    const { result } = renderHook(() => useReaderAppearance("test-book"));
    expect(result.current.fontFamily).toBe("Georgia");
    expect(result.current.lineHeight).toBe(2.0);
    expect(result.current.margin).toBe(100);
  });
});
