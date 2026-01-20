import { ArrowUpDown, Sparkles, Download, BookOpen, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { LibraryEmptyState } from "./LibraryEmptyState";
import { LibraryGrid, LibrarySkeleton } from "./LibraryGrid";
import { BookCard } from "./BookCard";
import { BookCardMinimal } from "./BookCardMinimal";
import { type CatalogEntry } from "../../lib/gutenberg";
import { type BulkScanState, type DownloadTask } from "../../hooks/useLibrary";
import { type SortOption, bestMobiUrl, authorsString, coverUrl, isPopular, formatDownloadCount, classifyResult } from "../../lib/gutenbergUtils";

interface CatalogResultsProps {
  catalogSearch: string;
  activeCatalog: CatalogEntry;
  sortBy: SortOption;
  setSortBy: (s: SortOption) => void;
  canBulkScan: boolean;
  startOrResumeBulk: () => void;
  bulkScan: BulkScanState;
  showSearchPrompt: boolean;
  catalogQ: any;
  sortedCatalogResults: any[];
  localGutenbergIds: Set<number>;
  queue: DownloadTask[];
  enqueue: (task: any) => void;
  setPaused: (p: boolean) => void;
  runQueue: () => void;
  setCatalogPageUrl: (url: string | null) => void;
}

export function CatalogResults({
  catalogSearch,
  activeCatalog,
  sortBy,
  setSortBy,
  canBulkScan,
  startOrResumeBulk,
  bulkScan,
  showSearchPrompt,
  catalogQ,
  sortedCatalogResults,
  localGutenbergIds,
  queue,
  enqueue,
  setPaused,
  runQueue,
  setCatalogPageUrl,
}: CatalogResultsProps) {
  return (
    <section className="border-2 border-black bg-background p-8 dark:border-white">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4 border-b-2 border-black pb-6 dark:border-white">
        <div className="space-y-1.5">
          <h2 className="font-sans text-3xl font-black uppercase tracking-tighter text-foreground">
            {catalogSearch ? `Results: ${catalogSearch}` : activeCatalog.label}
          </h2>
          {!catalogSearch && activeCatalog.kind !== "all" ? (
            <p className="max-w-2xl font-mono text-xs uppercase tracking-widest text-muted-foreground leading-relaxed">{activeCatalog.description}</p>
          ) : (
             <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
              {catalogQ.isLoading ? "Loading..." : `${catalogQ.data?.count ?? 0} Titles Found`}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-10 rounded-none border-2 border-black bg-background font-bold uppercase tracking-widest hover:bg-black hover:text-white dark:border-white dark:hover:bg-white dark:hover:text-black">
                <ArrowUpDown className="h-3.5 w-3.5" />
                <span>
                  {sortBy === "relevance" ? "Best match" :
                    sortBy === "popular" ? "Most popular" :
                      sortBy === "title" ? "Title A-Z" : "Author A-Z"}
                </span>
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-48 rounded-none border-2 border-black p-1 dark:border-white">
              {[
                { id: "relevance", label: "Best match", icon: Sparkles },
                { id: "popular", label: "Most popular", icon: Download },
                { id: "title", label: "Title A-Z", icon: BookOpen },
                { id: "author", label: "Author A-Z", icon: FileText },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setSortBy(opt.id as SortOption)}
                  className={`flex w-full items-center gap-2 px-3 py-2.5 font-mono text-[10px] uppercase tracking-widest transition-colors ${sortBy === opt.id ? "bg-black text-white dark:bg-white dark:text-black" : "hover:bg-muted"}`}
                >
                  <opt.icon className="h-3 w-3" />
                  {opt.label}
                </button>
              ))}
            </PopoverContent>
          </Popover>

          {canBulkScan && (
            <Button
              variant="outline"
              size="sm"
              className="h-10 rounded-none border-2 border-black bg-background font-bold uppercase tracking-widest hover:bg-black hover:text-white dark:border-white dark:hover:bg-white dark:hover:text-black"
              onClick={startOrResumeBulk}
              disabled={bulkScan.running}
            >
              <Download className="h-4 w-4" />
              {bulkScan.running ? "Scanning..." : "Download All"}
            </Button>
          )}
        </div>
      </div>

      {showSearchPrompt ? (
        <LibraryEmptyState type="catalog" />
      ) : catalogQ.isLoading ? (
        <LibrarySkeleton count={5} variant="minimal" />
      ) : catalogQ.isError ? (
        <div className="border-2 border-red-600 bg-red-50 py-12 text-center dark:bg-red-950/20">
          <p className="font-mono text-xs font-bold uppercase tracking-widest text-red-600">Failed to load catalog.</p>
        </div>
      ) : (
        <>
          {sortedCatalogResults.length === 0 ? (
            <LibraryEmptyState 
              type="search" 
              title="No results found" 
              description="Try a different search or category" 
            />
          ) : (
            <LibraryGrid variant="minimal">
              {sortedCatalogResults.map((b) => {
                const mobiUrl = bestMobiUrl(b);
                const already = localGutenbergIds.has(b.id);
                const queued = queue.some((t) => t.gutenbergId === b.id);
                const cover = coverUrl(b);
                const popular = isPopular(b.download_count);
                const downloadStr = formatDownloadCount(b.download_count);
                const resultType = classifyResult(b, catalogSearch);

                return (
                  <BookCardMinimal
                    key={b.id}
                    id={b.id}
                    gutenbergId={b.id}
                    title={b.title}
                    authors={authorsString(b)}
                    coverUrl={cover}
                    isLocal={false}
                    mobiUrl={mobiUrl}
                    alreadyInLibrary={already}
                    isQueued={queued}
                    popular={popular}
                    downloadCount={downloadStr}
                    resultType={resultType}
                    catalogSearch={catalogSearch}
                    onAdd={() => {
                      enqueue({
                        gutenbergId: b.id,
                        title: b.title,
                        authors: authorsString(b),
                        publicationYear: null,
                        coverUrl: cover,
                        mobiUrl,
                      });
                      setPaused(false);
                      runQueue();
                    }}
                  />
                );
              })}
            </LibraryGrid>
          )}

          {(catalogQ.data?.previous || catalogQ.data?.next) && (
            <div className="mt-12 flex items-center justify-center gap-6">
              <Button
                variant="outline"
                size="sm"
                className="h-10 min-w-[120px] rounded-none border-2 border-black bg-background font-bold uppercase tracking-widest hover:bg-black hover:text-white dark:border-white dark:hover:bg-white dark:hover:text-black"
                disabled={!catalogQ.data?.previous}
                onClick={() => setCatalogPageUrl(catalogQ.data?.previous ?? null)}
              >
                Previous
              </Button>
              <div className="h-2 w-2 bg-black dark:bg-white" />
              <Button
                variant="outline"
                size="sm"
                className="h-10 min-w-[120px] rounded-none border-2 border-black bg-background font-bold uppercase tracking-widest hover:bg-black hover:text-white dark:border-white dark:hover:bg-white dark:hover:text-black"
                disabled={!catalogQ.data?.next}
                onClick={() => setCatalogPageUrl(catalogQ.data?.next ?? null)}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </section>
  );
}