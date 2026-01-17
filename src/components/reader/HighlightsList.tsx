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
  const visibleHighlights = expanded ? highlights : highlights?.slice(0, 3);
  const hasMore = (highlights?.length ?? 0) > 3;

  return (
    <div className="rounded-lg border border-border/40 bg-gradient-to-b from-background to-muted/10 overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={onToggleExpanded}
        className="flex w-full items-center justify-between gap-2 border-b border-border/30 px-3.5 py-2.5 text-left transition-colors hover:bg-muted/30"
      >
        <div className="flex items-center gap-2">
          <svg
            className="h-4 w-4 text-amber-600/70 dark:text-amber-500/70"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Highlights
          </span>
          {highlights && highlights.length > 0 && (
            <span className="rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-400">
              {highlights.length}
            </span>
          )}
        </div>
        <svg
          className={cn(
            "h-3.5 w-3.5 text-muted-foreground/60 transition-transform duration-200",
            expanded && "rotate-180"
          )}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {/* Content */}
      <div className={cn("transition-all duration-200", expanded ? "max-h-64" : "max-h-40")}>
        <ScrollArea className="h-full">
          <div className="p-2">
            {visibleHighlights?.length ? (
              <div className="space-y-1.5">
                {visibleHighlights.map((highlight) => {
                  const isSelected = highlight.id === selectedHighlightId;
                  const hasNote = !!highlight.note;
                  const page = highlightPageMap[highlight.id];

                  return (
                    <div
                      key={highlight.id}
                      className={cn(
                        "group relative rounded-md p-2.5 transition-all cursor-pointer",
                        isSelected
                          ? "bg-amber-500/10 ring-1 ring-amber-500/30"
                          : "hover:bg-muted/50"
                      )}
                      onClick={() => onSelectHighlight(highlight.id)}
                    >
                      {/* Highlight marker */}
                      <div
                        className={cn(
                          "absolute left-0 top-2 bottom-2 w-0.5 rounded-full transition-colors",
                          isSelected ? "bg-amber-500" : "bg-amber-500/30"
                        )}
                      />

                      <div className="pl-2.5 pr-6">
                        <p
                          className={cn(
                            "text-sm leading-relaxed line-clamp-2",
                            isSelected ? "text-foreground" : "text-foreground/80"
                          )}
                          style={{ fontStyle: "italic" }}
                        >
                          "{highlight.text}"
                        </p>

                        <div className="mt-1.5 flex items-center gap-2">
                          {hasNote && (
                            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                              <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              Note
                            </span>
                          )}
                          {page && (
                            <span className="text-[10px] text-muted-foreground/70">
                              p. {page}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Delete button */}
                      <div className="absolute right-1.5 top-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <button
                              type="button"
                              className={cn(
                                "flex h-6 w-6 items-center justify-center rounded-md transition-colors",
                                "text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10"
                              )}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </AlertDialogTrigger>
                          <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete highlight?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently delete this highlight and any associated notes.
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

                {/* Show more */}
                {hasMore && !expanded && (
                  <button
                    type="button"
                    onClick={onToggleExpanded}
                    className="flex w-full items-center justify-center gap-1 py-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <span>Show {(highlights?.length ?? 0) - 3} more</span>
                    <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </button>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-muted/50">
                  <svg className="h-5 w-5 text-muted-foreground/50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </div>
                <p className="text-xs text-muted-foreground">
                  Select text to highlight
                </p>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
