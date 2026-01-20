import { ChevronRight } from "lucide-react";
import {
  CATALOG_BY_KEY,
  CATALOG_GROUPS,
} from "../../lib/gutenberg";

const FEATURED_COLLECTIONS = [
  { key: "collection-shakespeare", icon: "🎭", subtitle: "Plays & Sonnets" },
  { key: "collection-greek-tragedy", icon: "🏛️", subtitle: "Classical Drama" },
  { key: "collection-greek-epic", icon: "⚔️", subtitle: "Epic Poetry" },
  { key: "collection-roman-drama", icon: "🏺", subtitle: "Latin Theatre" },
];

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
  variant?: "default" | "sidebar";
}

export function LibraryCollections({
  catalogKey,
  setCatalogKey,
  showAllCategories,
  setShowAllCategories,
  variant = "default",
}: LibraryCollectionsProps) {
  const isSidebar = variant === "sidebar";

  return (
    <section className={`relative ${isSidebar ? "rounded-2xl border border-border/40 bg-card/60 p-5 shadow-sm" : ""}`}>
      <div className={`flex items-end justify-between ${isSidebar ? "mb-4" : "mb-6"}`}>
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-600/80 dark:text-amber-400/70">Browse by</p>
          <h2 className={`font-serif font-medium tracking-tight text-foreground ${isSidebar ? "text-lg" : "text-2xl"}`}>
            Collections
          </h2>
        </div>
        <button
          onClick={() => setShowAllCategories(!showAllCategories)}
          className="group flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <span className="border-b border-transparent group-hover:border-current">
            {showAllCategories ? "Hide categories" : "All categories"}
          </span>
          <ChevronRight className={`h-3.5 w-3.5 transition-transform duration-200 ${showAllCategories ? "rotate-90" : ""}`} />
        </button>
      </div>

      {/* Collection Cards */}
      <div className={`grid gap-3 ${isSidebar ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3 md:grid-cols-5"}`}>
        {/* All Books */}
        <button
          onClick={() => setCatalogKey("collection-all")}
          className={`group relative overflow-hidden rounded-2xl border-2 p-5 text-left transition-all duration-300 ${catalogKey === "collection-all"
            ? "border-amber-400 bg-gradient-to-br from-amber-50 via-orange-50/50 to-yellow-50/30 shadow-lg shadow-amber-500/10 dark:border-amber-500 dark:from-amber-950/60 dark:via-orange-950/40 dark:to-yellow-950/20"
            : "border-border/40 bg-gradient-to-br from-card to-muted/20 hover:border-amber-300/60 hover:shadow-md dark:hover:border-amber-600/40"
            }`}
        >
          <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-gradient-to-br from-amber-400/20 to-orange-300/10 blur-2xl transition-opacity group-hover:opacity-100 dark:from-amber-500/10 dark:to-orange-400/5" />
          <div className="relative">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-100 to-orange-100 text-xl shadow-sm dark:from-amber-900/50 dark:to-orange-900/30">
              📚
            </div>
            <div className="font-medium text-foreground">All Books</div>
            <div className="mt-0.5 text-xs text-muted-foreground">Full catalog</div>
          </div>
        </button>

        {FEATURED_COLLECTIONS.map((fc) => {
          const catalog = CATALOG_BY_KEY.get(fc.key);
          if (!catalog) return null;
          const isActive = catalogKey === fc.key;
          return (
            <button
              key={fc.key}
              onClick={() => setCatalogKey(isActive ? "collection-all" : fc.key)}
              className={`group relative overflow-hidden rounded-2xl border-2 p-5 text-left transition-all duration-300 ${isActive
                ? "border-amber-400 bg-gradient-to-br from-amber-50 via-orange-50/50 to-yellow-50/30 shadow-lg shadow-amber-500/10 dark:border-amber-500 dark:from-amber-950/60 dark:via-orange-950/40 dark:to-yellow-950/20"
                : "border-border/40 bg-gradient-to-br from-card to-muted/20 hover:border-amber-300/60 hover:shadow-md dark:hover:border-amber-600/40"
                }`}
            >
              <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-gradient-to-br from-amber-400/20 to-orange-300/10 opacity-0 blur-2xl transition-opacity group-hover:opacity-100 dark:from-amber-500/10 dark:to-orange-400/5" />
              <div className="relative">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-stone-100 to-stone-50 text-xl shadow-sm dark:from-stone-800/50 dark:to-stone-900/30">
                  {fc.icon}
                </div>
                <div className="font-medium text-foreground">{catalog.label}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">{fc.subtitle}</div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Categories Panel */}
      {showAllCategories && (
        <div className={`animate-in fade-in slide-in-from-top-4 duration-300 ${isSidebar ? "mt-4" : "mt-6"}`}>
          <div className="rounded-2xl border border-border/60 bg-gradient-to-b from-card to-background p-6 shadow-sm">
            <div className={`grid gap-6 ${isSidebar ? "md:grid-cols-2" : "md:grid-cols-2 lg:grid-cols-3"}`}>
              {CATALOG_GROUPS.slice(1).map((group) => (
                <div key={group.label} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-amber-500 dark:text-amber-400">{CATEGORY_ICONS[group.label] || "◆"}</span>
                    <h4 className="text-sm font-semibold tracking-wide text-foreground">
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
                          className={`rounded-full px-3 py-1 text-xs font-medium transition-all duration-200 ${isActive
                            ? "bg-amber-500 text-white shadow-md shadow-amber-500/25 dark:bg-amber-600"
                            : "bg-muted/60 text-muted-foreground hover:bg-amber-100 hover:text-amber-800 dark:hover:bg-amber-900/30 dark:hover:text-amber-300"
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
