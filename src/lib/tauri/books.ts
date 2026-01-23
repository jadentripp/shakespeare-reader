import { invoke, isTauri } from './core'
import type { Book, BookPosition } from './types'
import { getWebBooks, saveWebBooks } from './webStorage'

export async function dbInit(): Promise<void> {
  await invoke('db_init')
}

export async function listBooks(): Promise<Book[]> {
  if (!isTauri) {
    return getWebBooks()
  }
  return (await invoke<Book[]>('list_books')) ?? []
}

export async function getBook(bookId: number): Promise<Book> {
  if (!isTauri) {
    const books = getWebBooks()
    const b = books.find((x) => x.id === bookId)
    if (!b) throw new Error('Book not found in web library')
    return b
  }
  return await invoke('get_book', { bookId })
}

export async function hardDeleteBook(bookId: number): Promise<void> {
  if (!isTauri) {
    const books = getWebBooks()
    saveWebBooks(books.filter((x) => x.id !== bookId))
    return
  }
  await invoke('hard_delete_book', { bookId })
}

export async function getBookPosition(bookId: number): Promise<BookPosition | null> {
  return await invoke('get_book_position', { bookId })
}

export async function setBookPosition(params: { bookId: number; cfi: string }): Promise<void> {
  await invoke('set_book_position', { bookId: params.bookId, cfi: params.cfi })
}

export async function getBookImageData(bookId: number, relativeIndex: number): Promise<string> {
  if (isTauri) {
    return await invoke('get_book_image_data', { bookId, relativeIndex })
  }
  return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=='
}
