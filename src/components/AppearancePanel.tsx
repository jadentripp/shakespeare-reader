import type React from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { cn } from '@/lib/utils'

interface AppearancePanelProps {
  fontFamily: string
  lineHeight: number
  margin: number
  onFontFamilyChange: (font: string) => void
  onLineHeightChange: (lh: number) => void
  onMarginChange: (m: number) => void
}

const FONTS = [
  { value: "'EB Garamond', serif", label: 'EB Garamond', preview: 'EB Garamond' },
  { value: "'Baskervville', serif", label: 'Baskerville', preview: 'Baskervville' },
  { value: 'Georgia, serif', label: 'Georgia', preview: 'Georgia' },
  { value: "'Inter', sans-serif", label: 'Inter', preview: 'Inter' },
  { value: 'serif', label: 'System Serif', preview: 'serif' },
  { value: 'sans-serif', label: 'System Sans', preview: 'sans-serif' },
]

const AppearancePanel: React.FC<AppearancePanelProps> = ({
  fontFamily,
  lineHeight,
  margin,
  onFontFamilyChange,
  onLineHeightChange,
  onMarginChange,
}) => {
  return (
    <div className="w-80 overflow-hidden rounded-none border-2 border-black dark:border-white bg-background shadow-2xl">
      {/* Header */}
      <div className="border-b-2 border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 px-5 py-4">
        <h3 className="text-xs font-black uppercase tracking-tighter text-foreground">
          READER APPEARANCE
        </h3>
        <p className="mt-1 text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
          Bauhaus Typographic System
        </p>
      </div>

      <div className="space-y-6 p-5">
        {/* Font Family */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <svg
              className="h-4 w-4 text-black dark:text-white"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M4 7V4h16v3M9 20h6M12 4v16" />
            </svg>
            <Label className="text-[10px] font-black uppercase tracking-widest text-foreground">
              Typeface
            </Label>
          </div>
          <Select value={fontFamily} onValueChange={onFontFamilyChange}>
            <SelectTrigger className="h-11 w-full rounded-none border-2 border-black/20 dark:border-white/20 bg-background transition-[border-color] hover:border-black dark:hover:border-white focus:ring-0">
              <SelectValue placeholder="Select a font" />
            </SelectTrigger>
            <SelectContent className="rounded-none border-2 border-black dark:border-white">
              {FONTS.map((font) => (
                <SelectItem
                  key={font.value}
                  value={font.value}
                  className="rounded-none py-2.5 font-medium hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black"
                >
                  <span style={{ fontFamily: font.preview }}>{font.label}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Font Preview */}
          <div
            className="rounded-none border-2 border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 px-4 py-4 text-center"
            style={{ fontFamily }}
          >
            <span className="text-lg font-medium text-foreground">The quick brown fox…</span>
          </div>
        </div>

        {/* Divider */}
        <div className="h-0.5 bg-black/10 dark:bg-white/10" />

        {/* Line Height */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg
                className="h-4 w-4 text-black dark:text-white"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M21 10H3M21 6H3M21 14H3M21 18H3" />
              </svg>
              <Label className="text-[10px] font-black uppercase tracking-widest text-foreground">
                Line Spacing
              </Label>
            </div>
            <span className="bg-black text-white dark:bg-white dark:text-black px-2 py-0.5 font-mono text-[10px] font-bold tabular-nums">
              {lineHeight.toFixed(1)}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              onClick={() => onLineHeightChange(Math.max(1, lineHeight - 0.1))}
              className={cn(
                'h-9 w-9 rounded-none border-2 border-black/20 dark:border-white/20',
                'bg-background text-foreground transition-[background-color,color,border-color,transform]',
                'hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black hover:border-black dark:hover:border-white active:scale-95',
              )}
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path d="M5 12h14" />
              </svg>
            </Button>
            <Slider
              min={1}
              max={3}
              step={0.1}
              value={[lineHeight]}
              onValueChange={(value) => value[0] !== undefined && onLineHeightChange(value[0])}
              className="flex-1"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => onLineHeightChange(Math.min(3, lineHeight + 0.1))}
              className={cn(
                'h-9 w-9 rounded-none border-2 border-black/20 dark:border-white/20',
                'bg-background text-foreground transition-[background-color,color,border-color,transform]',
                'hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black hover:border-black dark:hover:border-white active:scale-95',
              )}
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path d="M12 5v14M5 12h14" />
              </svg>
            </Button>
          </div>

          {/* Line Height Visual */}
          <div className="flex justify-between gap-2 pt-1">
            {[1.2, 1.6, 2.0].map((lh) => (
              <Button
                key={lh}
                variant="ghost"
                onClick={() => onLineHeightChange(lh)}
                className={cn(
                  'group flex flex-1 flex-col items-center gap-2 h-auto rounded-none border-2 py-2 transition-[background-color,color,border-color]',
                  Math.abs(lineHeight - lh) < 0.15
                    ? 'bg-black text-white border-black dark:bg-white dark:text-black dark:border-white hover:bg-black/90 dark:hover:bg-white/90'
                    : 'border-black/10 dark:border-white/10 hover:border-black dark:hover:border-white',
                )}
              >
                <div className="flex flex-col" style={{ gap: `${(lh - 1) * 3}px` }}>
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className={cn(
                        'h-0.5 w-6 rounded-none transition-colors',
                        Math.abs(lineHeight - lh) < 0.15
                          ? 'bg-white dark:bg-black'
                          : 'bg-black/30 dark:bg-white/30 group-hover:bg-black dark:group-hover:bg-white',
                      )}
                    />
                  ))}
                </div>
                <span className="text-[9px] font-bold uppercase tracking-widest">
                  {lh === 1.2 ? 'Tight' : lh === 1.6 ? 'Normal' : 'Relaxed'}
                </span>
              </Button>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className="h-0.5 bg-black/10 dark:bg-white/10" />

        {/* Margin */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg
                className="h-4 w-4 text-black dark:text-white"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <rect x="3" y="3" width="18" height="18" rx="0" />
                <path d="M7 3v18M17 3v18" />
              </svg>
              <Label className="text-[10px] font-black uppercase tracking-widest text-foreground">
                Page Margins
              </Label>
            </div>
            <span className="bg-[#E02E2E] text-white px-2 py-0.5 font-mono text-[10px] font-bold tabular-nums">
              {margin}PX
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              onClick={() => onMarginChange(Math.max(0, margin - 10))}
              className={cn(
                'h-9 w-9 rounded-none border-2 border-black/20 dark:border-white/20',
                'bg-background text-foreground transition-[background-color,color,border-color,transform]',
                'hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black hover:border-black dark:hover:border-white active:scale-95',
              )}
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path d="M5 12h14" />
              </svg>
            </Button>
            <Slider
              min={0}
              max={200}
              step={10}
              value={[margin]}
              onValueChange={(value) => value[0] !== undefined && onMarginChange(value[0])}
              className="flex-1"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => onMarginChange(Math.min(200, margin + 10))}
              className={cn(
                'h-9 w-9 rounded-none border-2 border-black/20 dark:border-white/20',
                'bg-background text-foreground transition-[background-color,color,border-color,transform]',
                'hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black hover:border-black dark:hover:border-white active:scale-95',
              )}
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path d="M12 5v14M5 12h14" />
              </svg>
            </Button>
          </div>

          {/* Margin Visual */}
          <div className="flex justify-between gap-2 pt-1">
            {[
              { value: 20, label: 'Narrow' },
              { value: 80, label: 'Medium' },
              { value: 150, label: 'Wide' },
            ].map(({ value, label }) => (
              <Button
                key={value}
                variant="ghost"
                onClick={() => onMarginChange(value)}
                className={cn(
                  'group flex flex-1 flex-col items-center gap-2 h-auto rounded-none border-2 py-2 transition-[background-color,color,border-color]',
                  Math.abs(margin - value) < 25
                    ? 'bg-[#E02E2E] text-white border-[#E02E2E] hover:bg-[#E02E2E]/90'
                    : 'border-black/10 dark:border-white/10 hover:border-black dark:hover:border-white',
                )}
              >
                <div
                  className={cn(
                    'flex h-6 w-10 items-center justify-center rounded-none border transition-colors',
                    Math.abs(margin - value) < 25
                      ? 'border-white/40 bg-white/10'
                      : 'border-black/20 dark:border-white/20 bg-black/5 dark:bg-white/5',
                  )}
                >
                  <div
                    className={cn(
                      'h-4 rounded-none transition-colors',
                      Math.abs(margin - value) < 25
                        ? 'bg-white'
                        : 'bg-black/20 dark:bg-white/20 group-hover:bg-black/40 dark:group-hover:bg-white/40',
                    )}
                    style={{ width: `${100 - value / 3}%` }}
                  />
                </div>
                <span className="text-[9px] font-bold uppercase tracking-widest">{label}</span>
              </Button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default AppearancePanel
