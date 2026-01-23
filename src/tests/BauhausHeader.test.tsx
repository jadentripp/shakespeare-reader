import { beforeEach, describe, expect, it, mock } from 'bun:test'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import React from 'react'
import { BauhausHeader } from '../components/library/BauhausHeader'

// Mock Lucide icons
mock.module('lucide-react', () => ({
  Search: () => <div data-testid="search-icon" />,
  X: () => <div data-testid="x-icon" />,
  Loader2: () => <div data-testid="loader-icon" />,
}))

describe('BauhausHeader', () => {
  const defaultProps = {
    viewMode: 'discover' as const,
    setViewMode: mock(),
    libraryQuery: '',
    setLibraryQuery: mock(),
    catalogQuery: '',
    setCatalogQuery: mock(),
    handleSearch: mock(),
    catalogQ: { isFetching: false },
    activeCatalog: {
      key: 'collection-popular',
      label: 'Most Popular',
      kind: 'collection',
      description: '',
      catalogKey: 'all',
    },
    catalogSearch: '',
    setCatalogKey: mock(),
    searchInputRef: { current: null } as any,
  }

  beforeEach(() => {
    cleanup()
  })

  it('should render the massive typographic header and view toggle', () => {
    render(<BauhausHeader {...defaultProps} />)
    expect(screen.getByText('LIBRARY')).toBeDefined()
    expect(screen.getByText('MY BOOKS')).toBeDefined()
    expect(screen.getByText('DISCOVER')).toBeDefined()
  })

  it('should call setViewMode when clicking toggle', () => {
    const setViewMode = mock()
    render(<BauhausHeader {...defaultProps} setViewMode={setViewMode} />)
    fireEvent.click(screen.getByText('MY BOOKS'))
    expect(setViewMode).toHaveBeenCalledWith('local')
  })

  it('should render the horizontal filter bar in discover mode', () => {
    render(<BauhausHeader {...defaultProps} />)
    expect(screen.getAllByText('Most Popular').length).toBeGreaterThan(0)
    expect(screen.getByText('Shakespeare')).toBeDefined()
    expect(screen.getByText('Gothic Horror')).toBeDefined()
  })

  it('should hide horizontal filter bar in local mode', () => {
    render(<BauhausHeader {...defaultProps} viewMode="local" />)
    expect(screen.queryByText('Shakespeare')).toBeNull()
  })

  it('should use libraryQuery in local mode', () => {
    render(<BauhausHeader {...defaultProps} viewMode="local" libraryQuery="My Local Search" />)
    const input = screen.getByDisplayValue('My Local Search')
    expect(input).toBeDefined()
    expect(screen.getByPlaceholderText(/SEARCH YOUR BOOKS/i)).toBeDefined()
  })

  it('should use catalogQuery in discover mode', () => {
    render(<BauhausHeader {...defaultProps} viewMode="discover" catalogQuery="Kafka" />)
    const input = screen.getByDisplayValue('Kafka')
    expect(input).toBeDefined()
    expect(screen.getByPlaceholderText(/SEARCH GUTENBERG/i)).toBeDefined()
  })

  it('should call handleSearch on Enter in discover mode', () => {
    const handleSearch = mock()
    render(
      <BauhausHeader
        {...defaultProps}
        viewMode="discover"
        catalogQuery="Kafka"
        handleSearch={handleSearch}
      />,
    )
    const input = screen.getByPlaceholderText(/SEARCH GUTENBERG/i)
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' })
    expect(handleSearch).toHaveBeenCalledWith('Kafka')
  })
})
