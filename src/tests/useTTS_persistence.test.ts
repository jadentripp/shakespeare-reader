import { afterEach, beforeEach, describe, expect, it, mock, spyOn } from 'bun:test'
import { act, renderHook } from '@testing-library/react'
import { audioPlayer } from '@/lib/tts'
import * as readerUtils from '@/lib/readerUtils'
import * as tauri from '@/lib/tauri'
import { useTTS } from '../lib/reader/hooks/useTTS'

describe('useTTS Persistence', () => {
  const mockGetDoc = mock(() => document)
  const mockGetPageMetrics = mock(() => ({}) as any)
  const spies: any[] = []

  // Mock settings values
  const mockSettings: Record<string, string> = {
    tts_playback_speed: '1.5',
    tts_volume: '0.8',
    pocket_voice_id: 'v1',
  }

  beforeEach(() => {
    mock.restore()

    // Setup spies
    spies.push(spyOn(audioPlayer, 'play').mockResolvedValue(undefined as any))
    spies.push(spyOn(audioPlayer, 'setVolume').mockImplementation(() => {}))
    spies.push(spyOn(audioPlayer, 'setPlaybackRate').mockImplementation(() => {}))
    spies.push(spyOn(audioPlayer, 'getState').mockReturnValue('idle'))
    spies.push(spyOn(audioPlayer, 'subscribe').mockReturnValue(() => {}))
    spies.push(
      spyOn(audioPlayer, 'getProgress').mockReturnValue({
        currentTime: 0,
        duration: 0,
        isBuffering: false,
      }),
    )
    spies.push(spyOn(audioPlayer, 'subscribeProgress').mockReturnValue(() => {}))

    spies.push(
      spyOn(readerUtils, 'getPageContent').mockReturnValue({ text: 'Mocked page text' } as any),
    )

    // Mock getSetting to return our values
    spies.push(
      spyOn(tauri, 'getSetting').mockImplementation((key) => {
        return Promise.resolve(mockSettings[key] || null)
      }),
    )

    mockGetDoc.mockClear()
    mockGetPageMetrics.mockClear()
  })

  afterEach(() => {
    spies.forEach((s) => s.mockRestore())
    spies.length = 0
  })

  it('should load playback speed and volume from settings on mount', async () => {
    renderHook(() =>
      useTTS({
        getDoc: mockGetDoc,
        getPageMetrics: mockGetPageMetrics,
        currentPage: 1,
      }),
    )

    // Wait for useEffect
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(audioPlayer.setPlaybackRate).toHaveBeenCalledWith(1.5)
    expect(audioPlayer.setVolume).toHaveBeenCalledWith(0.8)
  })

  it('should save playback speed and volume when changed', async () => {
    const saveSettingSpy = spyOn(tauri, 'setSetting').mockResolvedValue(undefined)

    const { result } = renderHook(() =>
      useTTS({
        getDoc: mockGetDoc,
        getPageMetrics: mockGetPageMetrics,
        currentPage: 1,
      }),
    )

    await act(async () => {
      await result.current.setPlaybackRate(1.25)
    })

    expect(audioPlayer.setPlaybackRate).toHaveBeenCalledWith(1.25)
    expect(saveSettingSpy).toHaveBeenCalledWith({ key: 'tts_playback_speed', value: '1.25' })

    await act(async () => {
      await result.current.setVolume(0.5)
    })

    expect(audioPlayer.setVolume).toHaveBeenCalledWith(0.5)
    expect(saveSettingSpy).toHaveBeenCalledWith({ key: 'tts_volume', value: '0.5' })
  })
})
