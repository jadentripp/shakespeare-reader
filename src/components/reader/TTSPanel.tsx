import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Play, Pause, Volume2, Gauge } from "lucide-react";
import { useTTS } from "@/lib/hooks/useTTS";
import { cn } from "@/lib/utils";

interface TTSPanelProps {
  className?: string;
}

export function TTSPanel({ className }: TTSPanelProps) {
  const {
    state,
    progress,
    playCurrentPage,
    pause,
    resume,
    setPlaybackRate,
    setVolume,
  } = useTTS({
    getDoc: () => null,
    getPageMetrics: () => ({ pageWidth: 0, gap: 0 }),
    currentPage: 0,
  });

  const [isExpanded, setIsExpanded] = useState(false);
  const [playbackRate, setPlaybackRateLocal] = useState(1);
  const [volume, setVolumeLocal] = useState(1);

  const isPlaying = state === "playing";
  const isPaused = state === "paused";
  const currentVoiceName = "Voice 1";

  const handleTogglePlayPause = () => {
    if (isPlaying) {
      pause();
    } else if (isPaused) {
      resume();
    } else {
      playCurrentPage();
    }
  };

  const handleSpeedChange = (value: number[]) => {
    const newRate = value[0];
    setPlaybackRateLocal(newRate);
    setPlaybackRate(newRate);
  };

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0];
    setVolumeLocal(newVolume);
    setVolume(newVolume);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const progressPercent = progress.duration > 0 
    ? (progress.currentTime / progress.duration) * 100 
    : 0;

  return (
    <div
      data-testid="tts-panel-container"
      onClick={() => !isExpanded && setIsExpanded(true)}
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50",
        "bg-background/80 backdrop-blur-xl border-t border-border/50",
        "shadow-lg transition-all duration-300 ease-out",
        isExpanded ? "h-48" : "h-16",
        className
      )}
    >
      {/* Progress bar at top */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-muted">
        <div 
          className="h-full bg-primary transition-all duration-100"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Mini-player (collapsed state) */}
      <div className={cn(
        "flex items-center gap-3 px-4 h-16",
        isExpanded && "border-b border-border/30"
      )}>
        {/* Play/Pause button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            handleTogglePlayPause();
          }}
          aria-label={isPlaying ? "Pause" : "Play"}
          className="h-10 w-10 rounded-full bg-primary/10 hover:bg-primary/20"
        >
          {isPlaying ? (
            <Pause className="h-5 w-5" />
          ) : (
            <Play className="h-5 w-5 ml-0.5" />
          )}
        </Button>

        {/* Voice name and time */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{currentVoiceName}</p>
          <p className="text-xs text-muted-foreground">
            {formatTime(progress.currentTime)} / {formatTime(progress.duration)}
          </p>
        </div>

        {/* Expand indicator */}
        {!isExpanded && (
          <div className="text-muted-foreground text-xs">
            Tap to expand
          </div>
        )}
      </div>

      {/* Expanded controls */}
      {isExpanded && (
        <div className="px-4 py-3 space-y-4">
          {/* Speed control */}
          <div className="flex items-center gap-3">
            <Gauge className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-sm font-medium w-12">Speed</span>
            <Slider
              value={[playbackRate]}
              onValueChange={handleSpeedChange}
              min={0.5}
              max={2}
              step={0.25}
              className="flex-1"
            />
            <span className="text-sm text-muted-foreground w-10 text-right">
              {playbackRate}x
            </span>
          </div>

          {/* Volume control */}
          <div className="flex items-center gap-3">
            <Volume2 className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-sm font-medium w-12">Volume</span>
            <Slider
              value={[volume]}
              onValueChange={handleVolumeChange}
              min={0}
              max={1}
              step={0.1}
              className="flex-1"
            />
            <span className="text-sm text-muted-foreground w-10 text-right">
              {Math.round(volume * 100)}%
            </span>
          </div>

          {/* Collapse button */}
          <div className="flex justify-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(false);
              }}
              className="text-xs text-muted-foreground"
            >
              Collapse
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
