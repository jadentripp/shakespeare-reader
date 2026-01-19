import { useEffect, useMemo, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { getSetting, openAiKeyStatus, setSetting } from "../lib/tauri";
import { listModels } from "@/lib/openai";
import { cn } from "@/lib/utils";
import {
  ChevronLeft,
  ChevronRight,
  Settings2,
  Columns2,
  BookOpen,
  Play,
  Pause,
  Square,
  Loader2,
  Headphones,
  Volume2,
} from "lucide-react";
import { elevenLabsService, Voice } from "@/lib/elevenlabs";

function SettingsSection({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-border/60 bg-gradient-to-b from-card to-card/95 shadow-sm">
      <div className="border-b border-border/40 bg-muted/30 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            {icon}
          </div>
          <div>
            <h3 className="text-sm font-medium tracking-wide text-foreground/90">{title}</h3>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        </div>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

function SettingsRow({
  label,
  description,
  children,
  vertical = false,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
  vertical?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex gap-4",
        vertical ? "flex-col" : "items-center justify-between"
      )}
    >
      <div className="space-y-0.5">
        <Label className="text-sm font-medium text-foreground">{label}</Label>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      <div className={cn(vertical && "pt-1")}>{children}</div>
    </div>
  );
}

function StatusBadge({ status, type }: { status: string; type: "success" | "info" | "error" }) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium",
        type === "success" && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
        type === "info" && "bg-blue-500/10 text-blue-600 dark:text-blue-400",
        type === "error" && "bg-red-500/10 text-red-600 dark:text-red-400"
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          type === "success" && "bg-emerald-500",
          type === "info" && "bg-blue-500",
          type === "error" && "bg-red-500"
        )}
      />
      {status}
    </div>
  );
}

export default function SettingsPage() {
  const [apiKey, setApiKey] = useState("");
  const [elevenLabsApiKey, setElevenLabsApiKey] = useState("");
  const [voiceId, setVoiceId] = useState("Xb7hH8MSUJpSbSDYk0k2");
  const [voices, setVoices] = useState<Voice[]>([]);
  const [stability, setStability] = useState(0.5);
  const [similarity, setSimilarity] = useState(0.75);
  const [style, setStyle] = useState(0.0);
  const [speakerBoost, setSpeakerBoost] = useState(true);
  const [model, setModel] = useState("gpt-5.2");
  const [status, setStatus] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [models, setModels] = useState<string[]>([]);
  const [modelsStatus, setModelsStatus] = useState<string | null>(null);
  const [keyStatus, setKeyStatus] = useState<{ has_env_key: boolean; has_saved_key: boolean } | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showElevenLabsApiKey, setShowElevenLabsApiKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [previewingId, setPreviewingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  async function onPreviewVoice(voice: Voice) {
    if (!voice.preview_url) return;
    
    if (previewingId === voice.voice_id) {
      if (audioRef.current) {
        audioRef.current.pause();
        setPreviewingId(null);
      }
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
    }

    const audio = new Audio(voice.preview_url);
    audioRef.current = audio;
    setPreviewingId(voice.voice_id);
    
    audio.play().catch(e => {
      console.error("Failed to play preview:", e);
      setPreviewingId(null);
    });
    audio.onended = () => setPreviewingId(null);
  }

  useEffect(() => {
    (async () => {
      console.log("[Settings] Initializing...");
      const savedKey = await getSetting("openai_api_key");
      const savedElevenLabsKey = await getSetting("elevenlabs_api_key");
      const savedVoiceId = await getSetting("elevenlabs_voice_id");
      const savedStability = await getSetting("elevenlabs_stability");
      const savedSimilarity = await getSetting("elevenlabs_similarity");
      const savedStyle = await getSetting("elevenlabs_style");
      const savedSpeakerBoost = await getSetting("elevenlabs_speaker_boost");
      const savedModel = await getSetting("openai_model");
      
      let savedKeyStatus = { has_env_key: false, has_saved_key: false };
      try {
        savedKeyStatus = await openAiKeyStatus();
        console.log("[Settings] openAiKeyStatus result:", savedKeyStatus);
      } catch (e) {
        console.error("[Settings] openAiKeyStatus failed:", e);
      }

      if (savedKey) {
        console.log("[Settings] Found saved OpenAI key");
        setApiKey(savedKey);
      }
      if (savedElevenLabsKey) {
        setElevenLabsApiKey(savedElevenLabsKey);
        loadVoices();
      }
      if (savedVoiceId) setVoiceId(savedVoiceId);
      if (savedStability) setStability(parseFloat(savedStability));
      if (savedSimilarity) setSimilarity(parseFloat(savedSimilarity));
      if (savedStyle) setStyle(parseFloat(savedStyle));
      if (savedSpeakerBoost !== null) setSpeakerBoost(savedSpeakerBoost === "true");
      if (savedModel) setModel(savedModel);
      
      setKeyStatus(savedKeyStatus);
      if (savedKeyStatus.has_env_key || savedKeyStatus.has_saved_key || savedKey) {
        console.log("[Settings] Key detected, loading models...");
        loadModels();
      } else {
        console.log("[Settings] No key detected");
      }
    })();
  }, []);

  async function loadVoices() {
    try {
      const list = await elevenLabsService.getVoices();
      setVoices(list);
    } catch (e) {
      console.error("Failed to load voices:", e);
    }
  }

  async function onSave() {
    setStatus(null);
    setLoading(true);
    try {
      await setSetting({ key: "openai_api_key", value: apiKey.trim() });
      await setSetting({ key: "elevenlabs_api_key", value: elevenLabsApiKey.trim() });
      await setSetting({ key: "elevenlabs_voice_id", value: voiceId });
      await setSetting({ key: "elevenlabs_stability", value: stability.toString() });
      await setSetting({ key: "elevenlabs_similarity", value: similarity.toString() });
      await setSetting({ key: "elevenlabs_style", value: style.toString() });
      await setSetting({ key: "elevenlabs_speaker_boost", value: speakerBoost.toString() });
      await setSetting({ key: "openai_model", value: model });
      
      try {
        const savedKeyStatus = await openAiKeyStatus();
        setKeyStatus(savedKeyStatus);
      } catch (e) {
        console.error("[Settings] onSave: openAiKeyStatus failed", e);
      }
      
      setStatus({ message: "Settings saved successfully", type: "success" });
    } catch {
      setStatus({ message: "Failed to save settings", type: "error" });
    } finally {
      setLoading(false);
    }
  }

  async function onClearKey() {
    setStatus(null);
    setLoading(true);
    try {
      await setSetting({ key: "openai_api_key", value: "" });
      setApiKey("");
      
      try {
        const savedKeyStatus = await openAiKeyStatus();
        setKeyStatus(savedKeyStatus);
      } catch (e) {
        console.error("[Settings] onClearKey: openAiKeyStatus failed", e);
      }
      
      setStatus({ message: "API key cleared", type: "success" });
    } catch {
      setStatus({ message: "Failed to clear API key", type: "error" });
    } finally {
      setLoading(false);
    }
  }

  async function onClearElevenLabsKey() {
    setStatus(null);
    setLoading(true);
    try {
      await setSetting({ key: "elevenlabs_api_key", value: "" });
      setElevenLabsApiKey("");
      setStatus({ message: "ElevenLabs API key cleared", type: "success" });
    } catch {
      setStatus({ message: "Failed to clear ElevenLabs API key", type: "error" });
    } finally {
      setLoading(false);
    }
  }

  async function onTestElevenLabs() {
    setTestLoading(true);
    setStatus(null);
    try {
      await elevenLabsService.testSpeech();
      setStatus({ message: "ElevenLabs connection successful!", type: "success" });
    } catch (e: any) {
      setStatus({ message: `Connection failed: ${e.message}`, type: "error" });
    } finally {
      setTestLoading(false);
    }
  }

  async function loadModels() {
    console.log("[Settings] loadModels called");
    setModelsStatus(null);
    try {
      const list = await listModels();
      console.log("[Settings] listModels result:", list);
      setModels(list);
      setModelsStatus(list.length ? `${list.length} models available` : "No models found");
    } catch (e: unknown) {
      console.error("[Settings] loadModels error:", e);
      const message = e instanceof Error ? e.message : String(e);
      setModelsStatus(message);
    }
  }
  const keyConfigured = keyStatus?.has_env_key || keyStatus?.has_saved_key || apiKey.trim();
  const elevenLabsKeyConfigured = elevenLabsApiKey.trim();
  const selectedVoice = voices.find(v => v.voice_id === voiceId);

  // Combine fetched models with current model if not present, to avoid empty selection
  const allModels = useMemo(() => {
    const set = new Set(models);
    if (model) set.add(model);
    return Array.from(set);
  }, [models, model]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="mx-auto max-w-2xl px-6 py-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-serif text-3xl font-medium tracking-tight text-foreground">
            Settings
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Configure your AI Reader experience
          </p>
        </div>

        <div className="space-y-6">
          {/* API Configuration */}
          <SettingsSection
            icon={
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            }
            title="API Configuration"
            description="Connect to OpenAI for AI-powered features"
          >
            <div className="space-y-6">
              {/* API Key Status */}
              <div className="flex items-center justify-between rounded-lg bg-muted/40 px-4 py-3">
                <span className="text-sm text-muted-foreground">Connection Status</span>
                {keyConfigured ? (
                  <StatusBadge status="Connected" type="success" />
                ) : (
                  <StatusBadge status="Not configured" type="info" />
                )}
              </div>

              {/* API Key Input */}
              <SettingsRow
                label="API Key"
                description={
                  keyStatus?.has_env_key
                    ? "Using key from OPENAI_API_KEY environment variable"
                    : "Enter your OpenAI API key to enable AI features"
                }
                vertical
              >
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      type={showApiKey ? "text" : "password"}
                      value={apiKey}
                      onChange={(e) => setApiKey(e.currentTarget.value)}
                      placeholder="sk-..."
                      className="h-11 rounded-lg border-border/50 bg-background/50 pr-20 font-mono text-sm transition-colors focus:bg-background"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
                    >
                      {showApiKey ? "Hide" : "Show"}
                    </button>
                  </div>
                  {keyStatus?.has_saved_key && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onClearKey}
                      disabled={loading}
                      className="h-11 whitespace-nowrap"
                    >
                      Clear
                    </Button>
                  )}
                </div>
              </SettingsRow>

              {/* Divider */}
              <div className="h-px bg-gradient-to-r from-transparent via-border/60 to-transparent" />

              {/* Model Selection */}
              <SettingsRow
                label="Model"
                description="Select which OpenAI model to use for AI features"
                vertical
              >
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <Select
                      value={model}
                      onValueChange={setModel}
                    >
                      <SelectTrigger className="h-11 flex-1 rounded-lg border-border/50 bg-background/50 transition-colors hover:bg-background">
                        <SelectValue placeholder="Select a model" />
                      </SelectTrigger>
                      <SelectContent className="rounded-lg">
                        {allModels.map((modelId) => (
                          <SelectItem key={modelId} value={modelId} className="rounded-md">
                            <span className="font-mono text-sm">{modelId}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      onClick={loadModels}
                      disabled={!keyConfigured}
                      className="h-11 gap-2"
                    >
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Refresh
                    </Button>
                  </div>

                  {modelsStatus && (
                    <p className="text-xs text-muted-foreground">{modelsStatus}</p>
                  )}
                </div>
              </SettingsRow>
            </div>
          </SettingsSection>

          {/* Text-to-Speech Configuration */}
          <SettingsSection
            icon={
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
              </svg>
            }
            title="Text-to-Speech"
            description="Configure ElevenLabs for audiobook narration"
          >
            <div className="space-y-6">
              {/* API Key Status */}
              <div className="flex items-center justify-between rounded-lg bg-muted/40 px-4 py-3">
                <span className="text-sm text-muted-foreground">Connection Status</span>
                {elevenLabsKeyConfigured ? (
                  <StatusBadge status="Connected" type="success" />
                ) : (
                  <StatusBadge status="Not configured" type="info" />
                )}
              </div>

              {/* API Key Input */}
              <SettingsRow
                label="ElevenLabs API Key"
                description="Enter your ElevenLabs API key to enable text-to-speech features"
                vertical
              >
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      type={showElevenLabsApiKey ? "text" : "password"}
                      value={elevenLabsApiKey}
                      onChange={(e) => setElevenLabsApiKey(e.currentTarget.value)}
                      placeholder="Enter your API key"
                      className="h-11 rounded-lg border-border/50 bg-background/50 pr-20 font-mono text-sm transition-colors focus:bg-background"
                    />
                    <button
                      type="button"
                      onClick={() => setShowElevenLabsApiKey(!showElevenLabsApiKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
                    >
                      {showElevenLabsApiKey ? "Hide" : "Show"}
                    </button>
                  </div>
                  {elevenLabsKeyConfigured && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onClearElevenLabsKey}
                      disabled={loading}
                      className="h-11 whitespace-nowrap"
                    >
                      Clear
                    </Button>
                  )}
                </div>
              </SettingsRow>

              {/* Divider */}
              <div className="h-px bg-gradient-to-r from-transparent via-border/60 to-transparent" />

              {/* Voice Selection */}
              <SettingsRow
                label="Narrator Voice"
                description="Select the AI voice for audiobook narration"
                vertical
              >
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <Select
                      value={voiceId}
                      onValueChange={setVoiceId}
                      disabled={!elevenLabsKeyConfigured || voices.length === 0}
                    >
                      <SelectTrigger className="h-11 flex-1 rounded-lg border-border/50 bg-background/50 transition-colors hover:bg-background">
                        <SelectValue placeholder="Select a voice" />
                      </SelectTrigger>
                      <SelectContent className="rounded-lg">
                        {voices.map((v) => (
                          <SelectItem key={v.voice_id} value={v.voice_id} className="rounded-md">
                            <div className="flex items-center justify-between w-full gap-2">
                              <span>{v.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    {selectedVoice?.preview_url && (
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => onPreviewVoice(selectedVoice)}
                        className={cn(
                          "h-11 w-11 shrink-0",
                          previewingId === voiceId && "text-primary border-primary bg-primary/5"
                        )}
                        title="Preview voice"
                      >
                        {previewingId === voiceId ? (
                          <Volume2 className="h-4 w-4 animate-pulse" />
                        ) : (
                          <Play className="h-4 w-4 fill-current" />
                        )}
                      </Button>
                    )}

                    <Button
                      variant="outline"
                      onClick={loadVoices}
                      disabled={!elevenLabsKeyConfigured}
                      className="h-11 gap-2"
                    >
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Refresh
                    </Button>
                  </div>
                </div>
              </SettingsRow>

              {/* Divider */}
              <div className="h-px bg-gradient-to-r from-transparent via-border/60 to-transparent" />

              {/* Voice Settings */}
              <div className="space-y-6 pt-2">
                <SettingsRow
                  label="Stability"
                  description={`Value: ${stability.toFixed(2)}`}
                  vertical
                >
                  <Slider
                    value={[stability]}
                    onValueChange={([v]) => setStability(v)}
                    min={0}
                    max={1}
                    step={0.01}
                    className="w-full"
                  />
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    Higher values result in more consistent output.
                  </p>
                </SettingsRow>

                <SettingsRow
                  label="Similarity Boost"
                  description={`Value: ${similarity.toFixed(2)}`}
                  vertical
                >
                  <Slider
                    value={[similarity]}
                    onValueChange={([v]) => setSimilarity(v)}
                    min={0}
                    max={1}
                    step={0.01}
                    className="w-full"
                  />
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    Controls how closely the output matches the original voice.
                  </p>
                </SettingsRow>

                <SettingsRow
                  label="Style Exaggeration"
                  description={`Value: ${style.toFixed(2)}`}
                  vertical
                >
                  <Slider
                    value={[style]}
                    onValueChange={([v]) => setStyle(v)}
                    min={0}
                    max={1}
                    step={0.01}
                    className="w-full"
                  />
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    Exaggerates the speaking style of the voice.
                  </p>
                </SettingsRow>

                <SettingsRow
                  label="Speaker Boost"
                  description="Enhances voice clarity and quality"
                >
                  <Switch
                    checked={speakerBoost}
                    onCheckedChange={setSpeakerBoost}
                  />
                </SettingsRow>
              </div>

              {/* Test Button */}
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onTestElevenLabs}
                  disabled={testLoading || !elevenLabsKeyConfigured}
                  className="h-9 gap-2"
                >
                  {testLoading ? (
                    <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  ) : (
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                  Test Connection
                </Button>
              </div>
            </div>
          </SettingsSection>

          {/* About Section */}
          <SettingsSection
            icon={
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            }
            title="About"
            description="AI Reader application information"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Version</span>
                <span className="rounded-md bg-muted/50 px-2.5 py-1 font-mono text-xs text-foreground">
                  1.0.0
                </span>
              </div>
              <div className="h-px bg-gradient-to-r from-transparent via-border/40 to-transparent" />
              <p className="text-xs leading-relaxed text-muted-foreground">
                A beautiful reader for classic literature, powered by AI for deeper
                understanding and literary analysis.
              </p>
            </div>
          </SettingsSection>

          {/* Save Button */}
          <div className="flex items-center justify-between rounded-xl border border-border/60 bg-card/50 px-6 py-4">
            <div>
              {status && (
                <StatusBadge status={status.message} type={status.type} />
              )}
            </div>
            <Button
              onClick={onSave}
              disabled={loading}
              className="h-11 gap-2 px-6"
            >
              {loading ? (
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 13l4 4L19 7" />
                </svg>
              )}
              Save Settings
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
