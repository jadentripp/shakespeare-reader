import { afterEach, beforeEach, describe, expect, it, mock, spyOn } from 'bun:test'
import { act, renderHook } from '@testing-library/react'
import { audioPlayer } from '@/lib/elevenlabs'
import * as readerUtils from '@/lib/readerUtils'
import * as tauri from '@/lib/tauri'
import { useTTS } from '../lib/reader/hooks/useTTS'

describe('useTTS', () => {
  const mockGetDoc = mock(() => null as unknown as Document)
  const mockGetPageMetrics = mock(() => ({} as any))
  const mockOnPageTurnNeeded = mock(() => { })
  const spies: any[] = []

  beforeEach(() => {
    mock.restore()

    // Setup spies - playWithTimestamps is now used instead of play
    spies.push(spyOn(audioPlayer, 'play').mockResolvedValue(undefined as any))
    spies.push(spyOn(audioPlayer, 'playWithTimestamps').mockResolvedValue(undefined as any))
    spies.push(spyOn(audioPlayer, 'pause').mockImplementation(() => { }))
    spies.push(spyOn(audioPlayer, 'resume').mockImplementation(() => { }))
    spies.push(spyOn(audioPlayer, 'stop').mockImplementation(() => { }))
    spies.push(spyOn(audioPlayer, 'getState').mockReturnValue('idle'))
    spies.push(spyOn(audioPlayer, 'subscribe').mockReturnValue(() => { }))

    spies.push(
      spyOn(readerUtils, 'getPageContent').mockReturnValue({
        text: 'Mocked page text',
        charMap: [],
      } as any),
    )
    spies.push(spyOn(tauri, 'getSetting').mockResolvedValue(null))

    mockGetDoc.mockClear()
    mockGetPageMetrics.mockClear()
    mockOnPageTurnNeeded.mockClear()
  })

  afterEach(() => {
    spies.forEach((s) => s.mockRestore())
    spies.length = 0
  })

  it('should initialize with idle state', () => {
    const { result } = renderHook(() =>
      useTTS({
        getDoc: mockGetDoc,
        getPageMetrics: mockGetPageMetrics,
        currentPage: 1,
      }),
    )
    expect(result.current.state).toBe('idle')
  })

  it('should call audioPlayer.playWithTimestamps with page text', async () => {
    const { result } = renderHook(() =>
      useTTS({
        getDoc: mockGetDoc,
        getPageMetrics: mockGetPageMetrics,
        currentPage: 1,
      }),
    )

    await act(async () => {
      await result.current.playCurrentPage()
    })

    // playCurrentPage now uses playWithTimestamps for word-level highlighting
    expect(audioPlayer.playWithTimestamps).toHaveBeenCalledWith(
      'Mocked page text',
      undefined,
      undefined,
    )
  })
})
