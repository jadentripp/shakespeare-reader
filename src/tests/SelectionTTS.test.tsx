import { beforeEach, describe, expect, it, mock } from 'bun:test'
import * as matchers from '@testing-library/jest-dom/matchers'
import { fireEvent, render, screen } from '@testing-library/react'
import React from 'react'

expect.extend(matchers)

mock.module('react-dom', () => ({
  createPortal: (node: React.ReactNode) => node,
}))

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

  it('renders the Read button in the selection popover', () => {
    const { unmount } = render(<ReaderPane {...defaultProps} />)
    const readButton = screen.getByText(/Read/i)
    expect(readButton).toBeInTheDocument()
    unmount()
  })

  it('calls onReadAloud when the Read button is clicked', () => {
    const { unmount } = render(<ReaderPane {...defaultProps} />)
    const readButton = screen.getByText(/Read/i)
    fireEvent.click(readButton)
    expect(defaultProps.onReadAloud).toHaveBeenCalledWith('Selected text to read aloud')
    unmount()
  })
})

import ReaderPane from '../components/reader/ReaderPane'
