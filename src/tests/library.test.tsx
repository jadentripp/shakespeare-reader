// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import LibraryPage from "../routes/LibraryPage";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

// Mock @tanstack/react-router
vi.mock("@tanstack/react-router", () => ({
  useNavigate: vi.fn(),
  Link: ({ children, to, params }: any) => <a href={to}>{children}</a>,
}));

// Mock useLibrary hook
const mockUseLibrary = vi.fn();
vi.mock("../hooks/useLibrary", () => ({
  useLibrary: () => mockUseLibrary(),
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

describe("LibraryPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
    cleanup();
    
    // Default mock implementation
    mockUseLibrary.mockReturnValue({
        booksQ: { data: [], isLoading: false },
        catalogQ: { isFetching: false, data: { results: [], count: 0 } },
        catalogKey: "collection-all",
        setCatalogKey: vi.fn(),
        activeCatalog: { kind: "all", catalogKey: "collection-all" },
        catalogSearch: null,
        canQueryCatalog: false,
        hasQueueActivity: false,
        filteredBooks: [],
        booksInProgress: [],
        progressByBookId: new Map(),
        counts: { queued: 0, downloading: 0, done: 0, failed: 0 },
        recentSearches: [],
        queue: [],
        setQueue: vi.fn(),
        libraryQuery: "",
        setLibraryQuery: vi.fn(),
        deleteBook: vi.fn(),
        sortedCatalogResults: [],
        showAllCategories: false,
        setShowAllCategories: vi.fn(),
        paused: false,
        setPaused: vi.fn(),
        retryFailed: vi.fn(),
        clearDone: vi.fn(),
        clearFailed: vi.fn(),
        resumeAll: vi.fn(),
        startOrResumeBulk: vi.fn(),
        bulkScan: { running: false },
        canBulkScan: false,
        setCatalogPageUrl: vi.fn(),
        searchFocused: false,
        setSearchFocused: vi.fn(),
        handleSearch: vi.fn(),
        clearRecentSearches: vi.fn(),
        enqueue: vi.fn(),
        active: null,
        catalogQuery: "",
        setCatalogQuery: vi.fn(),
        sortBy: "relevance",
        setSortBy: vi.fn(),
    });
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
        {children}
    </QueryClientProvider>
  );

  it("should display book title", async () => {
    const mockBook = { id: 1, title: "Test Book", authors: "Test Author", gutenberg_id: 12345 };
    mockUseLibrary.mockReturnValue({
        ...mockUseLibrary(),
        filteredBooks: [mockBook],
        booksQ: { data: [mockBook], isLoading: false },
    });

    render(<LibraryPage />, { wrapper });

    expect(screen.getByText("Test Book")).toBeDefined();
  });

  it("should display empty state when no books are found", async () => {
    render(<LibraryPage />, { wrapper });
    expect(screen.getByText("Your library is empty")).toBeDefined();
  });
});
