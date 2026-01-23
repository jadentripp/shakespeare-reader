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
    catalogQuery: '',
    setCatalogQuery: mock(),
    handleSearch: mock(),
    catalogQ: { isFetching: false },
    activeCatalog: { key: 'collection-all', label: 'All Books', kind: 'all' },
    catalogSearch: '',
    setCatalogKey: mock(),
    searchInputRef: { current: null },
  }

  beforeEach(() => {
    cleanup()
  })

  it('should render the massive typographic header', () => {
    render(<BauhausHeader {...defaultProps} />)
    const header = screen.getByText('LIBRARY')
    expect(header).toBeDefined()
    expect(header.className).toContain('font-black')
    expect(header.className).toContain('uppercase')
  })

  it('should render the horizontal filter bar with collections', () => {
    render(<BauhausHeader {...defaultProps} />)
    // "All Books" is present in subtitle AND horizontal nav
    expect(screen.getAllByText('All Books').length).toBeGreaterThan(0)
    // Featured collections like "Shakespeare" should be there
    expect(screen.getByText('Shakespeare')).toBeDefined()
  })

  it('should render the bold search input', () => {
    render(<BauhausHeader {...defaultProps} />)
    const input = screen.getByPlaceholderText(/Search collection/i)
    expect(input).toBeDefined()
    // Bauhaus style: bold, sharp edges (rounded-none)
    expect(input.className).toContain('rounded-none')
    expect(input.className).toContain('border-b-4')
  })

  it('should call handleSearch on Enter', () => {
    const handleSearch = mock()
    render(<BauhausHeader {...defaultProps} catalogQuery="Kafka" handleSearch={handleSearch} />)
    const input = screen.getByPlaceholderText(/Search collection/i)
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' })
    expect(handleSearch).toHaveBeenCalledWith('Kafka')
  })
})
