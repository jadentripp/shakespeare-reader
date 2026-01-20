import { describe, it, expect, mock } from "bun:test";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { ContextTray } from "../components/reader/ContextTray";

describe("ContextTray", () => {
  const mockSnippets = [
    { id: "1", text: "Snippet 1", startPath: [], startOffset: 0, endPath: [], endOffset: 0, rect: { top: 0, left: 0, width: 0, height: 0 } },
    { id: "2", text: "Snippet 2", startPath: [], startOffset: 0, endPath: [], endOffset: 0, rect: { top: 0, left: 0, width: 0, height: 0 } },
  ];

  const defaultProps = {
    snippets: mockSnippets,
    onRemove: mock((id: string) => {}),
    onClear: mock(() => {}),
  };

  it("should render chips for each snippet", () => {
    render(<ContextTray {...defaultProps} />);
    expect(screen.getByText("Snippet 1")).toBeDefined();
    expect(screen.getByText("Snippet 2")).toBeDefined();
  });

  it("should call onRemove when 'X' is clicked", () => {
    render(<ContextTray {...defaultProps} />);
    const removeButtons = screen.getAllByRole("button", { name: /remove/i });
    fireEvent.click(removeButtons[0]);
    expect(defaultProps.onRemove).toHaveBeenCalledWith("1");
  });

  it("should call onClear when 'Clear' is clicked", () => {
    render(<ContextTray {...defaultProps} />);
    const clearButton = screen.getByTitle(/clear context/i);
    fireEvent.click(clearButton);
    expect(defaultProps.onClear).toHaveBeenCalled();
  });

  it("should render nothing when there are no snippets", () => {
    const { container } = render(<ContextTray {...defaultProps} snippets={[]} />);
    expect(container.firstChild).toBeNull();
  });
});
