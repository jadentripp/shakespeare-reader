import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useMemo, useState } from 'react'
import type { PendingHighlight, StagedSnippet } from '@/lib/readerTypes'
import {
  applyHighlightToRange,
  clearExistingHighlights,
  findTextRange,
  resolveNodePath,
} from '@/lib/readerUtils'
import { createHighlight, deleteHighlight, listHighlights, updateHighlightNote } from '@/lib/tauri'

export interface UseHighlightsOptions {
  bookId: number
  getDoc: () => Document | null
  getScrollRoot: () => HTMLElement | null
}

export interface UseHighlightsResult {
  highlights: any[] | undefined
  isLoading: boolean
  selectedHighlightId: number | null
  setSelectedHighlightId: (id: number | null) => void
  selectedHighlight: any | null
  pendingHighlight: PendingHighlight | null
  setPendingHighlight: (h: PendingHighlight | null) => void
  noteDraft: string
  setNoteDraft: (note: string) => void
  attachedHighlightIds: number[]
  attachedHighlights: any[]
  toggleAttachment: (id: number) => void
  activeAiQuote: string | null
  setActiveAiQuote: (q: string | null) => void
  activeAiBlockIndex: number | null
  setActiveAiBlockIndex: (i: number | null) => void
  stagedSnippets: StagedSnippet[]
  addSnippetToContext: () => void
  removeSnippetFromContext: (id: string) => void
  clearStagedSnippets: () => void
  handleCreate: () => Promise<void>
  handleSaveNote: () => Promise<void>
  handleAddToChat: () => Promise<void>
  handleDelete: (id: number) => Promise<void>
  renderHighlights: (
    activeId?: number | null,
    activeQuote?: string | null,
    activeBlockIndex?: number | null,
  ) => void
}

export function useHighlights(options: UseHighlightsOptions): UseHighlightsResult {
  const { bookId, getDoc, getScrollRoot } = options
  const queryClient = useQueryClient()

  const highlightsQ = useQuery({
    queryKey: ['bookHighlights', bookId],
    queryFn: () => listHighlights(bookId),
  })

  const [selectedHighlightId, setSelectedHighlightId] = useState<number | null>(null)
  const [pendingHighlight, setPendingHighlight] = useState<PendingHighlight | null>(null)
  const [noteDraft, setNoteDraft] = useState('')
  const [attachedHighlightIds, setAttachedHighlightIds] = useState<number[]>([])
  const [activeAiQuote, setActiveAiQuote] = useState<string | null>(null)
  const [activeAiBlockIndex, setActiveAiBlockIndex] = useState<number | null>(null)
  const [stagedSnippets, setStagedSnippets] = useState<StagedSnippet[]>([])

  const selectedHighlight = useMemo(() => {
    return (
      (highlightsQ.data as any[] | undefined)?.find((h: any) => h.id === selectedHighlightId) ??
      null
    )
  }, [highlightsQ.data, selectedHighlightId])

  // Sync noteDraft when selection changes during rendering
  const [prevSelectedHighlightIdForDraft, setPrevSelectedHighlightIdForDraft] =
    useState(selectedHighlightId)
  if (selectedHighlightId !== prevSelectedHighlightIdForDraft) {
    setPrevSelectedHighlightIdForDraft(selectedHighlightId)
    setNoteDraft(selectedHighlight?.note ?? '')
  }

  const attachedHighlights = useMemo(() => {
    return (
      (highlightsQ.data as any[] | undefined)?.filter((h: any) =>
        attachedHighlightIds.includes(h.id),
      ) ?? []
    )
  }, [highlightsQ.data, attachedHighlightIds])

  const toggleAttachment = useCallback((highlightId: number) => {
    setAttachedHighlightIds((prev) =>
      prev.includes(highlightId) ? prev.filter((id) => id !== highlightId) : [...prev, highlightId],
    )
  }, [])

  const addSnippetToContext = useCallback(() => {
    if (!pendingHighlight) return
    const snippet: StagedSnippet = {
      ...pendingHighlight,
      id: crypto.randomUUID(),
    }
    setStagedSnippets((prev) => [...prev, snippet])
    setPendingHighlight(null)
  }, [pendingHighlight])

  const removeSnippetFromContext = useCallback((id: string) => {
    setStagedSnippets((prev) => prev.filter((s) => s.id !== id))
  }, [])

  const clearStagedSnippets = useCallback(() => {
    setStagedSnippets([])
  }, [])

  const handleCreate = useCallback(async () => {
    if (!pendingHighlight) return
    const highlight = await createHighlight({
      bookId,
      startPath: JSON.stringify(pendingHighlight.startPath),
      startOffset: pendingHighlight.startOffset,
      endPath: JSON.stringify(pendingHighlight.endPath),
      endOffset: pendingHighlight.endOffset,
      text: pendingHighlight.text,
      note: '',
    })
    setPendingHighlight(null)
    await queryClient.invalidateQueries({ queryKey: ['bookHighlights', bookId] })
    setSelectedHighlightId(highlight.id)
  }, [pendingHighlight, bookId, queryClient])

  const handleSaveNote = useCallback(async () => {
    if (!selectedHighlight) return
    await updateHighlightNote({
      highlightId: selectedHighlight.id,
      note: noteDraft.trim() ? noteDraft.trim() : null,
    })
    await queryClient.invalidateQueries({ queryKey: ['bookHighlights', bookId] })
  }, [selectedHighlight, noteDraft, bookId, queryClient])

  const handleAddToChat = useCallback(async () => {
    addSnippetToContext()
  }, [addSnippetToContext])

  const handleDelete = useCallback(
    async (highlightId: number) => {
      await deleteHighlight(highlightId)
      if (selectedHighlightId === highlightId) {
        setSelectedHighlightId(null)
        setNoteDraft('')
      }
      await queryClient.invalidateQueries({ queryKey: ['bookHighlights', bookId] })
    },
    [selectedHighlightId, bookId, queryClient],
  )

  const renderHighlights = useCallback(
    (activeId?: number | null, activeQuote?: string | null, activeBlockIndex?: number | null) => {
      const doc = getDoc()
      const root = getScrollRoot()

      console.log('[useHighlights] renderHighlights called', {
        hasDoc: !!doc,
        hasRoot: !!root,
        activeId,
        stagedSnippetsCount: stagedSnippets.length
      })

      if (!doc || !root) return

      console.log('[useHighlights] clearing existing highlights')
      clearExistingHighlights(doc)

      const highlights = highlightsQ.data ?? []
      for (const highlight of highlights as any[]) {
        try {
          const startPath = JSON.parse(highlight.start_path)
          const endPath = JSON.parse(highlight.end_path)
          const startNode = resolveNodePath(root, startPath)
          const endNode = resolveNodePath(root, endPath)
          if (!startNode || !endNode) continue
          const range = doc.createRange()
          range.setStart(startNode, highlight.start_offset)
          range.setEnd(endNode, highlight.end_offset)
          applyHighlightToRange(
            range,
            highlight.id,
            'readerHighlight',
            highlight.start_offset,
            highlight.end_offset,
            startNode,
            endNode,
            root,
          )
          if (activeId === highlight.id) {
            const activeEls = doc.querySelectorAll(
              `span.readerHighlight[data-highlight-id="${highlight.id}"]`,
            )
            activeEls.forEach((el: any) => {
              ; (el as HTMLElement).classList.add('readerHighlightActive')
            })
          }
        } catch (e) {
          console.error('Failed to render highlight', e)
        }
      }

      // Render staged context snippets
      for (const snippet of stagedSnippets) {
        try {
          const startNode = resolveNodePath(root, snippet.startPath)
          const endNode = resolveNodePath(root, snippet.endPath)
          if (!startNode || !endNode) continue
          const range = doc.createRange()
          range.setStart(startNode, snippet.startOffset)
          range.setEnd(endNode, snippet.endOffset)
          applyHighlightToRange(
            range,
            snippet.id,
            'readerContextSnippet',
            snippet.startOffset,
            snippet.endOffset,
            startNode,
            endNode,
            root,
          )
        } catch (e) {
          console.error('Failed to render staged snippet', e)
        }
      }

      if (activeId && (activeAiQuote || activeAiBlockIndex)) {
        setActiveAiQuote(null)
        setActiveAiBlockIndex(null)
      }

      if (activeQuote) {
        const range = findTextRange(root, activeQuote, activeBlockIndex ?? undefined)
        if (range) {
          applyHighlightToRange(range, -999)
          const activeEls = doc.querySelectorAll(`span.readerHighlight[data-highlight-id="-999"]`)
          activeEls.forEach((el: any) => {
            ; (el as HTMLElement).classList.add('readerHighlightActive')
          })
        }
      }
    },
    [getDoc, getScrollRoot, highlightsQ.data, stagedSnippets, activeAiQuote, activeAiBlockIndex],
  )

  return {
    highlights: highlightsQ.data as any[] | undefined,
    isLoading: highlightsQ.isLoading,
    selectedHighlightId,
    setSelectedHighlightId,
    selectedHighlight,
    pendingHighlight,
    setPendingHighlight,
    noteDraft,
    setNoteDraft,
    attachedHighlightIds,
    attachedHighlights,
    toggleAttachment,
    activeAiQuote,
    setActiveAiQuote,
    activeAiBlockIndex,
    setActiveAiBlockIndex,
    stagedSnippets,
    addSnippetToContext,
    removeSnippetFromContext,
    clearStagedSnippets,
    handleCreate,
    handleSaveNote,
    handleAddToChat,
    handleDelete,
    renderHighlights,
  }
}
