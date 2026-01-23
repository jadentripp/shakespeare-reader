import { describe, it, expect, beforeEach, afterEach, beforeAll, mock, spyOn } from "bun:test";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import * as matchers from "@testing-library/jest-dom/matchers";
import React from "react";

expect.extend(matchers);

const mockGetSetting = mock().mockImplementation((key: string) => {
  if (key === "elevenlabs_api_key") return Promise.resolve("fake-key");
  if (key === "elevenlabs_voice_id") return Promise.resolve("v1");
  return Promise.resolve(null);
});
const mockSetSetting = mock().mockResolvedValue(undefined);
const mockOpenAiKeyStatus = mock().mockResolvedValue({
  has_env_key: false,
  has_saved_key: false,
});

const mockTestSpeech = mock().mockResolvedValue(undefined);
const mockGetVoices = mock().mockResolvedValue([
  { voice_id: "v1", name: "Rachel", preview_url: "https://example.com/preview.mp3" },
  { voice_id: "v2", name: "Clyde" },
]);

mock.module("../lib/tauri", () => ({
  getSetting: mockGetSetting,
  setSetting: mockSetSetting,
  openAiKeyStatus: mockOpenAiKeyStatus,
  dbInit: mock(() => Promise.resolve()),
}));

import { elevenLabsService } from "../lib/elevenlabs";
import SettingsPage from "../routes/SettingsPage";

describe("SettingsPage Voice Selection", () => {
  const spies: any[] = [];

  beforeAll(() => {
    global.ResizeObserver = class {
      observe() { }
      unobserve() { }
      disconnect() { }
    };
    global.Audio = class {
      play() { }
      pause() { }
    } as any;
  });

  beforeEach(() => {
    cleanup();
    mock.restore();

    spies.push(spyOn(elevenLabsService, 'getVoices').mockImplementation(() => mockGetVoices()));

    mockGetSetting.mockImplementation((key: string) => {
      if (key === "elevenlabs_api_key") return Promise.resolve("fake-key");
      if (key === "elevenlabs_voice_id") return Promise.resolve("v1");
      return Promise.resolve(null);
    });
    mockSetSetting.mockResolvedValue(undefined);
    mockOpenAiKeyStatus.mockResolvedValue({ has_env_key: false, has_saved_key: false });
  });

  afterEach(() => {
    spies.forEach(s => s.mockRestore());
    spies.length = 0;
  });

  const navigateToTab = (tabName: string) => {
    fireEvent.click(screen.getByText(new RegExp(tabName, "i")));
  };

  it("renders the Voice selection dropdown", async () => {
    render(<SettingsPage />);
    navigateToTab("Audio & TTS");
    expect(await screen.findByText(/Narrator Voice/i)).toBeInTheDocument();
  });

  it("shows preview button when a voice with preview is selected", async () => {
    render(<SettingsPage />);
    navigateToTab("Audio & TTS");
    const previewButton = await screen.findByTitle(/Preview voice/i);
    expect(previewButton).toBeInTheDocument();
  });
});
