import { afterEach, beforeAll, beforeEach, describe, expect, it, mock, spyOn } from 'bun:test'
import * as matchers from '@testing-library/jest-dom/matchers'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import React from 'react'
import * as tauri from '../lib/tauri'

expect.extend(matchers)

import SettingsPage from '../routes/SettingsPage'

describe('SettingsPage Appearance Section', () => {
  const spies: any[] = []

  beforeAll(() => {
    global.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  })

  beforeEach(() => {
    cleanup()
    mock.restore()

    spies.push(spyOn(tauri, 'getSetting').mockResolvedValue(null))
    spies.push(spyOn(tauri, 'setSetting').mockResolvedValue(undefined as any))
    spies.push(
      spyOn(tauri, 'openAiKeyStatus').mockResolvedValue({
        has_env_key: false,
        has_saved_key: false,
      }),
    )
    spies.push(spyOn(tauri, 'dbInit').mockResolvedValue(undefined as any))
  })

  afterEach(() => {
    spies.forEach((s) => s.mockRestore())
    spies.length = 0
    cleanup()
  })

  it('renders the appearance section', async () => {
    render(<SettingsPage />)
    // Appearance section is under "Appearance" tab
    fireEvent.click(screen.getByRole('button', { name: /Appearance/i }))
    expect(screen.getByText(/Typography/i)).toBeInTheDocument()
  })
})
