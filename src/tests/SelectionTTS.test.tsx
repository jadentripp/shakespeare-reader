// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';
import ReaderPane from '../components/reader/ReaderPane';

expect.extend(matchers);

describe('ReaderPane Selection TTS', () => {
  const defaultProps: any = {
    columns: 1,
    readerWidth: 800,
    iframeRef: { current: null },
    containerRef: { current: null },
    srcDoc: '<html></html>',
    onLoad: vi.fn(),
    pendingHighlight: {
      text: 'Selected text to read aloud',
      rect: { top: 100, left: 100, width: 200, height: 20 },
      startPath: [],
      startOffset: 0,
      endPath: [],
      endOffset: 10,
    },
    onCreateHighlight: vi.fn(),
    onCancelHighlight: vi.fn(),
    onAddToChat: vi.fn(),
    onReadAloud: vi.fn(),
    activeCitation: null,
    onActiveCitationChange: vi.fn(),
  };

  beforeEach(() => {
    cleanup();
  });

  it('renders the Read button in the selection popover', () => {
    render(<ReaderPane {...defaultProps} />);
    // @ts-ignore
    const readButton = screen.getByText(/Read/i);
    expect(readButton).toBeInTheDocument();
  });

  it('calls onReadAloud when the Read button is clicked', () => {
    render(<ReaderPane {...defaultProps} />);
    // @ts-ignore
    const readButton = screen.getByText(/Read/i);
    fireEvent.click(readButton);
    expect(defaultProps.onReadAloud).toHaveBeenCalledWith('Selected text to read aloud');
  });
});
