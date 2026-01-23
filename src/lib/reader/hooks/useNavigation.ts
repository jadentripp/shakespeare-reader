import { useCallback } from 'react'
import { getElementRect } from '../dom'
import { getOffsetLeftForRect, resolveElementFromCfi } from '../navigation'
import { type PageMetricsResult, syncPageMetricsToRoot } from '../pagination'

export interface UseNavigationOptions {
  getScrollRoot: () => HTMLElement | null
  getDoc: () => Document | null
  getPageMetrics: () => PageMetricsResult
  columns: 1 | 2
  margin: number
  pageLockRef: React.RefObject<number>
  isNavigatingRef: React.RefObject<boolean>
  updatePagination: () => void
}

export interface JumpResult {
  ok: boolean
  reason?: 'no root' | 'no rect'
  rect?: DOMRect
  page?: number
  offsetLeft?: number
  targetLeft?: number
  pageWidth?: number
  gap?: number
  stride?: number
  scrollWidth?: number
  rootWidth?: number
}

export interface UseNavigationResult {
  jumpToElement: (element: HTMLElement) => JumpResult
  scrollToCfi: (cfi: string) => boolean
}

export function useNavigation(options: UseNavigationOptions): UseNavigationResult {
  const {
    getScrollRoot,
    getDoc,
    getPageMetrics,
    columns,
    margin,
    pageLockRef,
    isNavigatingRef,
    updatePagination,
  } = options

  const jumpToElement = useCallback(
    (element: HTMLElement): JumpResult => {
      const root = getScrollRoot()
      if (!root) {
        return { ok: false, reason: 'no root' }
      }

      syncPageMetricsToRoot(root, columns, margin)
      const rect = getElementRect(element)
      if (!rect) {
        return { ok: false, reason: 'no rect' }
      }

      const offsetLeft = getOffsetLeftForRect(rect, root)
      if (offsetLeft === null) {
        return { ok: false, reason: 'no rect' }
      }

      const metrics = getPageMetrics()
      const stride = metrics.pageWidth + metrics.gap
      const page = stride ? Math.max(1, Math.floor(offsetLeft / stride) + 1) : 1
      const maxLeft = Math.max(0, root.scrollWidth - root.clientWidth)
      const targetLeft = Math.min(maxLeft, Math.max(0, offsetLeft))

      isNavigatingRef.current = true
      const oldSmooth = root.style.scrollBehavior
      root.style.scrollBehavior = 'auto'

      pageLockRef.current = page
      root.scrollLeft = targetLeft

      updatePagination()

      setTimeout(() => {
        root.style.scrollBehavior = oldSmooth
        isNavigatingRef.current = false
      }, 150)

      return {
        ok: true,
        rect,
        page,
        offsetLeft,
        targetLeft,
        pageWidth: metrics.pageWidth,
        gap: metrics.gap,
        stride,
        scrollWidth: root.scrollWidth,
        rootWidth: root.clientWidth,
      }
    },
    [
      getScrollRoot,
      getPageMetrics,
      columns,
      margin,
      pageLockRef,
      isNavigatingRef,
      updatePagination,
    ],
  )

  const scrollToCfi = useCallback(
    (cfi: string): boolean => {
      const doc = getDoc()
      const root = getScrollRoot()
      if (!doc || !root) return false

      const element = resolveElementFromCfi(doc, root, cfi)
      if (element) {
        jumpToElement(element)
        return true
      }

      return false
    },
    [getDoc, getScrollRoot, jumpToElement],
  )

  return {
    jumpToElement,
    scrollToCfi,
  }
}
