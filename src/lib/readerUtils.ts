/**
 * Pure utility functions for the reader component.
 * These have no React dependencies and can be tested in isolation.
 */

// ============================================================================
// Types
// ============================================================================

export interface CharacterMapping {
  node: Text
  offset: number
}

export interface PageContentResult {
  text: string
  blocks: Array<{ text: string; blockIndex: number; pageNumber: number }>
  charMap: CharacterMapping[]
}

export interface PageMetrics {
  pageWidth: number
  gap: number
  stride: number
  scrollLeft: number
  rootRect: DOMRect
}

// ============================================================================
// Text Normalization
// ============================================================================

/**
 * Normalize text for link matching - removes special chars, lowercases.
 */
export function normalizeLinkText(text: string): string {
  return text
    .toLowerCase()
    .replace(/&nbsp;/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Ultra-fuzzy normalization: Keep only alphanumeric characters.
 */
export function ultraNormalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '')
}

// ============================================================================
// DOM Path Utilities
// ============================================================================

// ============================================================================
// DOM Path Utilities
// ============================================================================

function isTextOrHighlight(node: Node): boolean {
  if (node.nodeType === Node.TEXT_NODE) return true
  if (node.nodeType === Node.ELEMENT_NODE) {
    const el = node as HTMLElement
    return (
      el.classList.contains('readerHighlight') ||
      el.classList.contains('readerContextSnippet') ||
      el.classList.contains('readerPendingHighlight')
    )
  }
  return false
}

function getNodeTextLength(node: Node): number {
  if (node.nodeType === Node.TEXT_NODE) return (node.nodeValue || '').length
  if (node.nodeType === Node.ELEMENT_NODE) return (node.textContent || '').length
  return 0
}

/**
 * Calculates the path and offset as they would be in a "normalized" DOM
 * (where all highlight spans are unwrapped and adjacent text nodes are merged).
 */
export function getCanonicalTextPosition(
  root: Node,
  node: Node,
  offset: number,
): { path: number[]; offset: number } | null {
  // 1. Find the effective parent (skip highlight spans)
  let targetNode = node
  let targetOffset = offset

  // If inside a highlight span, treat the span as the node
  if (
    node.parentNode &&
    node.parentNode.nodeType === Node.ELEMENT_NODE &&
    isTextOrHighlight(node.parentNode)
  ) {
    targetNode = node.parentNode
    // If the span contains a text node (which it should), the offset provided 
    // is usually relative to that text node. 
    // If the input `node` was the text node, we don't need to adjust offset 
    // *relative to the text node*, but we need to account for previous siblings within the span?
    // Usually applyHighlightToRange creates <span>text</span>. So offset is correct.
  }

  const parent = targetNode.parentNode
  if (!parent) return null

  // 2. Iterate siblings to simulate normalization
  let cleanIndex = 0
  let inRun = false
  let currentRunOffset = 0
  let found = false
  let finalPathIndex = -1
  let finalOffset = -1

  for (let i = 0; i < parent.childNodes.length; i++) {
    const child = parent.childNodes[i]
    const isTextish = isTextOrHighlight(child)

    if (isTextish) {
      if (!inRun) {
        // Start of a new text run (which will be 1 node in clean DOM)
        // cleanIndex is pointing to this new node
      }
      inRun = true

      if (child === targetNode) {
        finalPathIndex = cleanIndex
        finalOffset = currentRunOffset + targetOffset
        found = true
        break
      }

      currentRunOffset += getNodeTextLength(child)
    } else {
      if (inRun) {
        cleanIndex++ // The previous run ended, taking up 1 slot
      }
      inRun = false
      currentRunOffset = 0 // Reset for next run

      if (child === targetNode) {
        // Should not happen if target is text/highlight, but for safety
        finalPathIndex = cleanIndex
        finalOffset = targetOffset
        found = true
        break
      }
      cleanIndex++ // This non-text node takes up 1 slot
    }
  }

  // If we were in a run and matched, finalPathIndex is already set correctly (to the start of the run)

  if (!found) return null

  // 3. Get path to parent
  const parentPath = getNodePath(root, parent)
  if (!parentPath) return null

  return {
    path: [...parentPath, finalPathIndex],
    offset: finalOffset
  }
}

/**
 * Get the path from root to a node as an array of child indices.
 */
export function getNodePath(root: Node, node: Node): number[] | null {
  const path: number[] = []
  let current: Node | null = node
  while (current && current !== root) {
    const parentNode: Node | null = current.parentNode
    if (!parentNode) return null
    const index = Array.prototype.indexOf.call(parentNode.childNodes, current)
    if (index < 0) return null
    path.unshift(index)
    current = parentNode
  }
  if (current !== root) return null
  return path
}

/**
 * Resolve a node path back to a node.
 */
export function resolveNodePath(root: Node, path: number[]): Node | null {
  let current: Node | null = root
  for (const index of path) {
    if (!current || !current.childNodes[index]) return null
    current = current.childNodes[index]
  }
  return current
}

// ============================================================================
// Text Range Finding
// ============================================================================

/**
 * Find a text range in the DOM that matches the target text.
 */
export function findTextRange(
  root: HTMLElement,
  targetText: string,
  blockIndex?: number,
): Range | null {
  const doc = root.ownerDocument
  let searchRoot: HTMLElement = root

  if (blockIndex !== undefined) {
    const block = root.querySelector(`[data-block-index="${blockIndex}"]`)
    if (block instanceof HTMLElement) {
      searchRoot = block
    }
  }

  // Handle snippets with ellipses by splitting them into parts
  const snippetParts = targetText
    .split(/\.\.\./)
    .map((p) => p.trim())
    .filter((p) => p.length > 0)
  if (snippetParts.length > 1) {
    // Find the range of the longest part as a reliable anchor
    const longestPart = snippetParts.reduce((a, b) => (a.length > b.length ? a : b))
    return findTextRange(root, longestPart, blockIndex)
  }

  // PERFORMANCE OPTIMIZATION: If searchRoot is too large, use textContent first to narrow down
  if (
    blockIndex === undefined &&
    searchRoot.textContent &&
    searchRoot.textContent.length > 100000
  ) {
    console.log(
      `[findTextRange] Large document detected (${searchRoot.textContent.length} chars). Searching with block strategy...`,
    )
    // Try to find the block first by scanning block textContents (much faster than TreeWalker)
    const blocks = Array.from(searchRoot.querySelectorAll('[data-block-index]')) as HTMLElement[]
    const normalizedTarget = ultraNormalize(targetText)

    for (const block of blocks) {
      const blockContent = ultraNormalize(block.textContent || '')
      if (blockContent.includes(normalizedTarget)) {
        return findTextRange(block, targetText)
      }
    }
  }

  const walker = doc.createTreeWalker(searchRoot, NodeFilter.SHOW_TEXT)
  const fullTextParts: string[] = []
  const charMap: Array<{ node: Text; offset: number }> = []

  while (walker.nextNode()) {
    const node = walker.currentNode as Text
    const nodeText = node.nodeValue || ''
    for (let i = 0; i < nodeText.length; i++) {
      fullTextParts.push(nodeText[i])
      charMap.push({ node, offset: i })
    }
  }

  const fullText = fullTextParts.join('')
  const normalizedTarget = ultraNormalize(targetText)

  if (!normalizedTarget) return null

  let searchableStream = ''
  const searchableToFullMap: number[] = []

  for (let i = 0; i < fullText.length; i++) {
    const char = fullText[i].toLowerCase()
    if (/[a-z0-9]/.test(char)) {
      searchableStream += char
      searchableToFullMap.push(i)
    }
  }

  const matchIndex = searchableStream.indexOf(normalizedTarget)

  if (matchIndex === -1) {
    if (searchRoot !== root) {
      return findTextRange(root, targetText)
    }
    return null
  }

  const startFullIndex = searchableToFullMap[matchIndex]
  const endFullIndex = searchableToFullMap[matchIndex + normalizedTarget.length - 1] + 1

  const startInfo = charMap[startFullIndex]
  const endInfo = charMap[endFullIndex - 1]

  if (startInfo && endInfo) {
    const range = doc.createRange()
    range.setStart(startInfo.node, startInfo.offset)
    range.setEnd(endInfo.node, endInfo.offset + 1)
    return range
  }

  return null
}

// ============================================================================
// Content Cleaning
// ============================================================================

/**
 * Clean footnote content by removing return links and citation prefixes.
 */
export function cleanFootnoteContent(html: string): string {
  if (typeof document === 'undefined') return html
  const div = document.createElement('div')
  div.innerHTML = html

  const links = div.querySelectorAll('a')
  links.forEach((a) => {
    const text = a.textContent?.trim().toLowerCase() || ''
    if (
      text.includes('back') ||
      text.includes('return') ||
      text === '↩' ||
      text === '↑' ||
      text === 'top' ||
      text.includes('jump up') ||
      /^\[?\d+\]?$/.test(text)
    ) {
      a.remove()
    }
  })

  const firstChild = div.firstChild
  if (firstChild && firstChild.nodeType === 3) {
    firstChild.nodeValue = firstChild.nodeValue?.replace(/^\[\d+\]\s*/, '') || ''
  }

  return div.innerHTML.trim()
}

// ============================================================================
// Page Content Extraction
// ============================================================================

/**
 * Extracts the text content for a specific page number.
 */
export function getPageContent(
  doc: Document,
  pageNumber: number,
  metrics: PageMetrics,
): PageContentResult {
  const { pageWidth, stride, scrollLeft, rootRect } = metrics
  const blocks = Array.from(doc.querySelectorAll('[data-block-index]')) as HTMLElement[]
  const result: PageContentResult = { text: '', blocks: [], charMap: [] }
  const textParts: string[] = []
  const globalCharMap: CharacterMapping[] = []

  const pageStartX = (pageNumber - 1) * stride
  const pageEndX = pageStartX + pageWidth

  blocks.forEach((block) => {
    const blockRects = block.getClientRects()
    if (blockRects.length === 0) return

    let anyOnPage = false
    let allOnPage = true

    for (let i = 0; i < blockRects.length; i++) {
      const rect = blockRects[i]
      const absLeft = rect.left - rootRect.left + scrollLeft
      const absRight = rect.right - rootRect.left + scrollLeft

      if (absRight > pageStartX && absLeft < pageEndX) {
        anyOnPage = true
        if (absLeft < pageStartX || absRight > pageEndX) {
          allOnPage = false
        }
      } else {
        allOnPage = false
      }
    }

    if (!anyOnPage) return

    const visibleChars: Array<{ char: string; node: Text; offset: number }> = []
    const walker = doc.createTreeWalker(block, NodeFilter.SHOW_TEXT, null)
    let node: Node | null

    if (allOnPage) {
      while ((node = walker.nextNode())) {
        const textNode = node as Text
        const textContent = textNode.textContent || ''
        for (let i = 0; i < textContent.length; i++) {
          visibleChars.push({ char: textContent[i], node: textNode, offset: i })
        }
      }
    } else {
      while ((node = walker.nextNode())) {
        const textNode = node as Text
        const textContent = textNode.textContent || ''
        if (!textContent.trim()) continue

        const range = doc.createRange()
        range.selectNodeContents(node)
        const nodeRect = range.getBoundingClientRect()
        const absNodeLeft = nodeRect.left - rootRect.left + scrollLeft
        const absNodeRight = nodeRect.right - rootRect.left + scrollLeft

        if (absNodeRight <= pageStartX || absNodeLeft >= pageEndX) continue

        if (absNodeLeft >= pageStartX && absNodeRight <= pageEndX) {
          for (let i = 0; i < textContent.length; i++) {
            visibleChars.push({ char: textContent[i], node: textNode, offset: i })
          }
          continue
        }

        for (let i = 0; i < textContent.length; i++) {
          range.setStart(node, i)
          range.setEnd(node, i + 1)
          const rect = range.getBoundingClientRect()
          const absCharLeft = rect.left - rootRect.left + scrollLeft
          const absCharRight = rect.right - rootRect.left + scrollLeft

          if (absCharRight > pageStartX && absCharLeft < pageEndX) {
            visibleChars.push({ char: textContent[i], node: textNode, offset: i })
          }
        }
      }
    }

    if (visibleChars.length === 0) return

    let blockText = ''
    let lastWasSpace = true
    for (const { char, node, offset } of visibleChars) {
      const isSpace = /\s/.test(char)
      if (isSpace) {
        if (!lastWasSpace) {
          blockText += ' '
          globalCharMap.push({ node, offset })
          lastWasSpace = true
        }
      } else {
        blockText += char
        globalCharMap.push({ node, offset })
        lastWasSpace = false
      }
    }
    if (blockText.endsWith(' ')) {
      blockText = blockText.slice(0, -1)
      globalCharMap.pop()
    }

    if (blockText) {
      const blockIndex = parseInt(block.getAttribute('data-block-index') || '0', 10)
      result.blocks.push({ text: blockText, blockIndex, pageNumber })
      textParts.push(blockText)
    }
  })

  result.charMap = []
  let blockCharOffset = 0
  for (let i = 0; i < textParts.length; i++) {
    const blockLen = textParts[i].length
    for (let j = 0; j < blockLen; j++) {
      result.charMap.push(globalCharMap[blockCharOffset + j])
    }
    blockCharOffset += blockLen
    if (i < textParts.length - 1) {
      result.charMap.push({ node: null as any, offset: -1 })
      result.charMap.push({ node: null as any, offset: -1 })
    }
  }

  result.text = textParts.join('\n\n')
  return result
}

// ============================================================================
// Highlight Utilities
// ============================================================================

export function clearExistingHighlights(doc: Document): void {
  const spans = Array.from(doc.querySelectorAll('span.readerHighlight, span.readerContextSnippet'))
  for (const span of spans) {
    const parent = span.parentNode
    if (!parent) continue
    while (span.firstChild) {
      parent.insertBefore(span.firstChild, span)
    }
    parent.removeChild(span)
    parent.normalize()
  }
}

export function applyHighlightToRange(
  range: Range,
  highlightId: number | string,
  className = 'readerHighlight',
  explicitStartOffset?: number,
  explicitEndOffset?: number,
  explicitStartNode?: Node,
  explicitEndNode?: Node,
  searchRootOverride?: Node,
): void {
  const doc = range.startContainer.ownerDocument
  if (!doc) return

  const startNode = explicitStartNode ?? range.startContainer
  const startOffset = explicitStartOffset ?? range.startOffset
  const endNode = explicitEndNode ?? range.endContainer
  const endOffset = explicitEndOffset ?? range.endOffset

  const common = range.commonAncestorContainer
  const searchRoot =
    searchRootOverride ?? (common.nodeType === Node.TEXT_NODE ? common.parentNode! : common)

  const walker = doc.createTreeWalker(searchRoot, NodeFilter.SHOW_TEXT, null)
  const targetNodes: Array<{ node: Text; start: number; end: number }> = []
  let currentNode = walker.nextNode() as Text | null
  let inRange = false

  if (startNode === endNode && startNode.nodeType === Node.TEXT_NODE) {
    targetNodes.push({ node: startNode as Text, start: startOffset, end: endOffset })
  } else {
    while (currentNode) {
      if (currentNode === startNode) inRange = true
      if (inRange) {
        const text = currentNode.nodeValue || ''
        if (text.length > 0) {
          const nodeStart = currentNode === startNode ? startOffset : 0
          const nodeEnd = currentNode === endNode ? endOffset : text.length
          if (nodeStart < nodeEnd) {
            targetNodes.push({ node: currentNode, start: nodeStart, end: nodeEnd })
          }
        }
      }
      if (currentNode === endNode) inRange = false
      currentNode = walker.nextNode() as Text | null
    }
  }

  for (const { node, start, end } of targetNodes) {
    const text = node.nodeValue ?? ''
    const before = text.slice(0, start)
    const middle = text.slice(start, end)
    const after = text.slice(end)
    const fragment = doc.createDocumentFragment()
    if (before) fragment.appendChild(doc.createTextNode(before))
    const span = doc.createElement('span')
    span.className = className
    span.dataset.highlightId = String(highlightId)
    span.textContent = middle
    fragment.appendChild(span)
    if (after) fragment.appendChild(doc.createTextNode(after))
    if (node.parentNode) node.parentNode.replaceChild(fragment, node)
  }
}
