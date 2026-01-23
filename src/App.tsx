import { Outlet } from '@tanstack/react-router'
import { useEffect } from 'react'
import { GlobalNav } from './components/ui/GlobalNav'
import { LibraryProvider } from './hooks/LibraryProvider'
import { dbInit } from './lib/tauri'

let didInit = false

export default function AppLayout() {
  useEffect(() => {
    if (!didInit) {
      didInit = true
      void dbInit()
    }
  }, [])

  return (
    <LibraryProvider>
      <div className="h-screen min-h-screen w-full flex flex-col bg-background text-foreground overflow-hidden">
        <GlobalNav />

        <main className="flex-1 min-h-0 bg-muted/20 relative overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </LibraryProvider>
  )
}
