import { useQuery } from '@tanstack/react-query'
import { useNavigate, useRouterState } from '@tanstack/react-router'
import React from 'react'
import {
  CATALOG_BY_KEY,
  CATALOG_GROUPS,
  type CatalogEntry,
  DEFAULT_CATALOG_KEY,
} from '@/lib/gutenberg'
import {
  addRecentSearch,
  clearRecentSearches as clearRecentSearchesUtil,
  getRecentSearches,
  type SortOption,
  sortResults,
} from '@/lib/gutenbergUtils'
import { gutendexCatalogPage } from '@/lib/tauri'

export function useCatalogSearch() {
  const routerState = useRouterState()
  const currentPath = routerState.location.pathname
  const isOnIndexRoute = currentPath === '/'
  const urlSearchParams = routerState.location.search as { q?: string; category?: string }

  const navigate = useNavigate()

  const [localCatalogKey, setLocalCatalogKey] = React.useState(DEFAULT_CATALOG_KEY)
  const [localCatalogQuery, setLocalCatalogQuery] = React.useState('')

  const catalogKey = isOnIndexRoute
    ? urlSearchParams.category || DEFAULT_CATALOG_KEY
    : localCatalogKey
  const catalogQuery = isOnIndexRoute ? urlSearchParams.q || '' : localCatalogQuery

  const setCatalogKey = (key: string) => {
    if (isOnIndexRoute) {
      navigate({
        to: '/',
        search: (prev: any) => ({ ...prev, category: key, q: '' }),
      })
    } else {
      setLocalCatalogKey(key)
      setLocalCatalogQuery('')
    }
  }

  const setCatalogQuery = (q: string) => {
    if (isOnIndexRoute) {
      navigate({
        to: '/',
        search: (prev: any) => ({ ...prev, q }),
        replace: true,
      })
    } else {
      setLocalCatalogQuery(q)
    }
  }

  const [showAllCategories, setShowAllCategories] = React.useState(false)
  const [sortBy, setSortBy] = React.useState<SortOption>('relevance')
  const [searchFocused, setSearchFocused] = React.useState(false)
  const [recentSearches, setRecentSearches] = React.useState<string[]>([])
  const [catalogPageUrl, setCatalogPageUrl] = React.useState<string | null>(null)

  React.useEffect(() => {
    setRecentSearches(getRecentSearches())
  }, [])

  const activeCatalog = React.useMemo<CatalogEntry>(() => {
    return CATALOG_BY_KEY.get(catalogKey) ?? CATALOG_GROUPS[0].items[0]!
  }, [catalogKey])

  const catalogSearch = catalogQuery.trim()
  const catalogTopic = activeCatalog.kind === 'category' ? (activeCatalog.topic ?? null) : null
  const canQueryCatalog =
    activeCatalog.kind === 'collection' ||
    activeCatalog.kind === 'category' ||
    catalogSearch.length > 0 ||
    Boolean(catalogTopic)

  // Reset page when search or catalog changes
  const [prevCatalogKey, setPrevCatalogKey] = React.useState(catalogKey)
  const [prevCatalogSearch, setPrevCatalogSearch] = React.useState(catalogSearch)
  const [prevCatalogTopic, setPrevCatalogTopic] = React.useState(catalogTopic)

  if (
    catalogKey !== prevCatalogKey ||
    catalogSearch !== prevCatalogSearch ||
    catalogTopic !== prevCatalogTopic
  ) {
    setPrevCatalogKey(catalogKey)
    setPrevCatalogSearch(catalogSearch)
    setPrevCatalogTopic(catalogTopic)
    setCatalogPageUrl(null)
  }

  const catalogQ = useQuery({
    queryKey: ['gutendex', activeCatalog.catalogKey, catalogPageUrl, catalogSearch, catalogTopic],
    queryFn: () =>
      gutendexCatalogPage({
        catalogKey: activeCatalog.catalogKey,
        pageUrl: catalogPageUrl,
        searchQuery: catalogSearch.length > 0 ? catalogSearch : null,
        topic: catalogTopic,
      }),
    enabled: canQueryCatalog,
    staleTime: 5 * 60 * 1000, // Cache results for 5 minutes
    gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
  })

  function handleSearch(query: string) {
    if (isOnIndexRoute) {
      navigate({
        to: '/',
        search: (prev: any) => ({ ...prev, q: query }),
      })
    } else {
      setLocalCatalogQuery(query)
    }
    if (query.trim().length >= 2) {
      addRecentSearch(query)
      setRecentSearches(getRecentSearches())
    }
    setSearchFocused(false)
  }

  function clearRecentSearches() {
    clearRecentSearchesUtil()
    setRecentSearches([])
  }

  const sortedCatalogResults = React.useMemo(() => {
    const results = catalogQ.data?.results ?? []
    return sortResults(results, sortBy, catalogSearch)
  }, [catalogQ.data, sortBy, catalogSearch])

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
  }
}
