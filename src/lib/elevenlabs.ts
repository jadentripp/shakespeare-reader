import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import { getSetting } from "./tauri/settings";

export interface Voice {
  voice_id: string;
  name: string;
  category?: string;
  preview_url?: string;
}

export interface VoiceSettings {
  stability: number;
  similarity_boost: number;
  style: number;
  use_speaker_boost: boolean;
}

export async function resolveElevenLabsApiKey(): Promise<string> {
  const saved = await getSetting('elevenlabs_api_key');
  if (saved && saved.trim()) {
    return saved.trim();
  }

  throw new Error('Missing ElevenLabs API key (set in Settings)');
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

  async textToSpeech(text: string, voiceId: string, settings?: VoiceSettings): Promise<any> {
    console.log(`[ElevenLabs] textToSpeech called for text: "${text.substring(0, 30)}..." with voiceId: ${voiceId}`);
    const client = await this.getClient();
    try {
      const response = await client.textToSpeech.convert(voiceId, {
        text,
        modelId: "eleven_flash_v2_5", // Faster and more modern
        outputFormat: "mp3_44100_128",
        voiceSettings: settings ? {
          stability: settings.stability,
          similarityBoost: settings.similarity_boost,
          style: settings.style,
          useSpeakerBoost: settings.use_speaker_boost,
        } : undefined,
      });
      console.log(`[ElevenLabs] textToSpeech conversion successful`);
      return response;
    } catch (e: any) {
      if (e.message?.includes("famous_voice_not_permitted")) {
        console.error(`[ElevenLabs] VOICE RESTRICTED: The selected voice is restricted by ElevenLabs and cannot be used via API.`);
        throw new Error("This voice is restricted by ElevenLabs for API use. Please try a different voice.");
      }
      console.error(`[ElevenLabs] textToSpeech conversion failed:`, e);
      throw e;
    }
  }

  async getVoices(): Promise<Voice[]> {
    console.log(`[ElevenLabs] getVoices called`);
    const client = await this.getClient();
    try {
      const response = await client.voices.getAll();
      console.log(`[ElevenLabs] getVoices successful, found ${response.voices.length} voices`);

      if (response.voices.length > 0) {
        console.log(`[ElevenLabs] Sample voice object structure:`, {
          has_voice_id: 'voice_id' in response.voices[0],
          has_voiceId: 'voiceId' in response.voices[0],
          raw_keys: Object.keys(response.voices[0])
        });
      }

      return response.voices.map((v: any, index: number) => {
        const id = v.voice_id || v.voiceId;
        if (!id) {
          console.warn(`[ElevenLabs] Voice at index ${index} missing ID:`, v.name);
        }
        return {
          voice_id: id || `voice-err-${index}`,
          name: v.name || 'Unnamed Voice',
          category: v.category,
          preview_url: v.preview_url || v.previewUrl,
        };
      });
    } catch (e) {
      console.error(`[ElevenLabs] getVoices failed:`, e);
      throw e;
    }
  }
}

export const elevenLabsService = new ElevenLabsService();

export type PlaybackState = 'idle' | 'playing' | 'paused' | 'buffering' | 'error';

export class AudioPlayer {
  private context: AudioContext | null = null;
  private state: PlaybackState = 'idle';
  private currentSource: AudioBufferSourceNode | null = null;
  private queue: Array<{ text: string; audioBuffer: AudioBuffer }> = [];
  private listeners = new Set<(state: PlaybackState) => void>();

  constructor() {
    // Context is lazily initialized on first play
  }

  private initContext() {
    if (!this.context) {
      console.log(`[AudioPlayer] Initializing AudioContext`);
      this.context = new (window.AudioContext || (window as any).webkitAudioContext)();
      console.log(`[AudioPlayer] AudioContext state: ${this.context.state}`);
    }
    return this.context;
  }

  getState(): PlaybackState {
    return this.state;
  }

  setState(state: PlaybackState) {
    console.log(`[AudioPlayer] State transition: ${this.state} -> ${state}`);
    this.state = state;
    this.listeners.forEach(l => l(state));
  }

  async play(text: string, voiceId?: string, settings?: VoiceSettings) {
    console.log(`[AudioPlayer] play requested for text length: ${text.length}`);
    const ctx = this.initContext();
    if (ctx.state === 'suspended') {
      console.log(`[AudioPlayer] Resuming suspended AudioContext`);
      await ctx.resume();
    }

    this.setState('buffering');

    try {
      let finalVoiceId = voiceId;
      if (!finalVoiceId) {
        finalVoiceId = await getSetting("elevenlabs_voice_id") || undefined;
        console.log(`[AudioPlayer] Resolved voiceId from database: ${finalVoiceId}`);
      }

      if (!finalVoiceId) {
        // Fallback to a sensible default if nothing found (e.g. Rachel)
        finalVoiceId = "21m00Tcm4TbcDqnu8SRw";
        console.log(`[AudioPlayer] No voiceId found, falling back to Rachel: ${finalVoiceId}`);
      }

      // If settings not provided, try to load from database
      let finalSettings = settings;
      if (!finalSettings) {
        console.log(`[AudioPlayer] Loading voice settings from database`);
        const stability = await getSetting("elevenlabs_stability");
        const similarity = await getSetting("elevenlabs_similarity");
        const style = await getSetting("elevenlabs_style");
        const boost = await getSetting("elevenlabs_speaker_boost");

        if (stability !== null) {
          finalSettings = {
            stability: parseFloat(stability) || 0.5,
            similarity_boost: parseFloat(similarity ?? "0.75") || 0.75,
            style: parseFloat(style ?? "0") || 0,
            use_speaker_boost: boost === "true"
          };
          console.log(`[AudioPlayer] Settings loaded:`, finalSettings);
        } else {
          console.log(`[AudioPlayer] No settings found in database, using defaults`);
        }
      }

      console.log(`[AudioPlayer] Calling elevenLabsService.textToSpeech with voiceId: ${finalVoiceId}`);
      const audioStream = await elevenLabsService.textToSpeech(text, finalVoiceId, finalSettings);

      console.log(`[AudioPlayer] Converting stream to buffer`);
      const audioData = await this.streamToBuffer(audioStream);
      console.log(`[AudioPlayer] Audio data received, size: ${audioData.byteLength} bytes`);

      console.log(`[AudioPlayer] Decoding audio data`);
      const audioBuffer = await ctx.decodeAudioData(audioData);
      console.log(`[AudioPlayer] Audio decoded successfully, duration: ${audioBuffer.duration.toFixed(2)}s`);

      this.stop(); // Stop any current playback

      this.currentSource = ctx.createBufferSource();
      this.currentSource.buffer = audioBuffer;
      this.currentSource.connect(ctx.destination);
      this.currentSource.onended = () => {
        console.log(`[AudioPlayer] Playback ended`);
        if (this.state === 'playing') {
          this.setState('idle');
        }
      };

      console.log(`[AudioPlayer] Starting playback`);
      this.currentSource.start(0);
      this.setState('playing');
    } catch (e) {
      console.error('[AudioPlayer] Audio playback error:', e);
      this.setState('error');
    }
  }

  pause() {
    console.log(`[AudioPlayer] Pause requested`);
    if (this.state === 'playing') {
      this.context?.suspend();
      this.setState('paused');
    }
  }

  resume() {
    console.log(`[AudioPlayer] Resume requested`);
    if (this.state === 'paused') {
      this.context?.resume();
      this.setState('playing');
    }
  }

  stop() {
    if (this.currentSource) {
      console.log(`[AudioPlayer] Stopping current source`);
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
    console.log(`[AudioPlayer] Reading stream`);
    const reader = stream.getReader();
    const chunks: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
    const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
    console.log(`[AudioPlayer] Stream read complete, total chunks: ${chunks.length}, total length: ${totalLength}`);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }
    return result.buffer;
  }

  subscribe(callback: (state: PlaybackState) => void) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }
}

export const audioPlayer = new AudioPlayer();