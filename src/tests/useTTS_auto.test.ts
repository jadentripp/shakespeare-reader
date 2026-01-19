import { describe, it, expect, beforeEach, afterEach, mock, spyOn } from 'bun:test';
import { renderHook, act } from '@testing-library/react';
import { useTTS } from '../lib/reader/hooks/useTTS';
import { audioPlayer } from '@/lib/elevenlabs';
import * as readerUtils from '@/lib/readerUtils';
import * as tauri from '@/lib/tauri';

describe('useTTS auto-advance', () => {
  const mockGetDoc = mock(() => ({}));
  const mockGetPageMetrics = mock(() => ({}));
  const mockOnPageTurnNeeded = mock(() => { });
  let subscribeCallback: ((state: any) => void) | null = null;
  let mockStateValue = 'idle';
  const spies: any[] = [];

  beforeEach(() => {
    mock.restore();
    subscribeCallback = null;
    mockStateValue = 'idle';

    // Mock audioPlayer
    spies.push(spyOn(audioPlayer, 'play').mockResolvedValue(undefined as any));
    spies.push(spyOn(audioPlayer, 'pause').mockImplementation(() => { }));
    spies.push(spyOn(audioPlayer, 'resume').mockImplementation(() => { }));
    spies.push(spyOn(audioPlayer, 'stop').mockImplementation(() => { }));
    spies.push(spyOn(audioPlayer, 'getState').mockImplementation(() => mockStateValue as any));
    spies.push(spyOn(audioPlayer, 'subscribe').mockImplementation((cb: any) => {
      subscribeCallback = cb;
      return () => { };
    }));

    // Mock readerUtils.getPageContent
    spies.push(spyOn(readerUtils, 'getPageContent').mockReturnValue({ text: 'Mocked page text' } as any));

    // Mock tauri
    spies.push(spyOn(tauri, 'getSetting').mockResolvedValue(null));

    mockGetDoc.mockClear();
    mockGetPageMetrics.mockClear();
    mockOnPageTurnNeeded.mockClear();
  });

  afterEach(() => {
    spies.forEach(s => s.mockRestore());
    spies.length = 0;
  });

  it('triggers onPageTurnNeeded when audio ends naturally and autoNext is true', async () => {
    const { result } = renderHook(() => useTTS({
      getDoc: mockGetDoc,
      getPageMetrics: mockGetPageMetrics,
      currentPage: 1,
      onPageTurnNeeded: mockOnPageTurnNeeded,
    }));

    // Start playing to set autoNext to true
    await act(async () => {
      await result.current.playCurrentPage();
    });

    // Manually trigger 'playing' then 'idle' state transitions
    await act(async () => {
      mockStateValue = 'playing';
      if (subscribeCallback) subscribeCallback();
    });

    await act(async () => {
      mockStateValue = 'idle';
      if (subscribeCallback) subscribeCallback();
    });

    expect(mockOnPageTurnNeeded).toHaveBeenCalled();
  });
});