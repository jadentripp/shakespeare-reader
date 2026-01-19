import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getSetting } from '../lib/tauri/settings';

// Hoist mocks
const { mockCreateResponse, mockListModels } = vi.hoisted(() => {
  return {
    mockCreateResponse: vi.fn(),
    mockListModels: vi.fn(),
  };
});

vi.mock('openai', () => {
  return {
    default: class OpenAI {
      responses = {
        create: mockCreateResponse,
      };
      models = {
        list: mockListModels,
      };
    },
    OpenAI: class OpenAI {
      responses = {
        create: mockCreateResponse,
      };
      models = {
        list: mockListModels,
      };
    },
  };
});

vi.mock('../lib/tauri/settings', () => ({
  getSetting: vi.fn(),
}));

// Import after mocks
import { resolveApiKey, listModels, chat } from '../lib/openai';

describe('OpenAI Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // @ts-ignore
    delete import.meta.env.VITE_OPENAI_API_KEY;
  });

  describe('resolveApiKey', () => {
    it('should resolve key from Tauri settings first', async () => {
      vi.mocked(getSetting).mockResolvedValue('saved-key');
      const key = await resolveApiKey();
      expect(key).toBe('saved-key');
      expect(getSetting).toHaveBeenCalledWith('openai_api_key');
    });

    it('should fallback to environment variables if no saved key', async () => {
      vi.mocked(getSetting).mockResolvedValue(null);
      // @ts-ignore
      import.meta.env.VITE_OPENAI_API_KEY = 'env-key';
      const key = await resolveApiKey();
      expect(key).toBe('env-key');
    });

    it('should throw error if no key found', async () => {
      vi.mocked(getSetting).mockResolvedValue(null);
      await expect(resolveApiKey()).rejects.toThrow('Missing OpenAI API key');
    });
  });

  describe('listModels', () => {
    it('should filter and sort gpt models correctly', async () => {
      vi.mocked(getSetting).mockResolvedValue('key');

      mockListModels.mockResolvedValue({
        data: [
          { id: 'gpt-4o', created: 1700000000 },
          { id: 'gpt-3.5-turbo', created: 1600000000 },
          { id: 'gpt-4', created: 1680000000 },
          { id: 'claude-3', created: 1700000000 },
          { id: 'gpt-5.2', created: 1800000000 },
          { id: 'gpt-4o-realtime-preview', created: 1750000000 },
          { id: 'gpt-5-search-api', created: 1760000000 },
          { id: 'gpt-4o-mini-tts', created: 1770000000 },
          { id: 'gpt-5-codex', created: 1780000000 },
          { id: 'gpt-4o-audio-preview', created: 1790000000 },
          { id: 'gpt-image-1-mini', created: 1800000000 },
          { id: 'gpt-4o-mini-transcribe', created: 1810000000 },
        ],
      });

      const models = await listModels();
      
      expect(models).toContain('gpt-4o');
      expect(models).toContain('gpt-4');
      expect(models).toContain('gpt-5.2');
      expect(models).toContain('gpt-3.5-turbo');
      
      expect(models).not.toContain('claude-3');
      expect(models).not.toContain('gpt-4o-realtime-preview');
      expect(models).not.toContain('gpt-5-search-api');
      expect(models).not.toContain('gpt-4o-mini-tts');
      expect(models).not.toContain('gpt-5-codex');
      expect(models).not.toContain('gpt-4o-audio-preview');
      expect(models).not.toContain('gpt-image-1-mini');
      expect(models).not.toContain('gpt-4o-mini-transcribe');
      
      expect(models[0]).toBe('gpt-5.2');
    });
  });

  describe('chat', () => {
    it('should call openai.responses.create and format result', async () => {
      vi.mocked(getSetting).mockImplementation(async (key) => {
        if (key === 'openai_api_key') return 'api-key';
        if (key === 'openai_model') return 'gpt-5.2';
        return null;
      });

      mockCreateResponse.mockResolvedValue({
        output: [
          {
            type: 'message',
            content: [{ type: 'output_text', text: 'Hello world' }],
          },
          {
            type: 'reasoning',
            summary: 'I thought about it',
          },
        ],
      });

      const result = await chat([{ role: 'user', content: 'Hi' }]);

      expect(result.content).toBe('Hello world');
      expect(mockCreateResponse).toHaveBeenCalledWith(expect.objectContaining({
        model: 'gpt-5.2',
        input: [{ role: 'user', content: 'Hi' }],
      }));
    });
  });
});
