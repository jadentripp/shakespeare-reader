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
    <section className="rounded-2xl border border-border/40 bg-card/50 p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-xl font-medium text-foreground">
            {catalogSearch ? `Results for "${catalogSearch}"` : activeCatalog.label}
          </h2>
          {!catalogSearch && activeCatalog.kind !== "all" && (
            <p className="mt-1 text-sm text-muted-foreground">{activeCatalog.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Sort dropdown */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <ArrowUpDown className="h-3.5 w-3.5" />
                {sortBy === "relevance" ? "Best match" :
                  sortBy === "popular" ? "Most popular" :
                    sortBy === "title" ? "Title A-Z" : "Author A-Z"}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-44 p-1.5">
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
                  className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${sortBy === opt.id ? "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100" : "hover:bg-muted"}`}
                >
                  <opt.icon className="h-4 w-4" />
                  {opt.label}
                </button>
              ))}
            </PopoverContent>
          </Popover>

          {canBulkScan && (
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
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
        <LibrarySkeleton count={5} variant="list" />
      ) : catalogQ.isError ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 py-8 text-center">
          <p className="text-sm text-destructive">Failed to load catalog. Please try again.</p>
        </div>
      ) : (
        <>
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {sortedCatalogResults.length} of {catalogQ.data?.count ?? 0} results
            </p>
          </div>

          {sortedCatalogResults.length === 0 ? (
            <LibraryEmptyState 
              type="search" 
              title="No results found" 
              description="Try a different search or category" 
            />
          ) : (
            <LibraryGrid variant="list">
              {sortedCatalogResults.map((b) => {
                const mobiUrl = bestMobiUrl(b);
                const already = localGutenbergIds.has(b.id);
                const queued = queue.some((t) => t.gutenbergId === b.id);
                const cover = coverUrl(b);
                const popular = isPopular(b.download_count);
                const downloadStr = formatDownloadCount(b.download_count);
                const resultType = classifyResult(b, catalogSearch);

                return (
                  <BookCard
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
            <div className="mt-6 flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={!catalogQ.data?.previous}
                onClick={() => setCatalogPageUrl(catalogQ.data?.previous ?? null)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
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
