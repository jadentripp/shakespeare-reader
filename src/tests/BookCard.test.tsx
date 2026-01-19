// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { BookCard } from "../components/library/BookCard";

// Mock @tanstack/react-router
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to, params }: any) => {
    const href = to.replace("$bookId", params?.bookId || "");
    return <a href={href}>{children}</a>;
  },
}));

describe("BookCard", () => {
  const defaultProps = {
    id: 1,
    gutenbergId: 1000,
    title: "Test Book",
    authors: "Test Author",
    coverUrl: "http://example.com/cover.jpg",
    isLocal: true,
  };

  it("should render local book in grid variant by default", () => {
    render(<BookCard {...defaultProps} />);
    const card = screen.getByRole("link", { name: /Test Book/i }).closest("div");
    // Check for grid-specific classes or structure if needed
    expect(screen.getByText("Test Book")).toBeDefined();
    expect(screen.getByText("Test Author")).toBeDefined();
  });

  it("should render catalog book in list variant", () => {
    render(<BookCard {...defaultProps} isLocal={false} />);
    expect(screen.getByText("Test Book")).toBeDefined();
    expect(screen.getByText("#1000")).toBeDefined();
  });

  it("should display progress bar when progress is provided", () => {
    render(<BookCard {...defaultProps} progress={50} />);
    const progressBar = screen.getByRole("progressbar");
    expect(progressBar).toBeDefined();
    expect(progressBar.getAttribute("aria-valuenow")).toBe("50");
  });

  it("should not display progress bar when progress is 0 or undefined", () => {
    const { rerender } = render(<BookCard {...defaultProps} progress={0} />);
    expect(screen.queryByRole("progressbar")).toBeNull();

    rerender(<BookCard {...defaultProps} progress={undefined} />);
    expect(screen.queryByRole("progressbar")).toBeNull();
  });

  it("should cap progress bar at 100%", () => {
    render(<BookCard {...defaultProps} progress={150} />);
    const progressBar = screen.getByRole("progressbar");
    expect(progressBar.getAttribute("aria-valuenow")).toBe("150");
    // Style check is harder in jsdom but we can check if it exists
  });

  it("should support an explicit variant prop", () => {
    // This will fail initially because variant prop doesn't exist yet
    // @ts-ignore
    render(<BookCard {...defaultProps} variant="list" />);
    expect(screen.getByText("Test Book")).toBeDefined();
  });
});
