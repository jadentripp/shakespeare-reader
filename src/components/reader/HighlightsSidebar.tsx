import { cn } from "@/lib/utils";
import type { Highlight } from "@/lib/tauri";
import HighlightsList from "@/components/reader/HighlightsList";
import TocPanel, { type TocEntry } from "@/components/reader/TocPanel";
import { ScrollArea } from "@/components/ui/scroll-area";
import { List, Highlighter, PanelLeftClose } from "lucide-react";
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
  onCollapse: () => void;
  onToggleContext?: (id: number) => void;
  attachedHighlightIds?: number[];
};

type Tab = "contents" | "highlights";

export default function HighlightsSidebar({
  highlights = [],
  selectedHighlightId,
  onSelectHighlight,
  onDeleteHighlight,
  onClearSelection,
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
  onCollapse,
  onToggleContext,
  attachedHighlightIds = [],
}: HighlightsSidebarProps) {
  const [activeTab, setActiveTab] = useState<Tab>("contents");
  const highlightCount = highlights?.length ?? 0;

  const tabs: { id: Tab; label: string; icon: typeof List; count?: number }[] = [
    { id: "contents", label: "Contents", icon: List, count: tocEntries.length },
    { id: "highlights", label: "Highlights", icon: Highlighter, count: highlightCount },
  ];

  return (
    <aside className="h-full min-h-0 min-w-0 w-full flex flex-col overflow-hidden">
      <div className="flex h-full flex-col overflow-hidden rounded-none border-2 border-black dark:border-white bg-background shadow-xl">
        {/* Tab Navigation - Bauhaus Style */}
        <div className="shrink-0 border-b-2 border-black dark:border-white">
          <div className="flex items-center justify-between px-3 py-2 bg-black/5 dark:bg-white/5">
            <div className="flex items-center gap-6">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "group flex items-center gap-2 transition-all duration-200 py-1",
                      isActive
                        ? "text-foreground"
                        : "text-muted-foreground/70 hover:text-foreground"
                    )}
                  >
                    <Icon className={cn(
                      "h-4 w-4 transition-transform duration-200",
                      isActive && "scale-110"
                    )} />
                    <span className={cn(
                      "text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-200",
                      isActive ? "opacity-100" : "opacity-60"
                    )}>
                      {tab.label}
                    </span>
                    {tab.count !== undefined && tab.count > 0 && (
                      <span className={cn(
                        "tabular-nums text-[10px] font-black transition-colors duration-200 px-1 bg-black/10 dark:bg-white/10",
                        isActive ? "text-foreground" : "text-muted-foreground/50"
                      )}>
                        {tab.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={onCollapse}
              title="Collapse panel"
              className="flex h-8 w-8 items-center justify-center rounded-none text-muted-foreground/60 transition-all duration-200 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black border border-transparent hover:border-black dark:hover:border-white"
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
          </div>
          {/* Active indicator bar */}
          <div className="relative h-1 bg-black/10 dark:bg-white/10">
            <div
              className="absolute bottom-0 h-1 bg-[#E02E2E] transition-all duration-300 ease-out"
              style={{
                left: `${(tabs.findIndex(t => t.id === activeTab) / tabs.length) * 100}%`,
                width: `${100 / tabs.length}%`,
              }}
            />
          </div>
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
                  noteDraft={noteDraft}
                  onNoteDraftChange={onNoteDraftChange}
                  onSaveNote={onSaveNote}
                  selectedHighlight={selectedHighlight}
                  onToggleContext={onToggleContext}
                  attachedHighlightIds={attachedHighlightIds}
                />
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </aside>
  );
}
