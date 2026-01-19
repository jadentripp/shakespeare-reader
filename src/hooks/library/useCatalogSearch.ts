import { useQuery } from "@tanstack/react-query";
import { useState, useMemo, useEffect } from "react";
import {
  CATALOG_BY_KEY,
  CATALOG_GROUPS,
  DEFAULT_CATALOG_KEY,
  type CatalogEntry,
} from "@/lib/gutenberg";
import { gutendexCatalogPage } from "@/lib/tauri";
import {
  sortResults,
  getRecentSearches,
  addRecentSearch,
  clearRecentSearches as clearRecentSearchesUtil,
  type SortOption,
} from "@/lib/gutenbergUtils";

export function useCatalogSearch() {
  const [catalogKey, setCatalogKey] = useState<string>(DEFAULT_CATALOG_KEY);
  const [catalogQuery, setCatalogQuery] = useState("");
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>("relevance");
  const [searchFocused, setSearchFocused] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [catalogPageUrl, setCatalogPageUrl] = useState<string | null>(null);

  useEffect(() => {
    setRecentSearches(getRecentSearches());
  }, []);

  const activeCatalog = useMemo<CatalogEntry>(() => {
    return CATALOG_BY_KEY.get(catalogKey) ?? CATALOG_GROUPS[0].items[0]!;
  }, [catalogKey]);

  const catalogSearch = catalogQuery.trim();
  const catalogTopic = activeCatalog.kind === "category" ? activeCatalog.topic ?? null : null;
  const canQueryCatalog =
    activeCatalog.kind === "collection" || catalogSearch.length > 0 || Boolean(catalogTopic);

  const catalogQ = useQuery({
    queryKey: ["gutendex", activeCatalog.catalogKey, catalogPageUrl, catalogSearch, catalogTopic],
    queryFn: () =>
      gutendexCatalogPage({
        catalogKey: activeCatalog.catalogKey,
        pageUrl: catalogPageUrl,
        searchQuery: catalogSearch.length > 0 ? catalogSearch : null,
        topic: catalogTopic,
      }),
    enabled: canQueryCatalog,
  });

  useEffect(() => {
    setCatalogPageUrl(null);
  }, [catalogKey, catalogSearch, catalogTopic]);

  function handleSearch(query: string) {
    setCatalogQuery(query);
    if (query.trim().length >= 2) {
      addRecentSearch(query);
      setRecentSearches(getRecentSearches());
    }
    setSearchFocused(false);
  }

  function clearRecentSearches() {
    clearRecentSearchesUtil();
    setRecentSearches([]);
  }

  const sortedCatalogResults = useMemo(() => {
    const results = catalogQ.data?.results ?? [];
    return sortResults(results, sortBy, catalogSearch);
  }, [catalogQ.data, sortBy, catalogSearch]);

  return {
    catalogKey,
    setCatalogKey,
    catalogQuery,
    setCatalogQuery,
    showAllCategories,
    setShowAllCategories,
    sortBy,
    setSortBy,
    searchFocused,
    setSearchFocused,
    recentSearches,
    catalogPageUrl,
    setCatalogPageUrl,
    catalogQ,
    activeCatalog,
    catalogSearch,
    canQueryCatalog,
    handleSearch,
    clearRecentSearches,
    sortedCatalogResults,
  };
}
