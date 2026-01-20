import { describe, it, expect, mock, beforeEach } from "bun:test";
import { render, screen, fireEvent } from "@testing-library/react";
import * as matchers from "@testing-library/jest-dom/matchers";
import React from "react";

expect.extend(matchers);

const mockPlayCurrentPage = mock(() => {});
const mockPause = mock(() => {});
const mockResume = mock(() => {});
const mockSetPlaybackRate = mock(() => {});
const mockSetVolume = mock(() => {});

// Mock the useTTS hook before importing the component
mock.module("@/lib/hooks/useTTS", () => {
  return {
    useTTS: () => ({
      state: "idle",
      progress: { currentTime: 10, duration: 100, isBuffering: false },
      playCurrentPage: mockPlayCurrentPage,
      pause: mockPause,
      resume: mockResume,
      stop: mock(() => {}),
      getPageText: mock(() => ""),
      autoNext: false,
      setPlaybackRate: mockSetPlaybackRate,
      setVolume: mockSetVolume,
    }),
  };
});

// Import component after mocking
import { TTSPanel } from "../components/reader/TTSPanel";

describe("TTSPanel", () => {
  beforeEach(() => {
    mockPlayCurrentPage.mockClear();
    mockPause.mockClear();
  });

  it("renders the mini-player (collapsed state) initially", () => {
    render(<TTSPanel />);

    // Should show play button
    expect(screen.getByRole("button", { name: /play/i })).toBeInTheDocument();

    // Should show current voice name
    expect(screen.getByText("Voice 1")).toBeInTheDocument();
  });

  it("renders the expanded state when clicked", () => {
    render(<TTSPanel />);

    const panel = screen.getByTestId("tts-panel-container");
    fireEvent.click(panel);

    // Should now show expanded controls
    expect(screen.getByText("Speed")).toBeInTheDocument();
    expect(screen.getByText("Volume")).toBeInTheDocument();
  });

  it("can toggle play/pause", () => {
    render(<TTSPanel />);

    const playButton = screen.getByRole("button", { name: /play/i });
    fireEvent.click(playButton);

    expect(mockPlayCurrentPage).toHaveBeenCalled();
  });

  it("has correct initial collapsed height class", () => {
    render(<TTSPanel />);
    
    const panel = screen.getByTestId("tts-panel-container");
    expect(panel).toHaveClass("h-16");
  });

  it("has expanded height class when clicked", () => {
    render(<TTSPanel />);
    
    const panel = screen.getByTestId("tts-panel-container");
    fireEvent.click(panel);
    
    expect(panel).toHaveClass("h-48");
  });

  it("collapses when collapse button is clicked", () => {
    render(<TTSPanel />);
    
    const panel = screen.getByTestId("tts-panel-container");
    fireEvent.click(panel);
    
    expect(panel).toHaveClass("h-48");
    
    const collapseButton = screen.getByRole("button", { name: /collapse/i });
    fireEvent.click(collapseButton);
    
    expect(panel).toHaveClass("h-16");
  });

  it("has transition animation classes", () => {
    render(<TTSPanel />);
    
    const panel = screen.getByTestId("tts-panel-container");
    expect(panel).toHaveClass("transition-all");
    expect(panel).toHaveClass("duration-300");
    expect(panel).toHaveClass("ease-out");
  });

  describe("Panel Animations", () => {
    it("should have animate-slide-up class for expanded state", () => {
      render(<TTSPanel />);
      
      const panel = screen.getByTestId("tts-panel-container");
      fireEvent.click(panel);
      
      expect(panel).toHaveClass("animate-in");
      expect(panel).toHaveClass("slide-in-from-bottom-0");
    });

    it("should render expanded content with proper timing", () => {
      render(<TTSPanel />);
      
      const panel = screen.getByTestId("tts-panel-container");
      fireEvent.click(panel);
      
      const speedControl = screen.getByText("Speed");
      const volumeControl = screen.getByText("Volume");
      
      expect(speedControl).toBeInTheDocument();
      expect(volumeControl).toBeInTheDocument();
    });
  });

  describe("Swipe Gestures", () => {
    it("should handle touch start for swipe detection", () => {
      render(<TTSPanel />);
      
      const panel = screen.getByTestId("tts-panel-container");
      expect(panel).toBeInTheDocument();
    });

    it("should collapse when swipe down gesture is detected", () => {
      render(<TTSPanel />);
      
      const panel = screen.getByTestId("tts-panel-container");
      
      // First expand the panel
      fireEvent.click(panel);
      expect(panel).toHaveClass("h-48");
      
      // Use pointer events to simulate swipe down gesture
      fireEvent.pointerDown(panel, { clientY: 200 });
      fireEvent.pointerMove(panel, { clientY: 260 });
      fireEvent.pointerUp(panel, { clientY: 260 });
      
      // Panel should collapse after swipe down
      expect(panel).toHaveClass("h-16");
    });

    it("should not collapse on upward swipe when expanded", () => {
      render(<TTSPanel />);
      
      const panel = screen.getByTestId("tts-panel-container");
      
      // First expand the panel
      fireEvent.click(panel);
      expect(panel).toHaveClass("h-48");
      
      // Use pointer events to simulate swipe up (should not trigger collapse)
      fireEvent.pointerDown(panel, { clientY: 200 });
      fireEvent.pointerMove(panel, { clientY: 140 });
      fireEvent.pointerUp(panel, { clientY: 140 });
      
      // Panel should remain expanded
      expect(panel).toHaveClass("h-48");
    });

    it("should have touch-action CSS property for gesture handling", () => {
      render(<TTSPanel />);
      
      const panel = screen.getByTestId("tts-panel-container");
      expect(panel).toHaveClass("touch-none");
    });
  });

  describe("Tap to Expand", () => {
    it("should expand panel on tap of collapsed mini-player", () => {
      render(<TTSPanel />);
      
      const panel = screen.getByTestId("tts-panel-container");
      
      // Initial collapsed state
      expect(panel).toHaveClass("h-16");
      expect(screen.queryByText("Speed")).not.toBeInTheDocument();
      
      // Tap on panel to expand
      fireEvent.click(panel);
      
      // Should now be expanded
      expect(panel).toHaveClass("h-48");
      expect(screen.getByText("Speed")).toBeInTheDocument();
    });

    it("should stop propagation when clicking controls", () => {
      render(<TTSPanel />);
      
      const panel = screen.getByTestId("tts-panel-container");
      
      // Expand first
      fireEvent.click(panel);
      
      // Click on play button - should not collapse
      const playButton = screen.getByRole("button", { name: /play/i });
      fireEvent.click(playButton);
      
      // Panel should still be expanded (controls have stopPropagation)
      expect(panel).toHaveClass("h-48");
    });
  });
});
