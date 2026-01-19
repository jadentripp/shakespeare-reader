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
    <section className="rounded-2xl border border-border/20 bg-card/30 p-8 shadow-sm transition-all">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1.5">
          <h2 className="font-serif text-2xl font-semibold tracking-tight text-foreground">
            {catalogSearch ? `Results for "${catalogSearch}"` : activeCatalog.label}
          </h2>
          {!catalogSearch && activeCatalog.kind !== "all" ? (
            <p className="max-w-2xl text-sm text-muted-foreground leading-relaxed">{activeCatalog.description}</p>
          ) : (
             <p className="text-sm text-muted-foreground">
              {catalogQ.isLoading ? "Searching..." : `${catalogQ.data?.count ?? 0} titles found in Project Gutenberg`}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 gap-2 border-border/40 bg-background/50 hover:bg-background">
                <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="font-medium">
                  {sortBy === "relevance" ? "Best match" :
                    sortBy === "popular" ? "Most popular" :
                      sortBy === "title" ? "Title A-Z" : "Author A-Z"}
                </span>
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-48 p-1.5">
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
                  className={`flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm transition-colors ${sortBy === opt.id ? "bg-amber-50 text-amber-900 dark:bg-amber-900/20 dark:text-amber-100" : "hover:bg-muted"}`}
                >
                  <opt.icon className={`h-4 w-4 ${sortBy === opt.id ? "text-amber-600" : "text-muted-foreground"}`} />
                  {opt.label}
                </button>
              ))}
            </PopoverContent>
          </Popover>

          {canBulkScan && (
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-2 border-border/40 bg-background/50 hover:bg-background"
              onClick={startOrResumeBulk}
              disabled={bulkScan.running}
            >
              <Download className="h-4 w-4 text-muted-foreground" />
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
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 py-12 text-center">
          <p className="text-sm font-medium text-destructive">Failed to load catalog. Please try again.</p>
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
            <div className="mt-10 flex items-center justify-center gap-3">
              <Button
                variant="outline"
                size="sm"
                className="h-9 min-w-[100px] border-border/40"
                disabled={!catalogQ.data?.previous}
                onClick={() => setCatalogPageUrl(catalogQ.data?.previous ?? null)}
              >
                Previous
              </Button>
              <div className="h-1 w-1 rounded-full bg-stone-300" />
              <Button
                variant="outline"
                size="sm"
                className="h-9 min-w-[100px] border-border/40"
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