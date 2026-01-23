import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';

// Define mocks
const mockCreateResponse = mock(() => ({}));
const mockGetSetting = mock(async (key: string) => {
  if (key === 'openai_api_key') return 'api-key';
  return null;
});

// Mock factories
const mockOpenAIFactory = () => {
  return {
    default: class OpenAI {
      constructor(opts: any) { }
      responses = {
        create: mockCreateResponse
      };
      // Minimal mock for other parts if needed
      models = { list: mock(() => ({})) } as any
    }
  };
};

const mockSettingsFactory = () => {
  return {
    getSetting: mockGetSetting
  };
};

// Initial application (optional but helps IDE/imports)
mock.module("openai", mockOpenAIFactory);
mock.module("@/lib/tauri/settings", mockSettingsFactory);

import { generateThreadTitle } from '../lib/openai';

describe('AI Thread Title Generation', () => {
  beforeEach(() => {
    // Re-apply mocks for this test file
    mock.module("openai", mockOpenAIFactory);
    mock.module("@/lib/tauri/settings", mockSettingsFactory);

    mockCreateResponse.mockClear();
    mockGetSetting.mockClear();
  });

  afterEach(() => {
    mock.restore();
  });

  it('should generate a concise title from the first interaction', async () => {
    mockCreateResponse.mockResolvedValue({
      output: [
        {
          type: 'message',
          content: [{ type: 'output_text', text: 'Summary of Hamlet' }],
        },
      ],
    });

    const messages = [
      { role: 'user', content: 'What is Hamlet about?' },
      { role: 'assistant', content: 'Hamlet is a tragedy by William Shakespeare...' },
    ];

    const title = await generateThreadTitle(messages);

    expect(title).toBe('Summary of Hamlet');
    expect(mockCreateResponse).toHaveBeenCalledWith(expect.objectContaining({
      model: 'gpt-4o-mini',
      input: expect.arrayContaining([
        expect.objectContaining({ role: 'system' }),
        expect.objectContaining({ role: 'user', content: 'What is Hamlet about?' }),
      ]),
    }));
  });

  it('should clean up quotes from the generated title', async () => {
    mockCreateResponse.mockResolvedValue({
      output: [
        {
          type: 'message',
          content: [{ type: 'output_text', text: '"The Ghost of Hamlet"' }],
        },
      ],
    });

    // We need to pass at least empty messages to avoid slice error if implementation assumes length
    // Implementation: messages.slice(0, 2)
    const title = await generateThreadTitle([{ role: 'user', content: '...' }]);
    expect(title).toBe('The Ghost of Hamlet');
  });
});
