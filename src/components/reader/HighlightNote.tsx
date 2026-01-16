import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { Highlight } from "@/lib/tauri";

type HighlightNoteProps = {
  selectedHighlight: Highlight | null;
  noteDraft: string;
  onNoteChange: (value: string) => void;
  onSaveNote: () => void;
};

export default function HighlightNote({
  selectedHighlight,
  noteDraft,
  onNoteChange,
  onSaveNote,
}: HighlightNoteProps) {
  return (
    <div className="space-y-2">
      <div className="text-sm font-semibold">Note</div>
      {selectedHighlight ? (
        <>
          <Textarea
            className="min-h-[72px] max-h-32"
            value={noteDraft}
            onChange={(e) => onNoteChange(e.currentTarget.value)}
            placeholder="Leave a note about this passage..."
          />
          <Button variant="outline" size="sm" onClick={onSaveNote}>
            Save note
          </Button>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          Select a highlight to attach a note or keep chatting on this page.
        </p>
      )}
    </div>
  );
}
