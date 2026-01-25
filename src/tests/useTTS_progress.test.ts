import { afterEach, beforeEach, describe, expect, it, mock, spyOn } from 'bun:test'
import { renderHook } from '@testing-library/react'
import { audioPlayer } from '@/lib/tts'
import * as readerUtils from '@/lib/readerUtils'
import * as tauri from '@/lib/tauri'
import { useTTS } from '../lib/reader/hooks/useTTS'

describe('useTTS Progress', () => {
  const mockGetDoc = mock(() => document)
  const mockGetPageMetrics = mock(() => ({}) as any)
  const spies: any[] = []

  beforeEach(() => {
    mock.restore()

    // Setup spies
    spies.push(spyOn(audioPlayer, 'play').mockResolvedValue(undefined as any))
    spies.push(spyOn(audioPlayer, 'getState').mockReturnValue('idle'))
    spies.push(spyOn(audioPlayer, 'subscribe').mockReturnValue(() => {}))

    // Mock new methods
    spies.push(
      spyOn(audioPlayer, 'getProgress').mockReturnValue({
        currentTime: 10,
        duration: 60,
        isBuffering: false,
      }),
    )
    spies.push(spyOn(audioPlayer, 'subscribeProgress').mockReturnValue(() => {}))

    spies.push(
      spyOn(readerUtils, 'getPageContent').mockReturnValue({ text: 'Mocked page text' } as any),
    )
    spies.push(spyOn(tauri, 'getSetting').mockResolvedValue(null))
  })

  afterEach(() => {
    spies.forEach((s) => {
      s.mockRestore()
    })
    spies.length = 0
  })

  it('should expose progress state', () => {
    const { result } = renderHook(() =>
      useTTS({
        getDoc: mockGetDoc,
        getPageMetrics: mockGetPageMetrics,
        currentPage: 1,
      }),
    )

    expect(result.current.progress).toBeDefined()
    expect(result.current.progress.currentTime).toBe(10)
    expect(result.current.progress.duration).toBe(60)
    expect(result.current.progress.isBuffering).toBe(false)
  })
})
