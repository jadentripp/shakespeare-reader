import { afterEach, beforeEach, describe, expect, it, mock, spyOn } from 'bun:test'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import * as matchers from '@testing-library/jest-dom/matchers'
import { cleanup, render, screen } from '@testing-library/react'
import type React from 'react'
import * as useLibraryModule from '../hooks/useLibrary'
import * as tauri from '../lib/tauri'
import LibraryPage from '../routes/LibraryPage'

expect.extend(matchers)

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
})

describe('LibraryPage', () => {
  const spies: any[] = []
  let currentMockValues: any = {}

  beforeEach(() => {
    queryClient.clear()
    cleanup()
    mock.restore()

    currentMockValues = {
      booksQ: { data: [], isLoading: false },
      catalogQ: { isFetching: false, data: { results: [], count: 0 } },
      catalogKey: 'collection-all',
      setCatalogKey: mock(),
      activeCatalog: { kind: 'all', catalogKey: 'collection-all' },
      catalogSearch: null,
      canQueryCatalog: false,
      hasQueueActivity: false,
      filteredBooks: [],
      booksInProgress: [],
      progressByBookId: new Map(),
      counts: { queued: 0, downloading: 0, done: 0, failed: 0 },
      recentSearches: [],
      queue: [],
      setQueue: mock(),
      libraryQuery: '',
      setLibraryQuery: mock(),
      deleteBook: mock(),
      sortedCatalogResults: [],
      showAllCategories: false,
      setShowAllCategories: mock(),
      paused: false,
      setPaused: mock(),
      retryFailed: mock(),
      clearDone: mock(),
      clearFailed: mock(),
      resumeAll: mock(),
      startOrResumeBulk: mock(),
      bulkScan: { running: false },
      canBulkScan: false,
      setCatalogPageUrl: mock(),
      searchFocused: false,
      setSearchFocused: mock(),
      handleSearch: mock(),
      clearRecentSearches: mock(),
      enqueue: mock(),
      active: null,
      catalogQuery: '',
      setCatalogQuery: mock(),
      sortBy: 'relevance',
      setSortBy: mock(),
    }

    spies.push(spyOn(useLibraryModule, 'useLibrary').mockImplementation(() => currentMockValues))
  })

  afterEach(() => {
    spies.forEach((s) => s.mockRestore())
    spies.length = 0
    cleanup()
  })

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )

  it('should display the Bauhaus LIBRARY header', async () => {
    render(<LibraryPage />, { wrapper })
    expect(screen.getByText('LIBRARY')).toBeInTheDocument()
  })

  it('should display book title', async () => {
    const mockBook = { id: 1, title: 'Test Book', authors: 'Test Author', gutenberg_id: 12345 }
    currentMockValues.filteredBooks = [mockBook]
    currentMockValues.booksQ = { data: [mockBook], isLoading: false }

    render(<LibraryPage />, { wrapper })

    expect(screen.getByText('Test Book')).toBeInTheDocument()
  })

  it('should display empty state when no books are found', async () => {
    render(<LibraryPage />, { wrapper })
    expect(screen.getByText('Your library is empty')).toBeInTheDocument()
  })
})
