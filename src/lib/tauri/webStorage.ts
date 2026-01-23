import type { Book } from './types'

const WEB_BOOKS_KEY = 'reader-web-books'

export function getWebBooks(): Book[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(WEB_BOOKS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function saveWebBooks(books: Book[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem(WEB_BOOKS_KEY, JSON.stringify(books))
}
