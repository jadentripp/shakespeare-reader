import { createContext } from 'react'
import type { UseQueryResult } from '@tanstack/react-query'
import type { CatalogEntry } from '@/lib/gutenberg'
import type { SortOption } from '@/lib/gutenbergUtils'
import type { Book, GutendexBook, GutendexResponse } from '@/lib/tauri/types'
import type { BulkScanState, DownloadTask } from './library/useDownloadQueue'

export interface LibraryContextType {
  // From useLibraryCore
  booksQ: UseQueryResult<Book[], Error>
  libraryQuery: string
  setLibraryQuery: (q: string) => void
  progressByBookId: Map<number, number>
  filteredBooks: Book[]
  booksInProgress: Book[]
  deleteBook: (id: number) => Promise<void>

  // From useCatalogSearch
  catalogKey: string
  setCatalogKey: (key: string) => void
  catalogQuery: string
  setCatalogQuery: (q: string) => void
  showAllCategories: boolean
  setShowAllCategories: (show: boolean) => void
  sortBy: SortOption
  setSortBy: (sort: SortOption) => void
  searchFocused: boolean
  setSearchFocused: (focused: boolean) => void
  recentSearches: string[]
  catalogPageUrl: string | null
  setCatalogPageUrl: (url: string | null) => void
  catalogQ: UseQueryResult<GutendexResponse, Error>
  activeCatalog: CatalogEntry
  catalogSearch: string
  canQueryCatalog: boolean
  handleSearch: (query: string) => void
  clearRecentSearches: () => void
  sortedCatalogResults: GutendexBook[]

  // From useDownloadQueue
  queue: DownloadTask[]
  setQueue: React.Dispatch<React.SetStateAction<DownloadTask[]>>
  paused: boolean
  setPaused: (paused: boolean) => void
  bulkScan: BulkScanState
  setBulkScan: React.Dispatch<React.SetStateAction<BulkScanState>>
  counts: { queued: number; downloading: number; done: number; failed: number }
  active: DownloadTask | null
  enqueue: (task: Omit<DownloadTask, 'status' | 'attempts' | 'error'>) => void
  runQueue: () => Promise<void>
  runBulkScan: (
    fromUrl: string | null,
    reset: boolean,
    key: string,
    searchQuery: string | null,
    topic: string | null,
  ) => Promise<void>
  retryFailed: () => void
  clearFailed: () => void
  clearDone: () => void

  // From useLibrary (Combined/Computed)
  localGutenbergIds: Set<number>
  startOrResumeBulk: () => Promise<void>
  resumeAll: () => Promise<void>
  hasQueueActivity: boolean
  canBulkScan: boolean
}

export const LibraryContext = createContext<LibraryContextType | undefined>(undefined)
