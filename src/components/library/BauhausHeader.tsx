import { Loader2, Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { CatalogEntry } from '../../lib/gutenberg'
import type { LibraryViewMode } from '../../hooks/LibraryContext'

const FEATURED_COLLECTIONS = [
  { key: 'collection-popular', label: 'Most Popular' },
  { key: 'collection-shakespeare', label: 'Shakespeare' },
  { key: 'collection-gothic', label: 'Gothic Horror' },
  { key: 'collection-philosophy', label: 'Philosophy' },
  { key: 'collection-greek-tragedy', label: 'Greek Tragedy' },
  { key: 'collection-greek-epic', label: 'Greek Epic' },
]

interface BauhausHeaderProps {
  viewMode: LibraryViewMode
  setViewMode: (mode: LibraryViewMode) => void
  libraryQuery: string
  setLibraryQuery: (q: string) => void
  catalogQuery: string
  setCatalogQuery: (q: string) => void
  handleSearch: (q: string) => void
  catalogQ: { isFetching: boolean }
  activeCatalog: CatalogEntry
  catalogSearch: string
  setCatalogKey: (key: string) => void
  searchInputRef: React.RefObject<HTMLInputElement | null>
}

export function BauhausHeader({
  viewMode,
  setViewMode,
  libraryQuery,
  setLibraryQuery,
  catalogQuery,
  setCatalogQuery,
  handleSearch,
  catalogQ,
  activeCatalog,
  catalogSearch,
  setCatalogKey,
  searchInputRef,
}: BauhausHeaderProps) {
  const isDiscover = viewMode === 'discover'
  const currentQuery = isDiscover ? catalogQuery : libraryQuery
  const setQuery = isDiscover ? setCatalogQuery : setLibraryQuery

  return (
    <header className="relative w-full bg-background pt-12 pb-6">
      <div className="mx-auto max-w-6xl px-6">
        {/* Massive Typographic Header */}
        <div className="mb-12 border-b-8 border-black pb-4 dark:border-white">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <h1 className="select-none font-sans text-[80px] font-black uppercase leading-none tracking-tighter text-foreground md:text-[120px] [text-wrap:balance]">
              LIBRARY
            </h1>

            {/* View Mode Toggle */}
            <div className="flex gap-4 pb-2">
              <button
                type="button"
                onClick={() => setViewMode('local')}
                className={`font-mono text-xs font-bold uppercase tracking-[0.3em] transition-colors ${
                  viewMode === 'local' ? 'text-amber-500' : 'text-stone-400 hover:text-foreground'
                }`}
              >
                MY BOOKS
              </button>
              <div className="h-4 w-[2px] bg-stone-200 dark:bg-stone-800" />
              <button
                type="button"
                onClick={() => setViewMode('discover')}
                className={`font-mono text-xs font-bold uppercase tracking-[0.3em] transition-colors ${
                  viewMode === 'discover' ? 'text-amber-500' : 'text-stone-400 hover:text-foreground'
                }`}
              >
                DISCOVER
              </button>
            </div>
          </div>

          <div className="mt-2 flex items-center justify-between">
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">
              {isDiscover ? 'PROJECT GUTENBERG COLLECTION' : 'LOCAL EBOOK ARCHive'}
            </p>
            {isDiscover && (
              <div className="font-mono text-xs font-bold uppercase tracking-widest text-foreground">
                {activeCatalog.label}
              </div>
            )}
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
          {/* Bauhaus Search Field */}
          <div className="relative flex-1 max-w-xl group">
            <div className="relative">
              <Input
                ref={searchInputRef}
                type="search"
                name="catalog-search"
                aria-label={isDiscover ? 'Search project gutenberg' : 'Search local library'}
                placeholder={isDiscover ? 'SEARCH GUTENBERG…' : 'SEARCH YOUR BOOKS…'}
                value={currentQuery}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && currentQuery.trim()) {
                    if (isDiscover) {
                      handleSearch(currentQuery)
                    }
                    searchInputRef.current?.blur()
                  }
                }}
                className="h-16 rounded-none border-0 border-b-4 border-black bg-transparent px-0 font-sans text-2xl font-bold uppercase tracking-tight placeholder:text-stone-300 focus:border-amber-500 focus:ring-0 dark:border-white dark:placeholder:text-stone-700"
              />
              <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-2">
                {isDiscover && catalogQ.isFetching ? (
                  <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
                ) : (
                  <Search className="h-6 w-6 text-black dark:text-white" />
                )}
                {currentQuery && (
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Clear search"
                    className="h-8 w-8 hover:bg-stone-100 dark:hover:bg-stone-800"
                    onClick={() => setQuery('')}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Horizontal Collections Menu - Only in Discover */}
          {isDiscover && (
            <nav className="flex flex-wrap items-center gap-6 border-l-4 border-amber-500 pl-6">
              {FEATURED_COLLECTIONS.map((fc) => {
                const isActive = activeCatalog.key === fc.key
                return (
                  <button
                    type="button"
                    key={fc.key}
                    onClick={() => setCatalogKey(fc.key)}
                    className={`font-mono text-[10px] font-bold uppercase tracking-[0.2em] transition-[color,text-decoration-color] hover:text-amber-500 ${
                      isActive ? 'text-amber-500 underline underline-offset-8' : 'text-stone-400'
                    }`}
                  >
                    {fc.label}
                  </button>
                )
              })}
            </nav>
          )}
        </div>

        {/* Active Search Badge - Only in Discover */}
        {isDiscover && catalogSearch && (
          <div className="mt-8 flex items-center gap-4 bg-stone-100 p-4 dark:bg-stone-900">
            <div className="font-mono text-[10px] font-bold uppercase tracking-widest text-stone-500">
              Active Search:
            </div>
            <div className="font-sans text-sm font-black uppercase tracking-tight text-foreground">
              "{catalogSearch}"
            </div>
            <button
              type="button"
              onClick={() => setCatalogQuery('')}
              className="ml-auto text-[10px] font-bold uppercase tracking-widest text-red-600 hover:underline"
            >
              Clear
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
