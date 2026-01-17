import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  hardDeleteBook,
  downloadGutenbergMobi,
  gutendexCatalogPage,
  listBooks,
  type GutendexBook,
} from "../lib/tauri";

const CATALOGS = [
  {
    key: "shakespeare",
    label: "Shakespeare",
    description: "Plays and poems attributed to William Shakespeare.",
  },
  {
    key: "greek-tragedy",
    label: "Greek tragedy",
    description: "Aeschylus, Sophocles, Euripides, and their contemporaries.",
  },
  {
    key: "greek-epic",
    label: "Greek epics",
    description: "Epic poetry and mythic journeys from ancient Greece.",
  },
  {
    key: "roman-drama",
    label: "Roman drama",
    description: "Latin comedies, tragedies, and theatrical classics.",
  },
  {
    key: "mythology",
    label: "Mythology",
    description: "Collections of myths, legends, and folktales.",
  },
  {
    key: "philosophy",
    label: "Philosophy",
    description: "Classic philosophical works and dialogues.",
  },
  {
    key: "gothic",
    label: "Gothic fiction",
    description: "Haunted manors, dark romances, and early horror.",
  },
  {
    key: "science-fiction",
    label: "Science fiction",
    description: "Speculative classics and visionary futures.",
  },
  {
    key: "poetry",
    label: "Poetry",
    description: "Lyric, narrative, and dramatic poetry collections.",
  },
] as const;

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

function authorsString(book: GutendexBook): string {
  return (book.authors ?? []).map((a) => {
    if (a.birth_year || a.death_year) {
      return `${a.name} (${a.birth_year ?? "?"}–${a.death_year ?? "?"})`;
    }
    return a.name;
  }).join(", ") || "";
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

export default function LibraryPage() {
  const qc = useQueryClient();
  const booksQ = useQuery({ queryKey: ["books"], queryFn: listBooks });
  const [catalogKey, setCatalogKey] = useState<string>("shakespeare");
  const [libraryQuery, setLibraryQuery] = useState("");
  const [catalogQuery, setCatalogQuery] = useState("");

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
  }>({
    running: false,
    scanned: 0,
    enqueued: 0,
    nextUrl: null,
    done: false,
    error: null,
    catalogKey: null,
  });
  const bulkRunnerRef = useRef(false);

  const [catalogPageUrl, setCatalogPageUrl] = useState<string | null>(null);
  const catalogQ = useQuery({
    queryKey: ["gutendex", catalogKey, catalogPageUrl],
    queryFn: () => gutendexCatalogPage({ catalogKey, pageUrl: catalogPageUrl }),
  });

  const localGutenbergIds = useMemo(() => {
    return new Set((booksQ.data ?? []).map((b) => b.gutenberg_id));
  }, [booksQ.data]);

  const activeCatalog = useMemo(() => {
    return CATALOGS.find((catalog) => catalog.key === catalogKey) ?? CATALOGS[0];
  }, [catalogKey]);

  useEffect(() => {
    setCatalogPageUrl(null);
    setCatalogQuery("");
    setBulkScan({
      running: false,
      scanned: 0,
      enqueued: 0,
      nextUrl: null,
      done: false,
      error: null,
      catalogKey: null,
    });
  }, [catalogKey]);

  const progressByBookId = useMemo(() => {
    const map = new Map<number, number>();
    if (typeof window === "undefined") return map;
    for (const book of booksQ.data ?? []) {
      const raw = window.localStorage.getItem(`reader-progress-${book.id}`);
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

  const deleteM = useMutation({
    mutationFn: hardDeleteBook,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["books"] });
    },
    onError: (e) => {
      const msg = e instanceof Error ? e.message : typeof e === "string" ? e : JSON.stringify(e);
      window.alert(`Delete failed: ${msg}`);
    },
  });

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

  async function runBulkScan(fromUrl: string | null, reset: boolean, key: string) {
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
          }
        : { ...prev, running: true, error: null, catalogKey: key },
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

        const page = await gutendexCatalogPage({ catalogKey: key, pageUrl });
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

  async function startOrResumeBulk() {
    setPaused(false);
    const reset = bulkScan.done || (bulkScan.scanned === 0 && bulkScan.nextUrl == null);
    const from = reset ? null : bulkScan.nextUrl;
    void runBulkScan(from ?? null, reset, catalogKey);
    void runQueue();
  }

  async function resumeAll() {
    setPaused(false);
    void runQueue();
    if (!bulkScan.done && !bulkScan.running) {
      const from = bulkScan.scanned === 0 ? null : bulkScan.nextUrl;
      void runBulkScan(from ?? null, false, catalogKey);
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

  const normalizedCatalogQuery = catalogQuery.trim().toLowerCase();
  const filteredCatalogResults = useMemo(() => {
    const results = catalogQ.data?.results ?? [];
    if (!normalizedCatalogQuery) return results;
    return results.filter((b) => {
      return (
        b.title.toLowerCase().includes(normalizedCatalogQuery) ||
        authorsString(b).toLowerCase().includes(normalizedCatalogQuery)
      );
    });
  }, [catalogQ.data, normalizedCatalogQuery]);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Library</h2>
          <p className="text-sm text-muted-foreground">Curated Project Gutenberg collections (DRM-free)</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={startOrResumeBulk}
            disabled={bulkScan.running}
            title={`Downloads all ${activeCatalog.label} items that have a .mobi on Gutenberg`}
          >
            {bulkScan.running
              ? `Scanning catalog… (${bulkScan.enqueued} queued, ${bulkScan.scanned} scanned)`
              : bulkScan.done
                ? `Rescan ${activeCatalog.label} catalog`
                : bulkScan.scanned > 0
                  ? "Resume scan"
                  : `Download all ${activeCatalog.label} (.mobi)`}
          </Button>
          <Button variant="outline" onClick={() => setPaused(true)} disabled={paused}>
            Pause
          </Button>
          <Button variant="outline" onClick={resumeAll} disabled={!paused}>
            Resume
          </Button>
          <Button variant="outline" onClick={retryFailed} disabled={counts.failed === 0} title="Retry all failed downloads">
            Retry failed
          </Button>
          <Button variant="outline" onClick={clearFailed} disabled={counts.failed === 0} title="Remove failed items from the queue">
            Clear failed
          </Button>
          <Button variant="outline" onClick={clearDone} disabled={counts.done === 0} title="Remove completed items from the queue">
            Clear done
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              setCatalogPageUrl(null);
              void qc.invalidateQueries({ queryKey: ["gutendex"] });
            }}
          >
            Refresh catalog
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="grid gap-4 pt-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="space-y-2">
            <Label htmlFor="catalog-select">Catalog focus</Label>
            <Select value={catalogKey} onValueChange={setCatalogKey}>
              <SelectTrigger id="catalog-select" className="w-full">
                <SelectValue placeholder="Pick a catalog" />
              </SelectTrigger>
              <SelectContent>
                {CATALOGS.map((catalog) => (
                  <SelectItem key={catalog.key} value={catalog.key}>
                    {catalog.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">{activeCatalog.description}</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="library-search">Search your library</Label>
            <Input
              id="library-search"
              placeholder="Search by title or author"
              value={libraryQuery}
              onChange={(event) => setLibraryQuery(event.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <Badge variant="secondary">Downloading {counts.downloading}</Badge>
        <Badge variant="secondary">Queued {counts.queued}</Badge>
        <Badge variant={counts.failed ? "destructive" : "secondary"}>Failed {counts.failed}</Badge>
        <Badge variant="secondary">Done {counts.done}</Badge>
        {paused ? <Badge variant="outline">Paused</Badge> : null}
        {active ? <span className="text-sm">Now: {active.title}</span> : null}
        {bulkScan.error ? <span className="text-sm text-destructive">Scan error: {bulkScan.error}</span> : null}
      </div>

      {queue.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Queue</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-64 pr-4">
              <div className="space-y-3">
                {queue.slice().reverse().map((t) => (
                  <div key={t.gutenbergId} className="flex flex-wrap items-start justify-between gap-3 rounded-lg border bg-card p-3">
                    <div className="min-w-0 space-y-1">
                      <div className="font-medium leading-tight">{t.title}</div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span>#{t.gutenbergId}</span>
                        <Badge
                          variant={
                            t.status === "failed" ? "destructive" : t.status === "done" ? "secondary" : "outline"
                          }
                        >
                          {t.status}
                        </Badge>
                        <span>attempts {t.attempts}</span>
                      </div>
                      {t.error ? <div className="text-xs text-destructive">{t.error}</div> : null}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {t.status === "failed" ? (
                        <Button
                          variant="outline"
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
                      ) : null}
                      {t.status === "queued" || t.status === "failed" || t.status === "done" ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setQueue((prev) => prev.filter((x) => x.gutenbergId !== t.gutenbergId))}
                          title="Remove from queue"
                        >
                          Remove
                        </Button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-xl font-semibold">Downloaded</h3>
          <p className="text-sm text-muted-foreground">
            {filteredBooks.length} of {(booksQ.data ?? []).length} titles
          </p>
        </div>
      </div>
      {booksQ.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (booksQ.data ?? []).length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <div className="text-lg font-semibold">Your library is empty</div>
            <p className="mt-2 text-sm text-muted-foreground">
              Download a few classics from the catalog below to get started.
            </p>
          </CardContent>
        </Card>
      ) : filteredBooks.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <div className="text-lg font-semibold">No matching downloads</div>
            <p className="mt-2 text-sm text-muted-foreground">
              Try a different title, author, or clear the search to see everything.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredBooks.map((b) => (
            <Card key={b.id} className="overflow-hidden">
              <div className="aspect-[3/4] w-full bg-muted">
                {b.cover_url ? (
                  <img className="h-full w-full object-cover" src={b.cover_url} alt="" />
                ) : (
                  <div className="h-full w-full" />
                )}
              </div>
              <CardContent className="space-y-2 pt-4">
                <Link to="/book/$bookId" params={{ bookId: String(b.id) }} className="block space-y-1">
                  <div className="text-base font-semibold leading-tight hover:underline">{b.title}</div>
                  <div className="text-sm text-muted-foreground">{b.authors}</div>
                  {b.publication_year && (
                    <div className="text-xs text-muted-foreground">Published: {b.publication_year}</div>
                  )}
                  <div className="text-xs text-muted-foreground">#{b.gutenberg_id}</div>
                  {progressByBookId.has(b.id) ? (
                    <div className="text-xs text-muted-foreground">
                      Saved page {progressByBookId.get(b.id)}
                    </div>
                  ) : null}
                </Link>
              </CardContent>
              <CardContent className="flex flex-wrap gap-2 pt-0">
                <Button asChild size="sm">
                  <Link to="/book/$bookId" params={{ bookId: String(b.id) }}>
                    {progressByBookId.has(b.id) ? "Continue" : "Open"}
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const ok = window.confirm(`Delete “${b.title}” and its downloaded files?`);
                    if (!ok) return;
                    deleteM.mutate(b.id);
                  }}
                  disabled={deleteM.isPending}
                >
                  Delete
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>Catalog</CardTitle>
              <p className="text-sm text-muted-foreground">{activeCatalog.label}</p>
            </div>
            <div className="w-full max-w-sm space-y-2">
              <Label htmlFor="catalog-search">Search catalog</Label>
              <Input
                id="catalog-search"
                placeholder="Filter by title or author"
                value={catalogQuery}
                onChange={(event) => setCatalogQuery(event.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {catalogQ.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : catalogQ.isError ? (
            <p className="text-sm text-destructive">Failed to load catalog.</p>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Showing {filteredCatalogResults.length} of {catalogQ.data?.count ?? 0}
              </p>
              {filteredCatalogResults.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="py-6 text-sm text-muted-foreground">
                    No matching titles in this catalog. Try a different search or catalog.
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {filteredCatalogResults.map((b) => {
                    const mobiUrl = bestMobiUrl(b);
                    const already = localGutenbergIds.has(b.id);
                    const queued = queue.some((t) => t.gutenbergId === b.id);
                    return (
                      <div key={b.id} className="flex flex-wrap items-start justify-between gap-3 rounded-lg border bg-card p-3">
                        <div className="min-w-0 space-y-1">
                          <div className="font-medium leading-tight">{b.title}</div>
                          <div className="text-xs text-muted-foreground">{authorsString(b)}</div>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <span>Gutenberg #{b.id}</span>
                            {already ? <Badge variant="secondary">Installed</Badge> : null}
                            {queued ? <Badge variant="outline">Queued</Badge> : null}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            disabled={already || queued || !mobiUrl}
                            onClick={() => {
                              if (!mobiUrl) return;
                              enqueue({
                                gutenbergId: b.id,
                                title: b.title,
                                authors: authorsString(b),
                                publicationYear: null,
                                coverUrl: coverUrl(b),
                                mobiUrl,
                              });
                              setPaused(false);
                              void runQueue();
                            }}
                          >
                            {already ? "Downloaded" : queued ? "Queued" : mobiUrl ? "Queue MOBI" : "No MOBI"}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!catalogQ.data?.previous}
                  onClick={() => setCatalogPageUrl(catalogQ.data?.previous ?? null)}
                >
                  Prev
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
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
