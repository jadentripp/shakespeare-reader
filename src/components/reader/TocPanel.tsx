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
    { regex: /^(THE\s+)?(TRAGEDY|PLAY|COMEDY|HISTORY|POEM|SONNETS?|LIFE)\b/i, label: "Works" },
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
        "group relative flex w-full items-start gap-3 rounded-none px-2.5 py-2.5 text-left transition-all",
        "hover:bg-black/5 dark:hover:bg-white/5",
        isActive && "bg-[#E02E2E]/10 border-l-4 border-[#E02E2E]"
      )}
      style={{ paddingLeft: `${0.625 + indent * 0.75}rem` }}
    >
      <div
        className={cn(
          "mt-1.5 h-2 w-2 shrink-0 rounded-none transition-colors",
          isActive
            ? "bg-[#E02E2E]"
            : "bg-black/20 dark:bg-white/20 group-hover:bg-black dark:group-hover:bg-white"
        )}
      />

      <span
        className={cn(
          "flex-1 text-[11px] font-bold uppercase tracking-wider leading-snug transition-colors line-clamp-2",
          isActive
            ? "text-[#E02E2E]"
            : "text-foreground group-hover:text-foreground"
        )}
      >
        {entry.text}
      </span>
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
    <div className="border-b-2 border-black/5 dark:border-white/5 last:border-b-0">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "group flex w-full items-center gap-2 rounded-none px-2 py-3 text-left transition-all",
          "hover:bg-black/5 dark:hover:bg-white/5",
          hasActiveChild && !isExpanded && "bg-[#E02E2E]/5"
        )}
      >
        <div className="flex h-4 w-4 items-center justify-center text-foreground">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </div>
        <span
          className={cn(
            "flex-1 text-[11px] font-black uppercase tracking-[0.1em] leading-snug",
            hasActiveChild ? "text-[#E02E2E]" : "text-foreground"
          )}
        >
          {group.label}
        </span>
        <span className="text-[10px] font-black tabular-nums bg-black/10 dark:bg-white/10 px-1 text-muted-foreground">
          {group.entries.length}
        </span>
      </button>

      <div
        className={cn(
          "overflow-hidden transition-all duration-200 ease-in-out",
          isExpanded ? "max-h-[10000px] opacity-100" : "max-h-0 opacity-0"
        )}
      >
        {isExpanded && (
          <div className="ml-4 border-l-2 border-black/10 dark:border-white/10">
            {group.entries.map((entry) => (
              <TocItem
                key={entry.id}
                entry={entry}
                isActive={entry.id === currentEntryId}
                onNavigate={onNavigate}
                indent={0}
              />
            ))}
          </div>
        )}
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
      <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed border-black/10 dark:border-white/10">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-none bg-black/5 dark:bg-white/5 border-2 border-black/10 dark:border-white/10">
          <List className="h-6 w-6 text-muted-foreground/50" />
        </div>
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">NO CHAPTERS FOUND</p>
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
