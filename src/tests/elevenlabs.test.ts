import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ElevenLabsService } from '../lib/elevenlabs';

// Mock tauri functions
vi.mock('../lib/tauri/settings', () => ({
  getSetting: vi.fn().mockResolvedValue('fake-api-key'),
}));

// Use vi- prefix for variables used inside vi.mock factory
const vi_mockConvert = vi.fn().mockResolvedValue(new ReadableStream());
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
    // @ts-ignore
    expect(vi_mockConvert).toHaveBeenCalled();
  });

  it('should be able to list voices', async () => {
    const service = new ElevenLabsService();
    const voices = await service.getVoices();
    expect(voices).toHaveLength(1);
    expect(voices[0].name).toBe('Rachel');
    // @ts-ignore
    expect(vi_mockGetAll).toHaveBeenCalled();
  });
});