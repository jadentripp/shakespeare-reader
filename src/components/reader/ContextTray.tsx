import React from "react";
import { X, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { StagedSnippet } from "@/lib/readerTypes";

interface ContextTrayProps {
  snippets: StagedSnippet[];
  onRemove: (id: string) => void;
  onClear: () => void;
  className?: string;
}

export function ContextTray({ snippets, onRemove, onClear, className }: ContextTrayProps) {
  if (snippets.length === 0) return null;

  return (
    <div className={cn("flex flex-col gap-2 p-3 bg-white dark:bg-black border-2 border-black dark:border-white mb-2", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-baseline gap-2">
          <div className="bg-[#0055A4] px-1.5 py-0.5">
            <span className="text-[10px] font-black uppercase tracking-tighter text-white leading-none">CONTEXT</span>
          </div>
          <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
            {snippets.length} SNIPPET{snippets.length !== 1 ? "S" : ""} STAGED
          </span>
        </div>
        <button
          onClick={onClear}
          className="group flex items-center gap-1.5 px-2 py-0.5 hover:bg-[#E02E2E] transition-colors"
          title="Clear Context"
        >
          <Trash2 className="h-3 w-3 group-hover:text-white" />
          <span className="text-[9px] font-black uppercase tracking-widest group-hover:text-white">CLEAR</span>
        </button>
      </div>

      <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-black dark:scrollbar-thumb-white">
        {snippets.map((snippet) => (
          <div
            key={snippet.id}
            className="flex items-center gap-2 bg-white dark:bg-black border border-black dark:border-white px-2 py-1 group hover:border-[#0055A4] transition-colors relative"
          >
            <div className="absolute left-0 top-0 w-1 h-full bg-[#0055A4]" />
            <span className="text-[11px] font-medium line-clamp-1 max-w-[200px] pl-1">
              {snippet.text}
            </span>
            <button
              onClick={() => onRemove(snippet.id)}
              className="p-0.5 hover:bg-[#0055A4] hover:text-white transition-colors"
              aria-label="Remove snippet"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
