import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Gauge
} from "lucide-react";
import { useTTS } from "@/lib/hooks/useTTS";
import { elevenLabsService, Voice } from "@/lib/elevenlabs";
import { cn } from "@/lib/utils";

interface TTSPanelProps {
  className?: string;
  expanded?: boolean;
  onExpandChange?: (expanded: boolean) => void;
}

const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2] as const;
type PlaybackSpeed = typeof SPEED_OPTIONS[number];

const getSpeedLabel = (speed: PlaybackSpeed): string => `${speed}x`;

const VolumeIcon = ({ volume }: { volume: number }) => {
  if (volume === 0) return <VolumeX className="h-4 w-4" />;
  if (volume < 0.5) return <Volume1 className="h-4 w-4" />;
  return <Volume2 className="h-4 w-4" />;
};

export function TTSPanel({ className, expanded: controlledExpanded, onExpandChange }: TTSPanelProps) {
  const {
    state,
    progress,
    playCurrentPage,
    pause,
    resume,
    setPlaybackRate,
    setVolume,
    seek,
    voiceId,
    changeVoice,
  } = useTTS({
    getDoc: () => null,
    getPageMetrics: () => ({ 
      pageWidth: 0, 
      gap: 0, 
      stride: 0, 
      scrollLeft: 0, 
      rootRect: { x: 0, y: 0, width: 0, height: 0, top: 0, left: 0, right: 0, bottom: 0, toJSON: () => "" } as DOMRect 
    }),
    currentPage: 0,
  });

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
        "fixed bottom-6 left-1/2 -translate-x-1/2 z-50",
        "w-[95%] max-w-3xl", // Floating island look
        "bg-background/95 backdrop-blur-xl border border-border/50 rounded-2xl",
        "shadow-lg shadow-black/5",
        "transition-all duration-300 ease-out",
        "animate-in slide-in-from-bottom-4 fade-in",
        className
      )}
    >
      <div className="flex flex-col p-2 gap-1">
        {/* Progress Bar Row */}
        <div className="px-2 pt-1">
          <Slider
            value={[progress.currentTime]}
            max={progress.duration || 100} // Prevent 0 max
            step={1}
            onValueChange={handleSeek}
            className="w-full cursor-pointer py-1"
          />
          <div className="flex justify-between px-1 mt-1 text-[10px] font-medium text-muted-foreground/70 select-none">
            <span>{formatTime(progress.currentTime)}</span>
            <span>{formatTime(progress.duration)}</span>
          </div>
        </div>

        {/* Controls Row */}
        <div className="flex items-center justify-between px-2 pb-1 gap-4">
          
          {/* Left: Info & Voice (Conditional) */}
          <div className="flex items-center gap-3 flex-1 min-w-0 justify-start">
             {showSettings && (
               <Popover>
                <PopoverTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 gap-2 px-2 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors animate-in fade-in slide-in-from-left-2 duration-200"
                  >
                    <Mic2 className="h-4 w-4" />
                    <span className="text-xs font-medium truncate max-w-[100px] sm:max-w-[140px]">
                      {currentVoiceName}
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-2" side="top" align="start">
                  <div className="space-y-2">
                    <h4 className="font-medium text-xs text-muted-foreground px-2 mb-1">Select Voice</h4>
                    <div className="max-h-[200px] overflow-y-auto space-y-1 pr-1">
                      {voices.map((voice) => (
                        <button
                          key={voice.voice_id}
                          onClick={() => changeVoice(voice.voice_id)}
                          className={cn(
                            "w-full text-left px-2 py-1.5 rounded-md text-sm transition-colors",
                            voiceId === voice.voice_id 
                              ? "bg-primary/10 text-primary font-medium" 
                              : "hover:bg-muted text-foreground/80"
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
          <div className="flex items-center justify-center gap-2 flex-[2]">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSkipBackward}
              className="h-9 w-9 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted/50"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>

            <Button
              variant="default"
              size="icon"
              onClick={handleTogglePlayPause}
              className="h-10 w-10 rounded-full shadow-md hover:scale-105 transition-transform"
            >
              {isPlaying ? (
                <Pause className="h-5 w-5 fill-current" />
              ) : (
                <Play className="h-5 w-5 fill-current ml-0.5" />
              )}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={handleSkipForward}
              className="h-9 w-9 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted/50"
            >
              <RotateCcw className="h-4 w-4 scale-x-[-1]" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowSettings(!showSettings)}
              className={cn(
                "h-9 w-9 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted/50 transition-colors",
                showSettings && "bg-muted text-foreground"
              )}
              aria-label="Toggle settings"
            >
              <Settings2 className="h-4 w-4" />
            </Button>
          </div>

          {/* Right: Settings & Volume */}
          <div className="flex items-center gap-1 flex-1 justify-end">
            
            {showSettings && (
              <>
                {/* Speed Popover */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-12 gap-0.5 px-0 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-md animate-in fade-in slide-in-from-right-2 duration-200">
                       <Gauge className="h-3.5 w-3.5 mr-1" />
                       <span className="text-xs font-medium">{getSpeedLabel(playbackRate)}</span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-40 p-1" side="top" align="center">
                    <div className="grid grid-cols-1 gap-0.5">
                      {SPEED_OPTIONS.map((speed) => (
                        <button
                          key={speed}
                          onClick={() => handleSpeedSelect(speed)}
                          className={cn(
                            "flex items-center justify-between px-2 py-1.5 rounded-sm text-xs transition-colors",
                            playbackRate === speed
                              ? "bg-primary/10 text-primary font-medium"
                              : "hover:bg-muted text-foreground/80"
                          )}
                        >
                          <span>{speed}x</span>
                          {playbackRate === speed && <div className="h-1.5 w-1.5 rounded-full bg-primary" />}
                        </button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>

                {/* Volume Popover */}
                <Popover>
                   <PopoverTrigger asChild>
                     <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-md animate-in fade-in slide-in-from-right-2 duration-200">
                        <VolumeIcon volume={volume} />
                     </Button>
                   </PopoverTrigger>
                   <PopoverContent className="w-12 h-32 p-0 flex justify-center py-4" side="top" align="center">
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

                <div className="w-px h-4 bg-border/50 mx-1 animate-in fade-in duration-200" />
              </>
            )}

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsExpanded(false)}
              className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-destructive/10 hover:text-destructive rounded-full"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
