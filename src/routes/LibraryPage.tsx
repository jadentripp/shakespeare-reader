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
    enqueue,
    retryFailed,
    clearFailed,
    clearDone,
    startOrResumeBulk,
    resumeAll,
    deleteBook,
  } = useLibrary()

  const searchInputRef = useRef<HTMLInputElement>(null)
  const showDiscoverFirst =
    catalogSearch || (activeCatalog.kind !== 'all' && catalogKey !== 'collection-all')

  return (
    <TooltipProvider>
      <div className="min-h-full bg-background">
        <BauhausHeader
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
            <LibraryCollections
              catalogKey={catalogKey}
              setCatalogKey={setCatalogKey}
              showAllCategories={showAllCategories}
              setShowAllCategories={setShowAllCategories}
            />

            {showDiscoverFirst && (
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
            )}

            <div
              className={
                booksInProgress.length > 0
                  ? 'grid grid-cols-1 items-start gap-12 lg:grid-cols-4 xl:gap-20'
                  : ''
              }
            >
              {booksInProgress.length > 0 && (
                <aside className="lg:col-span-1">
                  <ContinueReading
                    booksInProgress={booksInProgress}
                    progressByBookId={progressByBookId}
                  />
                </aside>
              )}
              <div className={booksInProgress.length > 0 ? 'lg:col-span-3' : ''}>
                <YourLibrary
                  booksQ={booksQ}
                  libraryQuery={libraryQuery}
                  setLibraryQuery={setLibraryQuery}
                  filteredBooks={filteredBooks}
                  progressByBookId={progressByBookId}
                  deleteBook={deleteBook}
                />
              </div>
            </div>

            {!showDiscoverFirst && (
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
