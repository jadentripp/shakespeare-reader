import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import type { Highlight } from "@/lib/tauri";
import { Trash2, FileText, ChevronUp, ChevronDown } from "lucide-react";

type HighlightsListProps = {
  highlights: Highlight[] | undefined;
  selectedHighlightId: number | null;
  onSelectHighlight: (id: number) => void;
  onDeleteHighlight: (id: number) => void;
  highlightPageMap: Record<number, number>;
  expanded: boolean;
  onToggleExpanded: () => void;
};

export default function HighlightsList({
  highlights,
  selectedHighlightId,
  onSelectHighlight,
  onDeleteHighlight,
  highlightPageMap,
  expanded,
  onToggleExpanded,
}: HighlightsListProps) {
  const highlightListHeight = expanded ? "h-72" : "h-32";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">Highlights</span>
          {highlights && highlights.length > 0 && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              {highlights.length}
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={onToggleExpanded}
          type="button"
        >
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </div>
      <ScrollArea className={cn("pr-2", highlightListHeight)}>
        {highlights?.length ? (
          <div className="space-y-2">
            {highlights.map((highlight) => {
              const isSelected = highlight.id === selectedHighlightId;
              const hasNote = !!highlight.note;
              return (
                <div
                  key={highlight.id}
                  className={cn(
                    "group relative rounded-lg border p-3 transition-colors cursor-pointer",
                    isSelected
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-muted-foreground/30 hover:bg-muted/50"
                  )}
                  onClick={() => onSelectHighlight(highlight.id)}
                >
                  <div className="pr-8">
                    <p className="text-sm leading-relaxed line-clamp-2">
                      "{highlight.text}"
                    </p>
                    <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                      {hasNote && (
                        <span className="flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          Note
                        </span>
                      )}
                      {highlightPageMap[highlight.id] && (
                        <span>Page {highlightPageMap[highlight.id]}</span>
                      )}
                    </div>
                  </div>
                  <div className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete highlight?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete this highlight and any associated notes or chat messages.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => onDeleteHighlight(highlight.id)}
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-6 text-center">
            <p className="text-sm text-muted-foreground">
              Select text in the reader to create your first highlight
            </p>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
