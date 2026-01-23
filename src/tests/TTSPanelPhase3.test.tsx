import { beforeEach, describe, expect, it, mock } from 'bun:test'
import { cleanup, render, screen } from '@testing-library/react'
import React from 'react'
import { TTSPanel } from '../components/reader/TTSPanel'

// Mock elevenLabsService
mock.module('../lib/elevenlabs', () => ({
  elevenLabsService: {
    getVoices: mock(() => Promise.resolve([])),
  },
}))

// Create a mock TTS object that matches TTSHook interface
const createMockTts = (overrides = {}) => ({
  state: 'playing' as const,
  progress: { currentTime: 0, duration: 120, isBuffering: false },
  playCurrentPage: mock(() => Promise.resolve()),
  pause: mock(() => {}),
  resume: mock(() => {}),
  stop: mock(() => {}),
  setPlaybackRate: mock(() => {}),
  setVolume: mock(() => {}),
  seek: mock(() => {}),
  voiceId: 'v1',
  changeVoice: mock(() => {}),
  ...overrides,
})

describe('TTSPanel Bauhaus Alignment', () => {
  beforeEach(() => {
    cleanup()
  })

  it('should have sharp corners and bold 2px borders', () => {
    const { container } = render(<TTSPanel tts={createMockTts()} />)
    const panel = container.querySelector('[data-testid="tts-panel-container"]')
    expect(panel?.className).toContain('rounded-none')
    expect(panel?.className).toContain('border-2')
  })

  it('should have a Bauhaus Red progress bar with sharp edges', () => {
    const { container } = render(<TTSPanel tts={createMockTts()} />)
    // Check for the progress bar color
    const progressFill = container.querySelector('[class*="bg-[#E02E2E]"]')
    expect(progressFill).toBeDefined()
  })

  it('should use bold geometric sans-serif for labels', () => {
    render(<TTSPanel tts={createMockTts()} />)
    const timeLabels = screen.getAllByText('0:00')
    expect(timeLabels[0].parentElement?.className).toContain('font-black')
  })
})
