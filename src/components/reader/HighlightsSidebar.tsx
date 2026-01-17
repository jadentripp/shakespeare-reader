import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Highlight } from "@/lib/tauri";
import HighlightNote from "@/components/reader/HighlightNote";
import HighlightsList from "@/components/reader/HighlightsList";

type HighlightsSidebarProps = {
  highlights: Highlight[] | undefined;
  selectedHighlightId: number | null;
  onSelectHighlight: (id: number) => void;
  onDeleteHighlight: (id: number) => void;
  onClearSelection: () => void;
  highlightLibraryExpanded: boolean;
  onToggleHighlightLibrary: () => void;
  highlightPageMap: Record<number, number>;
  selectedHighlight: Highlight | null;
  noteDraft: string;
  onNoteDraftChange: (value: string) => void;
  onSaveNote: () => void;
};

export default function HighlightsSidebar({
  highlights,
  selectedHighlightId,
  onSelectHighlight,
  onDeleteHighlight,
  onClearSelection,
  highlightLibraryExpanded,
  onToggleHighlightLibrary,
  highlightPageMap,
  selectedHighlight,
  noteDraft,
  onNoteDraftChange,
  onSaveNote,
}: HighlightsSidebarProps) {
  return (
    <aside className="min-h-0">
      <Card className="flex h-full flex-col overflow-hidden">
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>Highlights & Notes</CardTitle>
            <p className="text-sm text-muted-foreground">
              {highlights ? `${highlights.length} saved` : "Loading..."}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={onClearSelection}>
            Clear
          </Button>
        </CardHeader>
        <CardContent className="flex-1 min-h-0 overflow-hidden pb-6">
          <div className="flex h-full flex-col gap-4">
            <HighlightsList
              highlights={highlights}
              selectedHighlightId={selectedHighlightId}
              onSelectHighlight={onSelectHighlight}
              onDeleteHighlight={onDeleteHighlight}
              highlightPageMap={highlightPageMap}
              expanded={highlightLibraryExpanded}
              onToggleExpanded={onToggleHighlightLibrary}
            />

            <HighlightNote
              selectedHighlight={selectedHighlight}
              noteDraft={noteDraft}
              onNoteChange={onNoteDraftChange}
              onSaveNote={onSaveNote}
            />
          </div>
        </CardContent>
      </Card>
    </aside>
  );
}
