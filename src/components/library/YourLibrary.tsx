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
  return (
    <section>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h2 className="font-serif text-xl font-medium text-foreground">Your Library</h2>
          <Badge variant="secondary" className="font-normal">
            {(booksQ.data ?? []).length} {(booksQ.data ?? []).length === 1 ? "book" : "books"}
          </Badge>
        </div>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
          <Input
            type="search"
            placeholder="Filter library..."
            value={libraryQuery}
            onChange={(e) => setLibraryQuery(e.target.value)}
            className="h-9 pl-9 pr-9"
          />
          {libraryQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2"
              onClick={() => setLibraryQuery("")}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {booksQ.isLoading ? (
        <LibrarySkeleton count={4} />
      ) : (booksQ.data ?? []).length === 0 ? (
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
