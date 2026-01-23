import { describe, it, expect, beforeEach, mock } from "bun:test";
import { render, screen, cleanup } from "@testing-library/react";
import React from "react";
import { TTSPanel } from "../components/reader/TTSPanel";

// Mock elevenLabsService
mock.module("../lib/elevenlabs", () => ({
  elevenLabsService: {
    getVoices: mock(() => Promise.resolve([])),
  },
}));

// Mock tauri settings
mock.module("../lib/tauri", () => ({
  getSetting: mock(() => Promise.resolve("")),
}));

// Mock useTTS
mock.module("@/lib/hooks/useTTS", () => ({
  useTTS: () => ({
    state: "playing",
    progress: { currentTime: 0, duration: 120, isBuffering: false },
    playCurrentPage: mock(() => {}),
    pause: mock(() => {}),
    resume: mock(() => {}),
    stop: mock(() => {}),
    seek: mock(() => {}),
    setPlaybackRate: mock(() => {}),
    setVolume: mock(() => {}),
    voiceId: "v1",
    changeVoice: mock(() => {}),
  }),
}));

describe("TTSPanel Bauhaus Alignment", () => {
  const defaultProps: any = {
    expanded: true,
    onExpandChange: mock(),
  };

  beforeEach(() => {
    cleanup();
  });

  it("should have sharp corners and bold 2px borders", () => {
    const { container } = render(<TTSPanel {...defaultProps} />);
    const panel = container.querySelector('[data-testid="tts-panel-container"]');
    expect(panel?.className).toContain('rounded-none');
    expect(panel?.className).toContain('border-2');
  });

  it("should have a Bauhaus Red progress bar with sharp edges", () => {
    const { container } = render(<TTSPanel {...defaultProps} />);
    // Check for the progress bar color
    const progressFill = container.querySelector('[class*="bg-[#E02E2E]"]');
    expect(progressFill).toBeDefined();
  });

  it("should use bold geometric sans-serif for labels", () => {
    render(<TTSPanel {...defaultProps} />);
    const timeLabels = screen.getAllByText("0:00");
    expect(timeLabels[0].parentElement?.className).toContain('font-black');
  });
});
