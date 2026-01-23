import { useRef } from 'react'
import { TooltipProvider } from '@/components/ui/tooltip'
import { BauhausHeader } from '../components/library/BauhausHeader'
import { CatalogResults } from '../components/library/CatalogResults'
import { ContinueReading } from '../components/library/ContinueReading'
import { DownloadQueue } from '../components/library/DownloadQueue'
import { DownloadStatusBar } from '../components/library/DownloadStatusBar'
import { LibraryCollections } from '../components/library/LibraryCollections'
import { YourLibrary } from '../components/library/YourLibrary'
import { useLibrary } from '../hooks/useLibrary'

export default function LibraryPage() {
  const {
    viewMode,
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
  } = useLibrary()

  const searchInputRef = useRef<HTMLInputElement>(null)

  return (
    <TooltipProvider>
      <div className="min-h-full bg-background">
        <BauhausHeader
          viewMode={viewMode}
          setViewMode={setViewMode}
          libraryQuery={libraryQuery}
          setLibraryQuery={setLibraryQuery}
          catalogQuery={catalogQuery}
          setCatalogQuery={setCatalogQuery}
          handleSearch={handleSearch}
          catalogQ={catalogQ}
          activeCatalog={activeCatalog}
          catalogSearch={catalogSearch}
          setCatalogKey={setCatalogKey}
          searchInputRef={searchInputRef}
        />

        <main className="mx-auto max-w-6xl space-y-20 px-6 py-12">
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

          <div className="space-y-20">
            {viewMode === 'local' ? (
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
              </>
            ) : (
              <>
                <LibraryCollections
                  catalogKey={catalogKey}
                  setCatalogKey={setCatalogKey}
                  showAllCategories={showAllCategories}
                  setShowAllCategories={setShowAllCategories}
                />
                <CatalogResults
                  catalogSearch={catalogSearch}
                  activeCatalog={activeCatalog}
                  sortBy={sortBy}
                  setSortBy={setSortBy}
                  canBulkScan={canBulkScan}
                  startOrResumeBulk={startOrResumeBulk}
                  bulkScan={bulkScan}
                  showSearchPrompt={!canQueryCatalog}
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

            {/* Download Queue at the bottom for full width */}
            {queue.length > 0 && (
              <div className="border-t-4 border-black pt-10 dark:border-white">
                <DownloadQueue queue={queue} setQueue={setQueue} />
              </div>
            )}
          </div>
        </main>
      </div>
    </TooltipProvider>
  )
}
