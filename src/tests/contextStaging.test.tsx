import { describe, it, expect, beforeEach, afterEach, mock } from "bun:test";
import { renderHook, act, cleanup } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { useHighlights } from "../lib/reader/hooks/useHighlights";
import * as tauri from "../lib/tauri";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

describe("useHighlights Context Staging", () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );

  const mockOptions = {
    bookId: 1,
    getDoc: () => document,
    getScrollRoot: () => document.body,
  };

  beforeEach(() => {
    queryClient.clear();
    cleanup();
    mock.restore();
    // Mock listHighlights to return empty
    mock.module("../lib/tauri", () => ({
      listHighlights: async () => [],
      createHighlight: async (h: any) => ({ ...h, id: Math.random() }),
      deleteHighlight: async () => {},
      updateHighlightNote: async () => {},
    }));
  });

  afterEach(() => {
    cleanup();
  });

  it("should initialize with empty staged snippets", () => {
    const { result } = renderHook(() => useHighlights(mockOptions), { wrapper });
    expect((result.current as any).stagedSnippets).toEqual([]);
  });

  it("should add a snippet to context", async () => {
    const { result } = renderHook(() => useHighlights(mockOptions), { wrapper });
    
    const mockSnippet = {
      startPath: [0],
      startOffset: 0,
      endPath: [0],
      endOffset: 10,
      text: "Sample text",
      rect: { top: 0, left: 0, width: 0, height: 0 },
    };

    act(() => {
      result.current.setPendingHighlight(mockSnippet);
    });

    await act(async () => {
      await (result.current as any).addSnippetToContext();
    });

    expect((result.current as any).stagedSnippets.length).toBe(1);
    expect((result.current as any).stagedSnippets[0].text).toBe("Sample text");
    // Should clear pending highlight
    expect(result.current.pendingHighlight).toBeNull();
  });

  it("should remove a snippet from context", async () => {
    const { result } = renderHook(() => useHighlights(mockOptions), { wrapper });
    
    const mockSnippet = {
      id: "test-id",
      startPath: [0],
      startOffset: 0,
      endPath: [0],
      endOffset: 10,
      text: "Sample text",
    };

    // We'll need to see how we implement addSnippetToContext to know how IDs are generated or passed
    // For now, let's assume we can add it directly if we want to test removal
    // Or just use the action
    
    act(() => {
      result.current.setPendingHighlight(mockSnippet as any);
    });
    act(() => {
      (result.current as any).addSnippetToContext();
    });

    expect((result.current as any).stagedSnippets.length).toBe(1);
    const id = (result.current as any).stagedSnippets[0].id;

    act(() => {
      (result.current as any).removeSnippetFromContext(id);
    });

    expect((result.current as any).stagedSnippets.length).toBe(0);
  });

  it("should clear all staged snippets", async () => {
    const { result } = renderHook(() => useHighlights(mockOptions), { wrapper });
    
    act(() => {
      result.current.setPendingHighlight({ text: "Snippet 1" } as any);
    });
    act(() => {
      (result.current as any).addSnippetToContext();
    });
    act(() => {
      result.current.setPendingHighlight({ text: "Snippet 2" } as any);
    });
    act(() => {
      (result.current as any).addSnippetToContext();
    });

    expect((result.current as any).stagedSnippets.length).toBe(2);

    act(() => {
      (result.current as any).clearStagedSnippets();
    });

    expect((result.current as any).stagedSnippets.length).toBe(0);
  });
});
