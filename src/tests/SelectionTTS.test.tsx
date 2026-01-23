import { beforeEach, describe, expect, it, mock } from 'bun:test'
import * as matchers from '@testing-library/jest-dom/matchers'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import React from 'react'

expect.extend(matchers)

describe('ReaderPane Selection TTS', () => {
  const defaultProps: any = {
    columns: 1,
    readerWidth: 800,
    iframeRef: { current: null },
    containerRef: { current: null },
    srcDoc: '<html></html>',
    onLoad: mock(),
    pendingHighlight: {
      text: 'Selected text to read aloud',
      rect: { top: 100, left: 100, width: 200, height: 20 },
      startPath: [],
      startOffset: 0,
      endPath: [],
      endOffset: 10,
    },
    onCreateHighlight: mock(),
    onCancelHighlight: mock(),
    onAddToChat: mock(),
    onReadAloud: mock(),
    activeCitation: null,
    onActiveCitationChange: mock(),
  }

  beforeEach(() => {
    cleanup()
  })

  it('renders the Read button in the selection popover', () => {
    render(<ReaderPane {...defaultProps} />)
    const readButton = screen.getByText(/Read/i)
    expect(readButton).toBeInTheDocument()
  })

  it('calls onReadAloud when the Read button is clicked', () => {
    render(<ReaderPane {...defaultProps} />)
    const readButton = screen.getByText(/Read/i)
    fireEvent.click(readButton)
    expect(defaultProps.onReadAloud).toHaveBeenCalledWith('Selected text to read aloud')
  })
})

import ReaderPane from '../components/reader/ReaderPane'
