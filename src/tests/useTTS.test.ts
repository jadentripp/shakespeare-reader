import { describe, it, expect, beforeEach, afterEach, mock, spyOn } from 'bun:test';
import { renderHook, act } from '@testing-library/react';
import { useTTS } from '../lib/reader/hooks/useTTS';
import { audioPlayer } from '@/lib/elevenlabs';
import * as readerUtils from '@/lib/readerUtils';
import * as tauri from '@/lib/tauri';

describe('useTTS', () => {
  const mockGetDoc = mock(() => ({}));
  const mockGetPageMetrics = mock(() => ({}));
  const mockOnPageTurnNeeded = mock(() => { });
  const spies: any[] = [];

  beforeEach(() => {
    mock.restore();

    // Setup spies
    spies.push(spyOn(audioPlayer, 'play').mockResolvedValue(undefined as any));
    spies.push(spyOn(audioPlayer, 'pause').mockImplementation(() => { }));
    spies.push(spyOn(audioPlayer, 'resume').mockImplementation(() => { }));
    spies.push(spyOn(audioPlayer, 'stop').mockImplementation(() => { }));
    spies.push(spyOn(audioPlayer, 'getState').mockReturnValue('idle'));
    spies.push(spyOn(audioPlayer, 'subscribe').mockReturnValue(() => { }));

    spies.push(spyOn(readerUtils, 'getPageContent').mockReturnValue({ text: 'Mocked page text' } as any));
    spies.push(spyOn(tauri, 'getSetting').mockResolvedValue(null));

    mockGetDoc.mockClear();
    mockGetPageMetrics.mockClear();
    mockOnPageTurnNeeded.mockClear();
  });

  afterEach(() => {
    spies.forEach(s => s.mockRestore());
    spies.length = 0;
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

    expect(audioPlayer.play).toHaveBeenCalledWith('Mocked page text', undefined, undefined);
  });
});
