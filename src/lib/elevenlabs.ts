import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import { getSetting } from "./tauri/settings";

export interface Voice {
  voice_id: string;
  name: string;
  preview_url?: string;
}

export async function resolveElevenLabsApiKey(): Promise<string> {
  const saved = await getSetting('elevenlabs_api_key');
  if (saved && saved.trim()) {
    return saved.trim();
  }

  // @ts-ignore
  const envKey = import.meta.env.VITE_ELEVENLABS_API_KEY;
  if (envKey && envKey.trim()) {
    return envKey.trim();
  }

  throw new Error('Missing ElevenLabs API key (set in Settings or VITE_ELEVENLABS_API_KEY)');
}

export class ElevenLabsService {
  private client: ElevenLabsClient | null = null;

  private async getClient(): Promise<ElevenLabsClient> {
    if (this.client) return this.client;
    
    const apiKey = await resolveElevenLabsApiKey();
    this.client = new ElevenLabsClient({
      apiKey,
    });
    return this.client;
  }

  async textToSpeech(text: string, voiceId: string = "Xb7hH8MSUJpSbSDYk0k2"): Promise<any> {
    const client = await this.getClient();
    return await client.textToSpeech.convert(voiceId, {
      text,
      modelId: "eleven_multilingual_v2",
      output_format: "mp3_44100_128",
    });
  }

  async getVoices(): Promise<Voice[]> {
    const client = await this.getClient();
    const response = await client.voices.getAll();
    return response.voices.map((v: any) => ({
      voice_id: v.voice_id,
      name: v.name,
      preview_url: v.preview_url,
    }));
  }

  async testSpeech(): Promise<void> {
    const client = await this.getClient();
    // Try to get voices as a test of the API key
    await client.voices.getAll();
  }
}

export const elevenLabsService = new ElevenLabsService();