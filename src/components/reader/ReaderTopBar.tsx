import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import AppearancePanel from "@/components/AppearancePanel";
import { ChevronLeft, ChevronRight, Settings2, Columns2, BookOpen } from "lucide-react";

type ReaderTopBarProps = {
  title?: string;
  showAppearance: boolean;
  onShowAppearanceChange: (open: boolean) => void;
  fontFamily: string;
  lineHeight: number;
  margin: number;
  onFontFamilyChange: (value: string) => void;
  onLineHeightChange: (value: number) => void;
  onMarginChange: (value: number) => void;
  columns: 1 | 2;
  onToggleColumns: () => void;
  onPrev: () => void;
  onNext: () => void;
  currentPage: number;
  totalPages: number;
  jumpPage: string;
  onJumpPageChange: (value: string) => void;
  onJumpPageGo: () => void;
  onBack: () => void;
};

export default function ReaderTopBar({
  title,
  showAppearance,
  onShowAppearanceChange,
  fontFamily,
  lineHeight,
  margin,
  onFontFamilyChange,
  onLineHeightChange,
  onMarginChange,
  columns,
  onToggleColumns,
  onPrev,
  onNext,
  currentPage,
  totalPages,
  jumpPage,
  onJumpPageChange,
  onJumpPageGo,
  onBack,
}: ReaderTopBarProps) {
  return (
    <div className="shrink-0 flex items-center gap-4 px-2 py-1.5">
      {/* Left: Back + Title */}
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="h-8 w-8 p-0 shrink-0 rounded-full hover:bg-muted/60"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <p className="truncate text-sm font-medium text-foreground/90">{title}</p>
      </div>

      {/* Center: Navigation */}
      <div className="flex items-center rounded-full border bg-card/60 backdrop-blur-sm shadow-sm">
        <Button
          variant="ghost"
          size="sm"
          onClick={onPrev}
          className="h-9 w-9 p-0 rounded-full hover:bg-muted/60"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-0.5 px-1">
          <Input
            className="h-7 w-12 text-center text-sm font-medium border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 tabular-nums"
            value={jumpPage}
            onChange={(e) => onJumpPageChange(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key !== "Enter") return;
              onJumpPageGo();
            }}
            placeholder={String(currentPage)}
          />
          <span className="text-muted-foreground/60 text-sm">/</span>
          <span className="text-sm text-muted-foreground tabular-nums pr-1">
            {totalPages}
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onNext}
          className="h-9 w-9 p-0 rounded-full hover:bg-muted/60"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Right: View controls */}
      <div className="flex items-center gap-3">
        {/* Page layout toggle */}
        <div className="flex items-center rounded-lg border bg-muted/30 p-0.5">
          <button
            type="button"
            onClick={columns === 1 ? undefined : onToggleColumns}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-all ${
              columns === 1
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <BookOpen className="h-3.5 w-3.5" />
            <span>Single</span>
          </button>
          <button
            type="button"
            onClick={columns === 2 ? undefined : onToggleColumns}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-all ${
              columns === 2
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Columns2 className="h-3.5 w-3.5" />
            <span>Spread</span>
          </button>
        </div>

        {/* Appearance settings */}
        <Popover open={showAppearance} onOpenChange={onShowAppearanceChange}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-1.5 rounded-lg border bg-muted/30 px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-all hover:bg-muted hover:text-foreground"
            >
              <Settings2 className="h-3.5 w-3.5" />
              <span>Display</span>
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-auto p-0">
            <AppearancePanel
              fontFamily={fontFamily}
              lineHeight={lineHeight}
              margin={margin}
              onFontFamilyChange={onFontFamilyChange}
              onLineHeightChange={onLineHeightChange}
              onMarginChange={onMarginChange}
            />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
