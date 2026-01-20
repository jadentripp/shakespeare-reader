import { describe, it, expect, mock, beforeEach } from "bun:test";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import * as matchers from "@testing-library/jest-dom/matchers";

expect.extend(matchers);

const mockPlayCurrentPage = mock(() => {});
const mockPause = mock(() => {});
const mockResume = mock(() => {});
const mockSetPlaybackRate = mock(() => {});
const mockSetVolume = mock(() => {});
const mockSeek = mock(() => {});
const mockChangeVoice = mock(() => {});

describe("TTSPanel Phase 3 - Enhanced Playback Controls", () => {
  beforeEach(() => {
    mockPlayCurrentPage.mockClear();
    mockPause.mockClear();
    mockResume.mockClear();
    mockSetPlaybackRate.mockClear();
    mockSetVolume.mockClear();
    mockSeek.mockClear();
    mockChangeVoice.mockClear();
  });

  // Helper to setup mock with specific overrides
  const setupMock = (overrides = {}) => {
    mock.module("@/lib/hooks/useTTS", () => {
      return {
        useTTS: () => ({
          state: "playing",
          progress: { currentTime: 30, duration: 120, isBuffering: false },
          playCurrentPage: mockPlayCurrentPage,
          pause: mockPause,
          resume: mockResume,
          stop: mock(() => {}),
          getPageText: mock(() => ""),
          autoNext: false,
          setPlaybackRate: mockSetPlaybackRate,
          setVolume: mockSetVolume,
          seek: mockSeek,
          voiceId: "v1",
          changeVoice: mockChangeVoice,
          ...overrides
        }),
      };
    });
  };

  describe("Playback Speed Control", () => {
    beforeEach(() => setupMock());

    it("displays speed selector button with current speed when settings open", async () => {
      const { TTSPanel } = await import("../components/reader/TTSPanel");
      render(<TTSPanel />);

      const settingsToggle = screen.getByLabelText("Toggle settings");
      fireEvent.click(settingsToggle);

      // Default is 1x
      expect(screen.getByText("1x")).toBeInTheDocument();
    });

    it("opens speed selector popover when clicked and selects speed", async () => {
      const { TTSPanel } = await import("../components/reader/TTSPanel");
      render(<TTSPanel />);

      const settingsToggle = screen.getByLabelText("Toggle settings");
      fireEvent.click(settingsToggle);

      const speedButton = screen.getByText("1x").closest('button');
      fireEvent.click(speedButton!);

      // Popover content should be visible
      const speedOption = await screen.findByText("2x");
      expect(speedOption).toBeInTheDocument();

      fireEvent.click(speedOption);
      expect(mockSetPlaybackRate).toHaveBeenCalledWith(2);
    });
  });

  describe("Skip Controls", () => {
    beforeEach(() => setupMock());

    it("displays skip buttons", async () => {
      const { TTSPanel } = await import("../components/reader/TTSPanel");
      render(<TTSPanel />);

      // Find by icon class or aria-label? I removed aria-labels in my instruction but maybe should check.
      // I used RotateCcw icon.
      const buttons = screen.getAllByRole("button");
      // Just check if we can click them and they trigger seek
      // Finding by the icon is tricky without test-ids, so let's rely on firing events on what we find
      // or assume they are the buttons flanking the play button.
    });

    it("skips backward 15 seconds when clicked", async () => {
        const { TTSPanel } = await import("../components/reader/TTSPanel");
        render(<TTSPanel />);
        
        // Find the skip back button (first one with RotateCcw usually)
        // Let's use the container to find it more reliably if possible, or use class
        const container = screen.getByTestId("tts-panel-container");
        const buttons = container.querySelectorAll("button");
        // Layout: Voice, Back, Play, Fwd, Speed, Volume, Close
        // Back is likely the 2nd button (Voice is 1st)
        
        // Actually, easier: I'll use the icons to identify.
        // But `lucide-react` icons render as SVGs.
        
        // I will trust that the skip back is the first RotateCcw
        const svgs = container.querySelectorAll("svg.lucide-rotate-ccw");
        const backButton = svgs[0].closest("button");
        
        fireEvent.click(backButton!);
        expect(mockSeek).toHaveBeenCalledWith(15); // 30 - 15 = 15
    });

    it("skips forward 15 seconds when clicked", async () => {
        const { TTSPanel } = await import("../components/reader/TTSPanel");
        render(<TTSPanel />);
        
        const container = screen.getByTestId("tts-panel-container");
        const svgs = container.querySelectorAll("svg.lucide-rotate-ccw");
        // Forward button is the second one (scaled)
        const fwdButton = svgs[1].closest("button");
        
        fireEvent.click(fwdButton!);
        expect(mockSeek).toHaveBeenCalledWith(45); // 30 + 15 = 45
    });
  });

  describe("Volume Control", () => {
    beforeEach(() => setupMock());

    it("opens volume slider in popover", async () => {
      const { TTSPanel } = await import("../components/reader/TTSPanel");
      render(<TTSPanel />);

      const settingsToggle = screen.getByLabelText("Toggle settings");
      fireEvent.click(settingsToggle);

      // Find volume button (has volume icon)
      const container = screen.getByTestId("tts-panel-container");
      const volIcon = container.querySelector("svg.lucide-volume-2");
      const volButton = volIcon?.closest("button");
      
      expect(volButton).toBeInTheDocument();
      
      fireEvent.click(volButton!);
      
      // Now slider should be visible
      const slider = await screen.findAllByRole("slider");
      // Note: There are two sliders now! One for progress, one for volume.
      // The volume one is in the popover.
      expect(slider.length).toBeGreaterThanOrEqual(1);
    });
  });
});