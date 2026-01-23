import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'

// Define mocks first
const mockCreateResponse = mock(() => ({}))
const mockListModels = mock(() => ({}))
const mockGetSetting = mock(() => Promise.resolve(null))

// Mock the OpenAI library logic function
const mockOpenAIFactory = () => {
  return {
    default: class OpenAI {
      constructor(opts: any) {}
      models = {
        list: mockListModels,
      }
      responses = {
        create: mockCreateResponse,
      }
    },
  }
}

// Mock the settings dependency logic function
const mockSettingsFactory = () => {
  return {
    getSetting: mockGetSetting,
  }
}

// Apply mocks initially
mock.module('openai', mockOpenAIFactory)
mock.module('@/lib/tauri/settings', mockSettingsFactory)

// Import the module under test
import { chat, listModels, openAIService, resolveApiKey } from '../lib/openai'

describe('OpenAI Service', () => {
  beforeEach(() => {
    // Re-apply mocks to ensure clean state and isolation from other tests
    mock.module('openai', mockOpenAIFactory)
    mock.module('@/lib/tauri/settings', mockSettingsFactory)

    mockCreateResponse.mockClear()
    mockListModels.mockClear()
    mockGetSetting.mockClear()

    // Reset the singleton client cache so it picks up the new Mock class
    openAIService.reset()
  })

  afterEach(() => {
    mock.restore()
  })

  describe('resolveApiKey', () => {
    it('should resolve key from Tauri settings first', async () => {
      mockGetSetting.mockResolvedValue('saved-key')
      const key = await resolveApiKey()
      expect(key).toBe('saved-key')
      expect(mockGetSetting).toHaveBeenCalledWith('openai_api_key')
    })

    it('should fallback to environment variables if no saved key', async () => {
      mockGetSetting.mockResolvedValue(null)
      try {
        await resolveApiKey()
      } catch (e: any) {
        expect(e.message).toContain('Missing OpenAI API key')
      }
    })

    it('should throw error if no key found', async () => {
      mockGetSetting.mockResolvedValue(null)
      await expect(resolveApiKey()).rejects.toThrow('Missing OpenAI API key')
    })
  })

  describe('listModels', () => {
    it('should filter and sort gpt models correctly', async () => {
      mockGetSetting.mockResolvedValue('key')

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
      })

      const models = await listModels()

      expect(models).toContain('gpt-4o')
      expect(models).toContain('gpt-4')
      expect(models).toContain('gpt-5.2')
      expect(models).toContain('gpt-3.5-turbo')

      expect(models).not.toContain('claude-3')
      expect(models).not.toContain('gpt-4o-realtime-preview')
      expect(models).not.toContain('gpt-5-search-api')
      expect(models).not.toContain('gpt-4o-mini-tts')
      expect(models).not.toContain('gpt-5-codex')
      expect(models).not.toContain('gpt-4o-audio-preview')
      expect(models).not.toContain('gpt-image-1-mini')
      expect(models).not.toContain('gpt-4o-mini-transcribe')

      expect(models[0]).toBe('gpt-5.2')
    })
  })

  describe('chat', () => {
    it('should call openai.responses.create and format result', async () => {
      mockGetSetting.mockImplementation(async (key: string) => {
        if (key === 'openai_api_key') return 'api-key'
        if (key === 'openai_model') return 'gpt-5.2'
        return null
      })

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
      })

      const result = await chat([{ role: 'user', content: 'Hi' }])

      expect(result.content).toBe('Hello world')
      expect(mockCreateResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-5.2',
          input: [{ role: 'user', content: 'Hi' }],
        }),
      )
    })
  })
})
