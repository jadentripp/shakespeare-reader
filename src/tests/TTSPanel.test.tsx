import { beforeEach, describe, expect, it, mock } from 'bun:test'
import * as matchers from '@testing-library/jest-dom/matchers'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import React from 'react'

expect.extend(matchers)

const mockPlayCurrentPage = mock(() => Promise.resolve())
const mockPause = mock(() => {})
const mockResume = mock(() => {})
const mockStop = mock(() => {})
const mockSetPlaybackRate = mock(() => {})
const mockSetVolume = mock(() => {})
const mockSeek = mock(() => {})
const mockChangeVoice = mock(() => {})

mock.module('@/lib/pocket-tts', () => {
  return {
    pocketTTSService: {
      getVoices: mock(() =>
        Promise.resolve([
          { id: 'v1', name: 'Voice 1' },
          { id: 'v2', name: 'Voice 2' },
        ]),
      ),
      healthCheck: mock(() => Promise.resolve(true)),
      subscribeStatus: mock(() => () => {}),
    },
  }
})

// Import component - no need to mock useTTS since TTSPanel receives tts as prop
import { TTSPanel } from '../components/reader/TTSPanel'

// Create a mock TTS object that matches TTSHook interface
const createMockTts = (overrides = {}) => ({
  state: 'playing' as const,
  progress: { currentTime: 10, duration: 100, isBuffering: false },
  playCurrentPage: mockPlayCurrentPage,
  pause: mockPause,
  resume: mockResume,
  stop: mockStop,
  setPlaybackRate: mockSetPlaybackRate,
  setVolume: mockSetVolume,
  seek: mockSeek,
  voiceId: 'v1',
  changeVoice: mockChangeVoice,
  ...overrides,
})

describe('TTSPanel', () => {
  beforeEach(() => {
    mockPlayCurrentPage.mockClear()
    mockPause.mockClear()
    mockChangeVoice.mockClear()
  })


  it('renders the player bar when playing', async () => {
    render(<TTSPanel tts={createMockTts()} />)

    // Should show pause button
    const pauseButton = await waitFor(() =>
      screen
        .getByTestId('tts-panel-container')
        .querySelector('button svg.lucide-pause')
        ?.closest('button'),
    )
    expect(pauseButton).toBeInTheDocument()

    // Settings toggle should be present
    const settingsToggle = screen.getByLabelText('Toggle settings')
    expect(settingsToggle).toBeInTheDocument()
  })

  it('can toggle play/pause', async () => {
    render(<TTSPanel tts={createMockTts()} />)

    const pauseButton = await waitFor(() =>
      screen
        .getByTestId('tts-panel-container')
        .querySelector('button svg.lucide-pause')
        ?.closest('button'),
    )
    fireEvent.click(pauseButton!)

    expect(mockPause).toHaveBeenCalled()
  })

  it('displays progress slider', () => {
    render(<TTSPanel tts={createMockTts()} />)
    const slider = screen.getByRole('slider')
    expect(slider).toBeInTheDocument()
  })

  it('displays current time and duration', () => {
    render(<TTSPanel tts={createMockTts()} />)
    expect(screen.getByText('0:10')).toBeInTheDocument()
    expect(screen.getByText('1:40')).toBeInTheDocument() // 100 seconds
  })

  it('renders voice selector button when settings toggled', async () => {
    render(<TTSPanel tts={createMockTts()} />)

    // Initially hidden
    expect(screen.queryByText('Voice 1')).not.toBeInTheDocument()

    // Toggle settings
    const settingsToggle = screen.getByLabelText('Toggle settings')
    fireEvent.click(settingsToggle)

    expect(await screen.findByText('Voice 1')).toBeInTheDocument()
  })

  it('has a close/hide button', () => {
    render(<TTSPanel tts={createMockTts()} />)
    // Look for the X icon button
    const closeButton = screen
      .getByTestId('tts-panel-container')
      .querySelector('button svg.lucide-x')
      ?.closest('button')
    expect(closeButton).toBeInTheDocument()
  })

  it('shows a loading indicator and disables play while buffering', () => {
    const tts = createMockTts({
      state: 'buffering',
      progress: { currentTime: 0, duration: 0, isBuffering: true },
    })
    render(<TTSPanel tts={tts} />)

    expect(screen.getByText(/loading/i)).toBeInTheDocument()
    const playButton = screen.getByLabelText('Play')
    expect(playButton).toBeDisabled()
  })

  it('shows a slow-load hint after prolonged buffering', async () => {
    const tts = createMockTts({
      state: 'buffering',
      progress: { currentTime: 0, duration: 0, isBuffering: true },
    })

    render(<TTSPanel tts={tts} />)
    expect(screen.queryByText(/still loading/i)).not.toBeInTheDocument()

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 2100))
    })
    expect(screen.getByText(/still loading/i)).toBeInTheDocument()
  })
})
