// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import LibraryPage from "../routes/LibraryPage";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Mock the tauri commands
vi.mock("../lib/tauri", () => ({
  listBooks: vi.fn().mockResolvedValue([
    {
      id: 1,
      gutenberg_id: 1513,
      title: "Romeo and Juliet",
      authors: "Shakespeare, William (1564–1616)",
      publication_year: 1597,
      cover_url: "http://example.com/cover.jpg",
      mobi_path: "/path/to/1513.mobi",
      html_path: "/path/to/1513.mobi.html",
      created_at: "2026-01-11T00:00:00Z",
    },
  ]),
  gutendexCatalogPage: vi.fn().mockResolvedValue({
    count: 1,
    next: null,
    previous: null,
    results: [
      {
        id: 1513,
        title: "Romeo and Juliet",
        authors: [{ name: "Shakespeare, William", birth_year: 1564, death_year: 1616 }],
        download_count: 100,
        formats: { "application/x-mobipocket-ebook": "http://example.com/1513.mobi" },
      }
    ],
  }),
  hardDeleteBook: vi.fn(),
  downloadGutenbergMobi: vi.fn(),
}));

// Mock @tanstack/react-router
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to, params }: any) => <a href={`${to}/${params.bookId}`}>{children}</a>,
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

describe("LibraryPage", () => {
  beforeEach(() => {
    cleanup();
  });

  it("should display book title, author with years, and catalog ID", async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <LibraryPage />
      </QueryClientProvider>
    );

    // Simulate search to show catalog results
    const searchInput = screen.getByPlaceholderText(/Search by title/i);
    fireEvent.change(searchInput, { target: { value: "Romeo" } });
    fireEvent.keyDown(searchInput, { key: "Enter", code: "Enter" });

    // Wait for the book to be displayed in catalog
    const title = await screen.findAllByText("Romeo and Juliet");
    expect(title.length).toBeGreaterThan(0);

    const author = await screen.findAllByText("Shakespeare, William (1564–1616)");
    expect(author.length).toBeGreaterThan(0);
    
    const id = await screen.findByText("#1513");
    expect(id).toBeDefined();
  });

  it("should display an enhanced empty state when no books are found", async () => {
    const { listBooks } = await import("../lib/tauri");
    (listBooks as any).mockResolvedValueOnce([]);

    render(
      <QueryClientProvider client={queryClient}>
        <LibraryPage />
      </QueryClientProvider>
    );

    const emptyMsg = await screen.findByText(/Your library is empty/i);
    expect(emptyMsg).toBeDefined();
    
    const suggestion = await screen.findByText(/Browse the collections above/i);
    expect(suggestion).toBeDefined();
  });
});
