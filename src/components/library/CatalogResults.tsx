import { ArrowUpDown, BookOpen, Download, FileText, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import type { BulkScanState, DownloadTask } from '../../hooks/useLibrary'
import {
  authorsString,
  bestMobiUrl,
  coverUrl,
  formatDownloadCount,
  isPopular,
  type SortOption,
} from '../../lib/gutenbergUtils'
import type { GutendexBook } from '../../lib/tauri'
import { BookDetailModal } from './BookDetailModal'
import { LibraryEmptyState } from './LibraryEmptyState'
import { LibraryGrid, LibrarySkeleton } from './LibraryGrid'

interface CatalogResultsProps {
  catalogSearch: string
  activeCatalog: { label: string; kind: string; description?: string }
  sortBy: SortOption
  setSortBy: (s: SortOption) => void
  canBulkScan: boolean
  startOrResumeBulk: () => void
  bulkScan: BulkScanState
  showSearchPrompt: boolean
  catalogQ: any
  sortedCatalogResults: GutendexBook[]
  localGutenbergIds: Set<number>
  queue: DownloadTask[]
  enqueue: (task: any) => void
  setPaused: (p: boolean) => void
  runQueue: () => void
  setCatalogPageUrl: (url: string | null) => void
}

// Catalog book card - simplified version that opens modal on click
function CatalogBookCard({
  book,
  isLocal,
  isQueued,
  onClick,
}: {
  book: GutendexBook
  isLocal: boolean
  isQueued: boolean
  onClick: () => void
}) {
  const cover = coverUrl(book)
  const authors = authorsString(book)
  const popular = isPopular(book.download_count)
  const downloadStr = formatDownloadCount(book.download_count)

  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative flex w-full flex-col bg-background text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
    >
      {/* Cover Container */}
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-stone-100 dark:bg-stone-800">
        {cover ? (
          <img
            src={cover}
            alt={book.title}
            width={300}
            height={450}
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <BookOpen className="h-12 w-12 text-stone-300 dark:text-stone-600" />
          </div>
        )}

        {/* Popular Badge */}
        {popular && (
          <div className="absolute left-2 top-2 bg-amber-500 px-2 py-1">
            <span className="font-mono text-[9px] font-bold uppercase tracking-widest text-black">
              Popular
            </span>
          </div>
        )}

        {/* Download Count Badge */}
        {downloadStr && !popular && (
          <div className="absolute left-2 top-2 bg-stone-900/80 px-2 py-1 backdrop-blur-sm">
            <span className="font-mono text-[9px] font-bold uppercase tracking-widest text-white">
              {downloadStr}
            </span>
          </div>
        )}

        {/* Status indicators */}
        {isLocal && (
          <div className="absolute bottom-2 right-2 bg-green-600 px-2 py-1">
            <span className="font-mono text-[8px] font-bold uppercase tracking-widest text-white">
              In Library
            </span>
          </div>
        )}
        {isQueued && !isLocal && (
          <div className="absolute bottom-2 right-2 bg-amber-500 px-2 py-1">
            <span className="font-mono text-[8px] font-bold uppercase tracking-widest text-black">
              Downloading
            </span>
          </div>
        )}

        {/* Hover overlay - just shows "View Details" */}
        <div className="absolute inset-0 flex items-center justify-center bg-stone-950/70 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <span className="rounded-none border-2 border-white bg-transparent px-4 py-2 font-mono text-xs font-bold uppercase tracking-widest text-white">
            View Details
          </span>
        </div>
      </div>

      {/* Typography Info */}
      <div className="mt-3 select-none">
        <h3 className="line-clamp-1 font-sans text-lg font-bold leading-none tracking-tight text-foreground transition-[color] group-hover:text-amber-600 [text-wrap:balance]">
          {book.title}
        </h3>
        <p className="mt-1 line-clamp-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          {authors}
        </p>
      </div>
    </button>
  )
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
  const [selectedBook, setSelectedBook] = useState<GutendexBook | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  const handleBookClick = (book: GutendexBook) => {
    setSelectedBook(book)
    setModalOpen(true)
  }

  const handleAddToLibrary = () => {
    if (!selectedBook) return
    const mobiUrl = bestMobiUrl(selectedBook)
    const cover = coverUrl(selectedBook)
    enqueue({
      gutenbergId: selectedBook.id,
      title: selectedBook.title,
      authors: authorsString(selectedBook),
      publicationYear: null,
      coverUrl: cover,
      mobiUrl,
    })
    setPaused(false)
    runQueue()
  }

  return (
    <>
      <section className="border-2 border-black bg-background p-8 dark:border-white touch-action-manipulation">
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4 border-b-2 border-black pb-6 dark:border-white">
          <div className="space-y-1.5">
            <h2 className="font-sans text-3xl font-black uppercase tracking-tighter text-foreground [text-wrap:balance]">
              {catalogSearch ? `Results: ${catalogSearch}` : activeCatalog.label}
            </h2>
            {!catalogSearch && activeCatalog.kind !== 'all' ? (
              <p className="max-w-2xl font-mono text-xs uppercase tracking-widest text-muted-foreground leading-relaxed">
                {activeCatalog.description}
              </p>
            ) : (
              <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                {catalogQ.isLoading ? (
                  'Loading…'
                ) : (
                  <span className="tabular-nums">{catalogQ.data?.count ?? 0} Titles Found</span>
                )}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-10 rounded-none border-2 border-black bg-background font-bold uppercase tracking-widest hover:bg-black hover:text-white dark:border-white dark:hover:bg-white dark:hover:text-black"
                >
                  <ArrowUpDown className="h-3.5 w-3.5" />
                  <span>
                    {sortBy === 'relevance'
                      ? 'Best match'
                      : sortBy === 'popular'
                        ? 'Most popular'
                        : sortBy === 'title'
                          ? 'Title A-Z'
                          : 'Author A-Z'}
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverContent
                align="end"
                className="w-48 rounded-none border-2 border-black p-1 dark:border-white"
              >
                {[
                  { id: 'relevance', label: 'Best match', icon: Sparkles },
                  { id: 'popular', label: 'Most popular', icon: Download },
                  { id: 'title', label: 'Title A-Z', icon: BookOpen },
                  { id: 'author', label: 'Author A-Z', icon: FileText },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setSortBy(opt.id as SortOption)}
                    className={`flex w-full items-center gap-2 px-3 py-2.5 font-mono text-[10px] uppercase tracking-widest transition-[color,background-color] ${sortBy === opt.id ? 'bg-black text-white dark:bg-white dark:text-black' : 'hover:bg-muted'}`}
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
                {bulkScan.running ? 'Scanning…' : 'Download All'}
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
            <p className="font-mono text-xs font-bold uppercase tracking-widest text-red-600">
              Failed to load catalog.
            </p>
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
                {sortedCatalogResults
                  .filter((b) => bestMobiUrl(b) !== null) // Only show downloadable books
                  .map((b) => {
                    const already = localGutenbergIds.has(b.id)
                    const queued = queue.some((t) => t.gutenbergId === b.id)

                    return (
                      <CatalogBookCard
                        key={b.id}
                        book={b}
                        isLocal={already}
                        isQueued={queued}
                        onClick={() => handleBookClick(b)}
                      />
                    )
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

      {/* Book Detail Modal */}
      <BookDetailModal
        book={selectedBook}
        open={modalOpen}
        onOpenChange={setModalOpen}
        isLocal={selectedBook ? localGutenbergIds.has(selectedBook.id) : false}
        isQueued={selectedBook ? queue.some((t) => t.gutenbergId === selectedBook.id) : false}
        mobiUrl={selectedBook ? bestMobiUrl(selectedBook) : null}
        onAdd={handleAddToLibrary}
      />
    </>
  )
}
