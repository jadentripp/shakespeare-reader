import { Play, Pause, RotateCcw, Trash, CheckCircle2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { type DownloadTask } from "../../hooks/useLibrary";

interface DownloadStatusBarProps {
  paused: boolean;
  setPaused: (p: boolean) => void;
  counts: {
    downloading: number;
    queued: number;
    done: number;
    failed: number;
  };
  active: DownloadTask | null;
  retryFailed: () => void;
  clearDone: () => void;
  clearFailed: () => void;
  resumeAll: () => void;
}

export function DownloadStatusBar({
  paused,
  setPaused,
  counts,
  active,
  retryFailed,
  clearDone,
  clearFailed,
  resumeAll,
}: DownloadStatusBarProps) {
  return (
    <div className="animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="flex items-center gap-4 rounded-xl border border-amber-200/60 bg-gradient-to-r from-amber-50 to-orange-50/50 px-5 py-3.5 shadow-sm dark:border-amber-800/40 dark:from-amber-950/30 dark:to-orange-950/20">
        <div className="flex items-center gap-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/40"
                onClick={() => paused ? resumeAll() : setPaused(true)}
              >
                {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{paused ? "Resume" : "Pause"}</TooltipContent>
          </Tooltip>

          <div className="h-8 w-px bg-amber-200 dark:bg-amber-800" />

          <div className="flex items-center gap-4 text-sm">
            {counts.downloading > 0 && (
              <span className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-500 opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-500" />
                </span>
                <span className="font-medium">{counts.downloading}</span>
                <span className="text-muted-foreground">active</span>
              </span>
            )}
            {counts.queued > 0 && (
              <span className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                <span className="font-medium text-foreground">{counts.queued}</span>
                queued
              </span>
            )}
            {counts.done > 0 && (
              <span className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span className="font-medium">{counts.done}</span>
                done
              </span>
            )}
            {counts.failed > 0 && (
              <span className="flex items-center gap-2 text-destructive">
                <span className="h-2 w-2 rounded-full bg-destructive" />
                <span className="font-medium">{counts.failed}</span>
                failed
              </span>
            )}
          </div>
        </div>

        {active && (
          <>
            <div className="h-8 w-px bg-amber-200 dark:bg-amber-800" />
            <span className="flex-1 truncate text-sm">
              Downloading <span className="font-medium">{active.title}</span>
            </span>
          </>
        )}

        <div className="ml-auto flex items-center gap-2">
          {counts.failed > 0 && (
            <Button variant="ghost" size="sm" onClick={retryFailed} className="h-8 gap-1.5">
              <RotateCcw className="h-3.5 w-3.5" />
              Retry
            </Button>
          )}
          {(counts.done > 0 || counts.failed > 0) && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 gap-1.5">
                  <Trash className="h-3.5 w-3.5" />
                  Clear
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-44 p-1.5">
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-muted disabled:opacity-50"
                  onClick={clearDone}
                  disabled={counts.done === 0}
                >
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  Completed ({counts.done})
                </button>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-destructive hover:bg-destructive/10 disabled:opacity-50"
                  onClick={clearFailed}
                  disabled={counts.failed === 0}
                >
                  <Trash className="h-4 w-4" />
                  Failed ({counts.failed})
                </button>
              </PopoverContent>
            </Popover>
          )}
        </div>
      </div>
    </div>
  );
}
