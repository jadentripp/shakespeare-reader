import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ElevenLabsService, AudioPlayer } from '../lib/elevenlabs';

// Mock tauri functions
vi.mock('../lib/tauri/settings', () => ({
  getSetting: vi.fn().mockResolvedValue('fake-api-key'),
}));

// Use vi- prefix for variables used inside vi.mock factory
const vi_mockConvert = vi.fn().mockImplementation(() => new ReadableStream({
  start(controller) {
    controller.enqueue(new Uint8Array([0, 0, 0, 0]));
    controller.close();
  }
}));
const vi_mockGetAll = vi.fn().mockResolvedValue({ voices: [{ voice_id: 'v1', name: 'Rachel' }] });

// Mock ElevenLabs SDK
vi.mock('@elevenlabs/elevenlabs-js', () => {
    return {
        ElevenLabsClient: class {
          textToSpeech = {
            convert: vi_mockConvert,
          };
          voices = {
            getAll: vi_mockGetAll,
          };
        },
        play: vi.fn().mockResolvedValue(undefined),
    };
});

describe('ElevenLabsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should be able to convert text to speech', async () => {
    const service = new ElevenLabsService();
    const result = await service.textToSpeech('Hello world');
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
  let mockAudioContext: any;

  beforeEach(() => {
    mockAudioContext = {
      createBufferSource: vi.fn().mockReturnValue({
        buffer: null,
        connect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
        onended: null,
      }),
      decodeAudioData: vi.fn().mockResolvedValue({ duration: 10 }),
      state: 'suspended',
      resume: vi.fn().mockResolvedValue(undefined),
      suspend: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined),
      destination: {},
    };

    // Class for constructor mocking
    class MockAudioContext {
      constructor() { return mockAudioContext; }
      createBufferSource() { return mockAudioContext.createBufferSource(); }
      decodeAudioData(data: any) { return mockAudioContext.decodeAudioData(data); }
      resume() { return mockAudioContext.resume(); }
      suspend() { return mockAudioContext.suspend(); }
      get state() { return mockAudioContext.state; }
      get destination() { return mockAudioContext.destination; }
    }
    
    vi.stubGlobal('AudioContext', MockAudioContext);
    player = new AudioPlayer();
  });

  it('should initialize with idle state', () => {
    expect(player.getState()).toBe('idle');
  });

  it('should be able to play text', async () => {
    await player.play('Test text');
    expect(player.getState()).toBe('playing');
  });

  it('should be able to pause and resume', async () => {
    await player.play('Test text');
    player.pause();
    expect(player.getState()).toBe('paused');
    player.resume();
    expect(player.getState()).toBe('playing');
  });
});
