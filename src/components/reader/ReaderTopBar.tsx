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
  const progress = totalPages > 0 ? (currentPage / totalPages) * 100 : 0;

  return (
    <div className="shrink-0 flex items-center gap-4 px-1">
      {/* Left: Back + Title */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="h-9 w-9 p-0 shrink-0"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-semibold leading-tight">{title}</p>
          <div className="flex items-center gap-2.5 mt-0.5">
            <div className="h-1.5 w-32 rounded-full bg-muted/80 overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-sm font-medium text-foreground/80 tabular-nums">
              {currentPage} / {totalPages}
            </span>
          </div>
        </div>
      </div>

      {/* Center: Navigation */}
      <div className="flex items-center gap-1 rounded-lg border bg-card/80 p-1 shadow-sm">
        <Button
          variant="ghost"
          size="sm"
          onClick={onPrev}
          className="h-8 w-8 p-0"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-1 px-1">
          <Input
            className="h-7 w-14 text-center text-xs"
            value={jumpPage}
            onChange={(e) => onJumpPageChange(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key !== "Enter") return;
              onJumpPageGo();
            }}
            placeholder={String(currentPage)}
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={onJumpPageGo}
            className="h-7 px-2 text-xs"
          >
            Go
          </Button>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onNext}
          className="h-8 w-8 p-0"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Right: View controls */}
      <div className="flex items-center gap-1">
        <Button
          variant={columns === 1 ? "secondary" : "ghost"}
          size="sm"
          onClick={columns === 1 ? undefined : onToggleColumns}
          className="h-8 w-8 p-0"
          title="Single page"
        >
          <BookOpen className="h-4 w-4" />
        </Button>
        <Button
          variant={columns === 2 ? "secondary" : "ghost"}
          size="sm"
          onClick={columns === 2 ? undefined : onToggleColumns}
          className="h-8 w-8 p-0"
          title="Two pages"
        >
          <Columns2 className="h-4 w-4" />
        </Button>

        <div className="w-px h-5 bg-border mx-1" />

        <Popover open={showAppearance} onOpenChange={onShowAppearanceChange}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <Settings2 className="h-4 w-4" />
            </Button>
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
