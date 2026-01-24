/**
 * Qwen3-TTS client for local TTS server.
 * Connects to the Python server running at localhost:5123.
 */

import { getQwenStatus, startQwenSidecar } from "./tauri/settings"

export interface QwenVoice {
  id: string
  name: string
  description: string
  language: string
}

export interface QwenTTSResponse {
  audio_base64: string
  sample_rate: number
  duration: number
}

const QWEN_TTS_URL = "http://localhost:5123"

// Available speakers for CustomVoice model
export const QWEN_SPEAKERS = [
  { id: "Aiden", name: "Aiden", description: "Sunny American male voice with a clear midrange", language: "English" },
  { id: "Ryan", name: "Ryan", description: "Dynamic male voice with strong rhythmic drive", language: "English" },
  { id: "Vivian", name: "Vivian", description: "Bright, slightly edgy young female voice", language: "Chinese" },
  { id: "Serena", name: "Serena", description: "Warm, gentle young female voice", language: "Chinese" },
  { id: "Ono_Anna", name: "Ono Anna", description: "Playful Japanese female voice", language: "Japanese" },
  { id: "Sohee", name: "Sohee", description: "Warm Korean female voice with rich emotion", language: "Korean" },
] as const

export class QwenTTSService {
  private baseUrl: string

  constructor(baseUrl: string = QWEN_TTS_URL) {
    this.baseUrl = baseUrl
  }

  private async ensureSidecar(): Promise<boolean> {
    try {
      let status = await getQwenStatus()
      if (status === "running") return true

      if (status === "stopped" || status === "errored") {
        await startQwenSidecar()
      }

      // Poll until running or timeout (30 seconds)
      const start = Date.now()
      while (status !== "running" && Date.now() - start < 30000) {
        await new Promise((r) => setTimeout(r, 1000))
        status = await getQwenStatus()
      }

      return status === "running"
    } catch (e) {
      console.error("[QwenTTS] Failed to ensure sidecar is running:", e)
      return false
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, { signal: AbortSignal.timeout(2000) })
      return response.ok
    } catch {
      return false
    }
  }

  async textToSpeech(
    text: string,
    speaker?: string,
    language?: string,
    instruct?: string
  ): Promise<QwenTTSResponse> {
    console.log(`[QwenTTS] textToSpeech called for ${text.length} chars, speaker=${speaker ?? "Aiden"}`)

    await this.ensureSidecar()

    const response = await fetch(`${this.baseUrl}/tts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        speaker: speaker ?? "Aiden",
        language: language ?? "English",
        instruct,
      }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "Unknown error" }))
      throw new Error(error.error || `TTS failed: ${response.status}`)
    }

    const data = await response.json()
    console.log(`[QwenTTS] Generated ${data.duration?.toFixed(2)}s audio`)
    return data
  }

  async *streamTextToSpeech(
    text: string,
    speaker?: string,
    language?: string,
    instruct?: string
  ): AsyncGenerator<QwenTTSResponse> {
    console.log(`[QwenTTS] streamTextToSpeech called for ${text.length} chars`)

    await this.ensureSidecar()

    const response = await fetch(`${this.baseUrl}/tts/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        speaker: speaker ?? "Aiden",
        language: language ?? "English",
        instruct,
      }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "Unknown error" }))
      throw new Error(error.error || `TTS stream failed: ${response.status}`)
    }

    const reader = response.body?.getReader()
    if (!reader) throw new Error("No response body")

    const decoder = new TextDecoder()
    let buffer = ""

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split("\n")
      buffer = lines.pop() || ""

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          try {
            const data = JSON.parse(line.slice(6))
            if (data.error) throw new Error(data.error)
            yield data
          } catch (e) {
            if (e instanceof SyntaxError) continue
            throw e
          }
        }
      }
    }
  }

  async getVoices(): Promise<QwenVoice[]> {
    await this.ensureSidecar()
    const response = await fetch(`${this.baseUrl}/voices`)
    if (!response.ok) throw new Error("Failed to fetch voices")
    const data = await response.json()
    return data.voices
  }
}

export const qwenTTSService = new QwenTTSService()
