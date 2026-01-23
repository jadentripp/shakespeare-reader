import { afterEach, beforeEach, describe, expect, it, mock, spyOn } from 'bun:test'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, renderHook } from '@testing-library/react'
import type React from 'react'
import * as appearance from '@/lib/appearance'
// Import ALL dependencies as namespaces to spy on them
import * as hooks from '@/lib/reader/hooks'
import * as tauri from '@/lib/tauri'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      gcTime: 0, // Disable garbage collection to avoid async timers
    },
  },
})

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
)

import { useMobiReader } from '../lib/reader/hooks/useMobiReader'

describe('useMobiReader hook', () => {
  const spies: any[] = []

  beforeEach(() => {
    queryClient.clear()
    mock.restore()
    cleanup() // Clean up any previous renders

    // Setup spies
    spies.push(
      spyOn(appearance, 'useReaderAppearance').mockReturnValue({
        fontFamily: 'serif',
        lineHeight: 1.5,
        margin: 20,
        setFontFamily: mock(),
        setLineHeight: mock(),
        setMargin: mock(),
      } as any),
    )

    spies.push(spyOn(tauri, 'getBook').mockResolvedValue({ id: 1, title: 'Test Book', gutenberg_id: 1 } as any))
    spies.push(spyOn(tauri, 'getBookHtml').mockResolvedValue('<html><body>Test</body></html>'))
    spies.push(spyOn(tauri, 'getBookImageData').mockResolvedValue(''))
    spies.push(spyOn(tauri, 'getSetting').mockResolvedValue(''))

    // Spy on useIframeDocument
    spies.push(
      spyOn(hooks, 'useIframeDocument').mockReturnValue({
        iframeRef: { current: null },
        docRef: { current: null },
        rootRef: { current: null },
        containerRef: { current: null },
        getScrollRoot: mock(),
        getDoc: mock(),
        setDocRef: mock(),
        setRootRef: mock(),
        setIframeReady: mock(),
      } as any),
    )

    // Spy on usePagination
    spies.push(
      spyOn(hooks, 'usePagination').mockReturnValue({
        currentPage: 1,
        totalPages: 1,
        scrollToPage: mock(),
        syncPageMetrics: mock(),
        getPageMetrics: mock(() => ({ pageWidth: 0, gap: 0 })),
        schedulePaginationUpdate: mock(),
        scheduleLock: mock(),
        scheduleLayoutRebuild: mock(),
        isNavigatingRef: { current: false },
        pageLockRef: { current: false },
        updatePagination: mock(),
        prev: mock(),
        next: mock(),
        lockToPage: mock(),
        scrollToPageInstant: mock(),
      } as any),
    )

    // Spy on other hooks...
    spies.push(spyOn(hooks, 'useNavigation').mockReturnValue({ jumpToElement: mock() } as any))
    spies.push(
      spyOn(hooks, 'useProgressPersistence').mockReturnValue({
        scheduleSaveProgress: mock(),
        scheduleSaveThreadProgress: mock(),
      } as any),
    )
    spies.push(
      spyOn(hooks, 'useToc').mockReturnValue({
        buildToc: mock(),
        tocEntries: [],
        currentTocEntryId: null,
        handleTocNavigate: mock(),
        tocExpanded: false,
        setTocExpanded: mock(),
        resetHeadingIndex: mock(),
      } as any),
    )
    spies.push(
      spyOn(hooks, 'useModels').mockReturnValue({
        currentModel: 'gpt-4',
        availableModels: [],
        handleModelChange: mock(),
        modelsLoading: false,
      } as any),
    )
    spies.push(
      spyOn(hooks, 'useHighlights').mockReturnValue({
        highlights: [],
        selectedHighlightId: null,
        setSelectedHighlightId: mock(),
        handleDelete: mock(),
        handleCreate: mock(),
        handleSaveNote: mock(),
        pendingHighlight: null,
        setPendingHighlight: mock(),
        noteDraft: '',
        setNoteDraft: mock(),
        renderHighlights: mock(),
        toggleAttachment: mock(),
        attachedHighlightIds: [],
        attachedHighlights: [],
        setActiveAiQuote: mock(),
        setActiveAiBlockIndex: mock(),
        activeAiQuote: null,
        activeAiBlockIndex: null,
      } as any),
    )
    spies.push(
      spyOn(hooks, 'useChat').mockReturnValue({
        chatMessages: [],
        sendChat: mock(),
        handleNewChat: mock(),
        currentThreadId: null,
        threads: [],
        handleSelectThread: mock(),
      } as any),
    )
    spies.push(
      spyOn(hooks, 'useTTS').mockReturnValue({
        state: 'idle',
        autoNext: false,
        setAutoNext: mock(),
        play: mock(),
        pause: mock(),
        stop: mock(),
        voiceId: 'v1',
      } as any),
    )
    // Spy on useMobiIframe if it's exported from hooks. If not, and it's relative, we might be in trouble for spying.
    // Assuming it's NOT in hooks barrel based on previous `mock.module`.
    // IF we cannot spy on it (relative import), we might have to rely on it being harmless or mocking what it calls.
    // If useMobiIframe uses hooks, we might crash.
    // Let's assume for now we skip spying on it if it's hard, or rely on it just working.
  })

  afterEach(() => {
    cleanup() // Ensure component is unmounted BEFORE restoring spies
    queryClient.clear()
    spies.forEach((s) => s.mockRestore())
    spies.length = 0
    mock.restore()
  })

  it('should initialize with default states', () => {
    const { result, unmount } = renderHook(() => useMobiReader(1), { wrapper })

    expect(result.current.columns).toBe(1)
    expect(result.current.showAppearance).toBe(false)
    expect(result.current.leftPanelCollapsed).toBe(false)
    expect(result.current.rightPanelCollapsed).toBe(false)

    unmount() // Explicitly unmount
  })

  it('should toggle columns', () => {
    const { result, unmount } = renderHook(() => useMobiReader(1), { wrapper })

    expect(result.current.columns).toBe(1)
    act(() => {
      result.current.toggleColumns()
    })
    expect(result.current.columns).toBe(2)

    unmount() // Explicitly unmount
  })
})
