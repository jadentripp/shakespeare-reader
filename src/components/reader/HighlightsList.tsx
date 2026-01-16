import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { Highlight } from "@/lib/tauri";

type HighlightsListProps = {
  highlights: Highlight[] | undefined;
  selectedHighlightId: number | null;
  onSelectHighlight: (id: number) => void;
  highlightPageMap: Record<number, number>;
  expanded: boolean;
  onToggleExpanded: () => void;
};

export default function HighlightsList({
  highlights,
  selectedHighlightId,
  onSelectHighlight,
  highlightPageMap,
  expanded,
  onToggleExpanded,
}: HighlightsListProps) {
  const highlightListHeight = expanded ? "h-60" : "h-28";
  const highlightToggleLabel = expanded ? "Collapse" : "Expand";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-semibold">Highlights</div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={onToggleExpanded}
          type="button"
        >
          {highlightToggleLabel}
        </Button>
      </div>
      <ScrollArea className={cn("pr-3", highlightListHeight)}>
        {highlights?.length ? (
          <div className="space-y-2">
            {highlights.map((highlight) => (
              <Button
                key={highlight.id}
                variant={highlight.id === selectedHighlightId ? "secondary" : "outline"}
                className={cn(
                  "h-auto w-full justify-start whitespace-normal text-left",
                  highlight.id === selectedHighlightId && "border-primary/40"
                )}
                onClick={() => onSelectHighlight(highlight.id)}
              >
                <div className="space-y-1">
                  <div className="text-sm font-medium leading-snug">"{highlight.text}"</div>
                  <div className="text-xs text-muted-foreground">
                    {highlight.note ? "Note attached" : "No note yet"}
                    {highlightPageMap[highlight.id] ? ` | Page ${highlightPageMap[highlight.id]}` : null}
                  </div>
                </div>
              </Button>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
            Select text in the reader to add a note and start a chat.
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
