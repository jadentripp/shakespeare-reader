import type { QueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useRef } from 'react'
import { setThreadLastCfi } from '@/lib/tauri'
import { DEBOUNCE_SAVE_PROGRESS, DEBOUNCE_SAVE_THREAD_PROGRESS } from '../constants'
import { findFirstVisibleBlock, makeBlockCfi } from '../navigation'

export interface UseProgressPersistenceOptions {
  progressKey: string | null
  currentPage: number
  currentThreadId: number | null
  bookId: number
  getScrollRoot: () => HTMLElement | null
  queryClient: QueryClient
}

export interface UseProgressPersistenceResult {
  scheduleSaveProgress: (page: number) => void
  scheduleSaveThreadProgress: () => void
  cleanup: () => void
}

export function useProgressPersistence(
  options: UseProgressPersistenceOptions,
): UseProgressPersistenceResult {
  const { progressKey, currentThreadId, bookId, getScrollRoot, queryClient } = options

  const saveTimeoutRef = useRef<number | null>(null)
  const threadSaveTimeoutRef = useRef<number | null>(null)

  const scheduleSaveProgress = useCallback(
    (page: number) => {
      if (saveTimeoutRef.current !== null) return
      if (!progressKey) return
      const key = progressKey
      saveTimeoutRef.current = window.setTimeout(() => {
        saveTimeoutRef.current = null
        localStorage.setItem(key, JSON.stringify({ page }))
      }, DEBOUNCE_SAVE_PROGRESS)
    },
    [progressKey],
  )

  const scheduleSaveThreadProgress = useCallback(() => {
    if (threadSaveTimeoutRef.current !== null) return
    if (currentThreadId === null) return

    threadSaveTimeoutRef.current = window.setTimeout(async () => {
      threadSaveTimeoutRef.current = null
      const root = getScrollRoot()
      if (!root) return

      const currentScroll = root.scrollLeft
      const firstVisible = findFirstVisibleBlock(root, currentScroll)

      if (firstVisible) {
        const blockIndex = parseInt(firstVisible.getAttribute('data-block-index') || '0', 10)
        const cfi = makeBlockCfi(blockIndex)
        try {
          await setThreadLastCfi({ threadId: currentThreadId, cfi })
          queryClient.invalidateQueries({ queryKey: ['bookChatThreads', bookId] })
        } catch (e) {
          console.error('[Thread] Failed to save last_cfi:', e)
        }
      }
    }, DEBOUNCE_SAVE_THREAD_PROGRESS)
  }, [currentThreadId, bookId, getScrollRoot, queryClient])

  const cleanup = useCallback(() => {
    if (saveTimeoutRef.current !== null) {
      window.clearTimeout(saveTimeoutRef.current)
      saveTimeoutRef.current = null
    }
    if (threadSaveTimeoutRef.current !== null) {
      window.clearTimeout(threadSaveTimeoutRef.current)
      threadSaveTimeoutRef.current = null
    }
  }, [])

  useEffect(() => {
    return cleanup
  }, [cleanup])

  return {
    scheduleSaveProgress,
    scheduleSaveThreadProgress,
    cleanup,
  }
}
