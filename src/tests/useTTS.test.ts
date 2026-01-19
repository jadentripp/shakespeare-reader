// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTTS } from '../lib/reader/hooks/useTTS';
import { audioPlayer } from '@/lib/elevenlabs';

// Mock audioPlayer
vi.mock('@/lib/elevenlabs', () => ({
  audioPlayer: {
    play: vi.fn().mockResolvedValue(undefined),
    pause: vi.fn(),
    resume: vi.fn(),
    stop: vi.fn(),
    subscribe: vi.fn(),
  },
}));

// Mock readerUtils
vi.mock('@/lib/readerUtils', () => ({
  getPageContent: vi.fn().mockReturnValue({ text: 'Mocked page text' }),
}));

describe('useTTS', () => {
  const mockGetDoc = vi.fn().mockReturnValue({});
  const mockGetPageMetrics = vi.fn().mockReturnValue({});
  const mockOnPageTurnNeeded = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with idle state', () => {
    const { result } = renderHook(() => useTTS({
      getDoc: mockGetDoc,
      getPageMetrics: mockGetPageMetrics,
      currentPage: 1,
    }));
    expect(result.current.state).toBe('idle');
  });

  it('should call audioPlayer.play with page text', async () => {
    const { result } = renderHook(() => useTTS({
      getDoc: mockGetDoc,
      getPageMetrics: mockGetPageMetrics,
      currentPage: 1,
    }));

    await act(async () => {
      await result.current.playCurrentPage();
    });

    expect(audioPlayer.play).toHaveBeenCalledWith('Mocked page text');
  });
});
