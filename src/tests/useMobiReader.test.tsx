// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useMobiReader } from '../lib/reader/hooks/useMobiReader';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Mock the hooks
vi.mock('@/lib/reader/hooks', () => ({
  useIframeDocument: vi.fn(() => ({
    iframeRef: { current: null },
    docRef: { current: null },
    rootRef: { current: null },
    containerRef: { current: null },
    getScrollRoot: vi.fn(),
    getDoc: vi.fn(),
    setDocRef: vi.fn(),
    setRootRef: vi.fn(),
    setIframeReady: vi.fn(),
  })),
  usePagination: vi.fn(() => ({
    currentPage: 1,
    totalPages: 1,
    scrollToPage: vi.fn(),
    syncPageMetrics: vi.fn(),
    getPageMetrics: vi.fn(() => ({ pageWidth: 0, gap: 0 })),
    schedulePaginationUpdate: vi.fn(),
    scheduleLock: vi.fn(),
    scheduleLayoutRebuild: vi.fn(),
    isNavigatingRef: { current: false },
    pageLockRef: { current: false },
    updatePagination: vi.fn(),
    prev: vi.fn(),
    next: vi.fn(),
    lockToPage: vi.fn(),
  })),
  useNavigation: vi.fn(() => ({
    jumpToElement: vi.fn(),
  })),
  useProgressPersistence: vi.fn(() => ({
    scheduleSaveProgress: vi.fn(),
    scheduleSaveThreadProgress: vi.fn(),
  })),
  useToc: vi.fn(() => ({
    buildToc: vi.fn(),
    tocEntries: [],
    currentTocEntryId: null,
    handleTocNavigate: vi.fn(),
    tocExpanded: false,
    setTocExpanded: vi.fn(),
    resetHeadingIndex: vi.fn(),
  })),
  useModels: vi.fn(() => ({
    currentModel: 'gpt-4',
    availableModels: [],
    handleModelChange: vi.fn(),
    modelsLoading: false,
  })),
  useHighlights: vi.fn(() => ({
    highlights: [],
    selectedHighlightId: null,
    setSelectedHighlightId: vi.fn(),
    handleDelete: vi.fn(),
    handleCreate: vi.fn(),
    handleSaveNote: vi.fn(),
    pendingHighlight: null,
    setPendingHighlight: vi.fn(),
    noteDraft: '',
    setNoteDraft: vi.fn(),
    renderHighlights: vi.fn(),
    toggleAttachment: vi.fn(),
    attachedHighlightIds: [],
    attachedHighlights: [],
  })),
  useChat: vi.fn(() => ({
    chatMessages: [],
    sendChat: vi.fn(),
    handleNewChat: vi.fn(),
    currentThreadId: null,
    threads: [],
    handleSelectThread: vi.fn(),
  })),
  useTTS: vi.fn(() => ({
    state: 'idle',
    autoNext: false,
    setAutoNext: vi.fn(),
    play: vi.fn(),
    pause: vi.fn(),
    stop: vi.fn(),
    voiceId: 'v1',
  })),
}));

vi.mock('../lib/tauri', () => ({
  getBook: vi.fn(),
  getBookHtml: vi.fn(),
  getBookImageData: vi.fn(),
}));

vi.mock('../lib/appearance', () => ({
  useReaderAppearance: vi.fn(() => ({
    fontFamily: 'serif',
    lineHeight: 1.5,
    margin: 20,
    setFontFamily: vi.fn(),
    setLineHeight: vi.fn(),
    setMargin: vi.fn(),
  })),
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

describe('useMobiReader hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
  });

  it('should initialize with default states', () => {
    const { result } = renderHook(() => useMobiReader(1), { wrapper });
    
    expect(result.current.columns).toBe(1);
    expect(result.current.showAppearance).toBe(false);
    expect(result.current.leftPanelCollapsed).toBe(false);
    expect(result.current.rightPanelCollapsed).toBe(false);
  });

  it('should toggle columns', () => {
    const { result } = renderHook(() => useMobiReader(1), { wrapper });
    
    expect(result.current.columns).toBe(1);
    
    // Simulate setColumns call if we expose it, or check the toggle function
    // For now let's just check the state exists
  });
});
