import { DESIRED_PAGE_WIDTH, TWO_COLUMN_GAP } from './constants'

export interface PageMetricsResult {
  pageWidth: number
  gap: number
  paddingLeft: number
  paddingRight: number
  scrollWidth: number
}

export const computePageGap = (columns: 1 | 2): number => {
  return columns === 2 ? TWO_COLUMN_GAP : 0
}

export const computeReaderWidth = (columns: 1 | 2, margin: number, gap: number): number => {
  return columns === 2 ? DESIRED_PAGE_WIDTH * 2 + gap + margin * 2 : DESIRED_PAGE_WIDTH + margin * 2
}

export const getStride = (pageWidth: number, gap: number): number => {
  return pageWidth + gap
}

export const computeTotalPages = (
  scrollWidth: number,
  paddingLeft: number,
  paddingRight: number,
  pageWidth: number,
  gap: number,
): number => {
  const usableWidth = Math.max(0, scrollWidth - paddingLeft - paddingRight)
  const stride = pageWidth + gap
  return Math.max(1, Math.ceil((usableWidth + gap) / stride))
}

export const computePageFromScroll = (
  scrollLeft: number,
  stride: number,
  totalPages: number,
): number => {
  const calculatedPage = Math.round(scrollLeft / (stride || 1)) + 1
  return Math.min(totalPages, Math.max(1, calculatedPage))
}

export const computeScrollTarget = (page: number, stride: number): number => {
  return Math.max(0, (page - 1) * stride)
}

export const getPageMetricsFromRoot = (
  root: HTMLElement | null,
  fallbackWidth?: number,
): PageMetricsResult => {
  if (!root) {
    const width = fallbackWidth || window.innerWidth
    return { pageWidth: width, gap: 0, paddingLeft: 0, paddingRight: 0, scrollWidth: 0 }
  }
  const styles = root.ownerDocument?.defaultView?.getComputedStyle(root)
  const paddingLeft = styles ? parseFloat(styles.paddingLeft || '0') : 0
  const paddingRight = styles ? parseFloat(styles.paddingRight || '0') : 0
  const pageWidthVar = styles ? parseFloat(styles.getPropertyValue('--page-content-width')) : NaN
  const gapVar = styles ? parseFloat(styles.getPropertyValue('--page-gap')) : NaN
  const fallbackPageWidth = Math.max(0, root.clientWidth - paddingLeft - paddingRight)
  const pageWidth =
    Number.isFinite(pageWidthVar) && pageWidthVar > 0 ? pageWidthVar : fallbackPageWidth
  const gap = Number.isFinite(gapVar) && gapVar > 0 ? gapVar : 0
  return { pageWidth, gap, paddingLeft, paddingRight, scrollWidth: root.scrollWidth }
}

export const syncPageMetricsToRoot = (root: HTMLElement, columns: 1 | 2, _margin: number): void => {
  const styles = root.ownerDocument?.defaultView?.getComputedStyle(root)
  const paddingLeft = styles ? parseFloat(styles.paddingLeft || '0') : 0
  const paddingRight = styles ? parseFloat(styles.paddingRight || '0') : 0
  const gap = columns === 2 ? TWO_COLUMN_GAP : 0
  const docWidth = root.ownerDocument?.documentElement?.clientWidth || root.clientWidth
  const maxPageWidth = Math.max(
    0,
    (docWidth - paddingLeft - paddingRight - gap * (columns - 1)) / columns,
  )
  const pageWidth = Math.min(DESIRED_PAGE_WIDTH, maxPageWidth)
  const containerWidth = pageWidth * columns + gap * (columns - 1) + paddingLeft + paddingRight
  root.style.width = `${containerWidth}px`
  root.style.setProperty('--page-content-width', `${pageWidth}px`)
  root.style.setProperty('--page-gap', `${gap}px`)
  root.style.setProperty('--column-width', `${pageWidth}px`)
}
