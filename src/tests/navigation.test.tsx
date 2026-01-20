import { describe, it, expect, mock, spyOn } from "bun:test";
import { renderHook } from '@testing-library/react';
import { useMobiReader } from '../lib/reader/hooks/useMobiReader';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from "react";

// Mock Tauri
mock.module("../lib/tauri", () => ({
  getBook: mock(() => Promise.resolve({ title: "Test Book", gutenberg_id: 123 })),
  getBookHtml: mock(() => Promise.resolve("<html><body>Test Content</body></html>")),
}));

// Mock Appearance
mock.module("../lib/appearance", () => ({
  useReaderAppearance: mock(() => ({
    fontFamily: "serif",
    lineHeight: 1.6,
    margin: 40,
    setFontFamily: mock(),
    setLineHeight: mock(),
    setMargin: mock(),
  })),
}));

const queryClient = new QueryClient();
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

describe('Keyboard Navigation', () => {
  it('should attach keydown listener to window', () => {
    const addEventListenerSpy = spyOn(window, 'addEventListener');
    renderHook(() => useMobiReader(1), { wrapper });
    
    const keydownListener = addEventListenerSpy.mock.calls.find(call => call[0] === 'keydown');
    expect(keydownListener).toBeDefined();
  });
});
