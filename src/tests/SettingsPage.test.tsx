// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
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

describe('SettingsPage', () => {
  beforeAll(() => {
    // @ts-ignore
    global.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  });

  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  const navigateToTab = (tabName: string) => {
    fireEvent.click(screen.getByText(new RegExp(tabName, 'i')));
  };

  it('renders the ElevenLabs API key input', async () => {
    render(<SettingsPage />);
    navigateToTab('Audio & TTS');
    // @ts-ignore
    expect(screen.getAllByText(/ElevenLabs API Key/i)[0]).toBeInTheDocument();
  });

  it('renders the Test Connection button', async () => {
    render(<SettingsPage />);
    navigateToTab('Audio & TTS');
    // @ts-ignore
    expect(screen.getByText(/Test Connection/i)).toBeInTheDocument();
  });

  it('switches sections when sidebar tabs are clicked', async () => {
    render(<SettingsPage />);
    
    // Initially should show Appearance
    expect(screen.getByText(/Font Family/i)).toBeInTheDocument();
    
    // Click AI Assistant
    navigateToTab('AI Assistant');
    
    // Should show OpenAI related stuff
    expect(screen.getByText(/API Configuration/i)).toBeInTheDocument();
    
    // Click Audio
    navigateToTab('Audio & TTS');
    
    // Should show ElevenLabs related stuff
    expect(screen.getByText(/ElevenLabs API Key/i)).toBeInTheDocument();
  });
});
