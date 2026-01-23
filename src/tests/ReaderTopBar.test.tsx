import { beforeEach, describe, expect, it, mock } from 'bun:test'
import * as matchers from '@testing-library/jest-dom/matchers'
import { cleanup, render, screen } from '@testing-library/react'
import ReaderTopBar from '../components/reader/ReaderTopBar'

expect.extend(matchers)

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
  }

  beforeEach(() => {
    cleanup()
  })

  it('renders the TTS play button when idle', () => {
    render(<ReaderTopBar {...defaultProps} />)
    // @ts-expect-error
    const playButton = screen.getByLabelText(/Play Narration/i)
    expect(playButton).toBeInTheDocument()
  })

  it('renders with sharp edges and Bauhaus branding', () => {
    render(<ReaderTopBar {...defaultProps} />)
    const container = screen.getByRole('banner')
    // Check for 2px bottom border on the container
    expect(container.className).toContain('border-b-2')

    // Check for AI Reader branding style (boxed Bauhaus)
    const brand = screen.getByText(/AI READER/i)
    expect(brand).toBeInTheDocument()
    expect(brand.className).toContain('font-black')
    expect(brand.className).toContain('tracking-tighter')
  })

  it('contains no rounded corners in navigation elements', () => {
    const { container } = render(<ReaderTopBar {...defaultProps} />)
    const roundedElements = container.querySelectorAll(
      '[class*="rounded-full"], [class*="rounded-lg"], [class*="rounded-md"]',
    )
    expect(roundedElements.length).toBe(0)
  })

  it('renders a Bauhaus Red reading progress bar', () => {
    render(<ReaderTopBar {...defaultProps} currentPage={5} totalPages={10} />)
    const progressBar = screen.getByRole('progressbar', { name: /reading progress/i })
    expect(progressBar).toBeInTheDocument()
    expect(progressBar.className).toContain('bg-[#E02E2E]')
    expect(progressBar.style.width).toBe('50%')
  })

  it('uses bold geometric sans-serif for title', () => {
    render(<ReaderTopBar {...defaultProps} title="The Metamorphosis" />)
    const title = screen.getByText('The Metamorphosis')
    expect(title.className).toContain('font-bold')
    expect(title.className).toContain('uppercase')
  })
})
