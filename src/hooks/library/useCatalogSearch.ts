import React from "react";
import { useQuery } from "@tanstack/react-query";
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
  const [catalogKey, setCatalogKey] = React.useState<string>(DEFAULT_CATALOG_KEY);
  const [catalogQuery, setCatalogQuery] = React.useState("");
  const [showAllCategories, setShowAllCategories] = React.useState(false);
  const [sortBy, setSortBy] = React.useState<SortOption>("relevance");
  const [searchFocused, setSearchFocused] = React.useState(false);
  const [recentSearches, setRecentSearches] = React.useState<string[]>([]);
  const [catalogPageUrl, setCatalogPageUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    setRecentSearches(getRecentSearches());
  }, []);

  const activeCatalog = React.useMemo<CatalogEntry>(() => {
    return CATALOG_BY_KEY.get(catalogKey) ?? CATALOG_GROUPS[0].items[0]!;
  }, [catalogKey]);

  const catalogSearch = catalogQuery.trim();
  const catalogTopic = activeCatalog.kind === "category" ? activeCatalog.topic ?? null : null;
  const canQueryCatalog =
    activeCatalog.kind === "collection" || catalogSearch.length > 0 || Boolean(catalogTopic);

  // Reset page when search or catalog changes
  const [prevCatalogKey, setPrevCatalogKey] = React.useState(catalogKey);
  const [prevCatalogSearch, setPrevCatalogSearch] = React.useState(catalogSearch);
  const [prevCatalogTopic, setPrevCatalogTopic] = React.useState(catalogTopic);

  if (
    catalogKey !== prevCatalogKey ||
    catalogSearch !== prevCatalogSearch ||
    catalogTopic !== prevCatalogTopic
  ) {
    setPrevCatalogKey(catalogKey);
    setPrevCatalogSearch(catalogSearch);
    setPrevCatalogTopic(catalogTopic);
    setCatalogPageUrl(null);
  }

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

  const sortedCatalogResults = React.useMemo(() => {
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
