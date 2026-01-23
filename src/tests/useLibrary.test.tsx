import { afterEach, beforeEach, describe, expect, it, mock, spyOn } from 'bun:test'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import type React from 'react'
import { LibraryProvider } from '../hooks/LibraryProvider'
import { useLibrary } from '../hooks/useLibrary'
import * as tauri from '../lib/tauri'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
})

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>
    <LibraryProvider>{children}</LibraryProvider>
  </QueryClientProvider>
)

describe('useLibrary hook', () => {
  const spies: any[] = []

  beforeEach(() => {
    cleanup()
    mock.restore()
    queryClient.clear()
    localStorage.clear()

    spies.push(spyOn(tauri, 'listBooks').mockResolvedValue([]))
    spies.push(
      spyOn(tauri, 'gutendexCatalogPage').mockResolvedValue({ results: [], count: 0 } as any),
    )
    spies.push(spyOn(tauri, 'hardDeleteBook').mockResolvedValue(undefined as any))
    spies.push(spyOn(tauri, 'downloadGutenbergMobi').mockResolvedValue(undefined as any))
    spies.push(spyOn(tauri, 'dbInit').mockResolvedValue(undefined as any))
  })

  afterEach(() => {
    spies.forEach((s) => s.mockRestore())
    spies.length = 0
    cleanup()
  })

  it('should initialize with default values', async () => {
    const { result } = renderHook(() => useLibrary(), { wrapper })

    expect(result.current.libraryQuery).toBe('')
    expect(result.current.catalogQuery).toBe('')
    expect(result.current.sortBy).toBe('relevance')
    expect(result.current.queue).toEqual([])
  })

  it('should handle library search query changes', async () => {
    const { result } = renderHook(() => useLibrary(), { wrapper })

    act(() => {
      result.current.setLibraryQuery('romeo')
    })

    expect(result.current.libraryQuery).toBe('romeo')
  })

  it('should filter books based on library query', async () => {
    const mockBooks = [
      { id: 1, title: 'Romeo and Juliet', authors: 'William Shakespeare', gutenberg_id: 1513 },
      { id: 2, title: 'Pride and Prejudice', authors: 'Jane Austen', gutenberg_id: 1342 },
    ]
    spies[0].mockResolvedValue(mockBooks)

    const { result } = renderHook(() => useLibrary(), { wrapper })

    await waitFor(() => expect(result.current.booksQ.isSuccess).toBe(true))

    expect(result.current.filteredBooks).toHaveLength(2)

    act(() => {
      result.current.setLibraryQuery('Romeo')
    })

    expect(result.current.filteredBooks).toHaveLength(1)
    expect(result.current.filteredBooks[0].title).toBe('Romeo and Juliet')
  })

  it('should handle catalog search and update recent searches', async () => {
    const { result } = renderHook(() => useLibrary(), { wrapper })

    act(() => {
      result.current.handleSearch('Shakespeare')
    })

    expect(result.current.catalogQuery).toBe('Shakespeare')
    const recentSearches = JSON.parse(localStorage.getItem('reader-recent-searches') || '[]')
    expect(recentSearches).toContain('Shakespeare')
  })

  it('should handle book deletion', async () => {
    const { result } = renderHook(() => useLibrary(), { wrapper })

    await act(async () => {
      await result.current.deleteBook(123)
    })

    expect(spies[2]).toHaveBeenCalledWith(123)
  })
})
