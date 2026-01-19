// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';
import ReaderTopBar from '../components/reader/ReaderTopBar';

expect.extend(matchers);

describe('ReaderTopBar', () => {
  const defaultProps: any = {
    showAppearance: false,
    onShowAppearanceChange: vi.fn(),
    fontFamily: 'serif',
    lineHeight: 1.6,
    margin: 40,
    onFontFamilyChange: vi.fn(),
    onLineHeightChange: vi.fn(),
    onMarginChange: vi.fn(),
    columns: 1,
    onToggleColumns: vi.fn(),
    onPrev: vi.fn(),
    onNext: vi.fn(),
    currentPage: 1,
    totalPages: 10,
    jumpPage: '',
    onJumpPageChange: vi.fn(),
    onJumpPageGo: vi.fn(),
    onBack: vi.fn(),
    // TTS props
    ttsState: 'idle',
    onTtsPlay: vi.fn(),
    onTtsPause: vi.fn(),
    onTtsStop: vi.fn(),
  };

  beforeEach(() => {
    cleanup();
  });

  it('renders the TTS play button when idle', () => {
    render(<ReaderTopBar {...defaultProps} />);
    // @ts-ignore
    const playButton = screen.getByLabelText(/Play Narration/i);
    expect(playButton).toBeInTheDocument();
  });

  it('renders the pause button when playing', () => {
    render(<ReaderTopBar {...defaultProps} ttsState="playing" />);
    // @ts-ignore
    const pauseButton = screen.getByLabelText(/Pause Narration/i);
    expect(pauseButton).toBeInTheDocument();
  });
});
