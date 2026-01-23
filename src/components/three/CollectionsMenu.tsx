import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChevronDown, Sparkles, BookOpen, Feather, Globe, FlaskConical } from "lucide-react";
import { CATALOG_GROUPS, type CatalogEntry } from "../../lib/gutenberg";

const QUICK_COLLECTIONS = [
  { key: "collection-all", icon: BookOpen, label: "All Books" },
  { key: "collection-shakespeare", icon: Feather, label: "Shakespeare" },
  { key: "collection-greek-tragedy", icon: Globe, label: "Greek Tragedy" },
  { key: "collection-greek-epic", icon: Sparkles, label: "Greek Epics" },
];

const CATEGORY_SHORTCUTS = [
  { key: "category-literature-adventure", label: "Adventure" },
  { key: "category-literature-novels", label: "Novels" },
  { key: "category-literature-poetry", label: "Poetry" },
  { key: "category-literature-science-fiction-and-fantasy", label: "Sci-Fi & Fantasy" },
  { key: "category-literature-romance", label: "Romance" },
  { key: "category-literature-biographies", label: "Biographies" },
];

interface CollectionsMenuProps {
  catalogKey: string;
  setCatalogKey: (key: string) => void;
  activeCatalog?: CatalogEntry;
}

export const CollectionsMenu: React.FC<CollectionsMenuProps> = ({
  catalogKey,
  setCatalogKey,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleSelect = (key: string) => {
    setCatalogKey(key);
    setIsExpanded(false);
  };

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 pointer-events-auto">
      {/* Compact pill bar */}
      <div className="flex items-center gap-1 bg-stone-950/80 backdrop-blur-xl rounded-full p-1 border border-white/5">
        {QUICK_COLLECTIONS.map(({ key, icon: Icon, label }) => {
          const isActive = catalogKey === key;
          return (
            <Button
              key={key}
              variant="ghost"
              size="sm"
              onClick={() => handleSelect(key)}
              className={`
                flex items-center gap-1.5 px-3 py-1.5 h-auto rounded-full transition-[color,background-color] duration-200
                ${isActive
                  ? "bg-amber-500/20 text-amber-300"
                  : "text-white/50 hover:text-white/80 hover:bg-white/5"
                }
              `}
            >
              <Icon className="h-3.5 w-3.5" />
              <span className="text-[11px] font-medium">{label}</span>
            </Button>
          );
        })}

        <div className="w-px h-4 bg-white/10 mx-1" />

        {/* More Categories Toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className={`
            flex items-center gap-1.5 px-3 py-1.5 h-auto rounded-full transition-[color,background-color] duration-200
            ${isExpanded
              ? "bg-white/10 text-white"
              : "text-white/50 hover:text-white/80 hover:bg-white/5"
            }
          `}
        >
          <FlaskConical className="h-3.5 w-3.5" />
          <span className="text-[11px] font-medium">More</span>
          <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
        </Button>
      </div>

      {/* Expanded Categories Panel */}
      {isExpanded && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="rounded-xl border border-white/10 bg-stone-950/95 backdrop-blur-xl p-4 shadow-2xl min-w-[360px]">
            {/* Quick picks */}
            <div className="flex flex-wrap gap-1.5 mb-3 pb-3 border-b border-white/5">
              {CATEGORY_SHORTCUTS.map(({ key, label }) => {
                const isActive = catalogKey === key;
                return (
                  <Button
                    key={key}
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSelect(key)}
                    className={`
                      px-2.5 py-1 h-auto rounded-full text-[11px] font-medium transition-[color,background-color]
                      ${isActive
                        ? "bg-amber-500/20 text-amber-300"
                        : "bg-white/5 text-stone-400 hover:text-white hover:bg-white/10"
                      }
                    `}
                  >
                    {label}
                  </Button>
                );
              })}
            </div>

            {/* All categories grid */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 max-h-36 overflow-y-auto">
              {CATALOG_GROUPS.slice(1).flatMap((group) =>
                group.items.slice(0, 6).map((cat) => {
                  const isActive = catalogKey === cat.key;
                  return (
                    <Button
                      key={cat.key}
                      variant="ghost"
                      onClick={() => handleSelect(cat.key)}
                      className={cn(
                        "text-left py-1 px-1.5 h-auto rounded text-[11px] transition-colors truncate justify-start",
                        isActive
                          ? "text-amber-300"
                          : "text-stone-500 hover:text-white hover:bg-white/5"
                      )}
                    >
                      {cat.label}
                    </Button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
