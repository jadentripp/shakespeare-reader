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

export type PlaybackState = 'idle' | 'playing' | 'paused' | 'buffering' | 'error';

export class AudioPlayer {
  private context: AudioContext | null = null;
  private state: PlaybackState = 'idle';
  private currentSource: AudioBufferSourceNode | null = null;
  private queue: Array<{ text: string; audioBuffer: AudioBuffer }> = [];
  private onStateChange: ((state: PlaybackState) => void) | null = null;

  constructor() {
    // Context is lazily initialized on first play
  }

  private initContext() {
    if (!this.context) {
      this.context = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return this.context;
  }

  getState(): PlaybackState {
    return this.state;
  }

  setState(state: PlaybackState) {
    this.state = state;
    this.onStateChange?.(state);
  }

  async play(text: string, voiceId?: string) {
    const ctx = this.initContext();
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    this.setState('buffering');

    try {
      const audioStream = await elevenLabsService.textToSpeech(text, voiceId);
      const audioData = await this.streamToBuffer(audioStream);
      const audioBuffer = await ctx.decodeAudioData(audioData);

      this.stop(); // Stop any current playback
      
      this.currentSource = ctx.createBufferSource();
      this.currentSource.buffer = audioBuffer;
      this.currentSource.connect(ctx.destination);
      this.currentSource.onended = () => {
        if (this.state === 'playing') {
          this.setState('idle');
        }
      };
      
      this.currentSource.start(0);
      this.setState('playing');
    } catch (e) {
      console.error('Audio playback error:', e);
      this.setState('error');
    }
  }

  pause() {
    if (this.state === 'playing') {
      this.context?.suspend();
      this.setState('paused');
    }
  }

  resume() {
    if (this.state === 'paused') {
      this.context?.resume();
      this.setState('playing');
    }
  }

  stop() {
    if (this.currentSource) {
      try {
        this.currentSource.stop();
      } catch (e) {
        // Source might have already stopped
      }
      this.currentSource = null;
    }
    this.setState('idle');
  }

  private async streamToBuffer(stream: ReadableStream): Promise<ArrayBuffer> {
    const reader = stream.getReader();
    const chunks: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
    const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }
    return result.buffer;
  }

  subscribe(callback: (state: PlaybackState) => void) {
    this.onStateChange = callback;
  }
}

export const audioPlayer = new AudioPlayer();