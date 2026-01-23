import { invoke } from './core'
import type { Highlight, HighlightMessage } from './types'

export async function listHighlights(bookId: number): Promise<Highlight[]> {
  return (await invoke<Highlight[]>('list_highlights', { bookId })) ?? []
}

export async function createHighlight(params: {
  bookId: number
  startPath: string
  startOffset: number
  endPath: string
  endOffset: number
  text: string
  note?: string | null
}): Promise<Highlight> {
  return await invoke('create_highlight', {
    bookId: params.bookId,
    startPath: params.startPath,
    startOffset: params.startOffset,
    endPath: params.endPath,
    endOffset: params.endOffset,
    text: params.text,
    note: params.note ?? null,
  })
}

export async function updateHighlightNote(params: {
  highlightId: number
  note?: string | null
}): Promise<Highlight> {
  return await invoke('update_highlight_note', {
    highlightId: params.highlightId,
    note: params.note ?? null,
  })
}

export async function deleteHighlight(highlightId: number): Promise<void> {
  await invoke('delete_highlight', { highlightId })
}

export async function listHighlightMessages(highlightId: number): Promise<HighlightMessage[]> {
  return (await invoke<HighlightMessage[]>('list_highlight_messages', { highlightId })) ?? []
}

export async function addHighlightMessage(params: {
  highlightId: number
  role: 'system' | 'user' | 'assistant'
  content: string
}): Promise<HighlightMessage> {
  return await invoke('add_highlight_message', {
    highlightId: params.highlightId,
    role: params.role,
    content: params.content,
  })
}
