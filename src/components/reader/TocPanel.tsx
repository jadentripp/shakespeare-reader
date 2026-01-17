import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

export type TocEntry = {
  id: string;
  level: number;
  text: string;
  element: HTMLElement;
};

type TocPanelProps = {
  entries: TocEntry[];
  currentEntryId: string | null;
  onNavigate: (entry: TocEntry) => void;
  expanded: boolean;
  onToggleExpanded: () => void;
};

export default function TocPanel({
  entries,
  currentEntryId,
  onNavigate,
  expanded,
  onToggleExpanded,
}: TocPanelProps) {
  const visibleEntries = expanded ? entries : entries.slice(0, 5);
  const hasMore = entries.length > 5;

  if (entries.length === 0) {
    return (
      <div className="rounded-lg border border-border/40 bg-gradient-to-b from-background to-muted/10 p-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <svg
            className="h-4 w-4 opacity-50"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M4 6h16M4 12h16M4 18h10" />
          </svg>
          <span>No chapters found</span>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border/40 bg-gradient-to-b from-background to-muted/10 overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={onToggleExpanded}
        className="flex w-full items-center justify-between gap-2 border-b border-border/30 px-3.5 py-2.5 text-left transition-colors hover:bg-muted/30"
      >
        <div className="flex items-center gap-2">
          <svg
            className="h-4 w-4 text-primary/70"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M4 6h16M4 10h16M4 14h12M4 18h8" />
          </svg>
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Contents
          </span>
          <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
            {entries.length}
          </span>
        </div>
        <svg
          className={cn(
            "h-3.5 w-3.5 text-muted-foreground/60 transition-transform duration-200",
            expanded && "rotate-180"
          )}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {/* Entries */}
      <ScrollArea className={cn("transition-all duration-200", expanded ? "h-56" : "h-44")}>
        <div>
          <div className="p-1.5">
            {visibleEntries.map((entry) => {
              const isActive = entry.id === currentEntryId;
              const indent = Math.min(entry.level - 1, 3);

              return (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => onNavigate(entry)}
                  className={cn(
                    "group relative flex w-full items-start gap-2 rounded-md px-2.5 py-2 text-left transition-all",
                    "hover:bg-muted/50",
                    isActive && "bg-primary/8"
                  )}
                  style={{ paddingLeft: `${0.625 + indent * 0.625}rem` }}
                >
                  {/* Indent line */}
                  {indent > 0 && (
                    <div
                      className={cn(
                        "absolute left-2 top-0 bottom-0 w-px",
                        isActive ? "bg-primary/40" : "bg-border/50"
                      )}
                    />
                  )}

                  {/* Marker */}
                  <div
                    className={cn(
                      "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full transition-colors",
                      isActive
                        ? "bg-primary"
                        : "bg-muted-foreground/25 group-hover:bg-muted-foreground/40"
                    )}
                  />

                  {/* Text */}
                  <span
                    className={cn(
                      "flex-1 text-sm leading-snug transition-colors line-clamp-1",
                      isActive
                        ? "font-medium text-primary"
                        : "text-foreground/75 group-hover:text-foreground",
                      entry.level === 1 && "font-medium"
                    )}
                  >
                    {entry.text}
                  </span>

                  {/* Active indicator bar */}
                  {isActive && (
                    <div className="absolute right-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-l-full bg-primary" />
                  )}
                </button>
              );
            })}

            {/* Show more */}
            {hasMore && !expanded && (
              <button
                type="button"
                onClick={onToggleExpanded}
                className="flex w-full items-center justify-center gap-1 py-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                <span>Show {entries.length - 5} more</span>
                <svg
                  className="h-3 w-3"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
