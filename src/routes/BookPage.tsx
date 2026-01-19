import { useQuery } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";
import { getBook } from "../lib/tauri";

import MobiBookPage from "./MobiBookPage";

export default function BookPage() {
  const { bookId } = useParams({ from: "/book/$bookId" });
  const id = Number(bookId);

  const bookQ = useQuery({ queryKey: ["book", id], queryFn: () => getBook(id) });
  if (bookQ.isLoading) return <div className="px-4 py-6 text-sm text-muted-foreground">Loading…</div>;
  if (bookQ.isError) return <div className="px-4 py-6 text-sm text-destructive">Failed to load book.</div>;

  const book = bookQ.data;
  const isTauri = typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__ !== undefined;

  if (book && (isTauri ? (book.mobi_path && book.html_path) : true)) return <MobiBookPage bookId={id} />;

  return (
    <div className="px-4 py-6">
      <div className="text-sm text-destructive">
        This book has no downloaded .mobi (or extraction failed). Re-download it from Library.
      </div>
    </div>
  );
}
