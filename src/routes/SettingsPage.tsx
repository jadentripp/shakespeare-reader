import { useEffect, useMemo, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectItemText,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { getSetting, openAiKeyStatus, setSetting } from "../lib/tauri";
import { listModels } from "@/lib/openai";
import { cn } from "@/lib/utils";
import {
  Settings2,
  Play,
  Loader2,
  Headphones,
  Volume2,
  Palette,
  Bot,
} from "lucide-react";
import { elevenLabsService, Voice } from "@/lib/elevenlabs";
import SettingsSidebar, { SettingsTab } from "@/components/settings/SettingsSidebar";

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
  description?: React.ReactNode;
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
  const [voiceId, setVoiceId] = useState("");
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
  const [previewingId, setPreviewingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [activeTab, setActiveTab] = useState<SettingsTab>("appearance");

  useEffect(() => {
    console.log("[Settings] voiceId changed:", voiceId);
  }, [voiceId]);

  useEffect(() => {
    if (elevenLabsApiKey.trim()) {
      loadVoices();
    }
  }, [elevenLabsApiKey]);

  // Set default voice if none is selected and voices are loaded
  useEffect(() => {
    // If we have voices but no voiceId, or if the current voiceId isn't in the list (stale/invalid)
    if (voices.length > 0) {
      const isValid = voices.some(v => v.voice_id === voiceId);

      if (!voiceId || !isValid) {
        console.log("[Settings:DefaultVoice] Current voiceId is invalid or missing. Selecting default...");
        const firstValid = voices.find(v => v.voice_id && v.category?.toLowerCase() !== 'famous');
        if (firstValid) {
          console.log("[Settings:DefaultVoice] Selected:", firstValid.name);
          setVoiceId(firstValid.voice_id);
        }
      }
    }
  }, [voices, voiceId]);

  // Appearance state
  const [fontSize, setFontSize] = useState(18);
  const [fontFamily, setFontFamily] = useState("serif");
  const [theme, setTheme] = useState("system");

  useEffect(() => {
    (async () => {
      const savedFontSize = await getSetting("appearance_font_size");
      const savedFontFamily = await getSetting("appearance_font_family");
      const savedTheme = await getSetting("appearance_theme");

      if (savedFontSize) setFontSize(parseInt(savedFontSize));
      if (savedFontFamily) setFontFamily(savedFontFamily);
      if (savedTheme) setTheme(savedTheme);
    })();
  }, []);

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
      }
      console.log("[Settings] Loading saved voice ID:", savedVoiceId);
      if (savedVoiceId) {
        setVoiceId(savedVoiceId);
      } else {
        console.log("[Settings] No saved voice ID, will use default when voices load");
      }
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

      // Save appearance settings
      await setSetting({ key: "appearance_font_size", value: fontSize.toString() });
      await setSetting({ key: "appearance_font_family", value: fontFamily });
      await setSetting({ key: "appearance_theme", value: theme });

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

  const groupedVoices = useMemo(() => {
    const groups: Record<string, Voice[]> = {};
    // Filter out "famous" voices as they are usually restricted via API
    voices.filter(v => v.voice_id && v.category?.toLowerCase() !== 'famous').forEach(v => {
      const cat = v.category || 'Other';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(v);
    });
    return groups;
  }, [voices]);

  return (
    <div className="flex h-full bg-background overflow-hidden">
      <SettingsSidebar activeTab={activeTab} onTabChange={setActiveTab} />

      <main className="flex-1 overflow-y-auto" key={activeTab}>
        <div className="max-w-3xl mx-auto px-4 md:px-8 py-10 space-y-8 animate-in fade-in duration-300">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground capitalize">
                {activeTab === 'ai' ? 'AI Assistant' : activeTab === 'audio' ? 'Audio & TTS' : activeTab}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {activeTab === 'appearance' && "Customize your reading environment"}
                {activeTab === 'ai' && "Configure OpenAI for intelligent analysis"}
                {activeTab === 'audio' && "Configure ElevenLabs for narration"}
              </p>
            </div>

            <div className="flex items-center gap-4">
              {status && (
                <StatusBadge status={status.message} type={status.type} />
              )}
              <Button
                onClick={onSave}
                disabled={loading}
                className="gap-2"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Settings2 className="h-4 w-4" />}
                Save Changes
              </Button>
            </div>
          </div>

          <div className="space-y-6">
            {activeTab === 'appearance' && (
              <div className="space-y-6">
                <SettingsSection
                  icon={<Palette className="h-5 w-5" />}
                  title="Typography"
                  description="Adjust the font and sizing for reading"
                >
                  <div className="space-y-6">
                    <SettingsRow
                      label="Font Family"
                      description="Choose the typeface for the book text"
                    >
                      <Select value={fontFamily} onValueChange={setFontFamily}>
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="serif"><SelectItemText>Serif (Classic)</SelectItemText></SelectItem>
                          <SelectItem value="sans"><SelectItemText>Sans-serif (Modern)</SelectItemText></SelectItem>
                          <SelectItem value="mono"><SelectItemText>Monospace</SelectItemText></SelectItem>
                        </SelectContent>                      </Select>
                    </SettingsRow>

                    <SettingsRow
                      label="Font Size"
                      description={`Current size: ${fontSize}px`}
                      vertical
                    >
                      <Slider
                        value={[fontSize]}
                        onValueChange={([v]) => setFontSize(v)}
                        min={12}
                        max={32}
                        step={1}
                      />
                    </SettingsRow>
                  </div>
                </SettingsSection>

                <SettingsSection
                  icon={<Palette className="h-5 w-5" />}
                  title="Theme"
                  description="Choose your preferred color mode"
                >
                  <SettingsRow
                    label="Application Theme"
                    description="Switch between light, dark, or system"
                  >
                    <Select value={theme} onValueChange={setTheme}>
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="light"><SelectItemText>Light</SelectItemText></SelectItem>
                        <SelectItem value="dark"><SelectItemText>Dark</SelectItemText></SelectItem>
                        <SelectItem value="system"><SelectItemText>System</SelectItemText></SelectItem>
                      </SelectContent>                    </Select>
                  </SettingsRow>
                </SettingsSection>

                <div className="rounded-xl border border-border/60 bg-muted/20 p-8 text-center">
                  <div
                    className={cn(
                      "mx-auto max-w-sm p-6 rounded-lg border bg-card shadow-sm transition-[color,background-color,border-color,text-decoration-color,fill,stroke,opacity,box-shadow,transform]",
                      theme === 'dark' && "dark"
                    )}
                    style={{
                      fontSize: `${fontSize}px`,
                      fontFamily: fontFamily === 'serif' ? 'serif' : fontFamily === 'mono' ? 'monospace' : 'sans-serif'
                    }}
                  >
                    <p className="text-foreground leading-relaxed">
                      “It was the best of times, it was the worst of times, it was the age of wisdom, it was the age of foolishness…”
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'ai' && (
              <div className="space-y-6">
                <SettingsSection
                  icon={<Bot className="h-5 w-5" />}
                  title="API Configuration"
                  description="Connect to OpenAI for AI-powered features"
                >
                  <div className="space-y-6">
                    <div className="flex items-center justify-between rounded-lg bg-muted/40 px-4 py-3">
                      <span className="text-sm text-muted-foreground">Connection Status</span>
                      {keyConfigured ? (
                        <StatusBadge status="Connected" type="success" />
                      ) : (
                        <StatusBadge status="Not configured" type="info" />
                      )}
                    </div>

                    <SettingsRow
                      label="API Key"
                      description={
                        keyStatus?.has_env_key
                          ? "Using key from OPENAI_API_KEY environment variable"
                          : "Enter your OpenAI API key"
                      }
                      vertical
                    >
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Input
                            type={showApiKey ? "text" : "password"}
                            value={apiKey}
                            onChange={(e) => setApiKey(e.currentTarget.value)}
                            placeholder="sk-…"
                            className="font-mono text-sm"
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowApiKey(!showApiKey)}
                            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground"
                          >
                            {showApiKey ? "Hide" : "Show"}
                          </Button>
                        </div>
                        {keyStatus?.has_saved_key && (
                          <Button variant="outline" onClick={onClearKey}>Clear</Button>
                        )}
                      </div>
                    </SettingsRow>
                  </div>
                </SettingsSection>

                <SettingsSection
                  icon={<Settings2 className="h-5 w-5" />}
                  title="Model Selection"
                  description="Select the LLM for analysis"
                >
                  <SettingsRow
                    label="Preferred Model"
                    description="Select which OpenAI model to use"
                    vertical
                  >
                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <Select value={model} onValueChange={setModel}>
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Select a model" />
                          </SelectTrigger>
                          <SelectContent>
                            {allModels.map((modelId) => (
                              <SelectItem key={modelId} value={modelId}>
                                <SelectItemText>
                                  <span className="font-mono text-sm">{modelId}</span>
                                </SelectItemText>
                              </SelectItem>
                            ))}
                          </SelectContent>                        </Select>
                        <Button variant="outline" onClick={loadModels} disabled={!keyConfigured}>
                          Refresh
                        </Button>
                      </div>
                      {modelsStatus && (
                        <p className="text-xs text-muted-foreground">{modelsStatus}</p>
                      )}
                    </div>
                  </SettingsRow>
                </SettingsSection>
              </div>
            )}

            {activeTab === 'audio' && (
              <div className="space-y-6">
                <SettingsSection
                  icon={<Headphones className="h-5 w-5" />}
                  title="Service Connection"
                  description="Connect to ElevenLabs for high-quality TTS"
                >
                  <div className="space-y-6">
                    <div className="flex items-center justify-between rounded-lg bg-muted/40 px-4 py-3">
                      <span className="text-sm text-muted-foreground">Connection Status</span>
                      {elevenLabsKeyConfigured ? (
                        <StatusBadge status="Connected" type="success" />
                      ) : (
                        <StatusBadge status="Not configured" type="info" />
                      )}
                    </div>

                    <SettingsRow
                      label="API Key"
                      description="Enter your ElevenLabs API key"
                      vertical
                    >
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Input
                            type={showElevenLabsApiKey ? "text" : "password"}
                            value={elevenLabsApiKey}
                            onChange={(e) => setElevenLabsApiKey(e.currentTarget.value)}
                            placeholder="Enter your API key"
                            className="font-mono text-sm"
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowElevenLabsApiKey(!showElevenLabsApiKey)}
                            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground"
                          >
                            {showElevenLabsApiKey ? "Hide" : "Show"}
                          </Button>
                        </div>
                        {elevenLabsKeyConfigured && (
                          <Button variant="outline" onClick={onClearElevenLabsKey}>Clear</Button>
                        )}
                      </div>
                    </SettingsRow>
                  </div>
                </SettingsSection>

                <SettingsSection
                  icon={<Volume2 className="h-5 w-5" />}
                  title="Voice & Style"
                  description="Configure the narrator's voice"
                >
                  <div className="space-y-6">
                    <SettingsRow
                      label="Narrator Voice"
                      description="Select the voice for reading"
                      vertical
                    >
                      <div className="flex gap-2">
                        <Select
                          value={voiceId}
                          onValueChange={setVoiceId}
                          disabled={!elevenLabsKeyConfigured || voices.length === 0}
                        >
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Select a voice" />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(groupedVoices).map(([category, categoryVoices]) => (
                              <SelectGroup key={category}>
                                <SelectLabel className="capitalize text-[10px] tracking-widest opacity-70">{category}</SelectLabel>
                                {categoryVoices.map((v) => {
                                  const [name, ...descParts] = v.name.split(' - ');
                                  const description = descParts.join(' - ');

                                  return (
                                    <SelectItem key={v.voice_id} value={v.voice_id} className="py-2.5">
                                      <div className="flex flex-col gap-0.5">
                                        <SelectItemText>
                                          <span className="font-medium text-sm">{name}</span>
                                        </SelectItemText>
                                        <span className="text-[10px] text-muted-foreground line-clamp-1">
                                          {v.category ? `${v.category} • ` : ""}{description}
                                        </span>
                                      </div>
                                    </SelectItem>
                                  );
                                })}
                              </SelectGroup>
                            ))}
                          </SelectContent>
                        </Select>

                        {selectedVoice?.preview_url && (
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => onPreviewVoice(selectedVoice)}
                            className={cn(previewingId === voiceId && "text-primary")}
                            title="Preview voice"
                          >
                            {previewingId === voiceId ? <Volume2 className="h-4 w-4 animate-pulse" /> : <Play className="h-4 w-4" />}
                          </Button>
                        )}
                        <Button variant="outline" onClick={loadVoices} disabled={!elevenLabsKeyConfigured}>
                          Refresh
                        </Button>
                      </div>
                    </SettingsRow>

                    <div className="space-y-4 pt-4 border-t border-border/40">
                      <SettingsRow label="Stability" description={<span className="tabular-nums">{stability.toFixed(2)}</span>} vertical>
                        <Slider value={[stability]} onValueChange={([v]) => setStability(v)} min={0} max={1} step={0.01} />
                      </SettingsRow>
                      <SettingsRow label="Similarity Boost" description={<span className="tabular-nums">{similarity.toFixed(2)}</span>} vertical>
                        <Slider value={[similarity]} onValueChange={([v]) => setSimilarity(v)} min={0} max={1} step={0.01} />
                      </SettingsRow>
                    </div>
                  </div>
                </SettingsSection>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
