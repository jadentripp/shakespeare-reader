import { Search, X } from 'lucide-react'
import type { UseQueryResult } from '@tanstack/react-query'
import type { Book } from '@/lib/tauri/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { BookCardMinimal } from './BookCardMinimal'
import { LibraryEmptyState } from './LibraryEmptyState'
import { LibraryGrid, LibrarySkeleton } from './LibraryGrid'

interface YourLibraryProps {
  booksQ: UseQueryResult<Book[], Error>
  libraryQuery: string
  setLibraryQuery: (q: string) => void
  filteredBooks: Book[]
  progressByBookId: Map<number, number>
  deleteBook: (id: number) => Promise<void>
}

export function YourLibrary({
  booksQ,
  libraryQuery,
  setLibraryQuery,
  filteredBooks,
  progressByBookId,
  deleteBook,
}: YourLibraryProps) {
  const totalBooks = (booksQ.data ?? []).length

  return (
    <section className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-6 border-b-2 border-black pb-4 dark:border-white">
        <div className="space-y-1">
          <h2 className="font-sans text-2xl font-black uppercase tracking-tighter text-foreground [text-wrap:balance]">
            Your Library
          </h2>
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground tabular-nums">
            {totalBooks} {totalBooks === 1 ? 'Book' : 'Books'}
          </p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search
            className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/40"
            aria-hidden="true"
          />
          <Input
            type="search"
            placeholder="Search collection…"
            name="library-search"
            aria-label="Search your library"
            value={libraryQuery}
            onChange={(e) => setLibraryQuery(e.target.value)}
            className="h-9 rounded-none border-2 border-black bg-background pl-9 pr-9 text-xs focus:ring-0 dark:border-white"
          />
          {libraryQuery && (
            <Button
              variant="ghost"
              size="icon"
              aria-label="Clear search"
              className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => setLibraryQuery('')}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {booksQ.isLoading ? (
        <LibrarySkeleton count={8} variant="minimal" />
      ) : totalBooks === 0 ? (
        <LibraryEmptyState type="library" />
      ) : filteredBooks.length === 0 ? (
        <LibraryEmptyState type="search" />
      ) : (
        <LibraryGrid variant="minimal">
          {filteredBooks.map((b) => (
            <BookCardMinimal
              key={b.id}
              id={b.id}
              gutenbergId={b.gutenberg_id}
              title={b.title}
              authors={b.authors}
              coverUrl={b.cover_url}
              progress={progressByBookId.get(b.id)}
              isLocal={true}
              onDelete={deleteBook}
            />
          ))}
        </LibraryGrid>
      )}
    </section>
  )
}
