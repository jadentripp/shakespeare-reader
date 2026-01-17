import { cn } from "@/lib/utils";
import type { Highlight } from "@/lib/tauri";
import HighlightNote from "@/components/reader/HighlightNote";
import HighlightsList from "@/components/reader/HighlightsList";
import TocPanel, { type TocEntry } from "@/components/reader/TocPanel";
import { ScrollArea } from "@/components/ui/scroll-area";

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
  tocEntries: TocEntry[];
  currentTocEntryId: string | null;
  onTocNavigate: (entry: TocEntry) => void;
  tocExpanded: boolean;
  onToggleTocExpanded: () => void;
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
  tocEntries,
  currentTocEntryId,
  onTocNavigate,
  tocExpanded,
  onToggleTocExpanded,
}: HighlightsSidebarProps) {
  return (
    <aside className="min-h-0 flex flex-col">
      <div className="flex h-full flex-col overflow-hidden rounded-xl border border-border/60 bg-gradient-to-b from-card via-card to-card/95 shadow-sm">
        {/* Header */}
        <div className="shrink-0 border-b border-border/40 bg-muted/20 px-4 py-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <svg
                  className="h-4 w-4 text-primary"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div>
                <h2 className="text-sm font-semibold tracking-tight">Reader</h2>
                <p className="text-[11px] text-muted-foreground">
                  Navigate & annotate
                </p>
              </div>
            </div>
            {selectedHighlightId && (
              <button
                type="button"
                onClick={onClearSelection}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                  "text-muted-foreground hover:text-foreground",
                  "hover:bg-muted/60"
                )}
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Scrollable Content */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="flex flex-col gap-1 p-3">
            {/* Table of Contents */}
            <TocPanel
              entries={tocEntries}
              currentEntryId={currentTocEntryId}
              onNavigate={onTocNavigate}
              expanded={tocExpanded}
              onToggleExpanded={onToggleTocExpanded}
            />

            {/* Divider */}
            <div className="my-2 h-px bg-gradient-to-r from-transparent via-border/50 to-transparent" />

            {/* Highlights Section */}
            <HighlightsList
              highlights={highlights}
              selectedHighlightId={selectedHighlightId}
              onSelectHighlight={onSelectHighlight}
              onDeleteHighlight={onDeleteHighlight}
              highlightPageMap={highlightPageMap}
              expanded={highlightLibraryExpanded}
              onToggleExpanded={onToggleHighlightLibrary}
            />

            {/* Divider */}
            <div className="my-2 h-px bg-gradient-to-r from-transparent via-border/50 to-transparent" />

            {/* Notes Section */}
            <HighlightNote
              selectedHighlight={selectedHighlight}
              noteDraft={noteDraft}
              onNoteChange={onNoteDraftChange}
              onSaveNote={onSaveNote}
            />
          </div>
        </ScrollArea>
      </div>
    </aside>
  );
}
