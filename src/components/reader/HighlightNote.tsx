import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { Highlight } from "@/lib/tauri";
import { Save, FileText, Check, Loader2 } from "lucide-react";
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

  if (!selectedHighlight) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
          <FileText className="h-4 w-4" />
          Note
        </div>
        <div className="rounded-lg border border-dashed border-muted-foreground/25 p-6 text-center">
          <FileText className="mx-auto h-8 w-8 text-muted-foreground/40 mb-2" />
          <p className="text-sm text-muted-foreground">
            Select a highlight to view or add notes
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <FileText className="h-4 w-4" />
          Note
        </div>
        <div className="h-5 flex items-center">
          {isSaving && (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground animate-pulse">
              <Loader2 className="h-3 w-3 animate-spin" />
              Saving...
            </span>
          )}
          {justSaved && !isSaving && (
            <span className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-500">
              <Check className="h-3 w-3" />
              Saved
            </span>
          )}
          {hasUnsavedChanges && !isSaving && (
            <span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-500">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              Unsaved
            </span>
          )}
        </div>
      </div>

      <div className="rounded-lg border bg-muted/40 p-3 transition-colors">
        <p className="line-clamp-2 text-xs text-muted-foreground italic leading-relaxed">
          "{selectedHighlight.text}"
        </p>
      </div>

      <Textarea
        className="min-h-[100px] max-h-48 resize-none border-muted-foreground/20 focus:border-primary/50 transition-colors"
        value={noteDraft}
        onChange={(e) => onNoteChange(e.currentTarget.value)}
        placeholder="Add your thoughts about this passage..."
      />

      <Button
        variant={hasUnsavedChanges ? "default" : "outline"}
        size="sm"
        onClick={onSaveNote}
        disabled={!hasUnsavedChanges || isSaving}
        className="gap-2 transition-all"
      >
        {isSaving ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Save className="h-4 w-4" />
        )}
        {isSaving ? "Saving..." : "Save note"}
      </Button>
    </div>
  );
}
