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

export interface AudioProgress {
  currentTime: number;
  duration: number;
  isBuffering: boolean;
}

export class AudioPlayer {
  private context: AudioContext | null = null;
  private state: PlaybackState = 'idle';
  private currentSource: AudioBufferSourceNode | null = null;
  private gainNode: GainNode | null = null;
  private currentBuffer: AudioBuffer | null = null;
  private queue: Array<{ text: string; audioBuffer: AudioBuffer }> = [];
  private listeners = new Set<(state: PlaybackState) => void>();
  private progressListeners = new Set<(progress: AudioProgress) => void>();

  // Playback state tracking
  private _playbackRate: number = 1;
  private _volume: number = 1;
  private _startTime: number = 0;  // AudioContext.currentTime when playback started
  private _startOffset: number = 0; // Position in audio buffer when playback started
  private _pausedAt: number = 0;    // Position where playback was paused
  private progressInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    // Context is lazily initialized on first play
  }

  private initContext() {
    if (!this.context) {
      console.log(`[AudioPlayer] Initializing AudioContext`);
      this.context = new (window.AudioContext || (window as any).webkitAudioContext)();
      console.log(`[AudioPlayer] AudioContext state: ${this.context.state}`);
    }
    // Initialize gain node for volume control
    if (!this.gainNode && this.context) {
      this.gainNode = this.context.createGain();
      this.gainNode.gain.value = this._volume;
      this.gainNode.connect(this.context.destination);
    }
    return this.context;
  }

  getState(): PlaybackState {
    return this.state;
  }

  setState(state: PlaybackState) {
    console.log(`[AudioPlayer] State transition: ${this.state} -> ${state}`);
    this.state = state;
    this.updateProgressCache();
    this.listeners.forEach(l => l(state));

    // Start/stop progress updates
    if (state === 'playing') {
      this.startProgressUpdates();
    } else {
      this.stopProgressUpdates();
    }
  }

  private startProgressUpdates() {
    this.stopProgressUpdates();
    this.progressInterval = setInterval(() => {
      this.notifyProgressListeners();
    }, 100);
  }

  private stopProgressUpdates() {
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
      this.progressInterval = null;
    }
  }

  private notifyProgressListeners() {
    this.updateProgressCache();
    const progress = this.getProgress();
    this.progressListeners.forEach(l => l(progress));
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

      // Store the buffer for seeking
      this.currentBuffer = audioBuffer;
      this._startOffset = 0;
      this._pausedAt = 0;

      this.startPlayback(audioBuffer, 0);
      this.setState('playing');
    } catch (e) {
      console.error('[AudioPlayer] Audio playback error:', e);
      this.setState('error');
    }
  }

  private startPlayback(buffer: AudioBuffer, offset: number) {
    const ctx = this.initContext();

    // Disconnect and clean up previous source
    if (this.currentSource) {
      try {
        this.currentSource.stop();
      } catch (e) {
        // Source might have already stopped
      }
      this.currentSource = null;
    }

    this.currentSource = ctx.createBufferSource();
    this.currentSource.buffer = buffer;
    this.currentSource.playbackRate.value = this._playbackRate;

    // Connect through gain node for volume control
    if (this.gainNode) {
      this.currentSource.connect(this.gainNode);
    } else {
      this.currentSource.connect(ctx.destination);
    }

    this.currentSource.onended = () => {
      console.log(`[AudioPlayer] Playback ended`);
      if (this.state === 'playing') {
        this._pausedAt = 0;
        this._startOffset = 0;
        this.setState('idle');
      }
    };

    this._startTime = ctx.currentTime;
    this._startOffset = offset;

    console.log(`[AudioPlayer] Starting playback at offset: ${offset.toFixed(2)}s`);
    this.currentSource.start(0, offset);
  }

  pause() {
    console.log(`[AudioPlayer] Pause requested`);
    if (this.state === 'playing') {
      // Calculate current position before pausing
      this._pausedAt = this.getCurrentTime();
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
    this.stopProgressUpdates();
    if (this.currentSource) {
      console.log(`[AudioPlayer] Stopping current source`);
      try {
        this.currentSource.stop();
      } catch (e) {
        // Source might have already stopped
      }
      this.currentSource = null;
    }
    this._startOffset = 0;
    this._pausedAt = 0;
    this.setState('idle');
  }

  /**
   * Seek to a specific position in the audio (in seconds)
   */
  seek(position: number) {
    if (!this.currentBuffer || !this.context) {
      console.log(`[AudioPlayer] Cannot seek: no audio loaded`);
      return;
    }

    const duration = this.currentBuffer.duration;
    const clampedPosition = Math.max(0, Math.min(position, duration));

    console.log(`[AudioPlayer] Seeking to position: ${clampedPosition.toFixed(2)}s`);

    if (this.state === 'playing') {
      // Restart playback from new position
      this.startPlayback(this.currentBuffer, clampedPosition);
    } else if (this.state === 'paused') {
      // Just update the position, playback will resume from here
      this._pausedAt = clampedPosition;
      this._startOffset = clampedPosition;
    }

    this.notifyProgressListeners();
  }

  /**
   * Set playback rate (0.5 to 2.0)
   */
  setPlaybackRate(rate: number) {
    const clampedRate = Math.max(0.5, Math.min(2, rate));
    console.log(`[AudioPlayer] Setting playback rate to: ${clampedRate}x`);
    this._playbackRate = clampedRate;

    if (this.currentSource) {
      this.currentSource.playbackRate.value = clampedRate;
    }
  }

  /**
   * Get current playback rate
   */
  getPlaybackRate(): number {
    return this._playbackRate;
  }

  /**
   * Set volume (0 to 1)
   */
  setVolume(level: number) {
    const clampedLevel = Math.max(0, Math.min(1, level));
    console.log(`[AudioPlayer] Setting volume to: ${clampedLevel}`);
    this._volume = clampedLevel;

    if (this.gainNode) {
      this.gainNode.gain.value = clampedLevel;
    }
  }

  /**
   * Get current volume
   */
  getVolume(): number {
    return this._volume;
  }

  /**
   * Get current playback time in seconds
   */
  getCurrentTime(): number {
    if (!this.context || !this.currentBuffer) return 0;

    if (this.state === 'paused') {
      return this._pausedAt;
    }

    if (this.state === 'playing') {
      const elapsed = (this.context.currentTime - this._startTime) * this._playbackRate;
      return Math.min(this._startOffset + elapsed, this.currentBuffer.duration);
    }

    return 0;
  }

  /**
   * Get audio duration in seconds
   */
  getDuration(): number {
    return this.currentBuffer?.duration ?? 0;
  }

  /**
   * Get progress info (currentTime, duration, isBuffering)
   * Returns a cached object if values haven't changed to satisfy useSyncExternalStore equality checks
   */
  private _cachedProgress: AudioProgress = { currentTime: 0, duration: 0, isBuffering: false };

  private updateProgressCache() {
    const currentTime = this.getCurrentTime();
    const duration = this.getDuration();
    const isBuffering = this.state === 'buffering';

    if (currentTime !== this._cachedProgress.currentTime ||
        duration !== this._cachedProgress.duration ||
        isBuffering !== this._cachedProgress.isBuffering) {
      this._cachedProgress = { currentTime, duration, isBuffering };
    }
  }

  getProgress(): AudioProgress {
    return this._cachedProgress;
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

  /**
   * Subscribe to progress updates (fires ~10x per second during playback)
   */
  subscribeProgress(callback: (progress: AudioProgress) => void) {
    this.progressListeners.add(callback);
    return () => this.progressListeners.delete(callback);
  }
}

export const audioPlayer = new AudioPlayer();