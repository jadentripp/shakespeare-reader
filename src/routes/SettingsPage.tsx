import { useEffect, useMemo, useState } from "react";
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
import { getSetting, openAiKeyStatus, openAiListModels, setSetting } from "../lib/tauri";
import { cn } from "@/lib/utils";

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
  const [model, setModel] = useState("gpt-4.1-mini");
  const [status, setStatus] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [models, setModels] = useState<string[]>([]);
  const [modelsStatus, setModelsStatus] = useState<string | null>(null);
  const [keyStatus, setKeyStatus] = useState<{ has_env_key: boolean; has_saved_key: boolean } | null>(null);
  const [customModel, setCustomModel] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const savedKey = await getSetting("openai_api_key");
      const savedModel = await getSetting("openai_model");
      const savedKeyStatus = await openAiKeyStatus();
      if (savedKey) setApiKey(savedKey);
      if (savedModel) setModel(savedModel);
      setKeyStatus(savedKeyStatus);
      if (savedKeyStatus.has_env_key || savedKeyStatus.has_saved_key || savedKey) {
        loadModels();
      }
    })();
  }, []);

  useEffect(() => {
    setCustomModel(model);
  }, [model]);

  const hasCustomModel = useMemo(() => !models.includes(model), [models, model]);

  async function onSave() {
    setStatus(null);
    setLoading(true);
    try {
      if (apiKey.trim()) {
        await setSetting({ key: "openai_api_key", value: apiKey.trim() });
      }
      await setSetting({ key: "openai_model", value: model });
      const savedKeyStatus = await openAiKeyStatus();
      setKeyStatus(savedKeyStatus);
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
      const savedKeyStatus = await openAiKeyStatus();
      setKeyStatus(savedKeyStatus);
      setStatus({ message: "API key cleared", type: "success" });
    } catch {
      setStatus({ message: "Failed to clear API key", type: "error" });
    } finally {
      setLoading(false);
    }
  }

  async function loadModels() {
    setModelsStatus(null);
    try {
      const list = await openAiListModels();
      setModels(list);
      if (list.length && !list.includes(model)) {
        setCustomModel(model);
      }
      setModelsStatus(list.length ? `${list.length} models available` : "No models found");
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      setModelsStatus(message);
    }
  }

  const keyConfigured = keyStatus?.has_env_key || keyStatus?.has_saved_key || apiKey.trim();

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="mx-auto max-w-2xl px-6 py-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-serif text-3xl font-medium tracking-tight text-foreground">
            Settings
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Configure your Shakespeare Reader experience
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
                      value={hasCustomModel ? "__custom__" : model}
                      onValueChange={(value) => {
                        if (value === "__custom__") {
                          setModel(customModel || model);
                        } else {
                          setModel(value);
                        }
                      }}
                    >
                      <SelectTrigger className="h-11 flex-1 rounded-lg border-border/50 bg-background/50 transition-colors hover:bg-background">
                        <SelectValue placeholder="Select a model" />
                      </SelectTrigger>
                      <SelectContent className="rounded-lg">
                        <SelectItem value="__custom__" className="rounded-md">
                          <span className="flex items-center gap-2">
                            <svg className="h-3.5 w-3.5 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M12 5v14M5 12h14" />
                            </svg>
                            Custom model
                          </span>
                        </SelectItem>
                        {models.map((modelId) => (
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

                  {hasCustomModel && (
                    <Input
                      value={customModel}
                      onChange={(e) => {
                        setCustomModel(e.currentTarget.value);
                        setModel(e.currentTarget.value);
                      }}
                      placeholder="Enter custom model ID (e.g., gpt-4.1-mini)"
                      className="h-11 rounded-lg border-border/50 bg-background/50 font-mono text-sm"
                    />
                  )}

                  {modelsStatus && (
                    <p className="text-xs text-muted-foreground">{modelsStatus}</p>
                  )}
                </div>
              </SettingsRow>
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
            description="Shakespeare Reader application information"
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
                A beautiful reader for Shakespeare's complete works, powered by AI for 
                deeper understanding and literary analysis.
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
