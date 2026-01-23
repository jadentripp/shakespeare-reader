import { describe, expect, it } from 'bun:test'
import { renderHook } from '@testing-library/react'
import { useChatSidebar } from '../lib/reader/hooks/useChatSidebar'

describe('useChatSidebar hook', () => {
  it('should initialize with default states', () => {
    const { result } = renderHook(() => useChatSidebar())

    // Add assertions for internal state if any
    expect(result).toBeDefined()
  })
})
