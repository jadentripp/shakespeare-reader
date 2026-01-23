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
              "group relative rounded-none p-3 transition-all cursor-pointer border-2",
              isSelected
                ? "bg-[#E02E2E]/10 border-[#E02E2E]"
                : "border-transparent hover:bg-muted/50 hover:border-border/50"
            )}
            onClick={() => onSelectHighlight(highlight.id)}
          >
            <div
              className={cn(
                "absolute left-0 top-0 bottom-0 w-1 transition-colors",
                isSelected ? "bg-[#E02E2E]" : "bg-[#E02E2E]/30"
              )}
            />

            <div className="pl-2 pr-5">
              <p
                className={cn(
                  "text-sm leading-relaxed line-clamp-3 font-medium",
                  isSelected ? "text-foreground" : "text-foreground/80"
                )}
              >
                "{highlight.text}"
              </p>

              <div className="mt-2 flex items-center gap-2">
                {hasNote && !isSelected && (
                  <span className="flex items-center gap-1 text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                    <FileText className="h-3 w-3" />
                    Note
                  </span>
                )}
                {isAttached && (
                  <span className="flex items-center gap-1 text-[10px] text-primary font-bold uppercase tracking-wider">
                    <MessageSquare className="h-3 w-3" />
                    In Chat
                  </span>
                )}
                {page && (
                  <span className="text-[10px] text-muted-foreground/70 font-bold uppercase tracking-wider">
                    p. {page}
                  </span>
                )}
              </div>

              {/* Inline note editing when selected */}
              {isSelected && (
                <div className="mt-3 space-y-2" onClick={(e) => e.stopPropagation()}>
                  <Textarea
                    className={cn(
                      "min-h-[60px] max-h-24 resize-none text-sm rounded-none",
                      "border-2 border-black/20 dark:border-white/20 bg-background/80",
                      "focus:border-[#E02E2E] focus:ring-0",
                      "placeholder:text-muted-foreground/50 font-medium"
                    )}
                    value={noteDraft}
                    onChange={(e) => onNoteDraftChange(e.currentTarget.value)}
                    placeholder="Add a note…"
                  />
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {hasUnsavedChanges && (
                        <>
                          <button
                            type="button"
                            onClick={onSaveNote}
                            className="flex items-center gap-1.5 rounded-none bg-[#E02E2E] px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-white transition-colors hover:bg-black"
                          >
                            <Check className="h-3 w-3" />
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => onNoteDraftChange(selectedHighlight?.note ?? "")}
                            className="flex items-center gap-1.5 rounded-none px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground border-2 border-border/40 transition-colors hover:bg-muted"
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
                        "flex items-center gap-1.5 rounded-none px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest transition-colors",
                        isAttached
                          ? "bg-black text-white dark:bg-white dark:text-black"
                          : "bg-muted text-muted-foreground hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black"
                      )}
                    >
                      {isAttached ? <X className="h-3 w-3" /> : <MessageSquarePlus className="h-3 w-3" />}
                      {isAttached ? "Remove" : "Chat"}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100 flex flex-col gap-1">
              <button
                type="button"
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-none transition-colors border border-transparent",
                  isAttached
                    ? "bg-black text-white dark:bg-white dark:text-black"
                    : "text-muted-foreground/60 hover:text-black hover:border-black dark:hover:text-white dark:hover:border-white"
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
                      "flex h-7 w-7 items-center justify-center rounded-none transition-colors border border-transparent",
                      "text-muted-foreground/60 hover:text-[#E02E2E] hover:border-[#E02E2E]"
                    )}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent onClick={(e) => e.stopPropagation()} className="rounded-none border-2 border-black dark:border-white">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="font-bold uppercase tracking-tight">Delete highlight?</AlertDialogTitle>
                    <AlertDialogDescription className="text-sm">
                      This will permanently delete this highlight and any associated notes.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="rounded-none font-bold uppercase tracking-widest text-[10px]">Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      className="rounded-none bg-[#E02E2E] text-white hover:bg-black font-bold uppercase tracking-widest text-[10px]"
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
