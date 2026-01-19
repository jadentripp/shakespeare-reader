import OpenAI from 'openai';
import { getSetting } from './tauri/settings';

export interface ChatMessage {
  role: string;
  content: string;
}

export interface ChatResult {
  content: string;
}

export async function resolveApiKey(): Promise<string> {
  const saved = await getSetting('openai_api_key');
  if (saved && saved.trim()) {
    return saved.trim();
  }

  // @ts-ignore
  const envKey = import.meta.env.VITE_OPENAI_API_KEY;
  if (envKey && envKey.trim()) {
    return envKey.trim();
  }

  throw new Error('Missing OpenAI API key (set in Settings or VITE_OPENAI_API_KEY)');
}

class OpenAIService {
  private client: OpenAI | null = null;

  getClient(): OpenAI {
    if (this.client) return this.client;
    
    this.client = new OpenAI({
      apiKey: resolveApiKey, // Use the async resolver directly
      dangerouslyAllowBrowser: true, // Required for Tauri/Web environment
    });
    return this.client;
  }

  async listModels(): Promise<string[]> {
    console.log("[OpenAI] listModels started");
    const client = this.getClient();
    try {
      const response = await client.models.list();
      console.log("[OpenAI] listModels raw response count:", response.data.length);
      
      const filtered = response.data
        .filter((model: any) => {
          const id = model.id;
          // Only show GPT models
          if (!id.startsWith('gpt-')) return false;
          
          // Filter out specialized models
          const excludeTerms = ['realtime', 'search', 'tts', 'codex', 'image', 'audio', 'transcribe'];
          if (excludeTerms.some(term => id.includes(term))) return false;
          
          return true;
        })
        .sort((a: any, b: any) => (b.created || 0) - (a.created || 0))
        .map((model: any) => model.id);
        
      console.log("[OpenAI] listModels filtered count:", filtered.length);
      return filtered;
    } catch (e) {
      console.error("[OpenAI] listModels failed:", e);
      throw e;
    }
  }

  async chat(messages: ChatMessage[], model_override?: string): Promise<ChatResult> {
    const client = this.getClient();
    
    const model = model_override || (await getSetting('openai_model')) || 'gpt-5.2';

    const response = await client.responses.create({
      model,
      input: messages as any, // Cast to any to match OpenAI SDK expectation if needed
      // @ts-ignore - Reasoning might not be in the current SDK types but is supported by API
      reasoning: undefined, 
    });

    let content = '';

    // @ts-ignore - SDK types for 'responses' might be lagging
    for (const item of response.output || []) {
      if (item.type === 'message') {
        for (const part of item.content || []) {
          if (part.type === 'output_text') {
            content += part.text;
          }
        }
      }
    }

    return {
      content,
    };
  }
}

export const openAIService = new OpenAIService();

// Helper exports to match original test expectations and common usage
export const listModels = () => openAIService.listModels();
export const chat = (messages: ChatMessage[], model_override?: string) => 
  openAIService.chat(messages, model_override);
export { OpenAIService };
