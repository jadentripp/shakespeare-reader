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
import { Highlighter, Trash2, FileText } from "lucide-react";

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
}: HighlightsListProps) {
  if (!highlights?.length) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-muted/50">
          <Highlighter className="h-5 w-5 text-muted-foreground/50" />
        </div>
        <p className="text-xs text-muted-foreground">Select text to highlight</p>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {highlights.map((highlight) => {
        const isSelected = highlight.id === selectedHighlightId;
        const hasNote = !!highlight.note;
        const page = highlightPageMap[highlight.id];

        return (
          <div
            key={highlight.id}
            className={cn(
              "group relative rounded-lg p-3 transition-all cursor-pointer border",
              isSelected
                ? "bg-amber-500/10 border-amber-500/30"
                : "border-transparent hover:bg-muted/50 hover:border-border/50"
            )}
            onClick={() => onSelectHighlight(highlight.id)}
          >
            <div
              className={cn(
                "absolute left-0 top-3 bottom-3 w-0.5 rounded-full transition-colors",
                isSelected ? "bg-amber-500" : "bg-amber-500/30"
              )}
            />

            <div className="pl-2 pr-5">
              <p
                className={cn(
                  "text-sm leading-relaxed line-clamp-3",
                  isSelected ? "text-foreground" : "text-foreground/80"
                )}
              >
                "{highlight.text}"
              </p>

              <div className="mt-2 flex items-center gap-2">
                {hasNote && (
                  <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <FileText className="h-3 w-3" />
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

            <div className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100">
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
                    <Trash2 className="h-3.5 w-3.5" />
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
    </div>
  );
}
