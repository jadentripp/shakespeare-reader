import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js'
import { getSetting } from './tauri/settings'

export interface Voice {
  voice_id: string
  name: string
  category?: string
  preview_url?: string
}

export interface VoiceSettings {
  stability: number
  similarity_boost: number
  style: number
  use_speaker_boost: boolean
}

export interface WordTiming {
  word: string
  start: number
  end: number
  startChar: number
  endChar: number
}

export interface TTSWithTimestamps {
  audioBase64: string
  wordTimings: WordTiming[]
}

export async function resolveElevenLabsApiKey(): Promise<string> {
  const saved = await getSetting('elevenlabs_api_key')
  if (saved && saved.trim()) {
    return saved.trim()
  }

  throw new Error('Missing ElevenLabs API key (set in Settings)')
}

export class ElevenLabsService {
  private client: ElevenLabsClient | null = null

  private async getClient(): Promise<ElevenLabsClient> {
    if (this.client) return this.client

    const apiKey = await resolveElevenLabsApiKey()
    this.client = new ElevenLabsClient({
      apiKey,
    })
    return this.client
  }

  async textToSpeech(text: string, voiceId: string, settings?: VoiceSettings): Promise<any> {
    console.log(
      `[ElevenLabs] textToSpeech called for text: "${text.substring(0, 30)}..." with voiceId: ${voiceId}`,
    )
    const client = await this.getClient()
    try {
      const response = await client.textToSpeech.convert(voiceId, {
        text,
        modelId: 'eleven_flash_v2_5',
        outputFormat: 'mp3_44100_128',
        ...(settings
          ? {
            voiceSettings: {
              stability: settings.stability,
              similarityBoost: settings.similarity_boost,
              style: settings.style,
              useSpeakerBoost: settings.use_speaker_boost,
            },
          }
          : {}),
      })
      console.log(`[ElevenLabs] textToSpeech conversion successful`)
      return response
    } catch (e: any) {
      if (e.message?.includes('famous_voice_not_permitted')) {
        console.error(
          `[ElevenLabs] VOICE RESTRICTED: The selected voice is restricted by ElevenLabs and cannot be used via API.`,
        )
        throw new Error(
          'This voice is restricted by ElevenLabs for API use. Please try a different voice.',
        )
      }
      console.error(`[ElevenLabs] textToSpeech conversion failed:`, e)
      throw e
    }
  }

  async textToSpeechWithTimestamps(
    text: string,
    voiceId: string,
    settings?: VoiceSettings,
  ): Promise<TTSWithTimestamps> {
    console.log(`[ElevenLabs] textToSpeechWithTimestamps called for text length: ${text.length}`)
    const client = await this.getClient()
    try {
      const response = await client.textToSpeech.convertWithTimestamps(voiceId, {
        text,
        modelId: 'eleven_flash_v2_5',
        ...(settings
          ? {
            voiceSettings: {
              stability: settings.stability,
              similarityBoost: settings.similarity_boost,
              style: settings.style,
              useSpeakerBoost: settings.use_speaker_boost,
            },
          }
          : {}),
      })

      console.log(`[ElevenLabs] textToSpeechWithTimestamps successful`)

      // Convert character-level alignment to word-level timings
      const wordTimings = this.extractWordTimings(
        text,
        response.alignment?.characters || [],
        response.alignment?.characterStartTimesSeconds || [],
        response.alignment?.characterEndTimesSeconds || [],
      )

      return {
        audioBase64: response.audioBase64 || '',
        wordTimings,
      }
    } catch (e: any) {
      if (e.message?.includes('famous_voice_not_permitted')) {
        console.error(
          `[ElevenLabs] VOICE RESTRICTED: The selected voice is restricted by ElevenLabs and cannot be used via API.`,
        )
        throw new Error(
          'This voice is restricted by ElevenLabs for API use. Please try a different voice.',
        )
      }
      console.error(`[ElevenLabs] textToSpeechWithTimestamps failed:`, e)
      throw e
    }
  }

  private extractWordTimings(
    _originalText: string,
    characters: string[],
    startTimes: number[],
    endTimes: number[],
  ): WordTiming[] {
    const words: WordTiming[] = []
    let currentWord = ''
    let wordStartChar = 0
    let wordStartTime = 0
    let wordEndTime = 0

    for (let i = 0; i < characters.length; i++) {
      const char = characters[i]
      if (char === undefined) continue
      const isWordBoundary = /\s/.test(char)

      if (isWordBoundary) {
        if (currentWord.length > 0) {
          words.push({
            word: currentWord,
            start: wordStartTime,
            end: wordEndTime,
            startChar: wordStartChar,
            endChar: wordStartChar + currentWord.length,
          })
        }
        currentWord = ''
        wordStartChar = i + 1
      } else {
        if (currentWord.length === 0) {
          wordStartTime = startTimes[i] || 0
          wordStartChar = i
        }
        currentWord += char
        wordEndTime = endTimes[i] || 0
      }
    }

    // Don't forget the last word
    if (currentWord.length > 0) {
      words.push({
        word: currentWord,
        start: wordStartTime,
        end: wordEndTime,
        startChar: wordStartChar,
        endChar: wordStartChar + currentWord.length,
      })
    }

    return words
  }

  async getVoices(): Promise<Voice[]> {
    console.log(`[ElevenLabs] getVoices called`)
    const client = await this.getClient()
    try {
      const response = await client.voices.getAll()
      console.log(`[ElevenLabs] getVoices successful, found ${response.voices.length} voices`)

      if (response.voices.length > 0) {
        const firstVoice = response.voices[0]
        if (firstVoice) {
          console.log(`[ElevenLabs] Sample voice object structure:`, {
            has_voice_id: 'voice_id' in firstVoice,
            has_voiceId: 'voiceId' in firstVoice,
            raw_keys: Object.keys(firstVoice),
          })
        }
      }

      return response.voices.map((v: any, index: number) => {
        const id = v.voice_id || v.voiceId
        if (!id) {
          console.warn(`[ElevenLabs] Voice at index ${index} missing ID:`, v.name)
        }
        return {
          voice_id: id || `voice-err-${index}`,
          name: v.name || 'Unnamed Voice',
          category: v.category,
          preview_url: v.preview_url || v.previewUrl,
        }
      })
    } catch (e) {
      console.error(`[ElevenLabs] getVoices failed:`, e)
      throw e
    }
  }
}

export const elevenLabsService = new ElevenLabsService()

export type PlaybackState = 'idle' | 'playing' | 'paused' | 'buffering' | 'error'
export type EndReason = 'ended' | 'stopped' | 'replaced' | 'error' | 'unknown'

export interface AudioProgress {
  currentTime: number
  duration: number
  isBuffering: boolean
}

export class AudioPlayer {
  private context: AudioContext | null = null
  private state: PlaybackState = 'idle'
  private currentSource: AudioBufferSourceNode | null = null
  private gainNode: GainNode | null = null
  private currentBuffer: AudioBuffer | null = null
  private listeners = new Set<(state: PlaybackState) => void>()
  private progressListeners = new Set<(progress: AudioProgress) => void>()
  private wordTimingListeners = new Set<(wordIndex: number, word: WordTiming | null) => void>()

  // Playback state tracking
  private _playbackRate: number = 1
  private _volume: number = 1
  private _startTime: number = 0 // AudioContext.currentTime when playback started
  private _startOffset: number = 0 // Position in audio buffer when playback started
  private _pausedAt: number = 0 // Position where playback was paused
  private progressInterval: ReturnType<typeof setInterval> | null = null
  private _lastEndReason: EndReason = 'unknown'
  private _wordTimings: WordTiming[] = []
  private _currentWordIndex: number = -1

  constructor() {
    // Context is lazily initialized on first play
  }

  private initContext() {
    if (!this.context) {
      console.log(`[AudioPlayer] Initializing AudioContext`)
      this.context = new (window.AudioContext || (window as any).webkitAudioContext)()
      console.log(`[AudioPlayer] AudioContext state: ${this.context.state}`)
    }
    // Initialize gain node for volume control
    if (!this.gainNode && this.context) {
      this.gainNode = this.context.createGain()
      this.gainNode.gain.value = this._volume
      this.gainNode.connect(this.context.destination)
    }
    return this.context
  }

  getState(): PlaybackState {
    return this.state
  }

  getLastEndReason(): EndReason {
    return this._lastEndReason
  }

  setState(state: PlaybackState) {
    console.log(`[AudioPlayer] State transition: ${this.state} -> ${state}`)
    this.state = state
    this.updateProgressCache()
    this.listeners.forEach((l) => l(state))

    // Start/stop progress updates
    if (state === 'playing') {
      this.startProgressUpdates()
    } else {
      this.stopProgressUpdates()
    }
  }

  private startProgressUpdates() {
    this.stopProgressUpdates()
    this.progressInterval = setInterval(() => {
      this.notifyProgressListeners()
    }, 100)
  }

  private stopProgressUpdates() {
    if (this.progressInterval) {
      clearInterval(this.progressInterval)
      this.progressInterval = null
    }
  }

  private notifyProgressListeners() {
    this.updateProgressCache()
    const progress = this.getProgress()
    this.progressListeners.forEach((l) => l(progress))
    // Log every ~1 second (every 10th call since interval is 100ms)
    if (Math.floor(progress.currentTime * 10) % 10 === 0 && progress.currentTime > 0) {
      console.log(
        `[AudioPlayer] Progress: ${progress.currentTime.toFixed(2)}s, wordTimings: ${this._wordTimings.length}`,
      )
    }
    this.updateCurrentWord(progress.currentTime)
  }

  private updateCurrentWord(currentTime: number) {
    if (this._wordTimings.length === 0) {
      return
    }

    // Find the word being spoken at currentTime
    let newIndex = -1
    for (let i = 0; i < this._wordTimings.length; i++) {
      const w = this._wordTimings[i]
      if (w && currentTime >= w.start && currentTime < w.end) {
        newIndex = i
        break
      }
      // If we're past this word's end but before next word's start, stick with previous
      const nextWord = this._wordTimings[i + 1]
      if (w && currentTime >= w.end && (i === this._wordTimings.length - 1 || (nextWord && currentTime < nextWord.start))) {
        newIndex = i
        break
      }
    }

    if (newIndex !== this._currentWordIndex) {
      this._currentWordIndex = newIndex
      const word = newIndex >= 0 ? this._wordTimings[newIndex] : null
      console.log(
        `[AudioPlayer] Word changed: index=${newIndex}, word="${word?.word}", time=${currentTime.toFixed(2)}s`,
      )
      this.wordTimingListeners.forEach((l) => l(newIndex, word || null))
    }
  }

  subscribeWordTiming(listener: (wordIndex: number, word: WordTiming | null) => void): () => void {
    this.wordTimingListeners.add(listener)
    return () => {
      this.wordTimingListeners.delete(listener)
    }
  }

  getCurrentWordIndex(): number {
    return this._currentWordIndex
  }

  getCurrentWord(): WordTiming | null {
    return this._currentWordIndex >= 0 ? this._wordTimings[this._currentWordIndex] || null : null
  }

  getWordTimings(): WordTiming[] {
    return this._wordTimings
  }

  async play(text: string, voiceId?: string, settings?: VoiceSettings) {
    console.log(`[AudioPlayer] play requested for text length: ${text.length}`)
    const ctx = this.initContext()
    if (ctx.state === 'suspended') {
      console.log(`[AudioPlayer] Resuming suspended AudioContext`)
      await ctx.resume()
    }

    this.setState('buffering')

    try {
      let finalVoiceId = voiceId
      if (!finalVoiceId) {
        finalVoiceId = (await getSetting('elevenlabs_voice_id')) || undefined
        console.log(`[AudioPlayer] Resolved voiceId from database: ${finalVoiceId}`)
      }

      if (!finalVoiceId) {
        // Fallback to a sensible default if nothing found (e.g. Rachel)
        finalVoiceId = '21m00Tcm4TbcDqnu8SRw'
        console.log(`[AudioPlayer] No voiceId found, falling back to Rachel: ${finalVoiceId}`)
      }

      // If settings not provided, try to load from database
      let finalSettings = settings
      if (!finalSettings) {
        console.log(`[AudioPlayer] Loading voice settings from database`)
        const stability = await getSetting('elevenlabs_stability')
        const similarity = await getSetting('elevenlabs_similarity')
        const style = await getSetting('elevenlabs_style')
        const boost = await getSetting('elevenlabs_speaker_boost')

        if (stability !== null) {
          finalSettings = {
            stability: parseFloat(stability) || 0.5,
            similarity_boost: parseFloat(similarity ?? '0.75') || 0.75,
            style: parseFloat(style ?? '0') || 0,
            use_speaker_boost: boost === 'true',
          }
          console.log(`[AudioPlayer] Settings loaded:`, finalSettings)
        } else {
          console.log(`[AudioPlayer] No settings found in database, using defaults`)
        }
      }

      console.log(
        `[AudioPlayer] Calling elevenLabsService.textToSpeech with voiceId: ${finalVoiceId}`,
      )
      const audioStream = await elevenLabsService.textToSpeech(text, finalVoiceId, finalSettings)

      console.log(`[AudioPlayer] Converting stream to buffer`)
      const audioData = await this.streamToBuffer(audioStream)
      console.log(`[AudioPlayer] Audio data received, size: ${audioData.byteLength} bytes`)

      console.log(`[AudioPlayer] Decoding audio data`)
      const audioBuffer = await ctx.decodeAudioData(audioData)
      console.log(
        `[AudioPlayer] Audio decoded successfully, duration: ${audioBuffer.duration.toFixed(2)}s`,
      )

      // Stop any current playback (marked as 'replaced', not natural end)
      this._lastEndReason = 'replaced'
      this.stopInternal()

      // Store the buffer for seeking
      this.currentBuffer = audioBuffer
      this._startOffset = 0
      this._pausedAt = 0

      this._wordTimings = []
      this._currentWordIndex = -1
      this.startPlayback(audioBuffer, 0)
      this.setState('playing')
    } catch (e) {
      console.error('[AudioPlayer] Audio playback error:', e)
      this._lastEndReason = 'error'
      this.setState('error')
    }
  }

  async playWithTimestamps(text: string, voiceId?: string, settings?: VoiceSettings) {
    console.log(`[AudioPlayer] playWithTimestamps requested for text length: ${text.length}`)
    const ctx = this.initContext()
    if (ctx.state === 'suspended') {
      console.log(`[AudioPlayer] Resuming suspended AudioContext`)
      await ctx.resume()
    }

    this.setState('buffering')

    try {
      let finalVoiceId = voiceId
      if (!finalVoiceId) {
        finalVoiceId = (await getSetting('elevenlabs_voice_id')) || undefined
      }
      if (!finalVoiceId) {
        finalVoiceId = '21m00Tcm4TbcDqnu8SRw'
      }

      let finalSettings = settings
      if (!finalSettings) {
        const stability = await getSetting('elevenlabs_stability')
        const similarity = await getSetting('elevenlabs_similarity')
        const style = await getSetting('elevenlabs_style')
        const boost = await getSetting('elevenlabs_speaker_boost')

        if (stability !== null) {
          finalSettings = {
            stability: parseFloat(stability) || 0.5,
            similarity_boost: parseFloat(similarity ?? '0.75') || 0.75,
            style: parseFloat(style ?? '0') || 0,
            use_speaker_boost: boost === 'true',
          }
        }
      }

      console.log(`[AudioPlayer] Calling textToSpeechWithTimestamps`)
      const result = await elevenLabsService.textToSpeechWithTimestamps(
        text,
        finalVoiceId,
        finalSettings,
      )

      // Decode base64 audio
      const binaryString = atob(result.audioBase64)
      const bytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }
      const audioBuffer = await ctx.decodeAudioData(bytes.buffer)
      console.log(
        `[AudioPlayer] Audio decoded, duration: ${audioBuffer.duration.toFixed(2)}s, words: ${result.wordTimings.length}`,
      )

      // Stop any current playback
      this._lastEndReason = 'replaced'
      this.stopInternal()

      // Store buffer and word timings
      this.currentBuffer = audioBuffer
      this._startOffset = 0
      this._pausedAt = 0
      this._wordTimings = result.wordTimings
      this._currentWordIndex = -1

      this.startPlayback(audioBuffer, 0)
      this.setState('playing')
    } catch (e) {
      console.error('[AudioPlayer] playWithTimestamps error:', e)
      this._lastEndReason = 'error'
      this.setState('error')
    }
  }

  private startPlayback(buffer: AudioBuffer, offset: number) {
    const ctx = this.initContext()

    // Disconnect and clean up previous source
    if (this.currentSource) {
      // Detach onended BEFORE stopping to prevent spurious 'ended' events
      this.currentSource.onended = null
      try {
        this.currentSource.stop()
      } catch (e) {
        // Source might have already stopped
      }
      this.currentSource = null
    }

    this.currentSource = ctx.createBufferSource()
    this.currentSource.buffer = buffer
    this.currentSource.playbackRate.value = this._playbackRate

    // Connect through gain node for volume control
    if (this.gainNode) {
      this.currentSource.connect(this.gainNode)
    } else {
      this.currentSource.connect(ctx.destination)
    }

    this.currentSource.onended = () => {
      const currentTime = this.getCurrentTime()
      const duration = buffer.duration
      const percentPlayed = duration > 0 ? ((currentTime / duration) * 100).toFixed(1) : 'N/A'
      console.log(
        `[AudioPlayer] onended fired. State: ${this.state}, CurrentTime: ${currentTime.toFixed(2)}s, Duration: ${duration.toFixed(2)}s, Played: ${percentPlayed}%`,
      )
      if (this.state === 'playing') {
        this._lastEndReason = 'ended'
        console.log(`[AudioPlayer] Setting EndReason to 'ended' and transitioning to idle`)
        this._pausedAt = 0
        this._startOffset = 0
        this.setState('idle')
      } else {
        console.log(
          `[AudioPlayer] onended fired but state was ${this.state}, not 'playing' - ignoring`,
        )
      }
    }

    this._startTime = ctx.currentTime
    this._startOffset = offset

    console.log(`[AudioPlayer] Starting playback at offset: ${offset.toFixed(2)}s`)
    this.currentSource.start(0, offset)
  }

  pause() {
    console.log(`[AudioPlayer] Pause requested`)
    if (this.state === 'playing') {
      // Calculate current position before pausing
      this._pausedAt = this.getCurrentTime()
      this.context?.suspend()
      this.setState('paused')
    }
  }

  resume() {
    console.log(`[AudioPlayer] Resume requested`)
    if (this.state === 'paused') {
      this.context?.resume()
      this.setState('playing')
    }
  }

  private stopInternal() {
    this.stopProgressUpdates()
    if (this.currentSource) {
      console.log(`[AudioPlayer] Stopping current source`)
      // Detach onended BEFORE stopping to prevent spurious 'ended' events
      this.currentSource.onended = null
      try {
        this.currentSource.stop()
      } catch (e) {
        // Source might have already stopped
      }
      this.currentSource = null
    }
    this._startOffset = 0
    this._pausedAt = 0
    this.setState('idle')
  }

  stop() {
    this._lastEndReason = 'stopped'
    this.stopInternal()
  }

  /**
   * Seek to a specific position in the audio (in seconds)
   */
  seek(position: number) {
    if (!this.currentBuffer || !this.context) {
      console.log(`[AudioPlayer] Cannot seek: no audio loaded`)
      return
    }

    const duration = this.currentBuffer.duration
    const clampedPosition = Math.max(0, Math.min(position, duration))

    console.log(`[AudioPlayer] Seeking to position: ${clampedPosition.toFixed(2)}s`)

    if (this.state === 'playing') {
      // Restart playback from new position
      this.startPlayback(this.currentBuffer, clampedPosition)
    } else if (this.state === 'paused') {
      // Just update the position, playback will resume from here
      this._pausedAt = clampedPosition
      this._startOffset = clampedPosition
    }

    this.notifyProgressListeners()
  }

  /**
   * Set playback rate (0.5 to 2.0)
   */
  setPlaybackRate(rate: number) {
    const clampedRate = Math.max(0.5, Math.min(2, rate))
    console.log(`[AudioPlayer] Setting playback rate to: ${clampedRate}x`)
    this._playbackRate = clampedRate

    if (this.currentSource) {
      this.currentSource.playbackRate.value = clampedRate
    }
  }

  /**
   * Get current playback rate
   */
  getPlaybackRate(): number {
    return this._playbackRate
  }

  /**
   * Set volume (0 to 1)
   */
  setVolume(level: number) {
    const clampedLevel = Math.max(0, Math.min(1, level))
    console.log(`[AudioPlayer] Setting volume to: ${clampedLevel}`)
    this._volume = clampedLevel

    if (this.gainNode) {
      this.gainNode.gain.value = clampedLevel
    }
  }

  /**
   * Get current volume
   */
  getVolume(): number {
    return this._volume
  }

  /**
   * Get current playback time in seconds
   */
  getCurrentTime(): number {
    if (!this.context || !this.currentBuffer) return 0

    if (this.state === 'paused') {
      return this._pausedAt
    }

    if (this.state === 'playing') {
      const elapsed = (this.context.currentTime - this._startTime) * this._playbackRate
      return Math.min(this._startOffset + elapsed, this.currentBuffer.duration)
    }

    return 0
  }

  /**
   * Get audio duration in seconds
   */
  getDuration(): number {
    return this.currentBuffer?.duration ?? 0
  }

  /**
   * Get progress info (currentTime, duration, isBuffering)
   * Returns a cached object if values haven't changed to satisfy useSyncExternalStore equality checks
   */
  private _cachedProgress: AudioProgress = { currentTime: 0, duration: 0, isBuffering: false }

  private updateProgressCache() {
    const currentTime = this.getCurrentTime()
    const duration = this.getDuration()
    const isBuffering = this.state === 'buffering'

    if (
      currentTime !== this._cachedProgress.currentTime ||
      duration !== this._cachedProgress.duration ||
      isBuffering !== this._cachedProgress.isBuffering
    ) {
      this._cachedProgress = { currentTime, duration, isBuffering }
    }
  }

  getProgress(): AudioProgress {
    return this._cachedProgress
  }

  private async streamToBuffer(stream: ReadableStream): Promise<ArrayBuffer> {
    console.log(`[AudioPlayer] Reading stream`)
    const reader = stream.getReader()
    const chunks: Uint8Array[] = []
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      chunks.push(value)
    }
    const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0)
    console.log(
      `[AudioPlayer] Stream read complete, total chunks: ${chunks.length}, total length: ${totalLength}`,
    )
    const result = new Uint8Array(totalLength)
    let offset = 0
    for (const chunk of chunks) {
      result.set(chunk, offset)
      offset += chunk.length
    }
    return result.buffer
  }

  subscribe(callback: (state: PlaybackState) => void) {
    this.listeners.add(callback)
    return () => {
      this.listeners.delete(callback)
    }
  }

  /**
   * Subscribe to progress updates (fires ~10x per second during playback)
   */
  subscribeProgress(callback: (progress: AudioProgress) => void) {
    this.progressListeners.add(callback)
    return () => {
      this.progressListeners.delete(callback)
    }
  }
}

export const audioPlayer = new AudioPlayer()
