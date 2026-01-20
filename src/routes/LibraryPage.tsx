import { useRef } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useLibrary } from "../hooks/useLibrary";
import { LibraryHeader } from "../components/library/LibraryHeader";
import { LibraryCollections } from "../components/library/LibraryCollections";
import { DownloadStatusBar } from "../components/library/DownloadStatusBar";
import { CatalogResults } from "../components/library/CatalogResults";
import { YourLibrary } from "../components/library/YourLibrary";
import { ContinueReading } from "../components/library/ContinueReading";
import { DownloadQueue } from "../components/library/DownloadQueue";

export default function LibraryPage() {
  const {
    booksQ,
    catalogKey,
    setCatalogKey,
    libraryQuery,
    setLibraryQuery,
    catalogQuery,
    setCatalogQuery,
    showAllCategories,
    setShowAllCategories,
    sortBy,
    setSortBy,
    searchFocused,
    setSearchFocused,
    recentSearches,
    setCatalogPageUrl,
    queue,
    setQueue,
    paused,
    setPaused,
    bulkScan,
    catalogQ,
    activeCatalog,
    catalogSearch,
    canQueryCatalog,
    localGutenbergIds,
    progressByBookId,
    counts,
    active,
    canBulkScan,
    filteredBooks,
    sortedCatalogResults,
    booksInProgress,
    hasQueueActivity,
    handleSearch,
    clearRecentSearches,
    enqueue,
    retryFailed,
    clearFailed,
    clearDone,
    startOrResumeBulk,
    resumeAll,
    deleteBook,
  } = useLibrary();

  const searchInputRef = useRef<HTMLInputElement>(null);
  const showSearchPrompt = !canQueryCatalog;
  const showDiscoverFirst = catalogSearch || (activeCatalog.kind !== "all" && catalogKey !== "collection-all");

  return (
    <TooltipProvider>
      <div className="min-h-screen">
        <LibraryHeader
          catalogQuery={catalogQuery}
          setCatalogQuery={setCatalogQuery}
          searchFocused={searchFocused}
          setSearchFocused={setSearchFocused}
          recentSearches={recentSearches}
          handleSearch={handleSearch}
          clearRecentSearches={clearRecentSearches}
          catalogQ={catalogQ}
          activeCatalog={activeCatalog}
          catalogSearch={catalogSearch}
          setCatalogKey={setCatalogKey}
          searchInputRef={searchInputRef}
        />

        <div className="mx-auto max-w-6xl space-y-10 px-6 py-8">
          {hasQueueActivity && (
            <DownloadStatusBar
              paused={paused}
              setPaused={setPaused}
              counts={counts}
              active={active}
              retryFailed={retryFailed}
              clearDone={clearDone}
              clearFailed={clearFailed}
              resumeAll={resumeAll}
            />
          )}

          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
            <div className="space-y-10">
              {showDiscoverFirst ? (
                <>
                  <CatalogResults
                    catalogSearch={catalogSearch}
                    activeCatalog={activeCatalog}
                    sortBy={sortBy}
                    setSortBy={setSortBy}
                    canBulkScan={canBulkScan}
                    startOrResumeBulk={startOrResumeBulk}
                    bulkScan={bulkScan}
                    showSearchPrompt={showSearchPrompt}
                    catalogQ={catalogQ}
                    sortedCatalogResults={sortedCatalogResults}
                    localGutenbergIds={localGutenbergIds}
                    queue={queue}
                    enqueue={enqueue}
                    setPaused={setPaused}
                    runQueue={resumeAll} // resumeAll handles queue run
                    setCatalogPageUrl={setCatalogPageUrl}
                  />
                  <YourLibrary
                    booksQ={booksQ}
                    libraryQuery={libraryQuery}
                    setLibraryQuery={setLibraryQuery}
                    filteredBooks={filteredBooks}
                    progressByBookId={progressByBookId}
                    deleteBook={deleteBook}
                  />
                  <ContinueReading
                    booksInProgress={booksInProgress}
                    progressByBookId={progressByBookId}
                  />
                </>
              ) : (
                <>
                  <ContinueReading
                    booksInProgress={booksInProgress}
                    progressByBookId={progressByBookId}
                  />
                  <YourLibrary
                    booksQ={booksQ}
                    libraryQuery={libraryQuery}
                    setLibraryQuery={setLibraryQuery}
                    filteredBooks={filteredBooks}
                    progressByBookId={progressByBookId}
                    deleteBook={deleteBook}
                  />
                  <CatalogResults
                    catalogSearch={catalogSearch}
                    activeCatalog={activeCatalog}
                    sortBy={sortBy}
                    setSortBy={setSortBy}
                    canBulkScan={canBulkScan}
                    startOrResumeBulk={startOrResumeBulk}
                    bulkScan={bulkScan}
                    showSearchPrompt={showSearchPrompt}
                    catalogQ={catalogQ}
                    sortedCatalogResults={sortedCatalogResults}
                    localGutenbergIds={localGutenbergIds}
                    queue={queue}
                    enqueue={enqueue}
                    setPaused={setPaused}
                    runQueue={resumeAll}
                    setCatalogPageUrl={setCatalogPageUrl}
                  />
                </>
              )}
            </div>

            <aside className="space-y-8 lg:sticky lg:top-8">
              <LibraryCollections
                catalogKey={catalogKey}
                setCatalogKey={setCatalogKey}
                showAllCategories={showAllCategories}
                setShowAllCategories={setShowAllCategories}
                variant="sidebar"
              />
              <DownloadQueue queue={queue} setQueue={setQueue} />
            </aside>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
