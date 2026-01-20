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
      <div className="mb-6 flex items-center gap-2 border-b-2 border-black pb-2 dark:border-white">
        <Sparkles className="h-5 w-5 text-amber-500" />
        <h2 className="font-sans text-xl font-black uppercase tracking-tighter text-foreground">In Progress</h2>
      </div>
      <div className="flex gap-8 overflow-x-auto pb-4">
        {booksInProgress.slice(0, 5).map((b) => (
          <Link
            key={b.id}
            to="/book/$bookId"
            params={{ bookId: String(b.id) }}
            className="group flex-shrink-0"
          >
            <div className="relative h-44 w-32 bg-stone-100 shadow-md transition-transform group-hover:scale-105 dark:bg-stone-800">
              {b.cover_url ? (
                <img src={b.cover_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center p-3">
                  <BookOpen className="h-10 w-10 text-stone-400" />
                </div>
              )}
              {/* Progress Line */}
              <div className="absolute bottom-0 left-0 h-1.5 w-full bg-black/20">
                <div 
                  className="h-full bg-amber-500" 
                  style={{ width: `${Math.min(100, progressByBookId.get(b.id) || 0)}%` }} 
                />
              </div>
            </div>
            <div className="mt-3 w-32">
              <div className="truncate font-sans text-sm font-bold uppercase tracking-tight text-foreground group-hover:text-amber-600">
                {b.title}
              </div>
              <div className="truncate font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{b.authors}</div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
