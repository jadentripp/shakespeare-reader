// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';
import SettingsPage from '../routes/SettingsPage';

expect.extend(matchers);

// Mock tauri functions
vi.mock('../lib/tauri', () => ({
  getSetting: vi.fn().mockImplementation((key) => {
      if (key === 'elevenlabs_api_key') return Promise.resolve('fake-key');
      if (key === 'elevenlabs_voice_id') return Promise.resolve('v1');
      return Promise.resolve(null);
  }),
  setSetting: vi.fn().mockResolvedValue(undefined),
  openAiKeyStatus: vi.fn().mockResolvedValue({ has_env_key: false, has_saved_key: false }),
}));

// Mock elevenlabs functions
vi.mock('@/lib/elevenlabs', () => ({
  elevenLabsService: {
    testSpeech: vi.fn().mockResolvedValue(undefined),
    getVoices: vi.fn().mockResolvedValue([
        { voice_id: 'v1', name: 'Rachel', preview_url: 'https://example.com/preview.mp3' },
        { voice_id: 'v2', name: 'Clyde' }
    ]),
  },
}));

describe('SettingsPage Voice Selection', () => {
  beforeAll(() => {
    // @ts-ignore
    global.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
    // Mock Audio
    // @ts-ignore
    global.Audio = vi.fn().mockImplementation(() => ({
      play: vi.fn(),
      pause: vi.fn(),
    }));
  });

  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  const navigateToTab = (tabName: string) => {
    fireEvent.click(screen.getByText(new RegExp(tabName, 'i')));
  };

  it('renders the Voice selection dropdown', async () => {
    render(<SettingsPage />);
    navigateToTab('Audio & TTS');
    // @ts-ignore
    expect(await screen.findByText(/Narrator Voice/i)).toBeInTheDocument();
  });

  it('shows preview button when a voice with preview is selected', async () => {
    render(<SettingsPage />);
    navigateToTab('Audio & TTS');
    // Since v1 is mocked as default or found, it might show up.
    // We might need to wait for voices to load.
    const previewButton = await screen.findByTitle(/Preview voice/i);
    expect(previewButton).toBeInTheDocument();
  });
});
