import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import AppearancePanel from "@/components/AppearancePanel";
import { ChevronLeft, ChevronRight, Settings2, Columns2, BookOpen, Play, Pause, Square, Loader2, SlidersHorizontal, Settings } from "lucide-react";
import { PlaybackState } from "@/lib/elevenlabs";
import { Link } from "@tanstack/react-router";

type ReaderTopBarProps = {
  title?: string;
  showAppearance: boolean;
  onShowAppearanceChange: (open: boolean) => void;
  fontFamily: string;
  lineHeight: number;
  margin: number;
  onFontFamilyChange: (value: string) => void;
  onLineHeightChange: (value: number) => void;
  onMarginChange: (value: number) => void;
  columns: 1 | 2;
  onToggleColumns: () => void;
  onPrev: () => void;
  onNext: () => void;
  currentPage: number;
  totalPages: number;
  jumpPage: string;
  onJumpPageChange: (value: string) => void;
  onJumpPageGo: () => void;
  onBack: () => void;
  // TTS props
  ttsState: PlaybackState;
  onTtsPlay: () => void;
  onTtsPause: () => void;
  onTtsStop: () => void;
  onTtsSettings: () => void;
};

export default function ReaderTopBar({
  title,
  showAppearance,
  onShowAppearanceChange,
  fontFamily,
  lineHeight,
  margin,
  onFontFamilyChange,
  onLineHeightChange,
  onMarginChange,
  columns,
  onToggleColumns,
  onPrev,
  onNext,
  currentPage,
  totalPages,
  jumpPage,
  onJumpPageChange,
  onJumpPageGo,
  onBack,
  ttsState,
  onTtsPlay,
  onTtsPause,
  onTtsStop,
  onTtsSettings,
}: ReaderTopBarProps) {
  return (
    <div role="banner" className="relative shrink-0 flex items-center gap-4 px-4 py-3 border-b-2 border-black dark:border-white bg-background touch-action-manipulation">
      {/* Left: Brand + Back + Title */}
      <div className="flex items-center gap-4 min-w-0 flex-1">
        <div className="hidden md:flex items-center gap-1 bg-black dark:bg-white px-2 py-0.5 shrink-0">
          <span className="font-sans text-[10px] font-black tracking-tighter text-white dark:text-black uppercase">AI READER</span>
        </div>
        <div className="flex items-center gap-2 min-w-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            aria-label="Go Back"
            className="h-8 w-8 p-0 shrink-0 rounded-none border border-foreground/10 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <p className="truncate text-sm font-bold uppercase tracking-tight text-foreground">{title}</p>
        </div>
      </div>

      {/* TTS Controls */}
      <div className="flex items-center border-2 border-black dark:border-white bg-background p-0.5">
        <Button
          variant="ghost"
          size="sm"
          onClick={onTtsSettings}
          aria-label="TTS Settings"
          className="h-8 w-8 p-0 rounded-none hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors"
        >
          <SlidersHorizontal className="h-3.5 w-3.5 fill-current opacity-70" />
        </Button>

        {ttsState === 'playing' ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={onTtsPause}
            aria-label="Pause Narration"
            className="h-8 w-8 p-0 rounded-none hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors text-[#E02E2E]"
          >
            <Pause className="h-4 w-4 fill-current" />
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={onTtsPlay}
            aria-label="Play Narration"
            disabled={ttsState === 'buffering'}
            className="h-8 w-8 p-0 rounded-none hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors"
          >
            {ttsState === 'buffering' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4 fill-current" />
            )}
          </Button>
        )}

        {ttsState !== 'idle' && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onTtsStop}
            aria-label="Stop Narration"
            className="h-8 w-8 p-0 rounded-none hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors"
          >
            <Square className="h-3.5 w-3.5 fill-current" />
          </Button>
        )}
      </div>

      {/* Center: Navigation */}
      <div className="flex items-center border-2 border-black dark:border-white bg-background">
        <Button
          variant="ghost"
          size="sm"
          onClick={onPrev}
          aria-label="Previous Page"
          className="h-9 w-9 p-0 rounded-none hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-0.5 px-2 border-x-2 border-black dark:border-white h-9">
          <Input
            name="jump-page"
            aria-label="Jump to page"
            autoComplete="off"
            className="h-7 w-28 px-1 text-center text-sm font-bold border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 tabular-nums rounded-none"
            value={jumpPage}
            onChange={(e) => onJumpPageChange(e.currentTarget.value)}
            onBlur={() => onJumpPageChange("")}
            onKeyDown={(e) => {
              if (e.key !== "Enter") return;
              onJumpPageGo();
            }}
            placeholder={columns === 2 ? `${currentPage}–${Math.min(currentPage + 1, totalPages)}` : String(currentPage)}
          />
          <span className="text-black/30 dark:text-white/30 text-sm font-bold">/</span>
          <span className="text-sm text-black dark:text-white font-bold tabular-nums pr-1">
            {totalPages}
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onNext}
          aria-label="Next Page"
          className="h-9 w-9 p-0 rounded-none hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Right: View controls */}
      <div className="flex items-center gap-3">
        {/* Page layout toggle */}
        <div className="flex items-center border-2 border-black dark:border-white p-0.5 bg-background">
          <Button
            variant="ghost"
            size="sm"
            onClick={columns === 1 ? undefined : onToggleColumns}
            className={`flex items-center gap-1.5 px-3 py-1.5 h-auto text-[10px] font-bold uppercase tracking-widest rounded-none transition-[color,background-color] ${columns === 1
              ? "bg-black text-white dark:bg-white dark:text-black shadow-sm"
              : "text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5"
              }`}
          >
            <BookOpen className="h-3.5 w-3.5" />
            <span>Single</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={columns === 2 ? undefined : onToggleColumns}
            className={`flex items-center gap-1.5 px-3 py-1.5 h-auto text-[10px] font-bold uppercase tracking-widest rounded-none transition-[color,background-color] ${columns === 2
              ? "bg-black text-white dark:bg-white dark:text-black shadow-sm"
              : "text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5"
              }`}
          >
            <Columns2 className="h-3.5 w-3.5" />
            <span>Spread</span>
          </Button>
        </div>

        {/* Appearance settings */}
        <Popover open={showAppearance} onOpenChange={onShowAppearanceChange}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-1.5 h-auto border-2 border-black dark:border-white bg-background px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-foreground rounded-none transition-[color,background-color] hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black"
            >
              <Settings2 className="h-3.5 w-3.5" />
              <span>Display</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-auto p-0 rounded-none border-2 border-black dark:border-white">
            <AppearancePanel
              fontFamily={fontFamily}
              lineHeight={lineHeight}
              margin={margin}
              onFontFamilyChange={onFontFamilyChange}
              onLineHeightChange={onLineHeightChange}
              onMarginChange={onMarginChange}
            />
          </PopoverContent>
        </Popover>

        {/* Global Settings */}
        <Link to="/settings">
          <Button
            variant="outline"
            size="icon"
            className="flex h-9 w-9 items-center justify-center border-2 border-black dark:border-white bg-background text-foreground rounded-none transition-[color,background-color] hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black"
            title="Application Settings"
            aria-label="Application Settings"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </Link>
      </div>

      {/* Reading Progress Bar (Absolute bottom) */}
      <div className="absolute -bottom-[2px] left-0 h-1 w-full bg-black/5 dark:bg-white/10 overflow-hidden">
        <div
          role="progressbar"
          aria-label="Reading progress"
          className="h-full bg-[#E02E2E] transition-[width] duration-300 ease-out"
          style={{ width: `${(currentPage / (totalPages || 1)) * 100}%` }}
        />
      </div>
    </div>
  );
}
