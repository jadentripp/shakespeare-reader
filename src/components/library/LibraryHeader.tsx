import React from "react";
import { Search, X, History, TrendingUp, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { type CatalogEntry } from "../../lib/gutenberg";

const POPULAR_SEARCHES = [
  "Shakespeare",
  "Jane Austen",
  "Mark Twain",
  "Charles Dickens",
  "Edgar Allan Poe",
  "Oscar Wilde",
  "H.G. Wells",
  "Arthur Conan Doyle",
];

interface LibraryHeaderProps {
  catalogQuery: string;
  setCatalogQuery: (q: string) => void;
  searchFocused: boolean;
  setSearchFocused: (f: boolean) => void;
  recentSearches: string[];
  handleSearch: (q: string) => void;
  clearRecentSearches: () => void;
  catalogQ: { isFetching: boolean };
  activeCatalog: CatalogEntry;
  catalogSearch: string;
  setCatalogKey: (key: string) => void;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
}

export function LibraryHeader({
  catalogQuery,
  setCatalogQuery,
  searchFocused,
  setSearchFocused,
  recentSearches,
  handleSearch,
  clearRecentSearches,
  catalogQ,
  activeCatalog,
  catalogSearch,
  setCatalogKey,
  searchInputRef,
}: LibraryHeaderProps) {
  return (
    <div className="relative border-b border-border/40 bg-gradient-to-b from-amber-50/50 via-amber-50/20 to-background dark:from-amber-950/20 dark:via-amber-950/10">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-100/40 via-transparent to-transparent dark:from-amber-900/20" />
      <div className="relative mx-auto max-w-6xl px-6 py-8">
        <div className="mb-2 text-center">
          <h1 className="font-serif text-2xl font-medium tracking-tight text-foreground md:text-3xl">
            Discover Classic Literature
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Over 70,000 free ebooks from Project Gutenberg
          </p>
        </div>

        <div className="relative mx-auto mt-6 max-w-2xl">
          <div className={`relative transition-all duration-300 ${searchFocused ? "scale-[1.02]" : ""}`}>
            <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-r from-amber-400/20 via-orange-400/20 to-amber-400/20 opacity-0 blur-xl transition-opacity duration-300" style={{ opacity: searchFocused ? 0.6 : 0 }} />
            <div className="relative">
              {catalogQ.isFetching ? (
                <Loader2 className="absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 animate-spin text-amber-500" />
              ) : (
                <Search className="absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground/60" />
              )}
              <Input
                ref={searchInputRef}
                type="search"
                placeholder="Search by title, author, or subject..."
                value={catalogQuery}
                onChange={(e) => setCatalogQuery(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && catalogQuery.trim()) {
                    handleSearch(catalogQuery);
                    searchInputRef.current?.blur();
                  }
                }}
                className="h-14 rounded-2xl border-2 border-border/40 bg-background pl-14 pr-12 text-base shadow-lg shadow-amber-500/5 transition-all placeholder:text-muted-foreground/50 focus:border-amber-400 focus:shadow-amber-500/10 focus:ring-0 dark:shadow-amber-900/10"
              />
              {catalogQuery && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-3 top-1/2 h-8 w-8 -translate-y-1/2 rounded-xl hover:bg-muted"
                  onClick={() => setCatalogQuery("")}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Search Dropdown */}
          {searchFocused && !catalogQuery && (
            <div className="absolute left-0 right-0 top-full z-50 mt-2 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-xl shadow-black/5">
                {recentSearches.length > 0 && (
                  <div className="mb-4">
                    <div className="mb-2 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        <History className="h-3.5 w-3.5" />
                        Recent
                      </div>
                      <button
                        onClick={clearRecentSearches}
                        className="text-xs text-muted-foreground hover:text-foreground"
                      >
                        Clear
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {recentSearches.map((search) => (
                        <button
                          key={search}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            handleSearch(search);
                          }}
                          className="rounded-full border border-border/60 bg-muted/40 px-3 py-1.5 text-sm transition-colors hover:border-amber-300 hover:bg-amber-50 dark:hover:border-amber-700 dark:hover:bg-amber-950/30"
                        >
                          {search}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    <TrendingUp className="h-3.5 w-3.5" />
                    Popular Authors
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {POPULAR_SEARCHES.map((search) => (
                      <button
                        key={search}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          handleSearch(search);
                        }}
                        className="rounded-full bg-gradient-to-r from-amber-100 to-orange-100 px-3 py-1.5 text-sm font-medium text-amber-800 transition-all hover:from-amber-200 hover:to-orange-200 hover:shadow-sm dark:from-amber-900/40 dark:to-orange-900/30 dark:text-amber-200 dark:hover:from-amber-900/60 dark:hover:to-orange-900/50"
                      >
                        {search}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Active Search/Filter Indicator */}
        {(catalogSearch || activeCatalog.kind !== "all") && (
          <div className="mt-4 flex items-center justify-center gap-2">
            {activeCatalog.kind !== "all" && (
              <Badge
                variant="secondary"
                className="gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200"
              >
                {activeCatalog.kind === "collection" ? "📚" : "📁"} {activeCatalog.label}
                <button
                  onClick={() => setCatalogKey("collection-all")}
                  className="ml-1 rounded-full p-0.5 hover:bg-amber-200/50 dark:hover:bg-amber-800/50"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {catalogSearch && (
              <Badge
                variant="outline"
                className="gap-1.5 rounded-full px-3 py-1"
              >
                <Search className="h-3 w-3" />
                "{catalogSearch}"
                <button
                  onClick={() => setCatalogQuery("")}
                  className="ml-1 rounded-full p-0.5 hover:bg-muted"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
