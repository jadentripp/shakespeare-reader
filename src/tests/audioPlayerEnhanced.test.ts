import { afterEach, beforeEach, describe, expect, it, mock, spyOn } from 'bun:test'
import * as tauriSettings from '../lib/tauri/settings'

// Mock ElevenLabs SDK
const vi_mockConvert = mock(
  () =>
    new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array([0, 0, 0, 0]))
        controller.close()
      },
    }),
)
const vi_mockGetAll = mock(() => Promise.resolve({ voices: [{ voice_id: 'v1', name: 'Rachel' }] }))

mock.module('@elevenlabs/elevenlabs-js', () => {
  return {
    ElevenLabsClient: class {
      textToSpeech = {
        convert: vi_mockConvert,
      }
      voices = {
        getAll: vi_mockGetAll,
      }
    },
  }
})

import { AudioPlayer } from '../lib/elevenlabs'

describe('AudioPlayer Enhanced Capabilities', () => {
  let player: AudioPlayer
  let mockAudioContextInstance: any
  let mockGainNode: any
  let mockBufferSourceNode: any
  const spies: any[] = []

  beforeEach(() => {
    mock.restore()
    spies.push(spyOn(tauriSettings, 'getSetting').mockResolvedValue('fake-api-key'))

    mockGainNode = {
      gain: { value: 1 },
      connect: mock(() => {}),
      disconnect: mock(() => {}),
    }

    mockBufferSourceNode = {
      buffer: null,
      playbackRate: { value: 1 },
      connect: mock(() => mockGainNode),
      start: mock(() => {}),
      stop: mock(() => {}),
      onended: null,
    }

    mockAudioContextInstance = {
      createBufferSource: mock(() => mockBufferSourceNode),
      createGain: mock(() => mockGainNode),
      decodeAudioData: mock(() => Promise.resolve({ duration: 30 })),
      state: 'suspended',
      currentTime: 0,
      resume: mock(() => Promise.resolve(undefined)),
      suspend: mock(() => Promise.resolve(undefined)),
      close: mock(() => Promise.resolve(undefined)),
      destination: {},
    }

    class MockAudioContext {
      constructor() {
        return mockAudioContextInstance
      }
      createBufferSource() {
        return mockAudioContextInstance.createBufferSource()
      }
      createGain() {
        return mockAudioContextInstance.createGain()
      }
      decodeAudioData(data: any) {
        return mockAudioContextInstance.decodeAudioData(data)
      }
      resume() {
        return mockAudioContextInstance.resume()
      }
      suspend() {
        return mockAudioContextInstance.suspend()
      }
      get state() {
        return mockAudioContextInstance.state
      }
      get currentTime() {
        return mockAudioContextInstance.currentTime
      }
      get destination() {
        return mockAudioContextInstance.destination
      }
    }

    globalThis.AudioContext = MockAudioContext as any
    player = new AudioPlayer()
  })

  afterEach(() => {
    spies.forEach((s) => s.mockRestore())
    spies.length = 0
    // @ts-expect-error
    delete globalThis.AudioContext
  })

  describe('seek(position)', () => {
    it('should have a seek method', () => {
      expect(typeof player.seek).toBe('function')
    })

    it('should seek to a position within the audio', async () => {
      await player.play('Test text', 'v1')
      player.seek(10)
      const progress = player.getProgress()
      expect(progress.currentTime).toBeCloseTo(10, 0)
    })

    it('should clamp seek to 0 when seeking before start', async () => {
      await player.play('Test text', 'v1')
      player.seek(-5)
      const progress = player.getProgress()
      expect(progress.currentTime).toBeGreaterThanOrEqual(0)
    })

    it('should clamp seek to duration when seeking past end', async () => {
      await player.play('Test text', 'v1')
      player.seek(100) // Beyond 30 second duration
      const progress = player.getProgress()
      expect(progress.currentTime).toBeLessThanOrEqual(progress.duration)
    })
  })

  describe('setPlaybackRate(rate)', () => {
    it('should have a setPlaybackRate method', () => {
      expect(typeof player.setPlaybackRate).toBe('function')
    })

    it('should set playback rate on the audio source', async () => {
      await player.play('Test text', 'v1')
      player.setPlaybackRate(1.5)
      expect(player.getPlaybackRate()).toBe(1.5)
    })

    it('should accept standard playback rates (0.5x to 2x)', async () => {
      await player.play('Test text', 'v1')

      player.setPlaybackRate(0.5)
      expect(player.getPlaybackRate()).toBe(0.5)

      player.setPlaybackRate(2)
      expect(player.getPlaybackRate()).toBe(2)
    })

    it('should clamp rate below minimum to 0.5', async () => {
      await player.play('Test text', 'v1')
      player.setPlaybackRate(0.25)
      expect(player.getPlaybackRate()).toBeGreaterThanOrEqual(0.5)
    })

    it('should clamp rate above maximum to 2', async () => {
      await player.play('Test text', 'v1')
      player.setPlaybackRate(3)
      expect(player.getPlaybackRate()).toBeLessThanOrEqual(2)
    })
  })

  describe('setVolume(level)', () => {
    it('should have a setVolume method', () => {
      expect(typeof player.setVolume).toBe('function')
    })

    it('should set volume level (0-1 range)', async () => {
      await player.play('Test text', 'v1')
      player.setVolume(0.5)
      expect(player.getVolume()).toBe(0.5)
    })

    it('should clamp volume below 0 to 0', async () => {
      await player.play('Test text', 'v1')
      player.setVolume(-0.5)
      expect(player.getVolume()).toBe(0)
    })

    it('should clamp volume above 1 to 1', async () => {
      await player.play('Test text', 'v1')
      player.setVolume(1.5)
      expect(player.getVolume()).toBe(1)
    })

    it('should persist volume across playback sessions', async () => {
      player.setVolume(0.7)
      await player.play('Test text', 'v1')
      expect(player.getVolume()).toBe(0.7)
    })
  })

  describe('getDuration() and getCurrentTime()', () => {
    it('should have getProgress method returning currentTime and duration', () => {
      expect(typeof player.getProgress).toBe('function')
    })

    it('should return duration after audio is loaded', async () => {
      await player.play('Test text', 'v1')
      const progress = player.getProgress()
      expect(progress.duration).toBe(30)
    })

    it('should return currentTime of 0 at start of playback', async () => {
      await player.play('Test text', 'v1')
      const progress = player.getProgress()
      expect(progress.currentTime).toBe(0)
    })

    it('should expose buffered state', async () => {
      await player.play('Test text', 'v1')
      const progress = player.getProgress()
      expect(typeof progress.isBuffering).toBe('boolean')
    })
  })

  describe('getPlaybackRate()', () => {
    it('should have a getPlaybackRate method', () => {
      expect(typeof player.getPlaybackRate).toBe('function')
    })

    it('should return default rate of 1', () => {
      expect(player.getPlaybackRate()).toBe(1)
    })
  })

  describe('getVolume()', () => {
    it('should have a getVolume method', () => {
      expect(typeof player.getVolume).toBe('function')
    })

    it('should return default volume of 1', () => {
      expect(player.getVolume()).toBe(1)
    })
  })
})
