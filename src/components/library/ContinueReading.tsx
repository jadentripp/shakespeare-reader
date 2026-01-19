import { Link } from "@tanstack/react-router";
import { Sparkles, BookOpen } from "lucide-react";

interface ContinueReadingProps {
  booksInProgress: any[];
  progressByBookId: Map<number, number>;
}

export function ContinueReading({ booksInProgress, progressByBookId }: ContinueReadingProps) {
  if (booksInProgress.length === 0) return null;

  return (
    <section>
      <div className="mb-5 flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-amber-500" />
        <h2 className="font-serif text-xl font-medium text-foreground">Continue Reading</h2>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-2">
        {booksInProgress.slice(0, 5).map((b) => (
          <Link
            key={b.id}
            to="/book/$bookId"
            params={{ bookId: String(b.id) }}
            className="group flex-shrink-0"
          >
            <div className="relative h-40 w-28 overflow-hidden rounded-lg bg-gradient-to-br from-stone-100 to-stone-200 shadow-md transition-transform group-hover:scale-105 dark:from-stone-800 dark:to-stone-900">
              {b.cover_url ? (
                <img src={b.cover_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center p-3">
                  <BookOpen className="h-8 w-8 text-stone-400" />
                </div>
              )}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                <div className="text-xs text-white/90">Page {progressByBookId.get(b.id)}</div>
              </div>
            </div>
            <div className="mt-2 w-28">
              <div className="truncate text-sm font-medium text-foreground group-hover:text-amber-600 dark:group-hover:text-amber-400">
                {b.title}
              </div>
              <div className="truncate text-xs text-muted-foreground">{b.authors}</div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
