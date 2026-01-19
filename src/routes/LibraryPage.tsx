import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Search, X, Trash2, Play, Pause, RotateCcw, Trash, CheckCircle2, BookOpen, Sparkles, ChevronRight, Download, Clock, ArrowUpDown, BookMarked, FileText, History, TrendingUp, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  CATALOG_BY_KEY,
  CATALOG_GROUPS,
  DEFAULT_CATALOG_KEY,
  type CatalogEntry,
} from "../lib/gutenberg";
import {
  hardDeleteBook,
  downloadGutenbergMobi,
  gutendexCatalogPage,
  listBooks,
  type GutendexBook,
} from "../lib/tauri";

function bestMobiUrl(book: GutendexBook): string | null {
  for (const [k, v] of Object.entries(book.formats)) {
    const kk = k.toLowerCase();
    if (kk.includes("mobipocket") || kk.includes("mobi")) return v;
    if (typeof v === "string" && v.toLowerCase().endsWith(".mobi")) return v;
  }
  return null;
}

function coverUrl(book: GutendexBook): string | null {
  return book.formats["image/jpeg"] ?? book.formats["image/png"] ?? null;
}

function formatYear(year: number | null | undefined): string {
  if (year == null) return "?";
  if (year < 0) {
    return `${Math.abs(year)} BCE`;
  }
  return String(year);
}

function formatAuthorDates(birth: number | null | undefined, death: number | null | undefined): string {
  if (birth == null && death == null) return "";

  const birthStr = formatYear(birth);
  const deathStr = formatYear(death);

  if (birth != null && birth < 0 && death != null && death < 0) {
    return `c. ${birthStr}`;
  }

  return `${birthStr}–${deathStr}`;
}

function authorsString(book: GutendexBook): string {
  return (book.authors ?? []).map((a) => {
    const dates = formatAuthorDates(a.birth_year, a.death_year);
    if (dates) {
      return `${a.name} (${dates})`;
    }
    return a.name;
  }).join(", ") || "";
}

function formatDownloadCount(count: number | undefined): string {
  if (!count) return "";
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(0)}K`;
  return String(count);
}

function isPopular(count: number | undefined): boolean {
  return (count ?? 0) >= 10000;
}

type ResultType = "primary" | "related" | "tangential";

function classifyResult(book: GutendexBook, searchQuery: string): ResultType {
  if (!searchQuery.trim()) return "primary";

  const query = searchQuery.toLowerCase().trim();
  const title = book.title.toLowerCase();
  const authorNames = (book.authors ?? []).map(a => a.name.toLowerCase());

  const queryWords = query.split(/\s+/).filter(w => w.length > 2);

  const titleStartsWithQuery = title.startsWith(query) ||
    title.startsWith("the " + query) ||
    title === query;

  const authorMatchesQuery = authorNames.some(name =>
    name.includes(query) || queryWords.some(w => name.includes(w))
  );

  const isByClassicAuthor = authorNames.some(name =>
    queryWords.some(w => name.includes(w))
  );

  if (titleStartsWithQuery && (authorMatchesQuery || book.authors?.length === 1)) {
    return "primary";
  }

  if (title.includes(query) && isByClassicAuthor) {
    return "primary";
  }

  if (title.includes(query)) {
    const titleWords = title.split(/\s+/);
    const isSubstantialMatch = queryWords.every(qw =>
      titleWords.some(tw => tw.includes(qw))
    );
    if (isSubstantialMatch && authorMatchesQuery) {
      return "related";
    }
    return "tangential";
  }

  if (authorMatchesQuery) {
    return "related";
  }

  return "tangential";
}

type SortOption = "relevance" | "popular" | "title" | "author";

function sortResults(results: GutendexBook[], sortBy: SortOption, searchQuery: string): GutendexBook[] {
  const sorted = [...results];

  switch (sortBy) {
    case "popular":
      return sorted.sort((a, b) => (b.download_count ?? 0) - (a.download_count ?? 0));
    case "title":
      return sorted.sort((a, b) => a.title.localeCompare(b.title));
    case "author":
      return sorted.sort((a, b) => {
        const aAuthor = a.authors?.[0]?.name ?? "";
        const bAuthor = b.authors?.[0]?.name ?? "";
        return aAuthor.localeCompare(bAuthor);
      });
    case "relevance":
    default:
      return sorted.sort((a, b) => {
        const aType = classifyResult(a, searchQuery);
        const bType = classifyResult(b, searchQuery);
        const typeOrder = { primary: 0, related: 1, tangential: 2 };
        const typeDiff = typeOrder[aType] - typeOrder[bType];
        if (typeDiff !== 0) return typeDiff;
        return (b.download_count ?? 0) - (a.download_count ?? 0);
      });
  }
}

type DownloadStatus = "queued" | "downloading" | "done" | "failed";
type DownloadTask = {
  gutenbergId: number;
  title: string;
  authors: string;
  publicationYear: number | null;
  coverUrl: string | null;
  mobiUrl: string;
  status: DownloadStatus;
  attempts: number;
  error: string | null;
};

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

const RECENT_SEARCHES_KEY = "reader-recent-searches";
const MAX_RECENT_SEARCHES = 8;

function getRecentSearches(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_SEARCHES_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}

function addRecentSearch(query: string) {
  const trimmed = query.trim();
  if (!trimmed || trimmed.length < 2) return;
  const existing = getRecentSearches().filter((s) => s.toLowerCase() !== trimmed.toLowerCase());
  const updated = [trimmed, ...existing].slice(0, MAX_RECENT_SEARCHES);
  localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
}

export default function LibraryPage() {
  const qc = useQueryClient();
  const booksQ = useQuery({ queryKey: ["books"], queryFn: listBooks });
  const [catalogKey, setCatalogKey] = useState<string>(DEFAULT_CATALOG_KEY);
  const [libraryQuery, setLibraryQuery] = useState("");
  const [catalogQuery, setCatalogQuery] = useState("");
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>("relevance");
  const [searchFocused, setSearchFocused] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setRecentSearches(getRecentSearches());
  }, []);

  const handleSearch = (query: string) => {
    setCatalogQuery(query);
    if (query.trim().length >= 2) {
      addRecentSearch(query);
      setRecentSearches(getRecentSearches());
    }
    setSearchFocused(false);
  };

  const clearRecentSearches = () => {
    localStorage.removeItem(RECENT_SEARCHES_KEY);
    setRecentSearches([]);
  };
  const activeCatalog = useMemo<CatalogEntry>(() => {
    return CATALOG_BY_KEY.get(catalogKey) ?? CATALOG_GROUPS[0].items[0]!;
  }, [catalogKey]);
  const catalogSearch = catalogQuery.trim();
  const catalogTopic = activeCatalog.kind === "category" ? activeCatalog.topic ?? null : null;
  const canQueryCatalog =
    activeCatalog.kind === "collection" || catalogSearch.length > 0 || Boolean(catalogTopic);

  const [queue, setQueue] = useState<DownloadTask[]>([]);
  const queueRef = useRef(queue);
  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(paused);
  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  const runnerRef = useRef(false);

  const [bulkScan, setBulkScan] = useState<{
    running: boolean;
    scanned: number;
    enqueued: number;
    nextUrl: string | null;
    done: boolean;
    error: string | null;
    catalogKey: string | null;
    searchQuery: string | null;
    topic: string | null;
  }>({
    running: false,
    scanned: 0,
    enqueued: 0,
    nextUrl: null,
    done: false,
    error: null,
    catalogKey: null,
    searchQuery: null,
    topic: null,
  });
  const bulkRunnerRef = useRef(false);

  const [catalogPageUrl, setCatalogPageUrl] = useState<string | null>(null);
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

  const localGutenbergIds = useMemo(() => {
    return new Set((booksQ.data ?? []).map((b) => b.gutenberg_id));
  }, [booksQ.data]);

  useEffect(() => {
    setCatalogPageUrl(null);
    setBulkScan({
      running: false,
      scanned: 0,
      enqueued: 0,
      nextUrl: null,
      done: false,
      error: null,
      catalogKey: null,
      searchQuery: null,
      topic: null,
    });
  }, [catalogKey]);
  useEffect(() => {
    setCatalogPageUrl(null);
  }, [catalogSearch, catalogTopic]);

  const progressByBookId = useMemo(() => {
    const map = new Map<number, number>();
    if (typeof window === "undefined") return map;
    for (const book of booksQ.data ?? []) {
      // Use gutenberg_id for progress key (matching MobiBookPage)
      const raw = window.localStorage.getItem(`reader-progress-gutenberg-${book.gutenberg_id}`);
      if (!raw) continue;
      try {
        const parsed = JSON.parse(raw) as { page?: number };
        if (typeof parsed.page === "number" && parsed.page > 0) {
          map.set(book.id, parsed.page);
        }
      } catch {
        // ignore malformed entries
      }
    }
    return map;
  }, [booksQ.data]);

  function enqueue(task: Omit<DownloadTask, "status" | "attempts" | "error">) {
    setQueue((prev) => {
      if (prev.some((t) => t.gutenbergId === task.gutenbergId)) return prev;
      return [...prev, { ...task, status: "queued", attempts: 0, error: null }];
    });
  }

  function retryFailed() {
    setQueue((prev) =>
      prev.map((t) => (t.status === "failed" ? { ...t, status: "queued", error: null } : t)),
    );
  }

  function clearFailed() {
    setQueue((prev) => prev.filter((t) => t.status !== "failed"));
  }

  function clearDone() {
    setQueue((prev) => prev.filter((t) => t.status !== "done"));
  }

  async function runQueue() {
    if (runnerRef.current) return;
    if (pausedRef.current) return;
    runnerRef.current = true;
    try {
      // eslint-disable-next-line no-constant-condition
      while (true) {
        if (pausedRef.current) return;
        const next = queueRef.current.find((t) => t.status === "queued");
        if (!next) return;

        setQueue((prev) =>
          prev.map((t) =>
            t.gutenbergId === next.gutenbergId
              ? { ...t, status: "downloading", attempts: t.attempts + 1, error: null }
              : t,
          ),
        );

        try {
          await downloadGutenbergMobi({
            gutenbergId: next.gutenbergId,
            title: next.title,
            authors: next.authors,
            publicationYear: next.publicationYear,
            coverUrl: next.coverUrl,
            mobiUrl: next.mobiUrl,
          });
          await qc.invalidateQueries({ queryKey: ["books"] });
          setQueue((prev) =>
            prev.map((t) => (t.gutenbergId === next.gutenbergId ? { ...t, status: "done" } : t)),
          );
        } catch (e) {
          setQueue((prev) =>
            prev.map((t) =>
              t.gutenbergId === next.gutenbergId
                ? { ...t, status: "failed", error: String(e) }
                : t,
            ),
          );
        }
      }
    } finally {
      runnerRef.current = false;
    }
  }

  async function runBulkScan(
    fromUrl: string | null,
    reset: boolean,
    key: string,
    searchQuery: string | null,
    topic: string | null,
  ) {
    if (bulkRunnerRef.current) return;
    if (pausedRef.current) return;
    bulkRunnerRef.current = true;
    setBulkScan((prev) =>
      reset
        ? {
          running: true,
          scanned: 0,
          enqueued: 0,
          nextUrl: null,
          done: false,
          error: null,
          catalogKey: key,
          searchQuery,
          topic,
        }
        : { ...prev, running: true, error: null, catalogKey: key, searchQuery, topic },
    );

    let pageUrl: string | null = fromUrl;
    let scanned = reset ? 0 : bulkScan.scanned;
    let enqueued = reset ? 0 : bulkScan.enqueued;

    const seen = new Set<number>([
      ...Array.from(localGutenbergIds),
      ...queueRef.current.map((t) => t.gutenbergId),
    ]);

    try {
      // eslint-disable-next-line no-constant-condition
      while (true) {
        if (pausedRef.current) break;

        const page = await gutendexCatalogPage({ catalogKey: key, pageUrl, searchQuery, topic });
        for (const b of page.results ?? []) {
          if (pausedRef.current) break;
          scanned += 1;
          const mobiUrl = bestMobiUrl(b);
          if (!seen.has(b.id) && mobiUrl) {
            enqueue({
              gutenbergId: b.id,
              title: b.title,
              authors: authorsString(b),
              publicationYear: null,
              coverUrl: coverUrl(b),
              mobiUrl,
            });
            seen.add(b.id);
            enqueued += 1;
          }
          setBulkScan((prev) => ({
            ...prev,
            running: true,
            scanned,
            enqueued,
            nextUrl: page.next ?? null,
            catalogKey: key,
            searchQuery,
            topic,
          }));
        }

        if (!page.next) {
          setBulkScan((prev) => ({
            ...prev,
            running: false,
            scanned,
            enqueued,
            nextUrl: null,
            done: true,
            catalogKey: key,
            searchQuery,
            topic,
          }));
          break;
        }
        pageUrl = page.next;
      }
    } catch (e) {
      setBulkScan((prev) => ({
        ...prev,
        running: false,
        error: String(e),
        nextUrl: pageUrl,
        catalogKey: key,
        searchQuery,
        topic,
      }));
    } finally {
      bulkRunnerRef.current = false;
      setBulkScan((prev) => ({
        ...prev,
        running: false,
        scanned,
        enqueued,
        nextUrl: pageUrl,
        catalogKey: key,
        searchQuery,
        topic,
      }));
    }
  }

  const counts = useMemo(() => {
    const out = { queued: 0, downloading: 0, done: 0, failed: 0 };
    for (const t of queue) out[t.status] += 1;
    return out;
  }, [queue]);

  useEffect(() => {
    if (paused) return;
    if (counts.queued > 0) void runQueue();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused, counts.queued]);

  const active = useMemo(() => queue.find((t) => t.status === "downloading") ?? null, [queue]);
  const canBulkScan = canQueryCatalog;
  const showSearchPrompt = !canQueryCatalog;

  async function startOrResumeBulk() {
    setPaused(false);
    const searchQuery = catalogSearch.length > 0 ? catalogSearch : null;
    const topic = catalogTopic;
    if (!canQueryCatalog) {
      window.alert("Pick a category or enter a search term to scan Gutenberg.");
      return;
    }
    const reset =
      bulkScan.done ||
      (bulkScan.scanned === 0 && bulkScan.nextUrl == null) ||
      bulkScan.catalogKey !== activeCatalog.catalogKey ||
      bulkScan.searchQuery !== searchQuery ||
      bulkScan.topic !== topic;
    const from = reset ? null : bulkScan.nextUrl;
    void runBulkScan(from ?? null, reset, activeCatalog.catalogKey, searchQuery, topic);
    void runQueue();
  }

  async function resumeAll() {
    setPaused(false);
    void runQueue();
    if (
      !bulkScan.done &&
      !bulkScan.running &&
      bulkScan.catalogKey === activeCatalog.catalogKey &&
      bulkScan.searchQuery === (catalogSearch.length > 0 ? catalogSearch : null) &&
      bulkScan.topic === catalogTopic
    ) {
      const from = bulkScan.scanned === 0 ? null : bulkScan.nextUrl;
      void runBulkScan(
        from ?? null,
        false,
        activeCatalog.catalogKey,
        bulkScan.searchQuery ?? null,
        bulkScan.topic ?? null,
      );
    }
  }

  const normalizedLibraryQuery = libraryQuery.trim().toLowerCase();
  const filteredBooks = useMemo(() => {
    if (!normalizedLibraryQuery) return booksQ.data ?? [];
    return (booksQ.data ?? []).filter((b) => {
      return (
        b.title.toLowerCase().includes(normalizedLibraryQuery) ||
        b.authors.toLowerCase().includes(normalizedLibraryQuery)
      );
    });
  }, [booksQ.data, normalizedLibraryQuery]);

  const sortedCatalogResults = useMemo(() => {
    const results = catalogQ.data?.results ?? [];
    return sortResults(results, sortBy, catalogSearch);
  }, [catalogQ.data, sortBy, catalogSearch]);

  const filteredCatalogResults = sortedCatalogResults;

  const hasQueueActivity = counts.downloading > 0 || counts.queued > 0 || counts.failed > 0 || counts.done > 0;

  const booksInProgress = useMemo(() => {
    return (booksQ.data ?? []).filter(b => progressByBookId.has(b.id));
  }, [booksQ.data, progressByBookId]);

  const CuratedCollectionsSection = () => (
    <section className="relative">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-600/80 dark:text-amber-400/70">Browse by</p>
          <h2 className="font-serif text-2xl font-medium tracking-tight text-foreground">Collections</h2>
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
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
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
        <div className="mt-6 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="rounded-2xl border border-border/60 bg-gradient-to-b from-card to-background p-6 shadow-sm">
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
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

  const ContinueReadingSection = () => (
    <section>
      <div className="mb-5 flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-amber-500" />
        <h2 className="font-serif text-xl font-medium text-foreground">Continue Reading</h2>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-2">
        {booksInProgress.slice(0, 5).map((b) => (
          <Link
            key={b.id}
            to="/book/$bookId"
            params={{ bookId: String(b.id) }}
            className="group flex-shrink-0"
          >
            <div className="relative h-40 w-28 overflow-hidden rounded-lg bg-gradient-to-br from-stone-100 to-stone-200 shadow-md transition-transform group-hover:scale-105 dark:from-stone-800 dark:to-stone-900">
              {b.cover_url ? (
                <img src={b.cover_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center p-3">
                  <BookOpen className="h-8 w-8 text-stone-400" />
                </div>
              )}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                <div className="text-xs text-white/90">Page {progressByBookId.get(b.id)}</div>
              </div>
            </div>
            <div className="mt-2 w-28">
              <div className="truncate text-sm font-medium text-foreground group-hover:text-amber-600 dark:group-hover:text-amber-400">
                {b.title}
              </div>
              <div className="truncate text-xs text-muted-foreground">{b.authors}</div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );

  const YourLibrarySection = () => (
    <section>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h2 className="font-serif text-xl font-medium text-foreground">Your Library</h2>
          <Badge variant="secondary" className="font-normal">
            {(booksQ.data ?? []).length} {(booksQ.data ?? []).length === 1 ? "book" : "books"}
          </Badge>
        </div>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
          <Input
            type="search"
            placeholder="Filter library..."
            value={libraryQuery}
            onChange={(e) => setLibraryQuery(e.target.value)}
            className="h-9 pl-9 pr-9"
          />
          {libraryQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2"
              onClick={() => setLibraryQuery("")}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {booksQ.isLoading ? (
        <div className="flex h-48 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
        </div>
      ) : (booksQ.data ?? []).length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/60 bg-muted/20 py-16 text-center">
          <BookOpen className="mx-auto h-12 w-12 text-muted-foreground/40" />
          <h3 className="mt-4 font-serif text-lg font-medium text-foreground">Your library is empty</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Browse the collections above or search for books to add
          </p>
        </div>
      ) : filteredBooks.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/60 bg-muted/20 py-12 text-center">
          <Search className="mx-auto h-10 w-10 text-muted-foreground/40" />
          <h3 className="mt-3 font-medium text-foreground">No matches</h3>
          <p className="mt-1 text-sm text-muted-foreground">Try a different search term</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {filteredBooks.map((b) => (
            <div
              key={b.id}
              className="group relative overflow-hidden rounded-xl border border-border/40 bg-card transition-all duration-200 hover:border-border hover:shadow-lg"
            >
              <Link to="/book/$bookId" params={{ bookId: String(b.id) }} className="block">
                <div className="aspect-[2/3] w-full overflow-hidden bg-gradient-to-br from-stone-100 to-stone-200 dark:from-stone-800 dark:to-stone-900">
                  {b.cover_url ? (
                    <img
                      src={b.cover_url}
                      alt=""
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <BookOpen className="h-12 w-12 text-stone-300 dark:text-stone-600" />
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-medium leading-tight text-foreground line-clamp-2 group-hover:text-amber-600 dark:group-hover:text-amber-400">
                    {b.title}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">{b.authors}</p>
                  {progressByBookId.has(b.id) && (
                    <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                      <BookOpen className="h-3 w-3" />
                      Page {progressByBookId.get(b.id)}
                    </div>
                  )}
                </div>
              </Link>
              <div className="flex items-center justify-between border-t border-border/40 px-4 py-2">
                <Button asChild variant="ghost" size="sm" className="h-8 gap-1.5 px-2 text-xs">
                  <Link to="/book/$bookId" params={{ bookId: String(b.id) }}>
                    <BookOpen className="h-3.5 w-3.5" />
                    {progressByBookId.has(b.id) ? "Continue" : "Read"}
                  </Link>
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 gap-1.5 px-2 text-xs text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete "{b.title}"?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete this book and its downloaded files.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        onClick={async () => {
                          try {
                            await hardDeleteBook(b.id);
                            await qc.invalidateQueries({ queryKey: ["books"] });
                          } catch (e) {
                            const msg = e instanceof Error ? e.message : String(e);
                            console.error("Delete failed:", msg);
                          }
                        }}
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );

  return (
    <TooltipProvider>
      <div className="min-h-screen">
        {/* Search Header */}
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

        <div className="mx-auto max-w-6xl space-y-10 px-6 py-8">
          {/* Download Status */}
          {hasQueueActivity && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="flex items-center gap-4 rounded-xl border border-amber-200/60 bg-gradient-to-r from-amber-50 to-orange-50/50 px-5 py-3.5 shadow-sm dark:border-amber-800/40 dark:from-amber-950/30 dark:to-orange-950/20">
                <div className="flex items-center gap-3">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/40"
                        onClick={() => paused ? resumeAll() : setPaused(true)}
                      >
                        {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{paused ? "Resume" : "Pause"}</TooltipContent>
                  </Tooltip>

                  <div className="h-8 w-px bg-amber-200 dark:bg-amber-800" />

                  <div className="flex items-center gap-4 text-sm">
                    {counts.downloading > 0 && (
                      <span className="flex items-center gap-2">
                        <span className="relative flex h-2.5 w-2.5">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-500 opacity-75" />
                          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-500" />
                        </span>
                        <span className="font-medium">{counts.downloading}</span>
                        <span className="text-muted-foreground">active</span>
                      </span>
                    )}
                    {counts.queued > 0 && (
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" />
                        <span className="font-medium text-foreground">{counts.queued}</span>
                        queued
                      </span>
                    )}
                    {counts.done > 0 && (
                      <span className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span className="font-medium">{counts.done}</span>
                        done
                      </span>
                    )}
                    {counts.failed > 0 && (
                      <span className="flex items-center gap-2 text-destructive">
                        <span className="h-2 w-2 rounded-full bg-destructive" />
                        <span className="font-medium">{counts.failed}</span>
                        failed
                      </span>
                    )}
                  </div>
                </div>

                {active && (
                  <>
                    <div className="h-8 w-px bg-amber-200 dark:bg-amber-800" />
                    <span className="flex-1 truncate text-sm">
                      Downloading <span className="font-medium">{active.title}</span>
                    </span>
                  </>
                )}

                <div className="ml-auto flex items-center gap-2">
                  {counts.failed > 0 && (
                    <Button variant="ghost" size="sm" onClick={retryFailed} className="h-8 gap-1.5">
                      <RotateCcw className="h-3.5 w-3.5" />
                      Retry
                    </Button>
                  )}
                  {(counts.done > 0 || counts.failed > 0) && (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 gap-1.5">
                          <Trash className="h-3.5 w-3.5" />
                          Clear
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent align="end" className="w-44 p-1.5">
                        <button
                          type="button"
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-muted disabled:opacity-50"
                          onClick={clearDone}
                          disabled={counts.done === 0}
                        >
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                          Completed ({counts.done})
                        </button>
                        <button
                          type="button"
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-destructive hover:bg-destructive/10 disabled:opacity-50"
                          onClick={clearFailed}
                          disabled={counts.failed === 0}
                        >
                          <Trash className="h-4 w-4" />
                          Failed ({counts.failed})
                        </button>
                      </PopoverContent>
                    </Popover>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Main Content Sections - Reordered based on activity */}
          {(catalogSearch || (activeCatalog.kind !== "all" && catalogKey !== "collection-all")) ? (
            <>
              {/* Elevated Catalog Results */}
              <section className="rounded-2xl border border-border/40 bg-card/50 p-6">
                <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h2 className="font-serif text-xl font-medium text-foreground">
                      {catalogSearch ? `Results for "${catalogSearch}"` : activeCatalog.label}
                    </h2>
                    {!catalogSearch && activeCatalog.kind !== "all" && (
                      <p className="mt-1 text-sm text-muted-foreground">{activeCatalog.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Sort dropdown */}
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="gap-2">
                          <ArrowUpDown className="h-3.5 w-3.5" />
                          {sortBy === "relevance" ? "Best match" :
                            sortBy === "popular" ? "Most popular" :
                              sortBy === "title" ? "Title A-Z" : "Author A-Z"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent align="end" className="w-44 p-1.5">
                        <button
                          type="button"
                          onClick={() => setSortBy("relevance")}
                          className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${sortBy === "relevance" ? "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100" : "hover:bg-muted"}`}
                        >
                          <Sparkles className="h-4 w-4" />
                          Best match
                        </button>
                        <button
                          type="button"
                          onClick={() => setSortBy("popular")}
                          className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${sortBy === "popular" ? "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100" : "hover:bg-muted"}`}
                        >
                          <Download className="h-4 w-4" />
                          Most popular
                        </button>
                        <button
                          type="button"
                          onClick={() => setSortBy("title")}
                          className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${sortBy === "title" ? "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100" : "hover:bg-muted"}`}
                        >
                          <BookOpen className="h-4 w-4" />
                          Title A-Z
                        </button>
                        <button
                          type="button"
                          onClick={() => setSortBy("author")}
                          className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${sortBy === "author" ? "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100" : "hover:bg-muted"}`}
                        >
                          <FileText className="h-4 w-4" />
                          Author A-Z
                        </button>
                      </PopoverContent>
                    </Popover>

                    {canBulkScan && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={startOrResumeBulk}
                        disabled={bulkScan.running}
                      >
                        <Download className="h-4 w-4" />
                        {bulkScan.running ? "Scanning..." : "Download All"}
                      </Button>
                    )}
                  </div>
                </div>

                {showSearchPrompt ? (
                  <div className="rounded-xl border border-dashed border-border/60 bg-muted/20 py-12 text-center">
                    <Search className="mx-auto h-10 w-10 text-muted-foreground/40" />
                    <h3 className="mt-3 font-medium text-foreground">Search the catalog</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Enter a search term to browse over 70,000 free ebooks
                    </p>
                  </div>
                ) : catalogQ.isLoading ? (
                  <div className="flex h-48 items-center justify-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
                  </div>
                ) : catalogQ.isError ? (
                  <div className="rounded-xl border border-destructive/30 bg-destructive/5 py-8 text-center">
                    <p className="text-sm text-destructive">Failed to load catalog. Please try again.</p>
                  </div>
                ) : (
                  <>
                    <div className="mb-4 flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">
                        {filteredCatalogResults.length} of {catalogQ.data?.count ?? 0} results
                      </p>
                    </div>

                    {filteredCatalogResults.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-border/60 bg-muted/20 py-12 text-center">
                        <BookOpen className="mx-auto h-10 w-10 text-muted-foreground/40" />
                        <h3 className="mt-3 font-medium text-foreground">No results found</h3>
                        <p className="mt-1 text-sm text-muted-foreground">Try a different search or category</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {filteredCatalogResults.map((b) => {
                          const mobiUrl = bestMobiUrl(b);
                          const already = localGutenbergIds.has(b.id);
                          const queued = queue.some((t) => t.gutenbergId === b.id);
                          const cover = coverUrl(b);
                          const popular = isPopular(b.download_count);
                          const downloadStr = formatDownloadCount(b.download_count);
                          const resultType = classifyResult(b, catalogSearch);

                          return (
                            <div
                              key={b.id}
                              className={`group flex gap-4 rounded-xl border bg-background p-4 transition-all hover:shadow-md ${resultType === "primary" && popular
                                ? "border-amber-200/60 dark:border-amber-800/40"
                                : resultType === "tangential"
                                  ? "border-border/30 opacity-75"
                                  : "border-border/40"
                                }`}
                            >
                              {/* Cover Image */}
                              <div className="relative h-24 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-gradient-to-br from-stone-100 to-stone-200 shadow-sm dark:from-stone-800 dark:to-stone-900">
                                {cover ? (
                                  <img src={cover} alt="" className="h-full w-full object-cover" />
                                ) : (
                                  <div className="flex h-full items-center justify-center">
                                    <BookOpen className="h-6 w-6 text-stone-400" />
                                  </div>
                                )}
                                {popular && resultType === "primary" && (
                                  <div className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-[10px] shadow-sm">
                                    ⭐
                                  </div>
                                )}
                              </div>

                              {/* Content */}
                              <div className="min-w-0 flex-1 space-y-1">
                                <div className="flex items-start gap-2">
                                  <h4 className="font-medium leading-tight text-foreground line-clamp-2 group-hover:text-amber-600 dark:group-hover:text-amber-400">
                                    {b.title}
                                  </h4>
                                </div>

                                <p className="text-sm text-muted-foreground">{authorsString(b)}</p>

                                <div className="flex flex-wrap items-center gap-2 pt-1">
                                  {resultType === "primary" && catalogSearch && (
                                    <Badge variant="secondary" className="gap-1 bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                                      <BookMarked className="h-3 w-3" />
                                      Primary work
                                    </Badge>
                                  )}
                                  {resultType === "related" && catalogSearch && (
                                    <Badge variant="outline" className="gap-1 text-xs">
                                      <FileText className="h-3 w-3" />
                                      Related
                                    </Badge>
                                  )}
                                  {resultType === "tangential" && catalogSearch && (
                                    <Badge variant="outline" className="gap-1 text-xs opacity-60">
                                      Mentions "{catalogSearch}"
                                    </Badge>
                                  )}
                                  {popular && resultType === "primary" && (
                                    <Badge variant="secondary" className="gap-1 bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                                      <Sparkles className="h-3 w-3" />
                                      Popular
                                    </Badge>
                                  )}
                                  {downloadStr && (
                                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                      <Download className="h-3 w-3" />
                                      {downloadStr} downloads
                                    </span>
                                  )}
                                  <span className="text-xs text-muted-foreground">#{b.id}</span>
                                  {already && (
                                    <Badge variant="secondary" className="text-xs">
                                      In Library
                                    </Badge>
                                  )}
                                  {queued && (
                                    <Badge variant="outline" className="text-xs">
                                      Queued
                                    </Badge>
                                  )}
                                </div>
                              </div>

                              {/* Action */}
                              <div className="flex flex-shrink-0 flex-col items-end justify-center gap-2">
                                {mobiUrl ? (
                                  <Button
                                    size="sm"
                                    variant={already ? "secondary" : "default"}
                                    disabled={already || queued}
                                    onClick={() => {
                                      enqueue({
                                        gutenbergId: b.id,
                                        title: b.title,
                                        authors: authorsString(b),
                                        publicationYear: null,
                                        coverUrl: cover,
                                        mobiUrl,
                                      });
                                      setPaused(false);
                                      void runQueue();
                                    }}
                                    className="min-w-[80px]"
                                  >
                                    {already ? "Added" : queued ? "Queued" : "Add"}
                                  </Button>
                                ) : (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        disabled
                                        className="min-w-[80px] cursor-not-allowed opacity-50"
                                      >
                                        Unavailable
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>No MOBI format available for this book</p>
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {(catalogQ.data?.previous || catalogQ.data?.next) && (
                      <div className="mt-6 flex items-center justify-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={!catalogQ.data?.previous}
                          onClick={() => setCatalogPageUrl(catalogQ.data?.previous ?? null)}
                        >
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={!catalogQ.data?.next}
                          onClick={() => setCatalogPageUrl(catalogQ.data?.next ?? null)}
                        >
                          Next
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </section>

              {/* Collections and Library at the bottom */}
              <CuratedCollectionsSection />
              {booksInProgress.length > 0 && (booksQ.data ?? []).length > 1 && <ContinueReadingSection />}
              <YourLibrarySection />
            </>
          ) : (
            <>
              {/* Default Order: Collections -> Library -> Results */}
              <CuratedCollectionsSection />
              {booksInProgress.length > 0 && (booksQ.data ?? []).length > 1 && <ContinueReadingSection />}
              <YourLibrarySection />
              <section className="rounded-2xl border border-border/40 bg-card/50 p-6">
                <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h2 className="font-serif text-xl font-medium text-foreground">
                      {catalogSearch ? `Results for "${catalogSearch}"` : activeCatalog.label}
                    </h2>
                    {!catalogSearch && activeCatalog.kind !== "all" && (
                      <p className="mt-1 text-sm text-muted-foreground">{activeCatalog.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Sort dropdown */}
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="gap-2">
                          <ArrowUpDown className="h-3.5 w-3.5" />
                          {sortBy === "relevance" ? "Best match" :
                            sortBy === "popular" ? "Most popular" :
                              sortBy === "title" ? "Title A-Z" : "Author A-Z"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent align="end" className="w-44 p-1.5">
                        <button
                          type="button"
                          onClick={() => setSortBy("relevance")}
                          className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${sortBy === "relevance" ? "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100" : "hover:bg-muted"}`}
                        >
                          <Sparkles className="h-4 w-4" />
                          Best match
                        </button>
                        <button
                          type="button"
                          onClick={() => setSortBy("popular")}
                          className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${sortBy === "popular" ? "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100" : "hover:bg-muted"}`}
                        >
                          <Download className="h-4 w-4" />
                          Most popular
                        </button>
                        <button
                          type="button"
                          onClick={() => setSortBy("title")}
                          className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${sortBy === "title" ? "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100" : "hover:bg-muted"}`}
                        >
                          <BookOpen className="h-4 w-4" />
                          Title A-Z
                        </button>
                        <button
                          type="button"
                          onClick={() => setSortBy("author")}
                          className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${sortBy === "author" ? "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100" : "hover:bg-muted"}`}
                        >
                          <FileText className="h-4 w-4" />
                          Author A-Z
                        </button>
                      </PopoverContent>
                    </Popover>

                    {canBulkScan && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={startOrResumeBulk}
                        disabled={bulkScan.running}
                      >
                        <Download className="h-4 w-4" />
                        {bulkScan.running ? "Scanning..." : "Download All"}
                      </Button>
                    )}
                  </div>
                </div>

                {showSearchPrompt ? (
                  <div className="rounded-xl border border-dashed border-border/60 bg-muted/20 py-12 text-center">
                    <Search className="mx-auto h-10 w-10 text-muted-foreground/40" />
                    <h3 className="mt-3 font-medium text-foreground">Search the catalog</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Enter a search term to browse over 70,000 free ebooks
                    </p>
                  </div>
                ) : catalogQ.isLoading ? (
                  <div className="flex h-48 items-center justify-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
                  </div>
                ) : catalogQ.isError ? (
                  <div className="rounded-xl border border-destructive/30 bg-destructive/5 py-8 text-center">
                    <p className="text-sm text-destructive">Failed to load catalog. Please try again.</p>
                  </div>
                ) : (
                  <>
                    <div className="mb-4 flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">
                        {filteredCatalogResults.length} of {catalogQ.data?.count ?? 0} results
                      </p>
                    </div>

                    {filteredCatalogResults.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-border/60 bg-muted/20 py-12 text-center">
                        <BookOpen className="mx-auto h-10 w-10 text-muted-foreground/40" />
                        <h3 className="mt-3 font-medium text-foreground">No results found</h3>
                        <p className="mt-1 text-sm text-muted-foreground">Try a different search or category</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {filteredCatalogResults.map((b) => {
                          const mobiUrl = bestMobiUrl(b);
                          const already = localGutenbergIds.has(b.id);
                          const queued = queue.some((t) => t.gutenbergId === b.id);
                          const cover = coverUrl(b);
                          const popular = isPopular(b.download_count);
                          const downloadStr = formatDownloadCount(b.download_count);
                          const resultType = classifyResult(b, catalogSearch);

                          return (
                            <div
                              key={b.id}
                              className={`group flex gap-4 rounded-xl border bg-background p-4 transition-all hover:shadow-md ${resultType === "primary" && popular
                                ? "border-amber-200/60 dark:border-amber-800/40"
                                : resultType === "tangential"
                                  ? "border-border/30 opacity-75"
                                  : "border-border/40"
                                }`}
                            >
                              {/* Cover Image */}
                              <div className="relative h-24 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-gradient-to-br from-stone-100 to-stone-200 shadow-sm dark:from-stone-800 dark:to-stone-900">
                                {cover ? (
                                  <img src={cover} alt="" className="h-full w-full object-cover" />
                                ) : (
                                  <div className="flex h-full items-center justify-center">
                                    <BookOpen className="h-6 w-6 text-stone-400" />
                                  </div>
                                )}
                                {popular && resultType === "primary" && (
                                  <div className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-[10px] shadow-sm">
                                    ⭐
                                  </div>
                                )}
                              </div>

                              {/* Content */}
                              <div className="min-w-0 flex-1 space-y-1">
                                <div className="flex items-start gap-2">
                                  <h4 className="font-medium leading-tight text-foreground line-clamp-2 group-hover:text-amber-600 dark:group-hover:text-amber-400">
                                    {b.title}
                                  </h4>
                                </div>

                                <p className="text-sm text-muted-foreground">{authorsString(b)}</p>

                                <div className="flex flex-wrap items-center gap-2 pt-1">
                                  {resultType === "primary" && catalogSearch && (
                                    <Badge variant="secondary" className="gap-1 bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                                      <BookMarked className="h-3 w-3" />
                                      Primary work
                                    </Badge>
                                  )}
                                  {resultType === "related" && catalogSearch && (
                                    <Badge variant="outline" className="gap-1 text-xs">
                                      <FileText className="h-3 w-3" />
                                      Related
                                    </Badge>
                                  )}
                                  {resultType === "tangential" && catalogSearch && (
                                    <Badge variant="outline" className="gap-1 text-xs opacity-60">
                                      Mentions "{catalogSearch}"
                                    </Badge>
                                  )}
                                  {popular && resultType === "primary" && (
                                    <Badge variant="secondary" className="gap-1 bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                                      <Sparkles className="h-3 w-3" />
                                      Popular
                                    </Badge>
                                  )}
                                  {downloadStr && (
                                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                      <Download className="h-3 w-3" />
                                      {downloadStr} downloads
                                    </span>
                                  )}
                                  <span className="text-xs text-muted-foreground">#{b.id}</span>
                                  {already && (
                                    <Badge variant="secondary" className="text-xs">
                                      In Library
                                    </Badge>
                                  )}
                                  {queued && (
                                    <Badge variant="outline" className="text-xs">
                                      Queued
                                    </Badge>
                                  )}
                                </div>
                              </div>

                              {/* Action */}
                              <div className="flex flex-shrink-0 flex-col items-end justify-center gap-2">
                                {mobiUrl ? (
                                  <Button
                                    size="sm"
                                    variant={already ? "secondary" : "default"}
                                    disabled={already || queued}
                                    onClick={() => {
                                      enqueue({
                                        gutenbergId: b.id,
                                        title: b.title,
                                        authors: authorsString(b),
                                        publicationYear: null,
                                        coverUrl: cover,
                                        mobiUrl,
                                      });
                                      setPaused(false);
                                      void runQueue();
                                    }}
                                    className="min-w-[80px]"
                                  >
                                    {already ? "Added" : queued ? "Queued" : "Add"}
                                  </Button>
                                ) : (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        disabled
                                        className="min-w-[80px] cursor-not-allowed opacity-50"
                                      >
                                        Unavailable
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>No MOBI format available for this book</p>
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {(catalogQ.data?.previous || catalogQ.data?.next) && (
                      <div className="mt-6 flex items-center justify-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={!catalogQ.data?.previous}
                          onClick={() => setCatalogPageUrl(catalogQ.data?.previous ?? null)}
                        >
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={!catalogQ.data?.next}
                          onClick={() => setCatalogPageUrl(catalogQ.data?.next ?? null)}
                        >
                          Next
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </section>
            </>
          )}

          {/* Queue Details (collapsible) */}
          {queue.length > 0 && (
            <section className="rounded-2xl border border-border/40 bg-card/50 p-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-serif text-lg font-medium text-foreground">Download Queue</h3>
                <span className="text-sm text-muted-foreground">{queue.length} items</span>
              </div>
              <ScrollArea className="h-48">
                <div className="space-y-2 pr-4">
                  {queue.slice().reverse().map((t) => (
                    <div
                      key={t.gutenbergId}
                      className="flex items-center justify-between gap-3 rounded-lg border border-border/40 bg-background p-3"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium text-foreground">{t.title}</div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>#{t.gutenbergId}</span>
                          <Badge
                            variant={
                              t.status === "failed"
                                ? "destructive"
                                : t.status === "done"
                                  ? "secondary"
                                  : t.status === "downloading"
                                    ? "default"
                                    : "outline"
                            }
                            className="text-xs"
                          >
                            {t.status}
                          </Badge>
                        </div>
                        {t.error && <div className="mt-1 text-xs text-destructive">{t.error}</div>}
                      </div>
                      <div className="flex gap-1">
                        {t.status === "failed" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setQueue((prev) =>
                                prev.map((x) =>
                                  x.gutenbergId === t.gutenbergId ? { ...x, status: "queued", error: null } : x,
                                ),
                              )
                            }
                          >
                            Retry
                          </Button>
                        )}
                        {(t.status === "queued" || t.status === "failed" || t.status === "done") && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setQueue((prev) => prev.filter((x) => x.gutenbergId !== t.gutenbergId))}
                          >
                            Remove
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </section>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
