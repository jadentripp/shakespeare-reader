// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, act } from "@testing-library/react";
import { useLibrary } from "../hooks/useLibrary";
import { LibraryProvider } from "../hooks/LibraryProvider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

// Mock tauri
vi.mock("../lib/tauri", () => ({
  listBooks: vi.fn().mockResolvedValue([]),
  gutendexCatalogPage: vi.fn().mockResolvedValue({ results: [], count: 0 }),
  hardDeleteBook: vi.fn().mockResolvedValue(undefined),
  downloadGutenbergMobi: vi.fn().mockResolvedValue(undefined),
  dbInit: vi.fn().mockResolvedValue(undefined),
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

describe("Library State Sharing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
  });

  it("shares state between multiple components using the hook under the same provider", () => {
    let result1: any;
    let result2: any;

    const TestComponent1 = () => {
      result1 = useLibrary();
      return null;
    };

    const TestComponent2 = () => {
      result2 = useLibrary();
      return null;
    };

    render(
      <QueryClientProvider client={queryClient}>
        <LibraryProvider>
          <TestComponent1 />
          <TestComponent2 />
        </LibraryProvider>
      </QueryClientProvider>
    );

    act(() => {
      result1.setCatalogQuery("Shakespeare");
    });

    expect(result1.catalogQuery).toBe("Shakespeare");
    expect(result2.catalogQuery).toBe("Shakespeare");
  });
});
