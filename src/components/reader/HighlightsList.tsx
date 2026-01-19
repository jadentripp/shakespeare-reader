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
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { Highlight } from "@/lib/tauri";
import { Highlighter, Trash2, FileText, Check, X, MessageSquarePlus, MessageSquare } from "lucide-react";
import { useState } from "react";

type HighlightsListProps = {
  highlights: Highlight[] | undefined;
  selectedHighlightId: number | null;
  onSelectHighlight: (id: number) => void;
  onDeleteHighlight: (id: number) => void;
  highlightPageMap: Record<number, number>;
  noteDraft: string;
  onNoteDraftChange: (value: string) => void;
  onSaveNote: () => void;
  selectedHighlight: Highlight | null;
  onToggleContext?: (id: number) => void;
  attachedHighlightIds?: number[];
};

export default function HighlightsList({
  highlights = [],
  selectedHighlightId,
  onSelectHighlight,
  onDeleteHighlight,
  highlightPageMap,
  noteDraft,
  onNoteDraftChange,
  onSaveNote,
  selectedHighlight,
  onToggleContext,
  attachedHighlightIds = [],
}: HighlightsListProps) {
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
  // Reset editing state when selection changes
  const [prevSelectedHighlightId, setPrevSelectedHighlightId] = useState(selectedHighlightId);
  if (selectedHighlightId !== prevSelectedHighlightId) {
    setPrevSelectedHighlightId(selectedHighlightId);
    if (selectedHighlightId !== editingNoteId) {
      setEditingNoteId(null);
    }
  }

  const hasUnsavedChanges = selectedHighlight
    ? noteDraft !== (selectedHighlight.note ?? "")
    : false;
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
        const isAttached = attachedHighlightIds.includes(highlight.id);
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
                {hasNote && !isSelected && (
                  <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <FileText className="h-3 w-3" />
                    Note
                  </span>
                )}
                {isAttached && (
                  <span className="flex items-center gap-1 text-[10px] text-primary font-medium">
                    <MessageSquare className="h-3 w-3" />
                    In Chat
                  </span>
                )}
                {page && (
                  <span className="text-[10px] text-muted-foreground/70">
                    p. {page}
                  </span>
                )}
              </div>

              {/* Inline note editing when selected */}
              {isSelected && (
                <div className="mt-3 space-y-2" onClick={(e) => e.stopPropagation()}>
                  <Textarea
                    className={cn(
                      "min-h-[60px] max-h-24 resize-none text-sm",
                      "border-border/40 bg-background/80",
                      "focus:border-amber-500/40 focus:ring-1 focus:ring-amber-500/20",
                      "placeholder:text-muted-foreground/50"
                    )}
                    value={noteDraft}
                    onChange={(e) => onNoteDraftChange(e.currentTarget.value)}
                    placeholder="Add a note..."
                  />
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {hasUnsavedChanges && (
                        <>
                          <button
                            type="button"
                            onClick={onSaveNote}
                            className="flex items-center gap-1.5 rounded-md bg-amber-500 px-2.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-amber-600"
                          >
                            <Check className="h-3 w-3" />
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => onNoteDraftChange(selectedHighlight?.note ?? "")}
                            className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted"
                          >
                            <X className="h-3 w-3" />
                            Cancel
                          </button>
                        </>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => onToggleContext?.(highlight.id)}
                      className={cn(
                        "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                        isAttached
                          ? "bg-primary/10 text-primary hover:bg-primary/20"
                          : "bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary"
                      )}
                    >
                      {isAttached ? <X className="h-3 w-3" /> : <MessageSquarePlus className="h-3 w-3" />}
                      {isAttached ? "Remove from Chat" : "Add to Chat"}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100 flex flex-col gap-1">
              <button
                type="button"
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-md transition-colors",
                  isAttached ? "text-primary bg-primary/10" : "text-muted-foreground/60 hover:text-primary hover:bg-primary/10"
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleContext?.(highlight.id);
                }}
                title={isAttached ? "Remove from Chat" : "Add to Chat"}
              >
                {isAttached ? <MessageSquare className="h-3.5 w-3.5" /> : <MessageSquarePlus className="h-3.5 w-3.5" />}
              </button>

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
