/**
 * Utility functions for Gutenberg book data processing
 */

import type { GutendexBook } from './tauri'

/**
 * Find the best MOBI download URL from a book's available formats.
 */
export function bestMobiUrl(book: GutendexBook): string | null {
  for (const [k, v] of Object.entries(book.formats)) {
    const kk = k.toLowerCase()
    if (kk.includes('mobipocket') || kk.includes('mobi')) return v
    if (typeof v === 'string' && v.toLowerCase().endsWith('.mobi')) return v
  }
  return null
}

/**
 * Get the cover image URL from a book's formats.
 */
export function coverUrl(book: GutendexBook): string | null {
  return book.formats['image/jpeg'] ?? book.formats['image/png'] ?? null
}

/**
 * Format a year for display, handling BCE dates.
 */
export function formatYear(year: number | null | undefined): string {
  if (year == null) return '?'
  if (year < 0) {
    return `${Math.abs(year)} BCE`
  }
  return String(year)
}

/**
 * Format author birth/death years for display.
 */
export function formatAuthorDates(
  birth: number | null | undefined,
  death: number | null | undefined,
): string {
  if (birth == null && death == null) return ''

  const birthStr = formatYear(birth)
  const deathStr = formatYear(death)

  if (birth != null && birth < 0 && death != null && death < 0) {
    return `c. ${birthStr}`
  }

  return `${birthStr}–${deathStr}`
}

/**
 * Format authors as a display string including dates.
 */
export function authorsString(book: GutendexBook): string {
  return (
    (book.authors ?? [])
      .map((a) => {
        const dates = formatAuthorDates(a.birth_year, a.death_year)
        if (dates) {
          return `${a.name} (${dates})`
        }
        return a.name
      })
      .join(', ') || ''
  )
}

/**
 * Format download count for display (e.g., "1.2M", "50K").
 */
export function formatDownloadCount(count: number | undefined): string {
  if (!count) return ''
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`
  if (count >= 1000) return `${(count / 1000).toFixed(0)}K`
  return String(count)
}

/**
 * Check if a book is considered popular based on download count.
 */
export function isPopular(count: number | undefined): boolean {
  return (count ?? 0) >= 10000
}

// ============================================================================
// Search Result Classification
// ============================================================================

export type ResultType = 'primary' | 'related' | 'tangential'

/**
 * Classify a search result based on how well it matches the query.
 */
export function classifyResult(book: GutendexBook, searchQuery: string): ResultType {
  if (!searchQuery.trim()) return 'primary'

  const query = searchQuery.toLowerCase().trim()
  const title = book.title.toLowerCase()
  const authorNames = (book.authors ?? []).map((a) => a.name.toLowerCase())

  const queryWords = query.split(/\s+/).filter((w) => w.length > 2)

  const titleStartsWithQuery =
    title.startsWith(query) || title.startsWith('the ' + query) || title === query

  const authorMatchesQuery = authorNames.some(
    (name) => name.includes(query) || queryWords.some((w) => name.includes(w)),
  )

  const isByClassicAuthor = authorNames.some((name) => queryWords.some((w) => name.includes(w)))

  if (titleStartsWithQuery && (authorMatchesQuery || book.authors?.length === 1)) {
    return 'primary'
  }

  if (title.includes(query) && isByClassicAuthor) {
    return 'primary'
  }

  if (title.includes(query)) {
    const titleWords = title.split(/\s+/)
    const isSubstantialMatch = queryWords.every((qw) => titleWords.some((tw) => tw.includes(qw)))
    if (isSubstantialMatch && authorMatchesQuery) {
      return 'related'
    }
    return 'tangential'
  }

  if (authorMatchesQuery) {
    return 'related'
  }

  return 'tangential'
}

// ============================================================================
// Sorting
// ============================================================================

export type SortOption = 'relevance' | 'popular' | 'title' | 'author'

/**
 * Sort search results based on the selected sort option.
 */
export function sortResults(
  results: GutendexBook[],
  sortBy: SortOption,
  searchQuery: string,
): GutendexBook[] {
  const sorted = [...results]

  switch (sortBy) {
    case 'popular':
      return sorted.sort((a, b) => (b.download_count ?? 0) - (a.download_count ?? 0))
    case 'title':
      return sorted.sort((a, b) => a.title.localeCompare(b.title))
    case 'author':
      return sorted.sort((a, b) => {
        const aAuthor = a.authors?.[0]?.name ?? ''
        const bAuthor = b.authors?.[0]?.name ?? ''
        return aAuthor.localeCompare(bAuthor)
      })
    case 'relevance':
    default:
      return sorted.sort((a, b) => {
        const aType = classifyResult(a, searchQuery)
        const bType = classifyResult(b, searchQuery)
        const typeOrder = { primary: 0, related: 1, tangential: 2 }
        const typeDiff = typeOrder[aType] - typeOrder[bType]
        if (typeDiff !== 0) return typeDiff
        return (b.download_count ?? 0) - (a.download_count ?? 0)
      })
  }
}

// ============================================================================
// Recent Searches (localStorage)
// ============================================================================

const RECENT_SEARCHES_KEY = 'reader-recent-searches'
const MAX_RECENT_SEARCHES = 8

/**
 * Get recent searches from localStorage.
 */
export function getRecentSearches(): string[] {
  try {
    if (typeof window === 'undefined') return []
    const raw = localStorage.getItem(RECENT_SEARCHES_KEY)
    if (!raw) return []
    return JSON.parse(raw) as string[]
  } catch {
    return []
  }
}

/**
 * Add a search query to recent searches.
 */
export function addRecentSearch(query: string): void {
  if (typeof window === 'undefined') return
  const trimmed = query.trim()
  if (!trimmed || trimmed.length < 2) return
  const existing = getRecentSearches().filter((s) => s.toLowerCase() !== trimmed.toLowerCase())
  const updated = [trimmed, ...existing].slice(0, MAX_RECENT_SEARCHES)
  localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated))
}

/**
 * Clear all recent searches.
 */
export function clearRecentSearches(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(RECENT_SEARCHES_KEY)
}
