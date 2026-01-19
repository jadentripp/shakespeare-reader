import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
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
} from "../lib/tauri";
import {
  bestMobiUrl,
  coverUrl,
  authorsString,
  sortResults,
  getRecentSearches,
  addRecentSearch,
  clearRecentSearches as clearRecentSearchesUtil,
  type SortOption,
} from "../lib/gutenbergUtils";

export type DownloadStatus = "queued" | "downloading" | "done" | "failed";
export type DownloadTask = {
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

export type BulkScanState = {
  running: boolean;
  scanned: number;
  enqueued: number;
  nextUrl: string | null;
  done: boolean;
  error: string | null;
  catalogKey: string | null;
  searchQuery: string | null;
  topic: string | null;
};

export function useLibrary() {
  const qc = useQueryClient();
  const booksQ = useQuery({ queryKey: ["books"], queryFn: listBooks });
  const [catalogKey, setCatalogKey] = useState<string>(DEFAULT_CATALOG_KEY);
  const [libraryQuery, setLibraryQuery] = useState("");
  const [catalogQuery, setCatalogQuery] = useState("");
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>("relevance");
  const [searchFocused, setSearchFocused] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [catalogPageUrl, setCatalogPageUrl] = useState<string | null>(null);
  const [queue, setQueue] = useState<DownloadTask[]>([]);
  const [paused, setPaused] = useState(false);
  const [bulkScan, setBulkScan] = useState<BulkScanState>({
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

  const queueRef = useRef(queue);
  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  const pausedRef = useRef(paused);
  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  const runnerRef = useRef(false);
  const bulkRunnerRef = useRef(false);

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

  const booksInProgress = useMemo(() => {
    return (booksQ.data ?? []).filter(b => progressByBookId.has(b.id));
  }, [booksQ.data, progressByBookId]);

  const hasQueueActivity = counts.downloading > 0 || counts.queued > 0 || counts.failed > 0 || counts.done > 0;

  async function deleteBook(id: number) {
    try {
      await hardDeleteBook(id);
      await qc.invalidateQueries({ queryKey: ["books"] });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("Delete failed:", msg);
      throw e;
    }
  }

  return {
    booksQ,
    catalogKey,
    setCatalogKey,
    libraryQuery,
    setLibraryQuery,
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
    queue,
    setQueue,
    paused,
    setPaused,
    bulkScan,
    catalogQ,
    activeCatalog,
    catalogSearch,
    canQueryCatalog,
    localGutenbergIds,
    progressByBookId,
    counts,
    active,
    canBulkScan,
    filteredBooks,
    sortedCatalogResults,
    booksInProgress,
    hasQueueActivity,
    handleSearch,
    clearRecentSearches,
    enqueue,
    retryFailed,
    clearFailed,
    clearDone,
    startOrResumeBulk,
    resumeAll,
    deleteBook,
  };
}
