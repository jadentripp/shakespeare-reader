import { beforeEach, describe, expect, it } from 'bun:test'
import { cleanup, render, screen } from '@testing-library/react'
import React from 'react'
import { LibraryGrid } from '../components/library/LibraryGrid'

describe('LibraryGrid', () => {
  beforeEach(() => {
    cleanup()
  })

  it('should render children in grid variant', () => {
    render(
      <LibraryGrid variant="grid">
        <div data-testid="child">Child</div>
      </LibraryGrid>,
    )
    const container = screen.getByTestId('child').parentElement
    expect(container?.className).toContain('grid')
    expect(container?.className).toContain('gap-6')
  })

  it('should render children in list variant', () => {
    render(
      <LibraryGrid variant="list">
        <div data-testid="child">Child</div>
      </LibraryGrid>,
    )
    const container = screen.getByTestId('child').parentElement
    expect(container?.className).toContain('flex-col')
  })

  it('should render children in minimal variant with generous spacing', () => {
    render(
      <LibraryGrid variant="minimal">
        <div data-testid="child">Child</div>
      </LibraryGrid>,
    )
    const container = screen.getByTestId('child').parentElement
    expect(container?.className).toContain('grid')
    // Expect larger gap for minimal/Bauhaus look
    expect(container?.className).toContain('gap-10')
  })
})
