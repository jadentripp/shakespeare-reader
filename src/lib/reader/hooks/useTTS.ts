import React, { useCallback, useEffect, useRef, useState } from 'react'
import { audioPlayer, EndReason, type VoiceSettings, type WordTiming } from '@/lib/elevenlabs'
import { type CharacterMapping, getPageContent, type PageMetrics } from '@/lib/readerUtils'
import { getSetting } from '@/lib/tauri'

interface UseTTSOptions {
  getDoc: () => Document | null
  getPageMetrics: () => PageMetrics
  currentPage: number
  onPageTurnNeeded?: () => void
}

const INITIAL_PROGRESS = { currentTime: 0, duration: 0, isBuffering: false }

export function useTTS({ getDoc, getPageMetrics, currentPage, onPageTurnNeeded }: UseTTSOptions) {
  const state = React.useSyncExternalStore(
    useCallback((callback: () => void) => audioPlayer.subscribe(callback), []),
    () => audioPlayer.getState(),
    () => 'idle' as const,
  )

  const progress = React.useSyncExternalStore(
    useCallback((callback: () => void) => audioPlayer.subscribeProgress(callback), []),
    () => audioPlayer.getProgress(),
    () => INITIAL_PROGRESS,
  )

  const [currentWord, setCurrentWord] = useState<WordTiming | null>(null)
  const [currentWordIndex, setCurrentWordIndex] = useState(-1)
  const [currentPageText, setCurrentPageText] = useState<string>('')
  const [currentCharMap, setCurrentCharMap] = useState<CharacterMapping[]>([])

  // Subscribe to word timing updates
  useEffect(() => {
    return audioPlayer.subscribeWordTiming((index, word) => {
      console.log(
        `[useTTS] Word timing update received: index=${index}, word="${word?.word}", startChar=${word?.startChar}, endChar=${word?.endChar}`,
      )
      setCurrentWordIndex(index)
      setCurrentWord(word)
    })
  }, [])

  const [autoNext, setAutoNext] = useState(false)
  const [voiceId, setVoiceId] = useState<string | undefined>()
  const [voiceSettings, setVoiceSettings] = useState<VoiceSettings | undefined>()

  useEffect(() => {
    Promise.all([
      getSetting('elevenlabs_voice_id'),
      getSetting('elevenlabs_stability'),
      getSetting('elevenlabs_similarity'),
      getSetting('elevenlabs_style'),
      getSetting('elevenlabs_speaker_boost'),
      getSetting('tts_playback_speed'),
      getSetting('tts_volume'),
    ]).then(([id, stability, similarity, style, boost, speed, volume]) => {
      if (id) setVoiceId(id)
      if (stability) {
        setVoiceSettings({
          stability: parseFloat(stability) || 0.5,
          similarity_boost: parseFloat(similarity ?? '0.75') || 0.75,
          style: parseFloat(style ?? '0') || 0,
          use_speaker_boost: boost === 'true',
        })
      }

      // Initialize player with persisted speed/volume
      if (speed) {
        audioPlayer.setPlaybackRate(parseFloat(speed))
      }
      if (volume) {
        audioPlayer.setVolume(parseFloat(volume))
      }
    })
  }, [])

  // Track state transitions for auto-advance
  const prevStateRef = useRef(state)
  useEffect(() => {
    console.log(`[useTTS] State transition: ${prevStateRef.current} -> ${state}`)
    if (state === 'idle' && prevStateRef.current === 'playing') {
      const reason = audioPlayer.getLastEndReason()
      const duration = audioPlayer.getDuration()
      const currentTime = audioPlayer.getCurrentTime()
      console.log(
        `[useTTS] Playback ended. Reason: ${reason}, Duration: ${duration.toFixed(2)}s, CurrentTime: ${currentTime.toFixed(2)}s, AutoNext: ${autoNext}`,
      )
      // Only auto-advance when audio naturally ended, not when stopped/replaced
      if (autoNext && reason === 'ended') {
        console.log(`[useTTS] Auto-advancing to next page`)
        onPageTurnNeeded?.()
      }
    }
    prevStateRef.current = state
  }, [state, autoNext, onPageTurnNeeded])

  // When currentPage changes, if autoNext is true, start playing
  // Use a ref to track if we just started playback manually to avoid double-calling
  const justStartedRef = useRef(false)
  useEffect(() => {
    console.log(
      `[useTTS] currentPage changed to ${currentPage}. AutoNext: ${autoNext}, State: ${state}, justStarted: ${justStartedRef.current}`,
    )
    if (justStartedRef.current) {
      justStartedRef.current = false
      return
    }
    if (autoNext && state === 'idle') {
      console.log(`[useTTS] Auto-playing new page ${currentPage}`)
      playCurrentPage()
    }
  }, [currentPage])

  const getPageText = useCallback(
    (pageIndex: number) => {
      const doc = getDoc()
      if (!doc) return { text: '', charMap: [] as CharacterMapping[] }

      const metrics = getPageMetrics()
      const content = getPageContent(doc, pageIndex, metrics)
      return { text: content.text, charMap: content.charMap }
    },
    [getDoc, getPageMetrics],
  )

  const playCurrentPage = useCallback(async () => {
    const { text, charMap } = getPageText(currentPage)
    console.log(
      `[useTTS] playCurrentPage called. Page: ${currentPage}, Text length: ${text.length}, CharMap length: ${charMap.length}`,
    )
    console.log(`[useTTS] Text preview (first 200 chars): "${text.substring(0, 200)}"`)
    console.log(`[useTTS] Text preview (last 200 chars): "${text.substring(text.length - 200)}"`)
    if (text) {
      justStartedRef.current = true // Prevent double-call from currentPage effect
      setAutoNext(true)
      setCurrentPageText(text) // Store the text for precise word highlighting
      setCurrentCharMap(charMap) // Store the character-to-DOM mapping
      // Use playWithTimestamps for word-level highlighting
      await audioPlayer.playWithTimestamps(text, voiceId, voiceSettings)
    }
  }, [currentPage, getPageText, voiceId, voiceSettings])

  const playText = useCallback(
    async (text: string) => {
      if (text) {
        setAutoNext(false) // One-off playback should not auto-advance
        await audioPlayer.play(text, voiceId, voiceSettings)
      }
    },
    [voiceId, voiceSettings],
  )

  const pause = useCallback(() => {
    audioPlayer.pause()
  }, [])

  const resume = useCallback(() => {
    audioPlayer.resume()
  }, [])

  const stop = useCallback(() => {
    setAutoNext(false)
    audioPlayer.stop()
  }, [])

  const setPlaybackRate = useCallback(async (rate: number) => {
    audioPlayer.setPlaybackRate(rate)
    const { setSetting } = await import('@/lib/tauri')
    await setSetting({ key: 'tts_playback_speed', value: rate.toString() })
  }, [])

  const setVolume = useCallback(async (volume: number) => {
    audioPlayer.setVolume(volume)
    const { setSetting } = await import('@/lib/tauri')
    await setSetting({ key: 'tts_volume', value: volume.toString() })
  }, [])

  const seek = useCallback((position: number) => {
    audioPlayer.seek(position)
  }, [])

  const changeVoice = useCallback(async (newVoiceId: string) => {
    console.log(`[useTTS] changeVoice called with: ${newVoiceId}`)
    setVoiceId(newVoiceId)
    const { setSetting } = await import('@/lib/tauri')
    await setSetting({ key: 'elevenlabs_voice_id', value: newVoiceId })
  }, [])

  return {
    state,
    progress,
    playCurrentPage,
    playText,
    pause,
    resume,
    stop,
    getPageText,
    autoNext,
    setPlaybackRate,
    setVolume,
    seek,
    voiceId,
    changeVoice,
    currentWord,
    currentWordIndex,
    currentPageText,
    currentCharMap,
    wordTimings: audioPlayer.getWordTimings(),
  }
}
