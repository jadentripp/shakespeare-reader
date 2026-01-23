import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { hardDeleteBook, listBooks } from '@/lib/tauri'

export function useLibraryCore() {
  const qc = useQueryClient()
  const booksQ = useQuery({ queryKey: ['books'], queryFn: listBooks })
  const [libraryQuery, setLibraryQuery] = useState('')

  const progressByBookId = useMemo(() => {
    const map = new Map<number, number>()
    if (typeof window === 'undefined') return map
    for (const book of booksQ.data ?? []) {
      const raw = window.localStorage.getItem(`reader-progress-gutenberg-${book.gutenberg_id}`)
      if (!raw) continue
      try {
        const parsed = JSON.parse(raw) as { page?: number }
        if (typeof parsed.page === 'number' && parsed.page > 0) {
          map.set(book.id, parsed.page)
        }
      } catch {
        // ignore malformed entries
      }
    }
    return map
  }, [booksQ.data])

  const normalizedLibraryQuery = libraryQuery.trim().toLowerCase()
  const filteredBooks = useMemo(() => {
    if (!normalizedLibraryQuery) return booksQ.data ?? []
    return (booksQ.data ?? []).filter((b) => {
      return (
        b.title.toLowerCase().includes(normalizedLibraryQuery) ||
        b.authors.toLowerCase().includes(normalizedLibraryQuery)
      )
    })
  }, [booksQ.data, normalizedLibraryQuery])

  const booksInProgress = useMemo(() => {
    return (booksQ.data ?? []).filter((b) => progressByBookId.has(b.id))
  }, [booksQ.data, progressByBookId])

  async function deleteBook(id: number) {
    try {
      await hardDeleteBook(id)
      await qc.invalidateQueries({ queryKey: ['books'] })
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      console.error('Delete failed:', msg)
      throw e
    }
  }

  return {
    booksQ,
    libraryQuery,
    setLibraryQuery,
    progressByBookId,
    filteredBooks,
    booksInProgress,
    deleteBook,
  }
}
