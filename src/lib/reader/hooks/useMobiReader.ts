import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useReaderAppearance } from '@/lib/appearance'
import {
  useChat,
  useHighlights,
  useIframeDocument,
  useModels,
  useNavigation,
  usePagination,
  useProgressPersistence,
  useToc,
  useTTS,
} from '@/lib/reader/hooks'
import { computePageGap, computeReaderWidth } from '@/lib/reader/pagination'
import { buildReaderCss } from '@/lib/reader/styles'
import { injectHead, processGutenbergContent, wrapBody } from '@/lib/readerHtml'
import { findTextRange } from '@/lib/readerUtils'
import { getBook, getBookHtml } from '@/lib/tauri'
import { useMobiIframe } from './useMobiIframe'

export function useMobiReader(bookId: number) {
  const [columns, setColumns] = useState<1 | 2>(1)
  const [showAppearance, setShowAppearance] = useState(false)
  const [jumpPage, setJumpPage] = useState('')
  const [highlightLibraryExpanded, setHighlightLibraryExpanded] = useState(false)
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false)
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false)
  const [activeCitation, setActiveCitation] = useState<{
    content: string
    rect: { top: number; left: number; width: number; height: number }
  } | null>(null)
  const [lightboxImage, setLightboxImage] = useState<{ src: string; alt?: string } | null>(null)

  const queryClient = useQueryClient()
  const bookQ = useQuery({ queryKey: ['book', bookId], queryFn: () => getBook(bookId) })
  const htmlQ = useQuery({ queryKey: ['bookHtml', bookId], queryFn: () => getBookHtml(bookId) })

  const restoredRef = useRef(false)
  const pendingRestoreRef = useRef<{ page?: number } | null>(null)

  const { fontFamily, lineHeight, margin, setFontFamily, setLineHeight, setMargin } =
    useReaderAppearance(bookId)

  const {
    iframeRef,
    rootRef,
    containerRef,
    iframeReady,
    setIframeReady,
    getDoc,
    getScrollRoot,
    setDocRef,
    setRootRef,
  } = useIframeDocument()

  const gutenbergId = bookQ.data?.gutenberg_id
  const progressKey = gutenbergId ? `reader-progress-gutenberg-${gutenbergId}` : null

  const pageGap = computePageGap(columns)
  const readerWidth = computeReaderWidth(columns, margin, pageGap)

  const pagination = usePagination({
    columns,
    margin,
    getScrollRoot,
    fallbackWidth: typeof window !== 'undefined' ? window.innerWidth : 1200,
    onPageChange: (page) => {
      progressPersistence.scheduleSaveProgress(page)
      progressPersistence.scheduleSaveThreadProgress()
    },
  })

  const progressPersistence = useProgressPersistence({
    progressKey,
    currentPage: pagination.currentPage,
    currentThreadId: null,
    bookId: bookId,
    getScrollRoot,
    queryClient: queryClient as any,
  })

  const navigation = useNavigation({
    getScrollRoot,
    getDoc,
    getPageMetrics: pagination.getPageMetrics,
    columns,
    margin,
    pageLockRef: pagination.pageLockRef,
    isNavigatingRef: pagination.isNavigatingRef,
    updatePagination: pagination.updatePagination,
  })

  const toc = useToc({
    getDoc,
    getScrollRoot,
    jumpToElement: navigation.jumpToElement,
  })

  const models = useModels()

  const highlightsHook = useHighlights({
    bookId: bookId,
    getDoc,
    getScrollRoot,
  })

  const scrollToQuote = (text: string, index?: number) => {
    const root = getScrollRoot()
    if (!root) return

    const range = findTextRange(root, text, index)
    if (range) {
      const rect = range.getBoundingClientRect()
      const rootRect = root.getBoundingClientRect()
      const offsetLeft = rect.left - rootRect.left + root.scrollLeft
      const metrics = pagination.getPageMetrics()
      const stride = metrics.pageWidth + metrics.gap
      const page = stride ? Math.max(1, Math.floor(offsetLeft / stride) + 1) : 1
      pagination.scrollToPage(page)
    }
  }

  const chatHook = useChat(
    {
      bookId: bookId,
      getDoc,
      getScrollRoot,
      getPageMetrics: pagination.getPageMetrics,
      currentPage: pagination.currentPage,
      totalPages: pagination.totalPages,
      columns,
      selectedHighlight: highlightsHook.selectedHighlight,
      attachedHighlights: highlightsHook.attachedHighlights,
      stagedSnippets: highlightsHook.stagedSnippets,
    },
    navigation,
    scrollToQuote,
    highlightsHook.activeAiQuote,
    highlightsHook.setActiveAiQuote,
    highlightsHook.setActiveAiBlockIndex,
    highlightsHook.setSelectedHighlightId,
  )

  const tts = useTTS({
    getDoc,
    getPageMetrics: () => {
      const metrics = pagination.getPageMetrics()
      const root = getScrollRoot()
      return {
        pageWidth: metrics.pageWidth,
        gap: metrics.gap,
        stride: metrics.pageWidth + metrics.gap,
        scrollLeft: root?.scrollLeft ?? 0,
        rootRect: root?.getBoundingClientRect() ?? new DOMRect(),
      }
    },
    currentPage: pagination.currentPage,
    onPageTurnNeeded: () => {
      if (pagination.currentPage < pagination.totalPages) {
        pagination.next()
      }
    },
  })

  // TTS word highlighting effect
  useEffect(() => {
    const doc = getDoc()
    if (!doc) return

    // Clear any existing TTS highlight
    const clearHighlight = () => {
      const existingHighlight = doc.querySelector('.ttsCurrentWord')
      if (existingHighlight) {
        const parent = existingHighlight.parentNode
        if (parent) {
          while (existingHighlight.firstChild) {
            parent.insertBefore(existingHighlight.firstChild, existingHighlight)
          }
          parent.removeChild(existingHighlight)
          parent.normalize()
        }
      }
    }

    clearHighlight()

    // If we have a current word and TTS is playing, highlight it using the character map
    if (tts.currentWord && tts.state === 'playing' && tts.currentCharMap.length > 0) {
      const { word, startChar, endChar } = tts.currentWord

      // Use the character map to get the exact DOM positions
      const startMapping = tts.currentCharMap[startChar]
      const endMapping = tts.currentCharMap[endChar - 1]

      if (startMapping?.node && endMapping?.node) {
        console.log(`[TTS Highlight] Highlighting word: "${word}" using charMap`)

        try {
          const range = doc.createRange()
          range.setStart(startMapping.node, startMapping.offset)
          range.setEnd(endMapping.node, endMapping.offset + 1)

          const span = doc.createElement('span')
          span.className = 'ttsCurrentWord'

          try {
            range.surroundContents(span)
          } catch (e) {
            // Range may cross element boundaries, use extractContents instead
            const fragment = range.extractContents()
            span.appendChild(fragment)
            range.insertNode(span)
          }
        } catch (e) {
          console.log(`[TTS Highlight] Failed to create range for word: "${word}"`, e)
        }
      } else {
        console.log(`[TTS Highlight] No valid mapping for word: "${word}" at offset ${startChar}`)
      }
    }

    // Cleanup on unmount or when TTS stops
    return () => {
      clearHighlight()
    }
  }, [tts.currentWord, tts.currentWordIndex, tts.state, tts.currentCharMap, pagination.currentPage])

  const { handleIframeLoad } = useMobiIframe({
    iframeRef,
    rootRef,
    containerRef,
    getScrollRoot,
    setDocRef,
    setRootRef,
    setIframeReady,
    pagination,
    toc,
    navigation,
    highlightsHook,
    setActiveCitation,
    setLightboxImage,
  })

  const processedHtml = useMemo(() => {
    if (!htmlQ.data) return ''
    const isTauri =
      typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__ !== undefined
    const baseUrl =
      !isTauri && bookQ.data?.gutenberg_id
        ? `https://www.gutenberg.org/cache/epub/${bookQ.data.gutenberg_id}/`
        : undefined

    console.time(`[Reader] Process HTML bookId=${bookId}`)
    const { html } = processGutenbergContent(htmlQ.data, bookId, baseUrl)
    console.timeEnd(`[Reader] Process HTML bookId=${bookId}`)
    return html
  }, [htmlQ.data, bookQ.data?.gutenberg_id, bookId])

  const srcDoc = useMemo(() => {
    if (!processedHtml) return ''
    const css = buildReaderCss({ columns, margin, pageGap, fontFamily, lineHeight })
    const wrappedBody = wrapBody(processedHtml)
    return injectHead(wrappedBody, css)
  }, [processedHtml, fontFamily, lineHeight, margin, columns, pageGap])

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target && /input|textarea|select|button/i.test(target.tagName)) return
      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        pagination.prev()
      } else if (event.key === 'ArrowRight') {
        event.preventDefault()
        pagination.next()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [pagination.totalPages])

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        window.requestAnimationFrame(() => pagination.lockToPage())
      }
    }
    const handleFocusChange = () => {
      window.requestAnimationFrame(() => pagination.lockToPage())
    }
    window.addEventListener('focus', handleFocusChange)
    window.addEventListener('blur', handleFocusChange)
    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      window.removeEventListener('focus', handleFocusChange)
      window.removeEventListener('blur', handleFocusChange)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [])

  // Restore reading progress from localStorage during rendering when data changes
  const [prevProgressKey, setPrevProgressKey] = useState<string | null>(null)
  const [prevHtmlData, setPrevHtmlData] = useState<string | undefined>(undefined)

  if (progressKey !== prevProgressKey || htmlQ.data !== prevHtmlData) {
    setPrevProgressKey(progressKey)
    setPrevHtmlData(htmlQ.data)
    restoredRef.current = false
    toc.resetHeadingIndex()

    if (!htmlQ.data || !progressKey) {
      pendingRestoreRef.current = null
    } else {
      const raw = localStorage.getItem(progressKey)
      if (!raw) {
        pendingRestoreRef.current = null
      } else {
        try {
          const parsed = JSON.parse(raw) as { page?: number }
          pendingRestoreRef.current = {
            page: typeof parsed.page === 'number' ? parsed.page : undefined,
          }
        } catch {
          pendingRestoreRef.current = null
        }
      }
    }
  }

  useEffect(() => {
    if (restoredRef.current) return
    const pending = pendingRestoreRef.current
    if (!pending) {
      restoredRef.current = true
      return
    }
    if (pending.page) {
      pagination.scrollToPage(pending.page)
      restoredRef.current = true
    }
  }, [pagination.totalPages])

  // Synchronize highlights with the iframe DOM
  useEffect(() => {
    if (!iframeReady) return
    highlightsHook.renderHighlights(
      highlightsHook.selectedHighlightId,
      highlightsHook.activeAiQuote,
      highlightsHook.activeAiBlockIndex,
    )
  }, [
    iframeReady,
    highlightsHook.highlights,
    highlightsHook.activeAiQuote,
    highlightsHook.activeAiBlockIndex,
    highlightsHook.selectedHighlightId,
    highlightsHook.stagedSnippets,
  ])

  const scrollToHighlight = (highlightId: number) => {
    let attempts = 0
    const attempt = () => {
      const doc = iframeRef.current?.contentDocument
      const el = doc?.querySelector(
        `span.readerHighlight[data-highlight-id="${highlightId}"]`,
      ) as HTMLElement | null
      if (el) {
        navigation.jumpToElement(el)
        return
      }
      if (attempts === 0 && iframeReady && highlightsHook.highlights) {
        highlightsHook.renderHighlights(highlightId, highlightsHook.activeAiQuote)
      }
      if (attempts < 4) {
        attempts += 1
        window.requestAnimationFrame(attempt)
      }
    }
    attempt()
  }

  const handleSaveImage = async (src: string) => {
    try {
      const { save } = await import('@tauri-apps/plugin-dialog')
      const { writeFile } = await import('@tauri-apps/plugin-fs')

      const filePath = await save({
        filters: [{ name: 'Image', extensions: ['jpg', 'png', 'gif'] }],
      })

      if (filePath) {
        const response = await fetch(src)
        const arrayBuffer = await response.arrayBuffer()
        await writeFile(filePath, new Uint8Array(arrayBuffer))
      }
    } catch (e) {
      console.error('Failed to save image:', e)
    }
  }

  const toggleColumns = () => {
    const currentPageNum = pagination.currentPage
    setColumns((prev) => {
      const newColumns = prev === 1 ? 2 : 1
      requestAnimationFrame(() => {
        pagination.syncPageMetrics()
        pagination.scrollToPageInstant(currentPageNum)
        pagination.updatePagination()
      })
      return newColumns
    })
  }

  return {
    // State
    columns,
    setColumns,
    toggleColumns,
    showAppearance,
    setShowAppearance,
    jumpPage,
    setJumpPage,
    highlightLibraryExpanded,
    setHighlightLibraryExpanded,
    leftPanelCollapsed,
    setLeftPanelCollapsed,
    rightPanelCollapsed,
    setRightPanelCollapsed,
    activeCitation,
    setActiveCitation,
    lightboxImage,
    setLightboxImage,

    // Queries
    bookQ,
    htmlQ,

    // Appearance
    appearance: {
      fontFamily,
      lineHeight,
      margin,
      setFontFamily,
      setLineHeight,
      setMargin,
    },

    // Iframe / Document
    iframe: {
      iframeRef,
      containerRef,
      iframeReady,
    },

    // Sub-hooks
    pagination,
    navigation,
    toc,
    models,
    highlights: highlightsHook,
    chat: chatHook,
    tts,

    // Derived
    readerWidth,
    srcDoc,

    // Handlers
    handleIframeLoad,
    scrollToHighlight,
    handleSaveImage,
  }
}
