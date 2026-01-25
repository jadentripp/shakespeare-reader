import { afterEach, beforeAll, beforeEach, describe, expect, it, mock, spyOn } from 'bun:test'
import * as matchers from '@testing-library/jest-dom/matchers'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import React from 'react'

expect.extend(matchers)

const mockGetSetting = mock().mockImplementation((key: string) => {
  if (key === 'pocket_voice_id') return Promise.resolve('v1')
  return Promise.resolve(null)
})
const mockSetSetting = mock().mockResolvedValue(undefined)
const mockOpenAiKeyStatus = mock().mockResolvedValue({
  has_env_key: false,
  has_saved_key: false,
})

const mockGetVoices = mock().mockResolvedValue([
  { id: 'v1', name: 'Alba', description: 'Clear female voice', language: 'English' },
  { id: 'v2', name: 'Marius', description: 'Male voice', language: 'English' },
])

mock.module('../lib/tauri', () => ({
  getSetting: mockGetSetting,
  setSetting: mockSetSetting,
  openAiKeyStatus: mockOpenAiKeyStatus,
  dbInit: mock(() => Promise.resolve()),
  getPocketStatus: mock(() => Promise.resolve('running')),
  startPocketSidecar: mock(() => Promise.resolve('running')),
  stopPocketSidecar: mock(() => Promise.resolve('stopped')),
}))

import { pocketTTSService } from '../lib/pocket-tts'
import SettingsPage from '../routes/SettingsPage'

describe('SettingsPage Voice Selection', () => {
  const spies: any[] = []

  beforeAll(() => {
    global.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    global.Audio = class {
      play() {}
      pause() {}
    } as any
  })

  beforeEach(() => {
    cleanup()
    mock.restore()

    spies.push(spyOn(pocketTTSService, 'healthCheck').mockResolvedValue(true))
    spies.push(spyOn(pocketTTSService, 'getVoices').mockImplementation(() => mockGetVoices()))

    mockGetSetting.mockImplementation((key: string) => {
      if (key === 'pocket_voice_id') return Promise.resolve('v1')
      return Promise.resolve(null)
    })
    mockSetSetting.mockResolvedValue(undefined)
    mockOpenAiKeyStatus.mockResolvedValue({ has_env_key: false, has_saved_key: false })
  })

  afterEach(() => {
    spies.forEach((s) => s.mockRestore())
    spies.length = 0
  })

  const navigateToTab = (tabName: string) => {
    fireEvent.click(screen.getByText(new RegExp(tabName, 'i')))
  }

  it('renders the Voice selection dropdown', async () => {
    render(<SettingsPage />)
    navigateToTab('Audio & TTS')
    const labels = await screen.findAllByText(/Voice/i)
    expect(labels.length).toBeGreaterThan(0)
  })

  it('shows preview button', async () => {
    render(<SettingsPage />)
    navigateToTab('Audio & TTS')
    const previewButton = await screen.findByTitle(/Preview voice/i)
    expect(previewButton).toBeInTheDocument()
  })
})
