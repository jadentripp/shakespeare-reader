import { Bot, Headphones, Loader2, Palette, Play, Settings2, Volume2 } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import SettingsSidebar, { type SettingsTab } from '@/components/settings/SettingsSidebar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectItemText,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { type Voice } from '@/lib/tts'
import { listModels } from '@/lib/openai'
import { POCKET_VOICES, pocketTTSService, type PocketTTSStatus } from '@/lib/pocket-tts'
import { cn } from '@/lib/utils'
import {
  getSetting,
  openAiKeyStatus,
  setSetting,
} from '../lib/tauri'

function SettingsSection({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode
  title: string
  description: string
  children: React.ReactNode
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
  )
}

function SettingsRow({
  label,
  description,
  children,
  vertical = false,
}: {
  label: string
  description?: React.ReactNode
  children: React.ReactNode
  vertical?: boolean
}) {
  return (
    <div className={cn('flex gap-4', vertical ? 'flex-col' : 'items-center justify-between')}>
      <div className="space-y-0.5">
        <Label className="text-sm font-medium text-foreground">{label}</Label>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
      <div className={cn(vertical && 'pt-1')}>{children}</div>
    </div>
  )
}

function StatusBadge({ status, type }: { status: string; type: 'success' | 'info' | 'error' }) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium',
        type === 'success' && 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
        type === 'info' && 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
        type === 'error' && 'bg-red-500/10 text-red-600 dark:text-red-400',
      )}
    >
      <span
        className={cn(
          'h-1.5 w-1.5 rounded-full',
          type === 'success' && 'bg-emerald-500',
          type === 'info' && 'bg-blue-500',
          type === 'error' && 'bg-red-500',
        )}
      />
      {status}
    </div>
  )
}

function ProgressBar({ loading }: { loading: boolean }) {
  if (!loading) return <div className="h-1 w-full" />
  return (
    <div className="h-1 w-full bg-muted/30 overflow-hidden rounded-full">
      <div className="h-full w-full bg-primary/40 animate-progress" />
    </div>
  )
}

export default function SettingsPage() {
  const [apiKey, setApiKey] = useState('')
  const [voiceId, setVoiceId] = useState('')
  const [voices, setVoices] = useState<Voice[]>([])
  const [model, setModel] = useState('gpt-5.2')
  const [status, setStatus] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [models, setModels] = useState<string[]>([])
  const [modelsStatus, setModelsStatus] = useState<string | null>(null)
  const [keyStatus, setKeyStatus] = useState<{
    has_env_key: boolean
    has_saved_key: boolean
  } | null>(null)
  const [showApiKey, setShowApiKey] = useState(false)
  const [loading, setLoading] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [activeTab, setActiveTab] = useState<SettingsTab>('appearance')

  const [pocketStatus, setPocketStatus] = useState<PocketTTSStatus>('idle')
  const [pocketStatusMessage, setPocketStatusMessage] = useState<string | null>(null)
  const [pocketPreviewing, setPocketPreviewing] = useState(false)
  const [pocketLoadingPreview, setPocketLoadingPreview] = useState(false)
  const [lsdSteps, setLsdSteps] = useState(2)
  const [loadingModels, setLoadingModels] = useState(false)

  async function ensurePocketReady() {
    try {
      const isOnline =
        typeof pocketTTSService.healthCheck === 'function'
          ? await pocketTTSService.healthCheck()
          : true
      return isOnline
    } catch (e) {
      console.error('Failed to ensure Pocket TTS is ready:', e)
      return false
    }
  }

  useEffect(() => {
    console.log('[Settings] voiceId changed:', voiceId)
  }, [voiceId])

  useEffect(() => {
    const unsubscribe = pocketTTSService.subscribeStatus((status, message) => {
      setPocketStatus(status)
      setPocketStatusMessage(message ?? null)
    })
    loadVoices()
    ensurePocketReady()
    return () => unsubscribe()
  }, [])

  // Set default voice if none is selected and voices are loaded
  useEffect(() => {
    // If we have voices but no voiceId, or if the current voiceId isn't in the list (stale/invalid)
    if (voices.length > 0) {
      const isValid = voices.some((v) => v.voice_id === voiceId)

      if (!voiceId || !isValid) {
        console.log(
          '[Settings:DefaultVoice] Current voiceId is invalid or missing. Selecting default...',
        )
        const firstValid = voices.find((v) => v.voice_id)
        if (firstValid) {
          console.log('[Settings:DefaultVoice] Selected:', firstValid.name)
          setVoiceId(firstValid.voice_id)
        }
      }
    }
  }, [voices, voiceId])

  // Appearance state
  const [fontSize, setFontSize] = useState(18)
  const [fontFamily, setFontFamily] = useState('serif')
  const [theme, setTheme] = useState('system')

  useEffect(() => {
    ;(async () => {
      const savedFontSize = await getSetting('appearance_font_size')
      const savedFontFamily = await getSetting('appearance_font_family')
      const savedTheme = await getSetting('appearance_theme')

      if (savedFontSize) setFontSize(parseInt(savedFontSize))
      if (savedFontFamily) setFontFamily(savedFontFamily)
      if (savedTheme) setTheme(savedTheme)
    })()
  }, [])

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [])

  async function onPreviewPocketVoice() {
    if (pocketPreviewing || pocketLoadingPreview) {
      if (audioRef.current) {
        audioRef.current.pause()
        setPocketPreviewing(false)
        setPocketLoadingPreview(false)
      }
      return
    }

    setPocketLoadingPreview(true)
    try {
      const isRunning = await ensurePocketReady()
      if (!isRunning) {
        throw new Error('Could not start Pocket TTS engine')
      }

      const selectedVoice = voiceId || voices[0]?.voice_id || 'alba'
      const response = await pocketTTSService.textToSpeech(
        'This is a preview of the Pocket TTS voice.',
        selectedVoice,
      )
      setPocketLoadingPreview(false)
      setPocketPreviewing(true)

      if (audioRef.current) {
        audioRef.current.pause()
      }

      const audio = new Audio(`data:audio/wav;base64,${response.audio_base64}`)
      audioRef.current = audio
      audio.play().catch((e) => {
        console.error('Failed to play Pocket preview:', e)
        setPocketPreviewing(false)
      })
      audio.onended = () => setPocketPreviewing(false)
    } catch (e) {
      console.error('Failed to generate Pocket preview:', e)
      setPocketLoadingPreview(false)
      setPocketPreviewing(false)
    }
  }

  useEffect(() => {
    ;(async () => {
      console.log('[Settings] Initializing...')
      const savedKey = await getSetting('openai_api_key')
      const savedVoiceId = await getSetting('pocket_voice_id')
      const savedModel = await getSetting('openai_model')
      const savedLsd = await getSetting('pocket_lsd')

      let savedKeyStatus = { has_env_key: false, has_saved_key: false }
      try {
        savedKeyStatus = await openAiKeyStatus()
        console.log('[Settings] openAiKeyStatus result:', savedKeyStatus)
      } catch (e) {
        console.error('[Settings] openAiKeyStatus failed:', e)
      }

      if (savedKey) {
        console.log('[Settings] Found saved OpenAI key')
        setApiKey(savedKey)
      }
      console.log('[Settings] Loading saved voice ID:', savedVoiceId)
      if (savedVoiceId) {
        setVoiceId(savedVoiceId)
      } else {
        console.log('[Settings] No saved voice ID, will use default when voices load')
      }
      if (savedLsd) {
        const parsed = Number(savedLsd)
        if (!Number.isNaN(parsed) && parsed >= 1) {
          setLsdSteps(parsed)
          pocketTTSService.setLsd(parsed)
        }
      }
      if (savedModel) setModel(savedModel)

      setKeyStatus(savedKeyStatus)
      if (savedKeyStatus.has_env_key || savedKeyStatus.has_saved_key || savedKey) {
        console.log('[Settings] Key detected, loading models...')
        loadModels()
      } else {
        console.log('[Settings] No key detected')
      }
    })()
  }, [])

  async function loadVoices() {
    try {
      const list = await pocketTTSService.getVoices()
      const mapped = list.map((voice) => ({
        voice_id: voice.id,
        name: voice.name,
        description: voice.description,
        language: voice.language,
      }))
      setVoices(mapped)
    } catch (e) {
      console.error('Failed to load voices:', e)
      setVoices(
        POCKET_VOICES.map((voice) => ({
          voice_id: voice.id,
          name: voice.name,
          description: voice.description,
          language: voice.language,
        })),
      )
    }
  }

  async function onSave() {
    setStatus(null)
    setLoading(true)
    try {
      await setSetting({ key: 'openai_api_key', value: apiKey.trim() })
      await setSetting({ key: 'pocket_voice_id', value: voiceId })
      await setSetting({ key: 'openai_model', value: model })

      // Save appearance settings
      await setSetting({ key: 'appearance_font_size', value: fontSize.toString() })
      await setSetting({ key: 'appearance_font_family', value: fontFamily })
      await setSetting({ key: 'appearance_theme', value: theme })

      try {
        const savedKeyStatus = await openAiKeyStatus()
        setKeyStatus(savedKeyStatus)
      } catch (e) {
        console.error('[Settings] onSave: openAiKeyStatus failed', e)
      }

      setStatus({ message: 'Settings saved successfully', type: 'success' })
    } catch {
      setStatus({ message: 'Failed to save settings', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  async function onClearKey() {
    setStatus(null)
    setLoading(true)
    try {
      await setSetting({ key: 'openai_api_key', value: '' })
      setApiKey('')

      try {
        const savedKeyStatus = await openAiKeyStatus()
        setKeyStatus(savedKeyStatus)
      } catch (e) {
        console.error('[Settings] onClearKey: openAiKeyStatus failed', e)
      }

      setStatus({ message: 'API key cleared', type: 'success' })
    } catch {
      setStatus({ message: 'Failed to clear API key', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  async function loadModels() {
    console.log('[Settings] loadModels called')
    setModelsStatus(null)
    setLoadingModels(true)
    try {
      const list = await listModels()
      console.log('[Settings] listModels result:', list)
      setModels(list)
      setModelsStatus(list.length ? `${list.length} models available` : 'No models found')
    } catch (e: unknown) {
      console.error('[Settings] loadModels error:', e)
      const message = e instanceof Error ? e.message : String(e)
      setModelsStatus(message)
    } finally {
      setLoadingModels(false)
    }
  }
  const keyConfigured = keyStatus?.has_env_key || keyStatus?.has_saved_key || apiKey.trim()

  // Combine fetched models with current model if not present, to avoid empty selection
  const allModels = useMemo(() => {
    const set = new Set(models)
    if (model) set.add(model)
    return Array.from(set)
  }, [models, model])

  return (
    <div className="flex h-full bg-background overflow-hidden">
      <SettingsSidebar activeTab={activeTab} onTabChange={setActiveTab} />

      <main className="flex-1 overflow-y-auto" key={activeTab}>
        <div className="max-w-3xl mx-auto px-4 md:px-8 py-10 space-y-8 animate-in fade-in duration-300">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground capitalize">
                {activeTab === 'ai'
                  ? 'AI Assistant'
                  : activeTab === 'audio'
                    ? 'Audio & TTS'
                    : activeTab}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {activeTab === 'appearance' && 'Customize your reading environment'}
                {activeTab === 'ai' && 'Configure OpenAI for intelligent analysis'}
                {activeTab === 'audio' && 'Configure Pocket TTS for narration'}
              </p>
            </div>

            <div className="flex items-center gap-4">
              {status && <StatusBadge status={status.message} type={status.type} />}
              <Button onClick={onSave} disabled={loading} className="gap-2">
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Settings2 className="h-4 w-4" />
                )}
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
                          <SelectItem value="serif">
                            <SelectItemText>Serif (Classic)</SelectItemText>
                          </SelectItem>
                          <SelectItem value="sans">
                            <SelectItemText>Sans-serif (Modern)</SelectItemText>
                          </SelectItem>
                          <SelectItem value="mono">
                            <SelectItemText>Monospace</SelectItemText>
                          </SelectItem>
                        </SelectContent>{' '}
                      </Select>
                    </SettingsRow>

                    <SettingsRow
                      label="Font Size"
                      description={`Current size: ${fontSize}px`}
                      vertical
                    >
                      <Slider
                        value={[fontSize]}
                        onValueChange={([v]) => v !== undefined && setFontSize(v)}
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
                        <SelectItem value="light">
                          <SelectItemText>Light</SelectItemText>
                        </SelectItem>
                        <SelectItem value="dark">
                          <SelectItemText>Dark</SelectItemText>
                        </SelectItem>
                        <SelectItem value="system">
                          <SelectItemText>System</SelectItemText>
                        </SelectItem>
                      </SelectContent>{' '}
                    </Select>
                  </SettingsRow>
                </SettingsSection>

                <div className="rounded-xl border border-border/60 bg-muted/20 p-8 text-center">
                  <div
                    className={cn(
                      'mx-auto max-w-sm p-6 rounded-lg border bg-card shadow-sm transition-[color,background-color,border-color,text-decoration-color,fill,stroke,opacity,box-shadow,transform]',
                      theme === 'dark' && 'dark',
                    )}
                    style={{
                      fontSize: `${fontSize}px`,
                      fontFamily:
                        fontFamily === 'serif'
                          ? 'serif'
                          : fontFamily === 'mono'
                            ? 'monospace'
                            : 'sans-serif',
                    }}
                  >
                    <p className="text-foreground leading-relaxed">
                      “It was the best of times, it was the worst of times, it was the age of
                      wisdom, it was the age of foolishness…”
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
                          ? 'Using key from OPENAI_API_KEY environment variable'
                          : 'Enter your OpenAI API key'
                      }
                      vertical
                    >
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Input
                            type={showApiKey ? 'text' : 'password'}
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
                            {showApiKey ? 'Hide' : 'Show'}
                          </Button>
                        </div>
                        {keyStatus?.has_saved_key && (
                          <Button variant="outline" onClick={onClearKey}>
                            Clear
                          </Button>
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
                          </SelectContent>{' '}
                        </Select>
                        <Button
                          variant="outline"
                          onClick={loadModels}
                          disabled={!keyConfigured || loadingModels}
                        >
                          {loadingModels ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Refresh'}
                        </Button>
                      </div>
                      <ProgressBar loading={loadingModels} />
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
                  title="Pocket TTS"
                  description="Web-based narration engine (runs fully in the app)"
                >
                  <div className="space-y-6">
                    <div className="flex items-center justify-between rounded-lg bg-muted/40 px-4 py-3">
                      <span className="text-sm text-muted-foreground">Engine Status</span>
                      {pocketStatus === 'loading' ? (
                        <StatusBadge status={pocketStatusMessage || 'Loading models...'} type="info" />
                      ) : pocketStatus === 'ready' ? (
                        <StatusBadge status="Ready" type="success" />
                      ) : pocketStatus === 'running' ? (
                        <StatusBadge status="Generating..." type="info" />
                      ) : pocketStatus === 'error' ? (
                        <div className="flex items-center gap-2">
                          <StatusBadge status="Error" type="error" />
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-[10px] uppercase tracking-wider"
                            onClick={() => pocketTTSService.reload()}
                          >
                            Try Again
                          </Button>
                        </div>
                      ) : (
                        <StatusBadge status="Offline" type="info" />
                      )}
                    </div>
                    {pocketStatusMessage && (
                      <p className="text-xs text-muted-foreground">{pocketStatusMessage}</p>
                    )}

                    <SettingsRow
                      label="Voice"
                      description="Select the narrator voice for reading"
                      vertical
                    >
                      <div className="flex gap-2">
                        <Select
                          value={voiceId}
                          onValueChange={setVoiceId}
                          disabled={voices.length === 0}
                        >
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Select a voice" />
                          </SelectTrigger>
                          <SelectContent>
                            {voices.map((voice) => (
                              <SelectItem key={voice.voice_id} value={voice.voice_id}>
                                <div className="flex flex-col gap-0.5">
                                  <SelectItemText>
                                    <span className="font-medium text-sm">{voice.name}</span>
                                  </SelectItemText>
                                  {voice.description && (
                                    <span className="text-[10px] text-muted-foreground line-clamp-1">
                                      {voice.language ? `${voice.language} • ` : ''}
                                      {voice.description}
                                    </span>
                                  )}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <Button
                          variant="outline"
                          size="icon"
                          onClick={onPreviewPocketVoice}
                          disabled={pocketStatus !== 'ready'}
                          className={cn(
                            (pocketPreviewing || pocketLoadingPreview) && 'text-primary',
                          )}
                          title="Preview voice"
                        >
                          {pocketLoadingPreview ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : pocketPreviewing ? (
                            <Volume2 className="h-4 w-4 animate-pulse" />
                          ) : (
                            <Play className="h-4 w-4" />
                          )}
                        </Button>
                        <Button variant="outline" onClick={loadVoices}>
                          Refresh
                        </Button>
                      </div>
                      <ProgressBar loading={pocketLoadingPreview} />
                    </SettingsRow>

                    <SettingsRow
                      label="Speed vs Quality (LSD steps)"
                      description={`Lower is faster. Current: ${lsdSteps}`}
                      vertical
                    >
                      <div className="space-y-2">
                        <Slider
                          value={[lsdSteps]}
                          min={1}
                          max={10}
                          step={1}
                          onValueChange={([value]) => {
                            if (value === undefined) return
                            setLsdSteps(value)
                            pocketTTSService.setLsd(value)
                            setSetting({ key: 'pocket_lsd', value: value.toString() })
                          }}
                        />
                        <p className="text-xs text-muted-foreground">
                          1–2 is fastest, 5+ is higher quality but slower.
                        </p>
                      </div>
                    </SettingsRow>
                  </div>
                </SettingsSection>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
