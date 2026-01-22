import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Volume1, 
  RotateCcw, 
  Mic2, 
  Settings2,
  X,
  Gauge,
  Check
} from "lucide-react";
import { elevenLabsService, Voice } from "@/lib/elevenlabs";
import { cn } from "@/lib/utils";

interface TTSHook {
  state: 'idle' | 'playing' | 'paused' | 'buffering' | 'error';
  progress: { currentTime: number; duration: number; isBuffering: boolean };
  playCurrentPage: () => Promise<void>;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  setPlaybackRate: (rate: number) => void;
  setVolume: (volume: number) => void;
  seek: (position: number) => void;
  voiceId: string | undefined;
  changeVoice: (voiceId: string) => void;
}

interface TTSPanelProps {
  className?: string;
  expanded?: boolean;
  onExpandChange?: (expanded: boolean) => void;
  tts: TTSHook;
}

const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2] as const;
type PlaybackSpeed = typeof SPEED_OPTIONS[number];

const getSpeedLabel = (speed: PlaybackSpeed): string => `${speed}x`;

const VolumeIcon = ({ volume }: { volume: number }) => {
  if (volume === 0) return <VolumeX className="h-4 w-4" />;
  if (volume < 0.5) return <Volume1 className="h-4 w-4" />;
  return <Volume2 className="h-4 w-4" />;
};

export function TTSPanel({ className, expanded: controlledExpanded, onExpandChange, tts }: TTSPanelProps) {
  const {
    state,
    progress,
    playCurrentPage,
    pause,
    resume,
    stop,
    setPlaybackRate,
    setVolume,
    seek,
    voiceId,
    changeVoice,
  } = tts;

  const [internalExpanded, setInternalExpanded] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  // Use controlled state if provided, otherwise internal
  const isExpanded = controlledExpanded !== undefined ? controlledExpanded : internalExpanded;
  
  const setIsExpanded = useCallback((value: boolean) => {
    setInternalExpanded(value);
    onExpandChange?.(value);
  }, [onExpandChange]);

  const [playbackRate, setPlaybackRateLocal] = useState<PlaybackSpeed>(1);
  const [volume, setVolumeLocal] = useState(1);
  const [voices, setVoices] = useState<Voice[]>([]);
  const [loadingVoices, setLoadingVoices] = useState(false);

  useEffect(() => {
    setLoadingVoices(true);
    elevenLabsService.getVoices()
      .then((fetchedVoices) => {
        setVoices(fetchedVoices);
        if (fetchedVoices.length > 0 && !voiceId) {
          changeVoice(fetchedVoices[0].voice_id);
        }
      })
      .catch(console.error)
      .finally(() => setLoadingVoices(false));
  }, [voiceId, changeVoice]);

  const isPlaying = state === "playing";
  const isPaused = state === "paused";
  const currentVoice = voices.find(v => v.voice_id === voiceId);
  const currentVoiceName = currentVoice?.name || "Select a Voice";

  const handleTogglePlayPause = () => {
    if (isPlaying) {
      pause();
    } else if (isPaused) {
      resume();
    } else {
      playCurrentPage();
    }
  };

  const handleSpeedSelect = (speed: PlaybackSpeed) => {
    setPlaybackRateLocal(speed);
    setPlaybackRate(speed);
  };

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0];
    setVolumeLocal(newVolume);
    setVolume(newVolume);
  };

  const handleSkipBackward = () => {
    const skipAmount = 15;
    const newTime = Math.max(0, progress.currentTime - skipAmount);
    seek(newTime);
  };

  const handleSkipForward = () => {
    const skipAmount = 15;
    const newTime = progress.currentTime + skipAmount;
    
    if (newTime >= progress.duration) {
      seek(progress.duration);
    } else {
      seek(newTime);
    }
  };

  const handleSeek = (value: number[]) => {
    seek(value[0]);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // If idle and not explicitly expanded, hide (or if you want a "launch" button, handle that elsewhere)
  if (state === 'idle' && !isExpanded) return null;

  return (
    <div
      data-testid="tts-panel-container"
      className={cn(
        "fixed bottom-8 left-1/2 -translate-x-1/2 z-50",
        "w-[95%] max-w-3xl", 
        "bg-background border-2 border-black dark:border-white rounded-none",
        "shadow-2xl",
        "transition-all duration-300 ease-out",
        "animate-in slide-in-from-bottom-4 fade-in",
        className
      )}
    >
      <div className="flex flex-col p-3 gap-2">
        {/* Progress Bar Row */}
        <div className="px-2 pt-1">
          <Slider
            value={[progress.currentTime]}
            max={progress.duration || 100} // Prevent 0 max
            step={1}
            onValueChange={handleSeek}
            className="w-full cursor-pointer py-1"
            // Custom slider track styling via class naming or inline is difficult with Radix without wrapping
            // but we can target it in CSS if needed. For now, we use standard slider and assume global BAUHAUS alignment
          />
          {/* Bauhaus Red Custom Progress Indicator Overlay (Simulated) */}
          <div className="h-1.5 w-full bg-black/10 dark:bg-white/10 mt-[-10px] pointer-events-none relative overflow-hidden">
             <div 
              className="h-full bg-[#E02E2E] transition-all duration-100 ease-linear"
              style={{ width: `${(progress.currentTime / (progress.duration || 1)) * 100}%` }}
             />
          </div>

          <div className="flex justify-between px-1 mt-3 text-[10px] font-black uppercase tracking-[0.2em] text-foreground select-none">
            <span>{formatTime(progress.currentTime)}</span>
            <span>{formatTime(progress.duration)}</span>
          </div>
        </div>

        {/* Controls Row */}
        <div className="flex items-center justify-between px-2 pb-1 gap-4 border-t-2 border-black/10 dark:border-white/10 pt-3">
          
          {/* Left: Info & Voice (Conditional) */}
          <div className="flex items-center gap-3 flex-1 min-w-0 justify-start">
             {showSettings && (
               <Popover>
                <PopoverTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-9 gap-2 px-3 border-2 border-black/20 dark:border-white/20 rounded-none text-foreground hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all animate-in fade-in slide-in-from-left-2 duration-200"
                  >
                    <Mic2 className="h-4 w-4" />
                    <span className="text-[10px] font-black uppercase tracking-widest truncate max-w-[100px] sm:max-w-[140px]">
                      {currentVoiceName}
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-2 rounded-none border-2 border-black dark:border-white bg-background" side="top" align="start">
                  <div className="space-y-2">
                    <h4 className="font-black text-[10px] uppercase tracking-widest text-muted-foreground px-2 mb-1 border-b-2 border-black/10 dark:border-white/10 pb-1">SELECT VOICE</h4>
                    <div className="max-h-[200px] overflow-y-auto space-y-1 pr-1">
                      {voices.map((voice) => (
                        <button
                          key={voice.voice_id}
                          onClick={() => changeVoice(voice.voice_id)}
                          className={cn(
                            "w-full text-left px-3 py-2 rounded-none text-[10px] font-bold uppercase tracking-widest transition-colors",
                            voiceId === voice.voice_id 
                              ? "bg-black text-white dark:bg-white dark:text-black" 
                              : "hover:bg-black/10 dark:hover:bg-white/10 text-foreground"
                          )}
                        >
                          {voice.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
             )}
          </div>

          {/* Center: Transport */}
          <div className="flex items-center justify-center gap-4 flex-[2]">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSkipBackward}
              className="h-10 w-10 text-foreground border-2 border-black/10 dark:border-white/10 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black rounded-none transition-all"
            >
              <RotateCcw className="h-5 w-5" />
            </Button>

            <Button
              variant="default"
              size="icon"
              onClick={handleTogglePlayPause}
              className="h-12 w-12 rounded-none bg-black text-white dark:bg-white dark:text-black hover:bg-[#E02E2E] hover:text-white transition-all shadow-xl border-2 border-black dark:border-white"
            >
              {isPlaying ? (
                <Pause className="h-6 w-6 fill-current" />
              ) : (
                <Play className="h-6 w-6 fill-current ml-1" />
              )}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={handleSkipForward}
              className="h-10 w-10 text-foreground border-2 border-black/10 dark:border-white/10 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black rounded-none transition-all"
            >
              <RotateCcw className="h-5 w-5 scale-x-[-1]" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowSettings(!showSettings)}
              className={cn(
                "h-10 w-10 text-foreground border-2 rounded-none transition-all",
                showSettings 
                  ? "bg-black text-white border-black dark:bg-white dark:text-black dark:border-white" 
                  : "border-black/10 dark:border-white/10 hover:border-black dark:hover:border-white"
              )}
              aria-label="Toggle settings"
            >
              <Settings2 className="h-5 w-5" />
            </Button>
          </div>

          {/* Right: Settings & Volume */}
          <div className="flex items-center gap-2 flex-1 justify-end">
            
            {showSettings && (
              <>
                {/* Speed Popover */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-9 w-14 gap-1 px-0 border-2 border-black/20 dark:border-white/20 rounded-none text-foreground hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all animate-in fade-in slide-in-from-right-2 duration-200">
                       <Gauge className="h-4 w-4" />
                       <span className="text-[10px] font-black uppercase tracking-widest">{getSpeedLabel(playbackRate)}</span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-40 p-1 rounded-none border-2 border-black dark:border-white bg-background" side="top" align="center">
                    <div className="grid grid-cols-1 gap-1">
                      {SPEED_OPTIONS.map((speed) => (
                        <button
                          key={speed}
                          onClick={() => handleSpeedSelect(speed)}
                          className={cn(
                            "flex items-center justify-between px-3 py-2 rounded-none text-[10px] font-bold uppercase tracking-widest transition-colors",
                            playbackRate === speed
                              ? "bg-black text-white dark:bg-white dark:text-black"
                              : "hover:bg-black/10 dark:hover:bg-white/10 text-foreground"
                          )}
                        >
                          <span>{speed}X</span>
                          {playbackRate === speed && <Check className="h-3 w-3" />}
                        </button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>

                {/* Volume Popover */}
                <Popover>
                   <PopoverTrigger asChild>
                     <Button variant="ghost" size="icon" className="h-9 w-9 text-foreground border-2 border-black/20 dark:border-white/20 rounded-none hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all animate-in fade-in slide-in-from-right-2 duration-200">
                        <VolumeIcon volume={volume} />
                     </Button>
                   </PopoverTrigger>
                   <PopoverContent className="w-12 h-32 p-0 flex justify-center py-4 rounded-none border-2 border-black dark:border-white bg-background" side="top" align="center">
                      <Slider
                        orientation="vertical"
                        value={[volume]}
                        max={1}
                        step={0.05}
                        onValueChange={handleVolumeChange}
                        className="h-full"
                      />
                   </PopoverContent>
                </Popover>

                <div className="w-0.5 h-6 bg-black/20 dark:bg-white/20 mx-1 animate-in fade-in duration-200" />
              </>
            )}

            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                stop();
                setIsExpanded(false);
              }}
              className="h-9 w-9 text-foreground border-2 border-black/10 dark:border-white/10 hover:bg-[#E02E2E] hover:text-white hover:border-[#E02E2E] rounded-none transition-all"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
