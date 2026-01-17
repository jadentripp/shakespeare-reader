import { cn } from "@/lib/utils";
import type { Highlight } from "@/lib/tauri";
import HighlightNote from "@/components/reader/HighlightNote";
import HighlightsList from "@/components/reader/HighlightsList";
import TocPanel, { type TocEntry } from "@/components/reader/TocPanel";
import { ScrollArea } from "@/components/ui/scroll-area";
import { List, Highlighter, FileText } from "lucide-react";
import { useState } from "react";

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

type Tab = "contents" | "highlights" | "notes";

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
  const [activeTab, setActiveTab] = useState<Tab>("contents");
  const highlightCount = highlights?.length ?? 0;

  const tabs: { id: Tab; label: string; icon: typeof List; count?: number }[] = [
    { id: "contents", label: "Contents", icon: List, count: tocEntries.length },
    { id: "highlights", label: "Highlights", icon: Highlighter, count: highlightCount },
    { id: "notes", label: "Notes", icon: FileText },
  ];

  return (
    <aside className="min-h-0 flex flex-col">
      <div className="flex h-full flex-col overflow-hidden rounded-xl border border-border/50 bg-card shadow-sm">
        {/* Tab Navigation */}
        <div className="shrink-0 flex border-b border-border/40">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors relative",
                  isActive
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground/80"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{tab.label}</span>
                {tab.count !== undefined && tab.count > 0 && (
                  <span className={cn(
                    "ml-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                    isActive ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                  )}>
                    {tab.count}
                  </span>
                )}
                {isActive && (
                  <div className="absolute bottom-0 left-2 right-2 h-0.5 rounded-t-full bg-primary" />
                )}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="p-3">
            {activeTab === "contents" && (
              <TocPanel
                entries={tocEntries}
                currentEntryId={currentTocEntryId}
                onNavigate={onTocNavigate}
                expanded={tocExpanded}
                onToggleExpanded={onToggleTocExpanded}
              />
            )}

            {activeTab === "highlights" && (
              <div className="space-y-3">
                {selectedHighlightId && (
                  <button
                    type="button"
                    onClick={onClearSelection}
                    className="w-full text-xs text-muted-foreground hover:text-foreground text-right"
                  >
                    Clear selection
                  </button>
                )}
                <HighlightsList
                  highlights={highlights}
                  selectedHighlightId={selectedHighlightId}
                  onSelectHighlight={onSelectHighlight}
                  onDeleteHighlight={onDeleteHighlight}
                  highlightPageMap={highlightPageMap}
                  expanded={highlightLibraryExpanded}
                  onToggleExpanded={onToggleHighlightLibrary}
                />
              </div>
            )}

            {activeTab === "notes" && (
              <HighlightNote
                selectedHighlight={selectedHighlight}
                noteDraft={noteDraft}
                onNoteChange={onNoteDraftChange}
                onSaveNote={onSaveNote}
              />
            )}
          </div>
        </ScrollArea>
      </div>
    </aside>
  );
}
