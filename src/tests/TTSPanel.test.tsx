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
});
