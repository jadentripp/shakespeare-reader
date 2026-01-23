import { beforeEach, describe, expect, it, mock } from 'bun:test'
import * as matchers from '@testing-library/jest-dom/matchers'
import { fireEvent, render, screen } from '@testing-library/react'

expect.extend(matchers)

const mockSeek = mock(() => {})
const mockSetPlaybackRate = mock(() => {})
const mockSetVolume = mock(() => {})

mock.module('@/lib/hooks/useTTS', () => {
  return {
    useTTS: () => ({
      state: 'playing',
      progress: { currentTime: 30, duration: 120, isBuffering: false },
      playCurrentPage: mock(() => {}),
      pause: mock(() => {}),
      resume: mock(() => {}),
      stop: mock(() => {}),
      seek: mockSeek,
      setPlaybackRate: mockSetPlaybackRate,
      setVolume: mockSetVolume,
    }),
  }
})

import { TTSProgressBar } from '../components/reader/TTSProgressBar'

describe('TTSProgressBar', () => {
  beforeEach(() => {
    mockSeek.mockClear()
  })

  it('renders progress bar with current time and duration', () => {
    render(<TTSProgressBar currentPage={5} totalPages={380} />)

    expect(screen.getByTestId('elapsed-time')).toBeInTheDocument()
    expect(screen.getByTestId('duration-time')).toBeInTheDocument()
  })

  it('displays page context information', () => {
    render(<TTSProgressBar currentPage={42} totalPages={380} />)

    expect(screen.getByText('PAGE 42 / 380')).toBeInTheDocument()
  })

  it('shows correct progress percentage', () => {
    render(<TTSProgressBar currentPage={5} totalPages={380} />)

    const progressFill = screen.getByTestId('progress-fill')
    expect(progressFill).toHaveStyle({ width: '25%' })
  })

  it('is seekable - allows clicking to seek', () => {
    render(<TTSProgressBar currentPage={5} totalPages={380} />)

    const progressTrack = screen.getByTestId('progress-track')
    fireEvent.click(progressTrack, { clientX: 150 })

    expect(mockSeek).toHaveBeenCalled()
  })

  it('has proper ARIA labels for accessibility', () => {
    render(<TTSProgressBar currentPage={5} totalPages={380} />)

    const progressTrack = screen.getByTestId('progress-track')
    expect(progressTrack).toHaveAttribute('role', 'slider')
    expect(progressTrack).toHaveAttribute('aria-label')
  })

  it('displays elapsed and remaining time', () => {
    render(<TTSProgressBar currentPage={5} totalPages={380} />)

    expect(screen.getByTestId('elapsed-time')).toBeInTheDocument()
    expect(screen.getByTestId('remaining-time')).toBeInTheDocument()
  })
})
