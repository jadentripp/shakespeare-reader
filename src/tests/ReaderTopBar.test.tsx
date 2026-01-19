import { describe, it, expect, beforeEach, mock } from "bun:test";
import { render, screen, cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';
import ReaderTopBar from '../components/reader/ReaderTopBar';

expect.extend(matchers);

describe('ReaderTopBar', () => {
  const defaultProps: any = {
    showAppearance: false,
    onShowAppearanceChange: mock(),
    fontFamily: 'serif',
    lineHeight: 1.6,
    margin: 40,
    onFontFamilyChange: mock(),
    onLineHeightChange: mock(),
    onMarginChange: mock(),
    columns: 1,
    onToggleColumns: mock(),
    onPrev: mock(),
    onNext: mock(),
    currentPage: 1,
    totalPages: 10,
    jumpPage: '',
    onJumpPageChange: mock(),
    onJumpPageGo: mock(),
    onBack: mock(),
    // TTS props
    ttsState: 'idle',
    onTtsPlay: mock(),
    onTtsPause: mock(),
    onTtsStop: mock(),
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
