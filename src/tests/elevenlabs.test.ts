import { describe, it, expect, beforeEach, afterEach, mock, spyOn } from 'bun:test';
import * as tauriSettings from '../lib/tauri/settings';

// Mock ElevenLabs SDK
const vi_mockConvert = mock(() => new ReadableStream({
  start(controller) {
    controller.enqueue(new Uint8Array([0, 0, 0, 0]));
    controller.close();
  }
}));
const vi_mockGetAll = mock(() => Promise.resolve({ voices: [{ voice_id: 'v1', name: 'Rachel' }] }));
const mockPlay = mock(() => Promise.resolve(undefined));

mock.module('@elevenlabs/elevenlabs-js', () => {
  return {
    ElevenLabsClient: class {
      textToSpeech = {
        convert: vi_mockConvert,
      };
      voices = {
        getAll: vi_mockGetAll,
      };
    },
    play: mockPlay,
  };
});

import { ElevenLabsService, AudioPlayer } from '../lib/elevenlabs';

describe('ElevenLabsService', () => {
  const spies: any[] = [];

  beforeEach(() => {
    mock.restore();
    spies.push(spyOn(tauriSettings, 'getSetting').mockResolvedValue('fake-api-key'));
    vi_mockConvert.mockClear();
    vi_mockGetAll.mockClear();
    mockPlay.mockClear();
  });

  afterEach(() => {
    spies.forEach(s => s.mockRestore());
    spies.length = 0;
  });

  it('should be able to convert text to speech', async () => {
    const service = new ElevenLabsService();
    const result = await service.textToSpeech('Hello world', 'v1', {
      stability: 0.5,
      similarity_boost: 0.75,
      style: 0,
      use_speaker_boost: true
    });
    expect(result).toBeDefined();
    expect(vi_mockConvert).toHaveBeenCalled();
  });

  it('should be able to list voices', async () => {
    const service = new ElevenLabsService();
    const voices = await service.getVoices();
    expect(voices).toHaveLength(1);
    expect(voices[0].name).toBe('Rachel');
    expect(vi_mockGetAll).toHaveBeenCalled();
  });
});

describe('AudioPlayer', () => {
  let player: AudioPlayer;
  let mockAudioContextInstance: any;
  const spies: any[] = [];

  beforeEach(() => {
    mock.restore();
    spies.push(spyOn(tauriSettings, 'getSetting').mockResolvedValue('fake-api-key'));

    mockAudioContextInstance = {
      createBufferSource: mock(() => ({
        buffer: null,
        playbackRate: { value: 1 },
        connect: mock(() => { }),
        start: mock(() => { }),
        stop: mock(() => { }),
        onended: null,
      })),
      createGain: mock(() => ({
        gain: { value: 1 },
        connect: mock(() => { }),
        disconnect: mock(() => { }),
      })),
      decodeAudioData: mock(() => Promise.resolve({ duration: 10 })),
      state: 'suspended',
      currentTime: 0,
      resume: mock(() => Promise.resolve(undefined)),
      suspend: mock(() => Promise.resolve(undefined)),
      close: mock(() => Promise.resolve(undefined)),
      destination: {},
    };

    class MockAudioContext {
      constructor() { return mockAudioContextInstance; }
      createBufferSource() { return mockAudioContextInstance.createBufferSource(); }
      createGain() { return mockAudioContextInstance.createGain(); }
      decodeAudioData(data: any) { return mockAudioContextInstance.decodeAudioData(data); }
      resume() { return mockAudioContextInstance.resume(); }
      suspend() { return mockAudioContextInstance.suspend(); }
      get state() { return mockAudioContextInstance.state; }
      get currentTime() { return mockAudioContextInstance.currentTime; }
      get destination() { return mockAudioContextInstance.destination; }
    }

    globalThis.AudioContext = MockAudioContext as any;
    player = new AudioPlayer();
  });

  afterEach(() => {
    spies.forEach(s => s.mockRestore());
    spies.length = 0;
    // @ts-ignore
    delete globalThis.AudioContext;
  });

  it('should initialize with idle state', () => {
    expect(player.getState()).toBe('idle');
  });

  it('should be able to play text', async () => {
    await player.play('Test text', 'v1', {
      stability: 0.5,
      similarity_boost: 0.75,
      style: 0,
      use_speaker_boost: true
    });
    expect(player.getState()).toBe('playing');
  });

  it("should be able to pause and resume", async () => {
    await player.play('Test text');
    player.pause();
    expect(player.getState()).toBe('paused');
    player.resume();
    expect(player.getState()).toBe('playing');
  });
});
