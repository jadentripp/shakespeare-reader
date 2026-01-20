import React from "react";
import { Search, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { type CatalogEntry, CATALOG_BY_KEY } from "../../lib/gutenberg";

const FEATURED_COLLECTIONS = [
  { key: "collection-all", label: "All Books" },
  { key: "collection-shakespeare", label: "Shakespeare" },
  { key: "collection-greek-tragedy", label: "Greek Tragedy" },
  { key: "collection-greek-epic", label: "Greek Epic" },
  { key: "collection-roman-drama", label: "Roman Drama" },
];

interface BauhausHeaderProps {
  catalogQuery: string;
  setCatalogQuery: (q: string) => void;
  handleSearch: (q: string) => void;
  catalogQ: { isFetching: boolean };
  activeCatalog: CatalogEntry;
  catalogSearch: string;
  setCatalogKey: (key: string) => void;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
}

export function BauhausHeader({
  catalogQuery,
  setCatalogQuery,
  handleSearch,
  catalogQ,
  activeCatalog,
  catalogSearch,
  setCatalogKey,
  searchInputRef,
}: BauhausHeaderProps) {
  return (
    <header className="relative w-full bg-background pt-12 pb-6">
      <div className="mx-auto max-w-6xl px-6">
        {/* Massive Typographic Header */}
        <div className="mb-12 border-b-8 border-black pb-4 dark:border-white">
          <h1 className="select-none font-sans text-[80px] font-black uppercase leading-none tracking-tighter text-foreground md:text-[120px]">
            LIBRARY
          </h1>
          <div className="mt-2 flex items-center justify-between">
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">
              PROJECT GUTENBERG COLLECTION
            </p>
            <div className="font-mono text-xs font-bold uppercase tracking-widest text-foreground">
              Est. 1971
            </div>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
          {/* Bauhaus Search Field */}
          <div className="relative flex-1 max-w-xl group">
            <div className="relative">
              <Input
                ref={searchInputRef}
                type="search"
                placeholder="SEARCH COLLECTION..."
                value={catalogQuery}
                onChange={(e) => setCatalogQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && catalogQuery.trim()) {
                    handleSearch(catalogQuery);
                    searchInputRef.current?.blur();
                  }
                }}
                className="h-16 rounded-none border-0 border-b-4 border-black bg-transparent px-0 font-sans text-2xl font-bold uppercase tracking-tight placeholder:text-stone-300 focus:border-amber-500 focus:ring-0 dark:border-white dark:placeholder:text-stone-700"
              />
              <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-2">
                {catalogQ.isFetching ? (
                  <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
                ) : (
                  <Search className="h-6 w-6 text-black dark:text-white" />
                )}
                {catalogQuery && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 hover:bg-stone-100 dark:hover:bg-stone-800"
                    onClick={() => setCatalogQuery("")}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Horizontal Collections Menu */}
          <nav className="flex flex-wrap items-center gap-6 border-l-4 border-amber-500 pl-6">
            {FEATURED_COLLECTIONS.map((fc) => {
              const isActive = activeCatalog.key === fc.key;
              return (
                <button
                  key={fc.key}
                  onClick={() => setCatalogKey(isActive && fc.key !== 'collection-all' ? "collection-all" : fc.key)}
                  className={`font-mono text-[10px] font-bold uppercase tracking-[0.2em] transition-all hover:text-amber-500 ${
                    isActive ? "text-amber-500 underline underline-offset-8" : "text-stone-400"
                  }`}
                >
                  {fc.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Active Search Badge */}
        {catalogSearch && (
          <div className="mt-8 flex items-center gap-4 bg-stone-100 p-4 dark:bg-stone-900">
             <div className="font-mono text-[10px] font-bold uppercase tracking-widest text-stone-500">Active Search:</div>
             <div className="font-sans text-sm font-black uppercase tracking-tight text-foreground">
               "{catalogSearch}"
             </div>
             <button 
              onClick={() => setCatalogQuery("")}
              className="ml-auto text-[10px] font-bold uppercase tracking-widest text-red-600 hover:underline"
             >
               Clear
             </button>
          </div>
        )}
      </div>
    </header>
  );
}
