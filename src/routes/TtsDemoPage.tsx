import { useCallback, useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { pocketTTSService, type PocketTTSStatus } from "@/lib/pocket-tts"
import { cn } from "@/lib/utils"

const SAMPLE_TEXT = "This is an offline Pocket TTS test. The quick brown fox jumps over the lazy dog."

export default function TtsDemoPage() {
  const [status, setStatus] = useState<PocketTTSStatus>("idle")
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [events, setEvents] = useState<{ id: string; text: string }[]>([])
  const [error, setError] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const eventCounter = useRef(0)
  const assetCheckRan = useRef(false)

  useEffect(() => {
    const unsubscribe = pocketTTSService.subscribeStatus((next, message) => {
      setStatus(next)
      setStatusMessage(message ?? null)
      setEvents((prev) => {
        const stamp = new Date().toLocaleTimeString()
        const text = `${stamp} • ${next}${message ? ` — ${message}` : ""}`
        eventCounter.current += 1
        const entry = { id: `${Date.now()}-${eventCounter.current}`, text }
        return [entry, ...prev].slice(0, 10)
      })
    })
    const runAssetCheck = async () => {
      if (assetCheckRan.current) return
      assetCheckRan.current = true
      const assets = [
        "/pocket-tts/tokenizer.model",
        "/pocket-tts/voices.bin",
        "/pocket-tts/voices/alba.wav",
        "/pocket-tts/voices/marius.wav",
        "/pocket-tts/voices/javert.wav",
        "/pocket-tts/voices/jean.wav",
        "/pocket-tts/voices/fantine.wav",
        "/pocket-tts/voices/cosette.wav",
        "/pocket-tts/voices/eponine.wav",
        "/pocket-tts/voices/azelma.wav",
        "/pocket-tts/onnx/mimi_encoder.onnx",
        "/pocket-tts/onnx/text_conditioner.onnx",
        "/pocket-tts/onnx/flow_lm_main_int8.onnx",
        "/pocket-tts/onnx/flow_lm_flow_int8.onnx",
        "/pocket-tts/onnx/mimi_decoder_int8.onnx",
        "/pocket-tts/onnxruntime/ort.min.mjs",
        "/pocket-tts/onnxruntime/ort-wasm-simd-threaded.mjs",
        "/pocket-tts/onnxruntime/ort-wasm-simd-threaded.wasm",
      ]
      console.log("[TTS Demo] Asset check starting")
      eventCounter.current += 1
      setEvents((prev) => [
        { id: `event-${eventCounter.current}`, text: "Asset check starting" },
        ...prev,
      ])
      for (const asset of assets) {
        try {
          const res = await fetch(asset, { method: "HEAD" })
          console.log(`[TTS Demo] ${asset} -> ${res.status}`)
          eventCounter.current += 1
          setEvents((prev) => [
            { id: `event-${eventCounter.current}`, text: `${asset} -> ${res.status}` },
            ...prev,
          ])
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err)
          console.error(`[TTS Demo] ${asset} failed: ${message}`)
          eventCounter.current += 1
          setEvents((prev) => [
            { id: `event-${eventCounter.current}`, text: `${asset} -> error: ${message}` },
            ...prev,
          ])
        }
      }
      console.log("[TTS Demo] Asset check complete")
    }
    runAssetCheck()
    pocketTTSService.healthCheck().catch((err) => {
      setError(err instanceof Error ? err.message : String(err))
    })
    return () => {
      unsubscribe()
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [])

  const onPlay = useCallback(async () => {
    setError(null)
    setLoading(true)
    try {
      const response = await pocketTTSService.textToSpeech(SAMPLE_TEXT, "alba")
      const audio = new Audio(`data:audio/wav;base64,${response.audio_base64}`)
      audioRef.current = audio
      await audio.play()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [])

  return (
    <div className="h-full w-full overflow-y-auto bg-background">
      <div className="mx-auto max-w-2xl px-6 py-12 space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Pocket TTS Offline Test</h1>
          <p className="text-sm text-muted-foreground">
            This page exercises the in-browser Pocket TTS pipeline and plays back audio locally.
          </p>
        </div>

        <div className="rounded-xl border border-border/60 bg-card p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Engine Status</span>
            <span
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium",
                status === "ready" && "bg-emerald-500/10 text-emerald-600",
                status === "loading" && "bg-blue-500/10 text-blue-600",
                status === "running" && "bg-blue-500/10 text-blue-600",
                status === "error" && "bg-red-500/10 text-red-600",
                status === "idle" && "bg-muted text-muted-foreground",
              )}
            >
              {statusMessage || status}
            </span>
          </div>
          {statusMessage && (
            <p className="text-xs text-muted-foreground">{statusMessage}</p>
          )}

          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">Sample Text</p>
            <div className="rounded-lg border border-border/50 bg-muted/20 p-3 text-sm text-foreground">
              {SAMPLE_TEXT}
            </div>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <Button
            onClick={onPlay}
            disabled={loading || status === "loading" || status === "running"}
            className="w-full"
          >
            {loading ? "Generating audio..." : "Generate & Play"}
          </Button>
          <p className="text-xs text-muted-foreground">
            Note: browsers require a user gesture to start audio, so click the button to play.
          </p>
          <div className="rounded-lg border border-border/50 bg-muted/20 p-3">
            <p className="text-xs font-medium text-muted-foreground">Recent TTS events</p>
            <div className="mt-2 space-y-1 text-xs text-muted-foreground">
              {events.length === 0 ? (
                <div>No events yet.</div>
              ) : (
                events.map((entry) => <div key={entry.id}>{entry.text}</div>)
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
