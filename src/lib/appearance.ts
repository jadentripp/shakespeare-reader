import { useEffect, useState } from 'react'

export interface AppearanceSettings {
  fontFamily: string
  lineHeight: number
  margin: number
}

const DEFAULT_SETTINGS: AppearanceSettings = {
  fontFamily: "'EB Garamond', serif",
  lineHeight: 1.65,
  margin: 40,
}

export function useReaderAppearance(bookId: string | number) {
  const storageKey = `reader-appearance-${bookId}`

  const [settings, setSettings] = useState<AppearanceSettings>(() => {
    const saved = localStorage.getItem(storageKey)
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch (e) {
        console.error('Failed to parse appearance settings', e)
      }
    }
    return DEFAULT_SETTINGS
  })

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(settings))
  }, [storageKey, settings])

  return {
    ...settings,
    setFontFamily: (fontFamily: string) => setSettings((s) => ({ ...s, fontFamily })),
    setLineHeight: (lineHeight: number) => setSettings((s) => ({ ...s, lineHeight })),
    setMargin: (margin: number) => setSettings((s) => ({ ...s, margin })),
    updateSettings: (newSettings: Partial<AppearanceSettings>) =>
      setSettings((s) => ({ ...s, ...newSettings })),
  }
}
