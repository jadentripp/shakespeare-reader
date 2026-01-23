import { afterEach, beforeEach, describe, expect, it, mock, spyOn } from 'bun:test'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, render } from '@testing-library/react'
import type React from 'react'
import { LibraryProvider } from '../hooks/LibraryProvider'
import { useLibrary } from '../hooks/useLibrary'
import * as tauri from '../lib/tauri'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
})

describe('Library State Sharing', () => {
  const spies: any[] = []

  beforeEach(() => {
    cleanup()
    mock.restore()
    queryClient.clear()

    spies.push(spyOn(tauri, 'listBooks').mockResolvedValue([]))
    spies.push(
      spyOn(tauri, 'gutendexCatalogPage').mockResolvedValue({ results: [], count: 0 } as any),
    )
    spies.push(spyOn(tauri, 'hardDeleteBook').mockResolvedValue(undefined as any))
    spies.push(spyOn(tauri, 'downloadGutenbergMobi').mockResolvedValue(undefined as any))
    spies.push(spyOn(tauri, 'dbInit').mockResolvedValue(undefined as any))
  })

  afterEach(() => {
    spies.forEach((s) => s.mockRestore())
    spies.length = 0
    cleanup()
  })

  it('shares state between multiple components using the hook under the same provider', () => {
    let result1: any
    let result2: any

    const Wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        <LibraryProvider>{children}</LibraryProvider>
      </QueryClientProvider>
    )

    const Component1 = () => {
      result1 = useLibrary()
      return null
    }

    const Component2 = () => {
      result2 = useLibrary()
      return null
    }

    render(
      <Wrapper>
        <Component1 />
        <Component2 />
      </Wrapper>,
    )

    act(() => {
      result1.setLibraryQuery('test')
    })

    expect(result1.libraryQuery).toBe('test')
    expect(result2.libraryQuery).toBe('test')
  })
})
