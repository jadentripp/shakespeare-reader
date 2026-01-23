import { CheckCircle2, Clock, Pause, Play, RotateCcw, Trash } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { DownloadTask } from '../../hooks/useLibrary'

interface DownloadStatusBarProps {
  paused: boolean
  setPaused: (p: boolean) => void
  counts: {
    downloading: number
    queued: number
    done: number
    failed: number
  }
  active: DownloadTask | null
  retryFailed: () => void
  clearDone: () => void
  clearFailed: () => void
  resumeAll: () => void
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
      <div className="flex items-center gap-4 border-2 border-black bg-background px-5 py-4 dark:border-white">
        <div className="flex items-center gap-4">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-none hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black"
                onClick={() => (paused ? resumeAll() : setPaused(true))}
              >
                {paused ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent className="rounded-none border-2 border-black font-mono text-[10px] uppercase font-bold dark:border-white">
              {paused ? 'Resume' : 'Pause'}
            </TooltipContent>
          </Tooltip>

          <div className="h-8 w-1 bg-black dark:bg-white" />

          <div className="flex items-center gap-6 font-mono text-[10px] font-bold uppercase tracking-widest">
            {counts.downloading > 0 && (
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 animate-pulse bg-amber-500" />
                <span className="tabular-nums">{counts.downloading} Active</span>
              </span>
            )}
            {counts.queued > 0 && (
              <span className="flex items-center gap-2 text-stone-400">
                <Clock className="h-3.5 w-3.5" />
                <span className="tabular-nums">{counts.queued} Queued</span>
              </span>
            )}
            {counts.done > 0 && (
              <span className="flex items-center gap-2 text-stone-500">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span className="tabular-nums">{counts.done} Done</span>
              </span>
            )}
            {counts.failed > 0 && (
              <span className="flex items-center gap-2 text-red-600">
                <span className="h-2 w-2 bg-red-600" />
                <span className="tabular-nums">{counts.failed} Failed</span>
              </span>
            )}
          </div>
        </div>

        {active && (
          <>
            <div className="h-8 w-px bg-stone-200 dark:bg-stone-800" />
            <span className="flex-1 truncate font-sans text-xs font-black uppercase tracking-tight">
              Loading: {active.title}
            </span>
          </>
        )}

        <div className="ml-auto flex items-center gap-4">
          {counts.failed > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={retryFailed}
              className="h-10 rounded-none border-2 border-black font-bold uppercase tracking-widest hover:bg-black hover:text-white dark:border-white dark:hover:bg-white dark:hover:text-black"
            >
              <RotateCcw className="h-4 w-4" />
              Retry
            </Button>
          )}
          {(counts.done > 0 || counts.failed > 0) && (
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-10 rounded-none border-2 border-black font-bold uppercase tracking-widest hover:bg-black hover:text-white dark:border-white dark:hover:bg-white dark:hover:text-black"
                >
                  <Trash className="h-4 w-4" />
                  Clear
                </Button>
              </PopoverTrigger>
              <PopoverContent
                align="end"
                className="w-48 rounded-none border-2 border-black p-1 dark:border-white"
              >
                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-3 py-3 font-mono text-[10px] font-bold uppercase tracking-widest hover:bg-stone-100 disabled:opacity-50 dark:hover:bg-stone-800"
                  onClick={clearDone}
                  disabled={counts.done === 0}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Completed ({counts.done})
                </button>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-3 py-3 font-mono text-[10px] font-bold uppercase tracking-widest text-red-600 hover:bg-red-50 disabled:opacity-50 dark:hover:bg-red-950/20"
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
  )
}
