import { describe, it, expect, mock, beforeEach } from "bun:test";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import * as matchers from "@testing-library/jest-dom/matchers";
import React from "react";

expect.extend(matchers);

const mockPlayCurrentPage = mock(() => {});
const mockPause = mock(() => {});
const mockResume = mock(() => {});
const mockSetPlaybackRate = mock(() => {});
const mockSetVolume = mock(() => {});
const mockSeek = mock(() => {});
const mockChangeVoice = mock(() => {});

// Mock elevenLabsService
mock.module("@/lib/elevenlabs", () => {
  return {
    elevenLabsService: {
      getVoices: mock(() => Promise.resolve([
        { voice_id: "v1", name: "Voice 1" },
        { voice_id: "v2", name: "Voice 2" }
      ])),
    },
    audioPlayer: {
      subscribe: mock(() => () => {}),
      subscribeProgress: mock(() => () => {}),
      getState: mock(() => 'idle'),
      getProgress: mock(() => ({ currentTime: 0, duration: 0, isBuffering: false })),
    }
  };
});

// Mock the useTTS hook before importing the component
mock.module("@/lib/hooks/useTTS", () => {
  return {
    useTTS: () => ({
      state: "playing", // Start as playing so it renders
      progress: { currentTime: 10, duration: 100, isBuffering: false },
      playCurrentPage: mockPlayCurrentPage,
      pause: mockPause,
      resume: mockResume,
      stop: mock(() => {}),
      getPageText: mock(() => ""),
      autoNext: false,
      setPlaybackRate: mockSetPlaybackRate,
      setVolume: mockSetVolume,
      voiceId: "v1",
      changeVoice: mockChangeVoice,
      seek: mockSeek,
    }),
  };
});

// Import component after mocking
import { TTSPanel } from "../components/reader/TTSPanel";

describe("TTSPanel", () => {
  beforeEach(() => {
    mockPlayCurrentPage.mockClear();
    mockPause.mockClear();
    mockChangeVoice.mockClear();
  });

  it("renders the player bar when playing", async () => {
    render(<TTSPanel />);

    // Should show pause button (since we mocked playing)
    // In the new UI, the pause button is an icon button
    const pauseButton = await waitFor(() => screen.getByTestId("tts-panel-container").querySelector('button svg.lucide-pause')?.closest('button'));
    expect(pauseButton).toBeInTheDocument();

    // Should show current voice name
    expect(await screen.findByText("Voice 1")).toBeInTheDocument();
  });

  it("can toggle play/pause", async () => {
    render(<TTSPanel />);

    const pauseButton = await waitFor(() => screen.getByTestId("tts-panel-container").querySelector('button svg.lucide-pause')?.closest('button'));
    fireEvent.click(pauseButton!);

    expect(mockPause).toHaveBeenCalled();
  });

  it("displays progress slider", () => {
    render(<TTSPanel />);
    const slider = screen.getByRole("slider");
    expect(slider).toBeInTheDocument();
  });

  it("displays current time and duration", () => {
    render(<TTSPanel />);
    expect(screen.getByText("0:10")).toBeInTheDocument();
    expect(screen.getByText("1:40")).toBeInTheDocument(); // 100 seconds
  });

  it("renders voice selector button", async () => {
    render(<TTSPanel />);
    expect(await screen.findByText("Voice 1")).toBeInTheDocument();
  });

  it("has a close/hide button", () => {
    render(<TTSPanel />);
    // Look for the X icon button
    const closeButton = screen.getByTestId("tts-panel-container").querySelector('button svg.lucide-x')?.closest('button');
    expect(closeButton).toBeInTheDocument();
  });
});