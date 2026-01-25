import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { DownloadTask } from '../../hooks/useLibrary'

interface DownloadQueueProps {
  queue: DownloadTask[]
  setQueue: React.Dispatch<React.SetStateAction<DownloadTask[]>>
}

export function DownloadQueue({ queue, setQueue }: DownloadQueueProps) {
  if (queue.length === 0) return null

  return (
    <section className="border-2 border-black bg-background p-8 dark:border-white">
      <div className="mb-8 flex items-end justify-between border-b-2 border-black pb-4 dark:border-white">
        <h3 className="font-sans text-2xl font-black uppercase tracking-tighter text-foreground [text-wrap:balance]">
          Queue
        </h3>
        <span className="font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground tabular-nums">
          {queue.length} items
        </span>
      </div>
      <ScrollArea className="h-64">
        <div className="space-y-4 pr-6">
          {queue
            .slice()
            .reverse()
            .map((t) => (
              <div
                key={t.gutenbergId}
                className="group flex items-center justify-between gap-6 border-b border-stone-200 py-4 transition-colors hover:border-black dark:border-stone-800 dark:hover:border-white"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate font-sans text-sm font-bold uppercase tracking-tight text-foreground group-hover:text-amber-600">
                    {t.title}
                  </div>
                  <div className="mt-1 flex items-center gap-3 font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    <span className="tabular-nums">#{t.gutenbergId}</span>
                    <span
                      className={`px-2 py-0.5 border rounded-none ${
                        t.status === 'failed'
                          ? 'border-red-600 text-red-600 bg-red-50 dark:bg-red-950/20'
                          : t.status === 'done'
                            ? 'border-stone-400 text-stone-500'
                            : t.status === 'downloading'
                              ? 'border-amber-500 text-amber-600 bg-amber-50 dark:bg-amber-950/20'
                              : 'border-stone-200 text-stone-400'
                      }`}
                    >
                      {t.status}
                    </span>
                  </div>
                  {t.error && (
                    <div className="mt-2 font-mono text-[9px] font-bold uppercase text-red-600">
                      {t.error}
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  {t.status === 'failed' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 rounded-none border-2 border-black font-bold uppercase text-[9px] tracking-widest hover:bg-black hover:text-white dark:border-white dark:hover:bg-white dark:hover:text-black"
                      onClick={() =>
                        setQueue((prev) =>
                          prev.map((x) =>
                            x.gutenbergId === t.gutenbergId
                              ? { ...x, status: 'queued', error: null }
                              : x,
                          ),
                        )
                      }
                    >
                      Retry
                    </Button>
                  )}
                  {(t.status === 'queued' || t.status === 'failed' || t.status === 'done') && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 rounded-none border-2 border-stone-200 font-bold uppercase text-[9px] tracking-widest hover:border-black hover:bg-stone-100 dark:border-stone-800 dark:hover:border-white dark:hover:bg-stone-900"
                      onClick={() =>
                        setQueue((prev) => prev.filter((x) => x.gutenbergId !== t.gutenbergId))
                      }
                    >
                      Remove
                    </Button>
                  )}
                </div>
              </div>
            ))}
        </div>
      </ScrollArea>
    </section>
  )
}
