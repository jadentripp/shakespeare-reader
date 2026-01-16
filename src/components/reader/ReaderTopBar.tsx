import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import AppearancePanel from "@/components/AppearancePanel";

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
    <div className="shrink-0 flex flex-wrap items-center gap-3 rounded-xl border border-border/80 bg-card p-3 shadow-sm">
      <Button variant="outline" size="sm" onClick={onBack}>
        Back
      </Button>
      <div className="min-w-0 flex-1">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">Reading</div>
        <div className="truncate font-semibold">{title}</div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Popover open={showAppearance} onOpenChange={onShowAppearanceChange}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm">
              Appearance
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

        <Separator orientation="vertical" className="h-6" />

        <Button
          variant={columns === 2 ? "secondary" : "outline"}
          size="sm"
          onClick={onToggleColumns}
        >
          {columns === 1 ? "Single" : "Dual"}
        </Button>

        <Separator orientation="vertical" className="h-6" />

        <Button variant="outline" size="sm" onClick={onPrev}>
          Prev
        </Button>
        <Button variant="outline" size="sm" onClick={onNext}>
          Next
        </Button>
        <Badge variant="secondary" className="px-2 py-1 text-xs font-medium">
          Page {currentPage} / {totalPages}
        </Badge>
        <div className="flex items-center gap-2">
          <Input
            className="h-8 w-20"
            placeholder="Page"
            value={jumpPage}
            onChange={(e) => onJumpPageChange(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key !== "Enter") return;
              onJumpPageGo();
            }}
          />
          <Button variant="secondary" size="sm" onClick={onJumpPageGo}>
            Go
          </Button>
        </div>
      </div>
    </div>
  );
}
