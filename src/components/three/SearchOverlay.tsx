import React, { useState, useRef, useCallback } from "react";
import { Search, X, Loader2, History, TrendingUp } from "lucide-react";

const POPULAR_SEARCHES = [
  "Shakespeare",
  "Jane Austen",
  "Mark Twain",
  "Charles Dickens",
  "Edgar Allan Poe",
  "Oscar Wilde",
];

interface SearchOverlayProps {
  catalogQuery: string;
  setCatalogQuery: (q: string) => void;
  handleSearch: (q: string) => void;
  isSearching: boolean;
  recentSearches: string[];
  clearRecentSearches: () => void;
  catalogSearch: string;
  onClearSearch: () => void;
}

export const SearchOverlay: React.FC<SearchOverlayProps> = ({
  catalogQuery,
  setCatalogQuery,
  handleSearch,
  isSearching,
  recentSearches,
  clearRecentSearches,
  catalogSearch,
  onClearSearch,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const onSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (catalogQuery.trim()) {
      handleSearch(catalogQuery);
      inputRef.current?.blur();
      setIsFocused(false);
    }
  }, [catalogQuery, handleSearch]);

  const onQuickSearch = useCallback((term: string) => {
    handleSearch(term);
    setIsFocused(false);
  }, [handleSearch]);

  return (
    <div className="relative z-30 pointer-events-auto w-full">
      <form onSubmit={onSubmit} className="relative">
        <div 
          className={`
            relative overflow-hidden rounded-full backdrop-blur-xl transition-all duration-300
            ${isFocused 
              ? "bg-stone-900/95 shadow-xl ring-1 ring-amber-400/50" 
              : "bg-stone-900/80 shadow-lg"
            }
          `}
        >
          <div className="flex items-center px-4 py-2">
            {isSearching ? (
              <Loader2 className="h-4 w-4 text-amber-500 animate-spin shrink-0" />
            ) : (
              <Search className="h-4 w-4 text-stone-500 shrink-0" />
            )}
            <input
              ref={inputRef}
              type="text"
              placeholder="Search catalog..."
              value={catalogQuery}
              onChange={(e) => setCatalogQuery(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setTimeout(() => setIsFocused(false), 200)}
              className="
                flex-1 bg-transparent px-3 py-0.5 text-sm font-medium
                text-white
                placeholder:text-stone-500
                focus:outline-none
              "
            />
            {/* Show active search badge inline */}
            {catalogSearch && !catalogQuery && (
              <span className="text-xs text-amber-300 font-medium mr-2 truncate max-w-[120px]">
                "{catalogSearch}"
              </span>
            )}
            {(catalogQuery || catalogSearch) && (
              <button
                type="button"
                onClick={() => {
                  setCatalogQuery("");
                  if (catalogSearch) onClearSearch();
                }}
                className="p-1 rounded-full hover:bg-white/10 transition-colors"
              >
                <X className="h-3.5 w-3.5 text-stone-400" />
              </button>
            )}
          </div>
        </div>

        {/* Search Dropdown */}
        {isFocused && !catalogQuery && (
          <div className="absolute left-0 right-0 top-full mt-2 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="rounded-xl border border-white/10 bg-stone-900/95 backdrop-blur-xl p-3 shadow-2xl shadow-black/40">
              {recentSearches.length > 0 && (
                <div className="mb-3">
                  <div className="mb-1.5 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-stone-500">
                      <History className="h-3 w-3" />
                      Recent
                    </div>
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        clearRecentSearches();
                      }}
                      className="text-[10px] text-stone-600 hover:text-white transition-colors"
                    >
                      Clear
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {recentSearches.slice(0, 4).map((search) => (
                      <button
                        key={search}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          onQuickSearch(search);
                        }}
                        className="rounded-full bg-white/5 px-2.5 py-1 text-xs text-stone-300 transition-all hover:bg-amber-500/20 hover:text-amber-200"
                      >
                        {search}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-stone-500">
                  <TrendingUp className="h-3 w-3" />
                  Popular
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {POPULAR_SEARCHES.slice(0, 4).map((search) => (
                    <button
                      key={search}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        onQuickSearch(search);
                      }}
                      className="rounded-full bg-amber-500/10 px-2.5 py-1 text-xs text-amber-200/80 transition-all hover:bg-amber-500/20 hover:text-amber-200"
                    >
                      {search}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};
