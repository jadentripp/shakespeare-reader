import { Loader2 } from 'lucide-react'
import { useCallback } from 'react'
import { useTTS } from '@/lib/hooks/useTTS'
import { cn } from '@/lib/utils'

interface TTSProgressBarProps {
  currentPage: number
  totalPages: number
  className?: string
}

export function TTSProgressBar({ currentPage, totalPages, className }: TTSProgressBarProps) {
  const { progress, seek } = useTTS({
    getDoc: () => null,
    getPageMetrics: () => ({
      pageWidth: 0,
      gap: 0,
      stride: 0,
      scrollLeft: 0,
      rootRect: {
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        toJSON: () => '',
      } as DOMRect,
    }),
    currentPage,
  })

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const progressPercent =
    progress.duration > 0 ? (progress.currentTime / progress.duration) * 100 : 0

  const remainingTime = Math.max(0, progress.duration - progress.currentTime)

  const handleSeek = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!seek || progress.duration === 0) return

      const rect = e.currentTarget.getBoundingClientRect()
      const x = e.clientX - rect.left
      const percentage = x / rect.width
      const newTime = percentage * progress.duration

      seek(Math.max(0, Math.min(progress.duration, newTime)))
    },
    [seek, progress.duration],
  )

  return (
    <div className={cn('space-y-2', className)}>
      {/* Page context */}
      <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-foreground">
        <span data-testid="elapsed-time">{formatTime(progress.currentTime)}</span>
        <span className="font-black">
          PAGE {currentPage} / {totalPages}
        </span>
        <span data-testid="remaining-time">-{formatTime(remainingTime)}</span>
      </div>

      {/* Progress bar */}
      <div
        data-testid="progress-track"
        role="slider"
        aria-label="Audio progress"
        aria-valuemin={0}
        aria-valuemax={progress.duration}
        aria-valuenow={progress.currentTime}
        aria-valuetext={`${formatTime(progress.currentTime)} of ${formatTime(progress.duration)}`}
        className="relative h-2 bg-black/10 dark:bg-white/10 rounded-none cursor-pointer overflow-hidden group border border-black/5 dark:border-white/5"
        onClick={handleSeek}
      >
        {/* Background track */}
        <div className="absolute inset-0 bg-transparent" />

        {/* Progress fill */}
        <div
          data-testid="progress-fill"
          className="absolute left-0 top-0 h-full bg-[#E02E2E] rounded-none transition-all duration-100 ease-linear group-hover:bg-[#E02E2E]/80"
          style={{ width: `${progressPercent}%` }}
        />

        {/* Buffering indicator */}
        {progress.isBuffering && (
          <div
            data-testid="buffering-indicator"
            className="absolute inset-0 flex items-center justify-center bg-white/20 dark:bg-black/20"
          >
            <Loader2 className="h-3 w-3 animate-spin text-white" />
          </div>
        )}

        {/* Duration time */}
        <span data-testid="duration-time" className="sr-only">
          {formatTime(progress.duration)}
        </span>
      </div>
    </div>
  )
}
