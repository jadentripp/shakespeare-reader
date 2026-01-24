import { Link } from '@tanstack/react-router'
import type { Book } from '@/lib/tauri/types'
import { BookOpen, Sparkles } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'

interface ContinueReadingProps {
  booksInProgress: Book[]
  progressByBookId: Map<number, number>
}

export function ContinueReading({ booksInProgress, progressByBookId }: ContinueReadingProps) {
  if (booksInProgress.length === 0) return null

  const count = booksInProgress.length

  return (
    <section className="sticky top-12 flex flex-col max-h-[calc(100vh-8rem)]">
      <div className="mb-8 flex items-center justify-between border-b-2 border-black pb-2 dark:border-white">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-amber-500" aria-hidden="true" />
          <h2 className="font-sans text-sm font-black uppercase tracking-tighter text-foreground">
            In Progress
          </h2>
        </div>
        <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground tabular-nums">
          {count} {count === 1 ? 'Book' : 'Books'}
        </span>
      </div>

      <ScrollArea className="flex-1 -mr-4 pr-4">
        <div className="flex flex-col gap-8 pb-4">
          {booksInProgress.map((b) => {
            const progress = Math.min(100, progressByBookId.get(b.id) || 0)
            return (
              <Link
                key={b.id}
                to="/book/$bookId"
                params={{ bookId: String(b.id) }}
                className="group flex flex-row items-start gap-4 focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 outline-none"
              >
                <div className="relative h-28 w-20 flex-shrink-0 bg-stone-100 shadow-sm transition-transform group-hover:scale-105 dark:bg-stone-800">
                  {b.cover_url ? (
                    <img
                      src={b.cover_url}
                      alt={b.title}
                      width={80}
                      height={112}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center p-2">
                      <BookOpen className="h-6 w-6 text-stone-400" aria-hidden="true" />
                    </div>
                  )}
                  {/* Progress Bar */}
                  <div className="absolute bottom-0 left-0 h-1 w-full bg-black/10">
                    <div className="h-full bg-amber-500" style={{ width: `${progress}%` }} />
                  </div>
                </div>
                <div className="min-w-0 flex-1 py-1">
                  <div className="truncate font-sans text-xs font-bold uppercase tracking-tight text-foreground group-hover:text-amber-600">
                    {b.title}
                  </div>
                  <div className="mt-1 truncate font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
                    {b.authors}
                  </div>
                  <div className="mt-3 font-mono text-[9px] font-bold uppercase tabular-nums text-amber-500">
                    {progress}% Read
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </ScrollArea>
    </section>
  )
}
