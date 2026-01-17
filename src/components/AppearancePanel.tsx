import React from "react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

interface AppearancePanelProps {
  fontFamily: string;
  lineHeight: number;
  margin: number;
  onFontFamilyChange: (font: string) => void;
  onLineHeightChange: (lh: number) => void;
  onMarginChange: (m: number) => void;
}

const FONTS = [
  { value: "'EB Garamond', serif", label: "EB Garamond", preview: "EB Garamond" },
  { value: "'Baskervville', serif", label: "Baskerville", preview: "Baskervville" },
  { value: "Georgia, serif", label: "Georgia", preview: "Georgia" },
  { value: "'Inter', sans-serif", label: "Inter", preview: "Inter" },
  { value: "serif", label: "System Serif", preview: "serif" },
  { value: "sans-serif", label: "System Sans", preview: "sans-serif" },
];

const AppearancePanel: React.FC<AppearancePanelProps> = ({
  fontFamily,
  lineHeight,
  margin,
  onFontFamilyChange,
  onLineHeightChange,
  onMarginChange,
}) => {
  return (
    <div className="w-80 overflow-hidden rounded-xl border border-border/60 bg-gradient-to-b from-card to-card/95 shadow-xl">
      {/* Header */}
      <div className="border-b border-border/40 bg-muted/30 px-5 py-4">
        <h3 className="text-sm font-medium tracking-wide text-foreground/90">
          Reader Appearance
        </h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Customize your reading experience
        </p>
      </div>

      <div className="space-y-5 p-5">
        {/* Font Family */}
        <div className="space-y-2.5">
          <div className="flex items-center gap-2">
            <svg
              className="h-4 w-4 text-muted-foreground/70"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M4 7V4h16v3M9 20h6M12 4v16" />
            </svg>
            <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Typeface
            </Label>
          </div>
          <Select value={fontFamily} onValueChange={onFontFamilyChange}>
            <SelectTrigger className="h-11 w-full rounded-lg border-border/50 bg-background/50 transition-colors hover:bg-background focus:ring-1 focus:ring-ring/30">
              <SelectValue placeholder="Select a font" />
            </SelectTrigger>
            <SelectContent className="rounded-lg">
              {FONTS.map((font) => (
                <SelectItem
                  key={font.value}
                  value={font.value}
                  className="rounded-md py-2.5"
                >
                  <span style={{ fontFamily: font.preview }}>{font.label}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {/* Font Preview */}
          <div
            className="rounded-lg border border-border/30 bg-muted/20 px-4 py-3 text-center"
            style={{ fontFamily }}
          >
            <span className="text-lg text-foreground/80">
              To be, or not to be...
            </span>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-border/60 to-transparent" />

        {/* Line Height */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg
                className="h-4 w-4 text-muted-foreground/70"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path d="M21 10H3M21 6H3M21 14H3M21 18H3" />
              </svg>
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Line Spacing
              </Label>
            </div>
            <span className="rounded-md bg-muted/50 px-2 py-0.5 font-mono text-xs text-muted-foreground">
              {lineHeight.toFixed(1)}×
            </span>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => onLineHeightChange(Math.max(1, lineHeight - 0.1))}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-md border border-border/50",
                "bg-background/50 text-muted-foreground transition-all",
                "hover:bg-muted hover:text-foreground active:scale-95"
              )}
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14" />
              </svg>
            </button>
            <Slider
              min={1}
              max={3}
              step={0.1}
              value={[lineHeight]}
              onValueChange={(value) => onLineHeightChange(value[0])}
              className="flex-1"
            />
            <button
              type="button"
              onClick={() => onLineHeightChange(Math.min(3, lineHeight + 0.1))}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-md border border-border/50",
                "bg-background/50 text-muted-foreground transition-all",
                "hover:bg-muted hover:text-foreground active:scale-95"
              )}
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </button>
          </div>
          
          {/* Line Height Visual */}
          <div className="flex justify-center gap-4 pt-1">
            {[1.2, 1.6, 2.0].map((lh) => (
              <button
                key={lh}
                type="button"
                onClick={() => onLineHeightChange(lh)}
                className={cn(
                  "group flex flex-col items-center gap-1 rounded-md px-2 py-1.5 transition-colors",
                  Math.abs(lineHeight - lh) < 0.15
                    ? "bg-primary/10"
                    : "hover:bg-muted/50"
                )}
              >
                <div className="flex flex-col" style={{ gap: `${(lh - 1) * 2}px` }}>
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className={cn(
                        "h-0.5 w-5 rounded-full transition-colors",
                        Math.abs(lineHeight - lh) < 0.15
                          ? "bg-primary"
                          : "bg-muted-foreground/30 group-hover:bg-muted-foreground/50"
                      )}
                    />
                  ))}
                </div>
                <span
                  className={cn(
                    "text-[10px] font-medium transition-colors",
                    Math.abs(lineHeight - lh) < 0.15
                      ? "text-primary"
                      : "text-muted-foreground/60"
                  )}
                >
                  {lh === 1.2 ? "Tight" : lh === 1.6 ? "Normal" : "Relaxed"}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-border/60 to-transparent" />

        {/* Margin */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg
                className="h-4 w-4 text-muted-foreground/70"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M7 3v18M17 3v18" />
              </svg>
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Page Margins
              </Label>
            </div>
            <span className="rounded-md bg-muted/50 px-2 py-0.5 font-mono text-xs text-muted-foreground">
              {margin}px
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => onMarginChange(Math.max(0, margin - 10))}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-md border border-border/50",
                "bg-background/50 text-muted-foreground transition-all",
                "hover:bg-muted hover:text-foreground active:scale-95"
              )}
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14" />
              </svg>
            </button>
            <Slider
              min={0}
              max={200}
              step={10}
              value={[margin]}
              onValueChange={(value) => onMarginChange(value[0])}
              className="flex-1"
            />
            <button
              type="button"
              onClick={() => onMarginChange(Math.min(200, margin + 10))}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-md border border-border/50",
                "bg-background/50 text-muted-foreground transition-all",
                "hover:bg-muted hover:text-foreground active:scale-95"
              )}
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </button>
          </div>

          {/* Margin Visual */}
          <div className="flex justify-center gap-3 pt-1">
            {[
              { value: 20, label: "Narrow" },
              { value: 80, label: "Medium" },
              { value: 150, label: "Wide" },
            ].map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => onMarginChange(value)}
                className={cn(
                  "group flex flex-col items-center gap-1.5 rounded-md px-2 py-1.5 transition-colors",
                  Math.abs(margin - value) < 25
                    ? "bg-primary/10"
                    : "hover:bg-muted/50"
                )}
              >
                <div
                  className={cn(
                    "flex h-6 w-10 items-center justify-center rounded border transition-colors",
                    Math.abs(margin - value) < 25
                      ? "border-primary/40 bg-primary/5"
                      : "border-border/40 bg-muted/20"
                  )}
                >
                  <div
                    className={cn(
                      "h-4 rounded-sm transition-colors",
                      Math.abs(margin - value) < 25
                        ? "bg-primary/60"
                        : "bg-muted-foreground/20"
                    )}
                    style={{ width: `${100 - value / 3}%` }}
                  />
                </div>
                <span
                  className={cn(
                    "text-[10px] font-medium transition-colors",
                    Math.abs(margin - value) < 25
                      ? "text-primary"
                      : "text-muted-foreground/60"
                  )}
                >
                  {label}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppearancePanel;
