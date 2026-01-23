import { beforeAll, beforeEach, describe, expect, it, mock } from 'bun:test'
import * as matchers from '@testing-library/jest-dom/matchers'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import React from 'react'

expect.extend(matchers)

describe('AppearancePanel', () => {
  beforeAll(() => {
    global.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    if (!Element.prototype.scrollIntoView) {
      Element.prototype.scrollIntoView = () => {}
    }
  })

  beforeEach(() => {
    try {
      cleanup()
    } catch (e) {
      // Ignore DOM node removal errors common with Radix UI in test environments
    }
  })

  const defaultProps = {
    fontFamily: 'serif',
    lineHeight: 1.6,
    margin: 40,
    onFontFamilyChange: mock(),
    onLineHeightChange: mock(),
    onMarginChange: mock(),
  }

  it('renders correctly with default props', () => {
    render(<AppearancePanel {...defaultProps} />)
    expect(screen.getByText(/Reader Appearance/i)).toBeInTheDocument()
    expect(screen.getByText(/Typeface/i)).toBeInTheDocument()
    expect(screen.getByText(/Line Spacing/i)).toBeInTheDocument()
    expect(screen.getByText(/Page Margins/i)).toBeInTheDocument()
  })

  it('calls onFontFamilyChange when font selection changes', async () => {
    render(<AppearancePanel {...defaultProps} />)
    const trigger = screen.getByRole('combobox')
    fireEvent.click(trigger)
    const option = await screen.findByText('System Sans')
    fireEvent.click(option)
    expect(defaultProps.onFontFamilyChange).toHaveBeenCalledWith('sans-serif')
  })

  it('has sharp corners and bold 2px borders', () => {
    const { container } = render(<AppearancePanel {...defaultProps} />)
    const panel = container.firstChild as HTMLElement
    expect(panel.className).toContain('rounded-none')
    expect(panel.className).toContain('border-2')
  })

  it('uses bold geometric sans-serif for headers', () => {
    render(<AppearancePanel {...defaultProps} />)
    const header = screen.getByText(/READER APPEARANCE/i)
    expect(header.className).toContain('font-black')
    expect(header.className).toContain('uppercase')
  })

  it('has sharp corners on interactive elements', () => {
    render(<AppearancePanel {...defaultProps} />)
    const trigger = screen.getByRole('combobox')
    expect(trigger.className).toContain('rounded-none')
  })
})

import AppearancePanel from '../components/AppearancePanel'
