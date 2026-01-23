import { ChevronRight } from "lucide-react";
import {
  CATALOG_GROUPS,
} from "../../lib/gutenberg";

const CATEGORY_ICONS: Record<string, string> = {
  "Literature": "✦",
  "Science & Technology": "◈",
  "History": "◆",
  "Social Sciences & Society": "◇",
  "Philosophy & Religion": "✧",
  "Arts & Culture": "❖",
  "Lifestyle & Hobbies": "○",
  "Health & Medicine": "●",
  "Education & Reference": "◎",
};

interface LibraryCollectionsProps {
  catalogKey: string;
  setCatalogKey: (key: string) => void;
  showAllCategories: boolean;
  setShowAllCategories: (show: boolean) => void;
}

export function LibraryCollections({
  catalogKey,
  setCatalogKey,
  showAllCategories,
  setShowAllCategories,
}: LibraryCollectionsProps) {
  return (
    <section className="relative">
      <div className="flex items-end justify-between mb-8 border-b-2 border-black pb-4 dark:border-white">
        <div>
          <p className="mb-2 font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground">Browse by</p>
          <h2 className="font-sans text-3xl font-black uppercase tracking-tighter text-foreground">
            Categories
          </h2>
        </div>
        <button
          onClick={() => setShowAllCategories(!showAllCategories)}
          className="group flex items-center gap-3 font-mono text-[10px] font-bold uppercase tracking-widest text-foreground transition-colors hover:text-amber-500"
        >
          <span>
            {showAllCategories ? "Close Menu" : "All Categories"}
          </span>
          <ChevronRight className={`h-4 w-4 transition-transform duration-300 ${showAllCategories ? "rotate-90" : ""}`} />
        </button>
      </div>

      {/* Categories Panel - Bauhaus Grid */}
      {showAllCategories && (
        <div className="animate-in fade-in slide-in-from-top-4 duration-400">
          <div className="border-4 border-black bg-white p-8 dark:border-white dark:bg-stone-900">
            <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-3">
              {CATALOG_GROUPS.slice(1).map((group) => (
                <div key={group.label} className="space-y-4">
                  <div className="flex items-center gap-3 border-b border-stone-200 pb-2 dark:border-stone-800">
                    <span className="text-amber-500">{CATEGORY_ICONS[group.label] || "◆"}</span>
                    <h4 className="font-sans text-sm font-black uppercase tracking-tight text-foreground">
                      {group.label}
                    </h4>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {group.items.map((cat) => {
                      const isActive = catalogKey === cat.key;
                      return (
                        <button
                          key={cat.key}
                          onClick={() => {
                            setCatalogKey(cat.key);
                            setShowAllCategories(false);
                          }}
                          className={`px-3 py-1.5 font-mono text-[9px] font-bold uppercase tracking-widest border-2 transition-[background-color,border-color,color] ${isActive
                            ? "bg-black border-black text-white dark:bg-white dark:border-white dark:text-black"
                            : "bg-transparent border-stone-200 text-stone-500 hover:border-black hover:text-black dark:border-stone-800 dark:hover:border-white dark:hover:text-white"
                            }`}
                        >
                          {cat.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}