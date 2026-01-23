import { useEffect, useRef } from 'react'
import { DEBOUNCE_SELECTION } from '@/lib/reader/constants'
import { findHighlightFromEvent, getEventTargetElement } from '@/lib/reader/dom'
import { createLinkClickHandler } from '@/lib/reader/links'
import { getNodePath } from '@/lib/readerUtils'
import { getBookImageData } from '@/lib/tauri'

export function useMobiIframe(params: {
  iframeRef: React.RefObject<HTMLIFrameElement | null>
  rootRef: React.RefObject<HTMLElement | null>
  containerRef: React.RefObject<HTMLElement | null>
  getScrollRoot: () => HTMLElement | null
  setDocRef: (doc: Document) => void
  setRootRef: (root: HTMLElement) => void
  setIframeReady: (ready: boolean) => void
  pagination: any
  toc: any
  navigation: any
  highlightsHook: any
  setActiveCitation: (citation: any) => void
  setLightboxImage: (image: any) => void
}) {
  const {
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
  } = params

  const resizeObserverRef = useRef<ResizeObserver | null>(null)
  const selectionTimeoutRef = useRef<number | null>(null)
  const rafRef = useRef<number | null>(null)
  const overlayRafRef = useRef<number | null>(null)
  const scrollHandlerRef = useRef<((event: Event) => void) | null>(null)
  const wheelHandlerRef = useRef<((event: WheelEvent) => void) | null>(null)
  const selectionHandlerRef = useRef<(() => void) | null>(null)
  const selectionChangeHandlerRef = useRef<(() => void) | null>(null)
  const highlightClickRef = useRef<((event: Event) => void) | null>(null)
  const linkClickRef = useRef<((event: MouseEvent) => void) | null>(null)
  const selectionOverlayRef = useRef<HTMLDivElement | null>(null)

  const stripGutenbergBoilerplate = (doc: Document) => {
    const header = doc.getElementById('pg-header')
    if (header) header.remove()
    const footer = doc.getElementById('pg-footer')
    if (footer) footer.remove()
  }

  const handleIframeLoad = () => {
    const doc = iframeRef.current?.contentDocument
    const root = getScrollRoot()
    if (!doc || !root) return

    setDocRef(doc)
    setRootRef(root)

    stripGutenbergBoilerplate(doc)
    pagination.syncPageMetrics()

    const resolveMobiImages = async () => {
      const imgs = doc.querySelectorAll('img.mobi-inline-image')
      for (const img of Array.from(imgs)) {
        const bId = img.getAttribute('data-book-id')
        const relativeIndex = img.getAttribute('data-kindle-index')
        if (bId && relativeIndex) {
          try {
            const dataUrl = await getBookImageData(parseInt(bId), parseInt(relativeIndex))
              ; (img as HTMLImageElement).src = dataUrl
          } catch (e) {
            console.error('Failed to resolve image:', e)
          }
        }
      }
    }
    resolveMobiImages()

    toc.buildToc()

    const handleScroll = () => {
      if (pagination.isNavigatingRef.current) return
      pagination.schedulePaginationUpdate()
      pagination.scheduleLock()
    }
    scrollHandlerRef.current = handleScroll
    root.addEventListener('scroll', handleScroll, { passive: true })

    const handleWheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaX) > 0 || event.shiftKey) {
        event.preventDefault()
      }
    }
    wheelHandlerRef.current = handleWheel
    root.addEventListener('wheel', handleWheel, { passive: false })

    resizeObserverRef.current?.disconnect()
    resizeObserverRef.current = new ResizeObserver(() => pagination.scheduleLayoutRebuild())
    resizeObserverRef.current.observe(root)

    // Create selection overlay container in iframe
    if (!selectionOverlayRef.current) {
      const overlay = doc.createElement('div')
      overlay.id = 'selection-overlay'
      overlay.style.cssText = 'position:fixed;top:0;left:0;pointer-events:none;z-index:9998;'
      doc.body.appendChild(overlay)
      selectionOverlayRef.current = overlay
    }

    const updateSelectionOverlay = (clientRects: DOMRectList | null) => {
      const overlay = selectionOverlayRef.current
      if (!overlay) return

      // Clear previous overlay
      overlay.textContent = ''
      if (!clientRects || clientRects.length === 0) return

      // Get content bounds once (batch read before writes)
      const rootBounds = root.getBoundingClientRect()
      const minX = rootBounds.left
      const maxX = rootBounds.right
      const viewportHeight = doc.defaultView?.innerHeight ?? 800

      // Filter and merge rects in a single pass
      type MergedRect = { top: number; left: number; right: number; bottom: number }
      const mergedRects: MergedRect[] = []

      for (let i = 0; i < clientRects.length; i++) {
        const rect = clientRects[i]
        // Filter: skip tiny rects and rects outside content area or viewport
        if (rect.width < 4 || rect.height < 4) continue
        if (rect.right < minX || rect.left > maxX) continue
        if (rect.bottom < 0 || rect.top > viewportHeight) continue

        // Clamp to content bounds to remove margin overflow
        const clampedLeft = Math.max(rect.left, minX)
        const clampedRight = Math.min(rect.right, maxX)
        if (clampedRight - clampedLeft < 4) continue

        // Try to merge with last rect if on same line (within 2px tolerance)
        const last = mergedRects[mergedRects.length - 1]
        if (last && Math.abs(last.top - rect.top) < 2 && Math.abs(last.bottom - rect.bottom) < 2) {
          last.left = Math.min(last.left, clampedLeft)
          last.right = Math.max(last.right, clampedRight)
        } else {
          mergedRects.push({
            top: rect.top,
            left: clampedLeft,
            right: clampedRight,
            bottom: rect.bottom,
          })
        }
      }

      // Batch DOM writes using DocumentFragment
      const fragment = doc.createDocumentFragment()
      for (const r of mergedRects) {
        const div = doc.createElement('div')
        div.style.cssText = `position:fixed;top:${r.top}px;left:${r.left}px;width:${r.right - r.left}px;height:${r.bottom - r.top}px;background:rgba(224,46,46,0.25);pointer-events:none;`
        fragment.appendChild(div)
      }
      overlay.appendChild(fragment)
    }

    // Live overlay update during drag via selectionchange (pure DOM, no React state)
    const handleSelectionChange = () => {
      if (overlayRafRef.current !== null) return // throttle to 1 per frame
      overlayRafRef.current = requestAnimationFrame(() => {
        overlayRafRef.current = null
        const selection = doc.getSelection()
        if (!selection || selection.rangeCount === 0) {
          updateSelectionOverlay(null)
          return
        }
        const range = selection.getRangeAt(0)
        if (range.collapsed) {
          updateSelectionOverlay(null)
          return
        }
        const rootNode = rootRef.current ?? root
        if (!rootNode.contains(range.startContainer) || !rootNode.contains(range.endContainer)) {
          updateSelectionOverlay(null)
          return
        }
        updateSelectionOverlay(range.getClientRects())
      })
    }
    selectionChangeHandlerRef.current = handleSelectionChange
    doc.addEventListener('selectionchange', handleSelectionChange)

    // React state update on mouseup/keyup only (for floating menu)
    const handleSelection = () => {
      if (selectionTimeoutRef.current !== null) {
        window.clearTimeout(selectionTimeoutRef.current)
      }
      selectionTimeoutRef.current = window.setTimeout(() => {
        selectionTimeoutRef.current = null
        const selection = doc.getSelection()

        if (!selection || selection.rangeCount === 0) {
          highlightsHook.setPendingHighlight(null)
          return
        }

        doc.defaultView?.focus()

        const range = selection.getRangeAt(0)
        if (range.collapsed) {
          highlightsHook.setPendingHighlight(null)
          return
        }
        const rootNode = rootRef.current ?? root
        if (!rootNode.contains(range.startContainer) || !rootNode.contains(range.endContainer)) {
          highlightsHook.setPendingHighlight(null)
          return
        }

        const startPath = getNodePath(rootNode, range.startContainer)
        const endPath = getNodePath(rootNode, range.endContainer)
        const text = range.toString().trim()

        if (!startPath || !endPath || !text) {
          highlightsHook.setPendingHighlight(null)
          return
        }

        const rangeRect = range.getBoundingClientRect()
        const iRect = iframeRef.current?.getBoundingClientRect()
        const cRect = containerRef.current?.getBoundingClientRect()

        if (!iRect || !cRect) {
          highlightsHook.setPendingHighlight(null)
          return
        }

        highlightsHook.setPendingHighlight({
          startPath,
          startOffset: range.startOffset,
          endPath,
          endOffset: range.endOffset,
          text,
          rect: {
            top: iRect.top + rangeRect.top - cRect.top,
            left: iRect.left + rangeRect.left - cRect.left,
            width: rangeRect.width,
            height: rangeRect.height,
          },
          viewportRect: {
            top: iRect.top + rangeRect.top,
            left: iRect.left + rangeRect.left,
            width: rangeRect.width,
            height: rangeRect.height,
          },
        })
      }, DEBOUNCE_SELECTION)
    }
    selectionHandlerRef.current = handleSelection
    doc.addEventListener('mouseup', handleSelection)
    doc.addEventListener('keyup', handleSelection)

    const handleHighlightClick = (event: Event) => {
      const target = getEventTargetElement(event.target)
      if (target && target.tagName === 'IMG') {
        setLightboxImage({
          src: (target as HTMLImageElement).src,
          alt: (target as HTMLImageElement).alt,
        })
        return
      }
      const highlightEl = findHighlightFromEvent(event)
      const highlightId = highlightEl?.dataset?.highlightId
      if (highlightId) {
        highlightsHook.setSelectedHighlightId(Number(highlightId))
      } else {
        // Clear selection if clicking elsewhere
        highlightsHook.setSelectedHighlightId(null)
        highlightsHook.setActiveAiQuote(null)
        highlightsHook.setActiveAiBlockIndex(null)
      }
    }
    highlightClickRef.current = handleHighlightClick
    root.addEventListener('click', handleHighlightClick)

    const handleLinkClick = createLinkClickHandler({
      iframeRef,
      containerRef,
      navigation,
      toc,
      onFootnote: (result) => setActiveCitation(result),
    })
    linkClickRef.current = handleLinkClick
    doc.addEventListener('click', handleLinkClick, true)

    const handleBlur = () => {
      console.log('[useMobiIframe] Iframe window BLUR event')
    }
    const handleFocus = () => {
      console.log('[useMobiIframe] Iframe window FOCUS event')
    }
    const win = doc.defaultView
    if (win) {
      win.addEventListener('blur', handleBlur)
      win.addEventListener('focus', handleFocus)
    }

    pagination.scheduleLayoutRebuild()
    setIframeReady(true)
  }

  useEffect(() => {
    return () => {


      if (selectionTimeoutRef.current !== null) {
        window.clearTimeout(selectionTimeoutRef.current)
        selectionTimeoutRef.current = null
      }
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
      if (overlayRafRef.current !== null) {
        cancelAnimationFrame(overlayRafRef.current)
        overlayRafRef.current = null
      }
      resizeObserverRef.current?.disconnect()
      resizeObserverRef.current = null

      const root = getScrollRoot()
      const doc = iframeRef.current?.contentDocument

      if (root && scrollHandlerRef.current) {
        root.removeEventListener('scroll', scrollHandlerRef.current)
      }
      if (root && wheelHandlerRef.current) {
        root.removeEventListener('wheel', wheelHandlerRef.current)
      }
      if (doc && selectionHandlerRef.current) {
        doc.removeEventListener('mouseup', selectionHandlerRef.current)
        doc.removeEventListener('keyup', selectionHandlerRef.current)
      }
      if (doc && selectionChangeHandlerRef.current) {
        doc.removeEventListener('selectionchange', selectionChangeHandlerRef.current)
      }
      if (doc && linkClickRef.current) {
        doc.removeEventListener('click', linkClickRef.current, true)
      }
      if (root && highlightClickRef.current) {
        root.removeEventListener('click', highlightClickRef.current)
      }
    }
  }, [])

  return {
    handleIframeLoad,
  }
}
