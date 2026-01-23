import { describe, it, expect } from "bun:test";
import { render, screen } from "@testing-library/react";
import React from "react";
import HighlightsList from "../components/reader/HighlightsList";
import HighlightNote from "../components/reader/HighlightNote";

// Mock Highlight type
const mockHighlight: any = {
  id: 1,
  text: "Sample highlight text",
  note: "Sample note",
  cfi: "sample-cfi",
  color: "yellow",
  created_at: new Date().toISOString()
};

describe("Global Bauhaus Colors", () => {
  it("HighlightNote should not use amber colors", () => {
    const { container } = render(
      <HighlightNote 
        highlight={mockHighlight}
        noteDraft=""
        onNoteDraftChange={() => {}}
        onSaveNote={() => {}}
      />
    );
    const amberElements = container.querySelectorAll('[class*="amber"]');
    expect(amberElements.length).toBe(0);
  });

  it("HighlightsList should not use amber colors", () => {
    const { container } = render(
      <HighlightsList 
        highlights={[mockHighlight]}
        selectedHighlightId={1}
        onSelectHighlight={() => {}}
        onDeleteHighlight={() => {}}
        highlightPageMap={{}}
        noteDraft=""
        onNoteDraftChange={() => {}}
        onSaveNote={() => {}}
        selectedHighlight={mockHighlight}
      />
    );
    const amberElements = container.querySelectorAll('[class*="amber"]');
    expect(amberElements.length).toBe(0);
  });
});
