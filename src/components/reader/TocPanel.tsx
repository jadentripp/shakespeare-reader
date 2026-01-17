import { cn } from "@/lib/utils";
import { List, ChevronRight, ChevronDown } from "lucide-react";
import { useState, useMemo } from "react";

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

type TocGroup = {
  type: "standalone" | "group";
  label: string;
  entries: TocEntry[];
};

function detectGroups(entries: TocEntry[]): TocGroup[] {
  const patterns = [
    { regex: /^BOOK\s+([IVXLCDM]+|[0-9]+)\b/i, label: "Books" },
    { regex: /^Chapter\s+([IVXLCDM]+|[0-9]+)\b/i, label: "Chapters" },
    { regex: /^Part\s+([IVXLCDM]+|[0-9]+)\b/i, label: "Parts" },
    { regex: /^Act\s+([IVXLCDM]+|[0-9]+)\b/i, label: "Acts" },
    { regex: /^Scene\s+([IVXLCDM]+|[0-9]+)\b/i, label: "Scenes" },
    { regex: /^Canto\s+([IVXLCDM]+|[0-9]+)\b/i, label: "Cantos" },
    { regex: /^Section\s+([IVXLCDM]+|[0-9]+)\b/i, label: "Sections" },
  ];

  const patternMatches = new Map<string, { entries: TocEntry[]; indices: number[] }>();

  entries.forEach((entry, index) => {
    for (const { regex, label } of patterns) {
      if (regex.test(entry.text.trim())) {
        if (!patternMatches.has(label)) {
          patternMatches.set(label, { entries: [], indices: [] });
        }
        patternMatches.get(label)!.entries.push(entry);
        patternMatches.get(label)!.indices.push(index);
        return;
      }
    }
  });

  const validGroups = new Map<string, { entries: TocEntry[]; firstIndex: number }>();
  patternMatches.forEach((data, label) => {
    if (data.entries.length >= 3) {
      validGroups.set(label, { entries: data.entries, firstIndex: Math.min(...data.indices) });
    }
  });

  if (validGroups.size === 0) {
    return entries.map((entry) => ({
      type: "standalone" as const,
      label: entry.text,
      entries: [entry],
    }));
  }

  const groupedIndices = new Set<number>();
  patternMatches.forEach((data, label) => {
    if (validGroups.has(label)) {
      data.indices.forEach((i) => groupedIndices.add(i));
    }
  });

  const result: TocGroup[] = [];
  const groupsToInsert = Array.from(validGroups.entries())
    .map(([label, data]) => ({ label, ...data }))
    .sort((a, b) => a.firstIndex - b.firstIndex);

  let groupIdx = 0;
  entries.forEach((entry, index) => {
    while (groupIdx < groupsToInsert.length && groupsToInsert[groupIdx].firstIndex === index) {
      const g = groupsToInsert[groupIdx];
      result.push({
        type: "group",
        label: g.label,
        entries: g.entries,
      });
      groupIdx++;
    }

    if (!groupedIndices.has(index)) {
      result.push({
        type: "standalone",
        label: entry.text,
        entries: [entry],
      });
    }
  });

  return result;
}

function TocItem({
  entry,
  isActive,
  onNavigate,
  indent = 0,
}: {
  entry: TocEntry;
  isActive: boolean;
  onNavigate: (entry: TocEntry) => void;
  indent?: number;
}) {
  return (
    <button
      key={entry.id}
      type="button"
      onClick={() => onNavigate(entry)}
      className={cn(
        "group relative flex w-full items-start gap-2 rounded-md px-2.5 py-2 text-left transition-all",
        "hover:bg-muted/50",
        isActive && "bg-primary/10"
      )}
      style={{ paddingLeft: `${0.625 + indent * 0.75}rem` }}
    >
      {indent > 0 && (
        <div
          className={cn(
            "absolute left-2 top-0 bottom-0 w-px",
            isActive ? "bg-primary/40" : "bg-border/40"
          )}
        />
      )}

      <div
        className={cn(
          "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full transition-colors",
          isActive
            ? "bg-primary"
            : "bg-muted-foreground/25 group-hover:bg-muted-foreground/40"
        )}
      />

      <span
        className={cn(
          "flex-1 text-sm leading-snug transition-colors line-clamp-2",
          isActive
            ? "font-medium text-primary"
            : "text-foreground/75 group-hover:text-foreground",
          entry.level === 1 && "font-medium"
        )}
      >
        {entry.text}
      </span>

      {isActive && (
        <div className="absolute right-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-l-full bg-primary" />
      )}
    </button>
  );
}

function CollapsibleGroup({
  group,
  currentEntryId,
  onNavigate,
  defaultExpanded = false,
}: {
  group: TocGroup;
  currentEntryId: string | null;
  onNavigate: (entry: TocEntry) => void;
  defaultExpanded?: boolean;
}) {
  const hasActiveChild = group.entries.some((e) => e.id === currentEntryId);
  const [isExpanded, setIsExpanded] = useState(defaultExpanded || hasActiveChild);

  return (
    <div>
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "group flex w-full items-center gap-1.5 rounded-md px-2 py-2 text-left transition-all",
          "hover:bg-muted/50",
          hasActiveChild && !isExpanded && "bg-primary/5"
        )}
      >
        <div className="flex h-4 w-4 items-center justify-center text-muted-foreground/60">
          {isExpanded ? (
            <ChevronDown className="h-3.5 w-3.5" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5" />
          )}
        </div>
        <span
          className={cn(
            "flex-1 text-sm font-medium leading-snug",
            hasActiveChild ? "text-primary" : "text-foreground/80"
          )}
        >
          {group.label}
        </span>
        <span className="text-xs text-muted-foreground/60">
          ({group.entries.length})
        </span>
      </button>

      <div
        className={cn(
          "overflow-hidden transition-all duration-200 ease-in-out",
          isExpanded ? "max-h-[5000px] opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <div className="ml-2 border-l border-border/40 pl-1">
          {group.entries.map((entry) => (
            <TocItem
              key={entry.id}
              entry={entry}
              isActive={entry.id === currentEntryId}
              onNavigate={onNavigate}
              indent={1}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function TocPanel({
  entries,
  currentEntryId,
  onNavigate,
}: TocPanelProps) {
  const groups = useMemo(() => detectGroups(entries), [entries]);

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-muted/50">
          <List className="h-5 w-5 text-muted-foreground/50" />
        </div>
        <p className="text-xs text-muted-foreground">No chapters found</p>
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      {groups.map((group, idx) =>
        group.type === "group" ? (
          <CollapsibleGroup
            key={`${group.label}-${idx}`}
            group={group}
            currentEntryId={currentEntryId}
            onNavigate={onNavigate}
          />
        ) : (
          <TocItem
            key={group.entries[0].id}
            entry={group.entries[0]}
            isActive={group.entries[0].id === currentEntryId}
            onNavigate={onNavigate}
            indent={Math.min(group.entries[0].level - 1, 3)}
          />
        )
      )}
    </div>
  );
}
