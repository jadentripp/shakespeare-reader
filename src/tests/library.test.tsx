// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import LibraryPage from '../routes/LibraryPage';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock the tauri commands
vi.mock('../lib/tauri', () => ({
  listBooks: vi.fn().mockResolvedValue([
    {
      id: 1,
      gutenberg_id: 1513,
      title: 'Romeo and Juliet',
      authors: 'Shakespeare, William (1564–1616)',
      publication_year: 1597,
      cover_url: 'http://example.com/cover.jpg',
      mobi_path: '/path/to/1513.mobi',
      html_path: '/path/to/1513.mobi.html',
      created_at: '2026-01-11T00:00:00Z',
    },
  ]),
  gutendexShakespearePage: vi.fn().mockResolvedValue({
    count: 1,
    next: null,
    previous: null,
    results: [],
  }),
  deleteBook: vi.fn(),
  downloadGutenbergMobi: vi.fn(),
}));

// Mock @tanstack/react-router
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, params }: any) => <a href={`${to}/${params.bookId}`}>{children}</a>,
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

describe('LibraryPage', () => {
  it('should display book title, author with years, and publication year', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <LibraryPage />
      </QueryClientProvider>
    );

    // Wait for the book to be displayed
    const title = await screen.findByText('Romeo and Juliet');
    expect(title).toBeDefined();

    const author = await screen.findByText('Shakespeare, William (1564–1616)');
    expect(author).toBeDefined();

    const published = await screen.findByText('Published: 1597');
    expect(published).toBeDefined();
    
    const id = await screen.findByText('#1513');
    expect(id).toBeDefined();
  });
});
