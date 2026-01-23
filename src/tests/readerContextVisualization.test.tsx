import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, renderHook } from '@testing-library/react'
import type React from 'react'
import { useHighlights } from '../lib/reader/hooks/useHighlights'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
})

describe('Reader Context Visualization', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )

  let mockDoc: Document
  let mockRoot: HTMLElement

  beforeEach(() => {
    queryClient.clear()
    cleanup()
    mock.restore()

    mockDoc = document.implementation.createHTMLDocument()
    mockRoot = mockDoc.createElement('div')
    mockRoot.innerHTML = '<p>Sample text for testing highlights.</p>'
    mockDoc.body.appendChild(mockRoot)

    mock.module('../lib/tauri', () => ({
      listHighlights: async () => [],
    }))
  })

  afterEach(() => {
    cleanup()
  })

  it('should render staged snippets with context class', async () => {
    const mockOptions = {
      bookId: 1,
      getDoc: () => mockDoc,
      getScrollRoot: () => mockRoot,
    }

    const { result } = renderHook(() => useHighlights(mockOptions), { wrapper })

    const mockSnippet = {
      startPath: [0, 0], // First child of root, first child of p
      startOffset: 0,
      endPath: [0, 0],
      endOffset: 6,
      text: 'Sample',
      rect: { top: 0, left: 0, width: 0, height: 0 },
    }

    act(() => {
      result.current.setPendingHighlight(mockSnippet)
    })

    act(() => {
      ;(result.current as any).addSnippetToContext()
    })

    expect((result.current as any).stagedSnippets.length).toBe(1)
    console.log(
      'Staged Snippet state:',
      JSON.stringify((result.current as any).stagedSnippets[0], null, 2),
    )

    const snippet = (result.current as any).stagedSnippets[0]
    const startNode = (function resolveNodePath(root: Node, path: number[]): Node | null {
      let current: Node | null = root
      for (const index of path) {
        if (!current || !current.childNodes[index]) return null
        current = current.childNodes[index]
      }
      return current
    })(mockRoot, snippet.startPath)

    console.log(
      'Start Node resolved in test:',
      startNode?.nodeName,
      'Type:',
      startNode?.nodeType,
      'Text:',
      startNode?.textContent,
    )

    act(() => {
      result.current.renderHighlights()
    })

    console.log('Root HTML after render:', mockRoot.innerHTML)

    const highlightSpan = mockRoot.querySelector('.readerContextSnippet')
    expect(highlightSpan).not.toBeNull()
    expect(highlightSpan?.textContent).toBe('Sample')
  })

  it('should render staged snippets spanning multiple nodes', async () => {
    mockRoot.innerHTML = '<p>Part 1</p><p>Part 2</p>'
    const mockOptions = {
      bookId: 1,
      getDoc: () => mockDoc,
      getScrollRoot: () => mockRoot,
    }

    const { result } = renderHook(() => useHighlights(mockOptions), { wrapper })

    const mockSnippet = {
      startPath: [0, 0], // "Part 1"
      startOffset: 0,
      endPath: [1, 0], // "Part 2"
      endOffset: 6,
      text: 'Part 1 Part 2',
      rect: { top: 0, left: 0, width: 0, height: 0 },
    }

    act(() => {
      result.current.setPendingHighlight(mockSnippet)
    })

    act(() => {
      ;(result.current as any).addSnippetToContext()
    })

    act(() => {
      result.current.renderHighlights()
    })

    const highlightSpans = mockRoot.querySelectorAll('.readerContextSnippet')
    expect(highlightSpans.length).toBeGreaterThanOrEqual(2)
  })
})
