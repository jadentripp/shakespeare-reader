import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import type { Highlight } from "@/lib/tauri";
import { useMemo, useEffect, useState } from "react";

type HighlightNoteProps = {
  selectedHighlight: Highlight | null;
  noteDraft: string;
  onNoteChange: (value: string) => void;
  onSaveNote: () => void;
  isSaving?: boolean;
};

export default function HighlightNote({
  selectedHighlight,
  noteDraft,
  onNoteChange,
  onSaveNote,
  isSaving = false,
}: HighlightNoteProps) {
  const [justSaved, setJustSaved] = useState(false);

  const hasUnsavedChanges = useMemo(() => {
    if (!selectedHighlight) return false;
    const originalNote = selectedHighlight.note ?? "";
    return noteDraft !== originalNote;
  }, [selectedHighlight, noteDraft]);

  useEffect(() => {
    if (!isSaving && !hasUnsavedChanges && selectedHighlight?.note) {
      setJustSaved(true);
      const timer = setTimeout(() => setJustSaved(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [isSaving, hasUnsavedChanges, selectedHighlight?.note]);

  return (
    <div className="rounded-lg border border-border/40 bg-gradient-to-b from-background to-muted/10 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/30 px-3.5 py-2.5">
        <div className="flex items-center gap-2">
          <svg
            className="h-4 w-4 text-muted-foreground/70"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Notes
          </span>
        </div>

        {/* Status indicator */}
        <div className="h-5 flex items-center">
          {isSaving && (
            <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground animate-pulse">
              <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83" />
              </svg>
              Saving
            </span>
          )}
          {justSaved && !isSaving && (
            <span className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-500">
              <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 13l4 4L19 7" />
              </svg>
              Saved
            </span>
          )}
          {hasUnsavedChanges && !isSaving && (
            <span className="flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-500">
              <span className="h-1.5 w-1.5 rounded-full bg-current" />
              Unsaved
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-3">
        {selectedHighlight ? (
          <div className="space-y-3">
            {/* Selected text preview */}
            <div className="rounded-md bg-amber-500/5 border border-amber-500/20 p-2.5">
              <p className="text-xs text-foreground/70 leading-relaxed line-clamp-2 italic">
                "{selectedHighlight.text}"
              </p>
            </div>

            {/* Textarea */}
            <Textarea
              className={cn(
                "min-h-[80px] max-h-32 resize-none text-sm",
                "border-border/40 bg-background/50",
                "focus:border-primary/40 focus:ring-1 focus:ring-primary/20",
                "placeholder:text-muted-foreground/50"
              )}
              value={noteDraft}
              onChange={(e) => onNoteChange(e.currentTarget.value)}
              placeholder="Add your thoughts..."
            />

            {/* Save button */}
            <button
              type="button"
              onClick={onSaveNote}
              disabled={!hasUnsavedChanges || isSaving}
              className={cn(
                "flex w-full items-center justify-center gap-2 rounded-md px-3 py-2 text-xs font-medium transition-all",
                hasUnsavedChanges
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "bg-muted/50 text-muted-foreground cursor-not-allowed"
              )}
            >
              {isSaving ? (
                <>
                  <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83" />
                  </svg>
                  Saving...
                </>
              ) : (
                <>
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                  </svg>
                  Save note
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-muted/50">
              <svg className="h-5 w-5 text-muted-foreground/50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-xs text-muted-foreground">
              Select a highlight to add notes
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
