import { describe, expect, it, mock } from 'bun:test'
import { render, screen } from '@testing-library/react'
import { BookCardMinimal } from '../components/library/BookCardMinimal'

describe('BookCardMinimal', () => {
  const defaultProps = {
    id: 1,
    gutenbergId: 1000,
    title: 'Bauhaus Manifesto',
    authors: 'Walter Gropius',
    coverUrl: 'http://example.com/cover.jpg',
    isLocal: true,
    progress: 45,
    onDelete: mock(),
  }

  it('should render title and author', () => {
    render(<BookCardMinimal {...defaultProps} />)
    expect(screen.getByText('Bauhaus Manifesto')).toBeDefined()
    expect(screen.getByText('Walter Gropius')).toBeDefined()
  })

  it('should have sharp edges (no border-radius)', () => {
    const { container } = render(<BookCardMinimal {...defaultProps} />)
    // Check for explicit sharp edge classes or absence of rounded classes on the main container
    const mainDiv = container.firstChild as HTMLElement
    // We expect "rounded-none" or at least NOT "rounded-xl"
    expect(mainDiv.className).not.toContain('rounded-xl')
    expect(mainDiv.className).not.toContain('rounded-lg')
  })

  it('should render actions (Read/Delete)', () => {
    render(<BookCardMinimal {...defaultProps} />)
    // Actions might be hidden by default (opacity-0), but should exist in the DOM
    expect(screen.getByText('Read')).toBeDefined()
    expect(screen.getByText('Delete')).toBeDefined()
  })

  it('should render a geometric progress bar', () => {
    render(<BookCardMinimal {...defaultProps} />)
    const progressBar = screen.getByRole('progressbar')
    expect(progressBar).toBeDefined()
    // Should have sharp corners
    expect(progressBar.className).not.toContain('rounded')
  })
})
