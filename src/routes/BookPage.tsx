import { useQuery } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";
import { getBook } from "../lib/tauri";

import MobiBookPage from "./MobiBookPage";

export default function BookPage() {
  const { bookId } = useParams({ from: "/book/$bookId" });
  const id = Number(bookId);

  const bookQ = useQuery({ queryKey: ["book", id], queryFn: () => getBook(id) });
  if (bookQ.isLoading) return <div className="page">Loading…</div>;
  if (bookQ.isError) return <div className="page">Failed to load book.</div>;

  const book = bookQ.data;
  if (book?.mobi_path && book?.html_path) return <MobiBookPage bookId={id} />;

  return (
    <div className="page">
      <div className="error">This book has no downloaded .mobi (or extraction failed). Re-download it from Library.</div>
    </div>
  );
}
