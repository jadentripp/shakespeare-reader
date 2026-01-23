import { afterEach, beforeAll, beforeEach, describe, expect, it, mock, spyOn } from 'bun:test'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import * as matchers from '@testing-library/jest-dom/matchers'
import { cleanup, render, screen } from '@testing-library/react'
import React from 'react'
import { LibraryProvider } from '../hooks/LibraryProvider'

import * as tauri from '../lib/tauri'

expect.extend(matchers)

// We no longer mock internal components here if they are safe to render with global R3F mocks.
// This avoids module leakage to other tests like ReadingRoom.test.tsx.

import ThreeDLibraryPage from '../routes/ThreeDLibraryPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
})

describe('ThreeDLibraryPage', () => {
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
    queryClient.clear()

    spies.push(spyOn(tauri, 'listBooks').mockResolvedValue([]))
    spies.push(
      spyOn(tauri, 'gutendexCatalogPage').mockResolvedValue({ results: [], count: 0 } as any),
    )
    spies.push(spyOn(tauri, 'dbInit').mockResolvedValue(undefined as any))
  })

  afterEach(() => {
    spies.forEach((s) => s.mockRestore())
    spies.length = 0
    cleanup()
  })

  it('should render the 3D scene with ReadingRoom elements', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <LibraryProvider>
          <ThreeDLibraryPage />
        </LibraryProvider>
      </QueryClientProvider>,
    )

    expect(screen.getByTestId('canvas')).toBeInTheDocument()
  })
})
