// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useLibrary } from "../hooks/useLibrary";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as tauri from "../lib/tauri";

// Mock tauri
vi.mock("../lib/tauri", () => ({
  listBooks: vi.fn(),
  gutendexCatalogPage: vi.fn(),
  hardDeleteBook: vi.fn(),
  downloadGutenbergMobi: vi.fn(),
}));

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value.toString();
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
  };
})();

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
});

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

describe("useLibrary hook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
    localStorageMock.clear();
  });

  it("should initialize with default values", async () => {
    (tauri.listBooks as any).mockResolvedValue([]);
    
    const { result } = renderHook(() => useLibrary(), { wrapper });

    expect(result.current.libraryQuery).toBe("");
    expect(result.current.catalogQuery).toBe("");
    expect(result.current.sortBy).toBe("relevance");
    expect(result.current.queue).toEqual([]);
  });

  it("should handle library search query changes", async () => {
    (tauri.listBooks as any).mockResolvedValue([]);
    const { result } = renderHook(() => useLibrary(), { wrapper });

    act(() => {
      result.current.setLibraryQuery("romeo");
    });
    
    expect(result.current.libraryQuery).toBe("romeo");
  });

  it("should filter books based on library query", async () => {
    const mockBooks = [
      { id: 1, title: "Romeo and Juliet", authors: "William Shakespeare", gutenberg_id: 1513 },
      { id: 2, title: "Pride and Prejudice", authors: "Jane Austen", gutenberg_id: 1342 },
    ];
    (tauri.listBooks as any).mockResolvedValue(mockBooks);

    const { result } = renderHook(() => useLibrary(), { wrapper });

    // Wait for books to load
    await waitFor(() => expect(result.current.booksQ.isSuccess).toBe(true));

    expect(result.current.filteredBooks).toHaveLength(2);

    act(() => {
      result.current.setLibraryQuery("Romeo");
    });
    
    expect(result.current.filteredBooks).toHaveLength(1);
    expect(result.current.filteredBooks[0].title).toBe("Romeo and Juliet");
  });

  it("should handle catalog search and update recent searches", async () => {
    (tauri.listBooks as any).mockResolvedValue([]);
    (tauri.gutendexCatalogPage as any).mockResolvedValue({ results: [], count: 0 });

    const { result } = renderHook(() => useLibrary(), { wrapper });

    act(() => {
      result.current.handleSearch("Shakespeare");
    });
    
    expect(result.current.catalogQuery).toBe("Shakespeare");
    expect(result.current.recentSearches).toContain("Shakespeare");
  });

  it("should handle book deletion", async () => {
    (tauri.listBooks as any).mockResolvedValue([]);
    (tauri.hardDeleteBook as any).mockResolvedValue(undefined);
    
    const { result } = renderHook(() => useLibrary(), { wrapper });

    await act(async () => {
      await result.current.deleteBook(123);
    });
    
    expect(tauri.hardDeleteBook).toHaveBeenCalledWith(123);
  });
});
