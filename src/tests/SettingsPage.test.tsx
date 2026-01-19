// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';
import SettingsPage from '../routes/SettingsPage';

expect.extend(matchers);

// Mock tauri functions
vi.mock('../lib/tauri', () => ({
  getSetting: vi.fn().mockResolvedValue(null),
  setSetting: vi.fn().mockResolvedValue(undefined),
  openAiKeyStatus: vi.fn().mockResolvedValue({ has_env_key: false, has_saved_key: false }),
}));

// Mock openai functions
vi.mock('@/lib/openai', () => ({
  listModels: vi.fn().mockResolvedValue(['gpt-4', 'gpt-3.5-turbo']),
}));

// Mock elevenlabs functions
vi.mock('@/lib/elevenlabs', () => ({
  elevenLabsService: {
    testSpeech: vi.fn().mockResolvedValue(undefined),
  },
}));

describe('SettingsPage', () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('renders the ElevenLabs API key input', () => {
    render(<SettingsPage />);
    // @ts-ignore
    expect(screen.getAllByText(/ElevenLabs API Key/i)[0]).toBeInTheDocument();
  });

  it('renders the Test Connection button', () => {
    render(<SettingsPage />);
    // @ts-ignore
    expect(screen.getByText(/Test Connection/i)).toBeInTheDocument();
  });
});
