import { Search, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LibraryGrid, LibrarySkeleton } from "./LibraryGrid";
import { BookCard } from "./BookCard";
import { LibraryEmptyState } from "./LibraryEmptyState";

interface YourLibraryProps {
  booksQ: any;
  libraryQuery: string;
  setLibraryQuery: (q: string) => void;
  filteredBooks: any[];
  progressByBookId: Map<number, number>;
  deleteBook: (id: number) => Promise<void>;
}

export function YourLibrary({
  booksQ,
  libraryQuery,
  setLibraryQuery,
  filteredBooks,
  progressByBookId,
  deleteBook,
}: YourLibraryProps) {
  const totalBooks = (booksQ.data ?? []).length;

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border/40 pb-4">
        <div className="space-y-1">
          <h2 className="font-serif text-2xl font-semibold tracking-tight text-foreground">Your Library</h2>
          <p className="text-sm text-muted-foreground">
            {totalBooks} {totalBooks === 1 ? "book" : "books"} in your collection
          </p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/40" />
          <Input
            type="search"
            placeholder="Filter by title or author..."
            value={libraryQuery}
            onChange={(e) => setLibraryQuery(e.target.value)}
            className="h-10 border-border/40 bg-background/50 pl-9 pr-9 focus:bg-background"
          />
          {libraryQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => setLibraryQuery("")}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {booksQ.isLoading ? (
        <LibrarySkeleton count={8} />
      ) : totalBooks === 0 ? (
        <LibraryEmptyState type="library" />
      ) : filteredBooks.length === 0 ? (
        <LibraryEmptyState type="search" />
      ) : (
        <LibraryGrid>
          {filteredBooks.map((b) => (
            <BookCard
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
  );
}