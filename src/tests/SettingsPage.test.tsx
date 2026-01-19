import { describe, it, expect, beforeEach, beforeAll, afterEach, mock, spyOn } from "bun:test";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import * as matchers from "@testing-library/jest-dom/matchers";
import React from "react";
import * as tauri from "../lib/tauri";
import * as openai from "../lib/openai";

expect.extend(matchers);

import SettingsPage from "../routes/SettingsPage";

describe("SettingsPage", () => {
  const spies: any[] = [];

  beforeAll(() => {
    global.ResizeObserver = class {
      observe() { }
      unobserve() { }
      disconnect() { }
    };
  });

  beforeEach(() => {
    cleanup();
    mock.restore();

    spies.push(spyOn(tauri, 'getSetting').mockResolvedValue(null));
    spies.push(spyOn(tauri, 'setSetting').mockResolvedValue(undefined as any));
    spies.push(spyOn(tauri, 'openAiKeyStatus').mockResolvedValue({ has_env_key: false, has_saved_key: false }));
    spies.push(spyOn(tauri, 'dbInit').mockResolvedValue(undefined as any));

    spies.push(spyOn(openai, 'listModels').mockResolvedValue(["gpt-4", "gpt-3.5-turbo"]));
  });

  afterEach(() => {
    spies.forEach(s => s.mockRestore());
    spies.length = 0;
    cleanup();
  });

  const navigateToTab = (tabName: string) => {
    fireEvent.click(screen.getByText(new RegExp(tabName, "i")));
  };

  it("renders the ElevenLabs API key input", async () => {
    render(<SettingsPage />);
    navigateToTab("Audio & TTS");
    expect(screen.getAllByText(/ElevenLabs API Key/i)[0]).toBeInTheDocument();
  });

  it("renders the Connection Status section", async () => {
    render(<SettingsPage />);
    navigateToTab("Audio & TTS");
    expect(screen.getByText(/Connection Status/i)).toBeInTheDocument();
  });

  it("shows the settings page content", async () => {
    // Mock getSetting to return minimal valid config
    spies.push(spyOn(tauri, 'getSetting').mockImplementation(async (key: string) => {
      if (key === 'openai_api_key') return 'sk-test-key';
      return null;
    }));
    render(<SettingsPage />);
    expect(screen.getByRole("heading", { name: /Settings/i, level: 2 })).toBeInTheDocument();
  });
});
