import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  deleteBook,
  downloadGutenbergMobi,
  gutendexShakespearePage,
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
  }>({ running: false, scanned: 0, enqueued: 0, nextUrl: null, done: false, error: null });
  const bulkRunnerRef = useRef(false);

  const [catalogPageUrl, setCatalogPageUrl] = useState<string | null>(null);
  const catalogQ = useQuery({
    queryKey: ["gutendex", catalogPageUrl],
    queryFn: () => gutendexShakespearePage(catalogPageUrl),
  });

  const localGutenbergIds = useMemo(() => {
    return new Set((booksQ.data ?? []).map((b) => b.gutenberg_id));
  }, [booksQ.data]);

  const deleteM = useMutation({
    mutationFn: deleteBook,
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

  async function runBulkScan(fromUrl: string | null, reset: boolean) {
    if (bulkRunnerRef.current) return;
    if (pausedRef.current) return;
    bulkRunnerRef.current = true;
    setBulkScan((prev) =>
      reset
        ? { running: true, scanned: 0, enqueued: 0, nextUrl: null, done: false, error: null }
        : { ...prev, running: true, error: null },
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

        const page = await gutendexShakespearePage(pageUrl);
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
          }));
          break;
        }
        pageUrl = page.next;
      }
    } catch (e) {
      setBulkScan((prev) => ({ ...prev, running: false, error: String(e), nextUrl: pageUrl }));
    } finally {
      bulkRunnerRef.current = false;
      setBulkScan((prev) => ({ ...prev, running: false, scanned, enqueued, nextUrl: pageUrl }));
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
    void runBulkScan(from ?? null, reset);
    void runQueue();
  }

  async function resumeAll() {
    setPaused(false);
    void runQueue();
    if (!bulkScan.done && !bulkScan.running) {
      const from = bulkScan.scanned === 0 ? null : bulkScan.nextUrl;
      void runBulkScan(from ?? null, false);
    }
  }

  return (
    <div className="page">
      <h2>Library</h2>

      <div className="row" style={{ justifyContent: "space-between" }}>
        <div className="muted">Project Gutenberg (DRM-free)</div>
        <div className="row">
          <button
            className="button"
            onClick={startOrResumeBulk}
            disabled={bulkScan.running}
            title="Downloads all Shakespeare items that have a .mobi on Gutenberg"
          >
            {bulkScan.running
              ? `Scanning catalog… (${bulkScan.enqueued} queued, ${bulkScan.scanned} scanned)`
              : bulkScan.done
                ? "Rescan Shakespeare catalog"
                : bulkScan.scanned > 0
                  ? "Resume scan"
                  : "Download all Shakespeare (.mobi)"}
          </button>
          <button className="buttonSecondary" onClick={() => setPaused(true)} disabled={paused}>
            Pause
          </button>
          <button className="buttonSecondary" onClick={resumeAll} disabled={!paused}>
            Resume
          </button>
          <button
            className="buttonSecondary"
            onClick={retryFailed}
            disabled={counts.failed === 0}
            title="Retry all failed downloads"
          >
            Retry failed
          </button>
          <button
            className="buttonSecondary"
            onClick={clearFailed}
            disabled={counts.failed === 0}
            title="Remove failed items from the queue"
          >
            Clear failed
          </button>
          <button
            className="buttonSecondary"
            onClick={clearDone}
            disabled={counts.done === 0}
            title="Remove completed items from the queue"
          >
            Clear done
          </button>
          <button
            className="buttonSecondary"
            onClick={() => {
              setCatalogPageUrl(null);
              void qc.invalidateQueries({ queryKey: ["gutendex"] });
            }}
          >
            Refresh catalog
          </button>
        </div>
      </div>

      <div className="muted" style={{ marginTop: 8 }}>
        Queue: {counts.downloading} downloading, {counts.queued} queued, {counts.failed} failed, {counts.done} done
        {paused ? " (paused)" : ""}
        {active ? ` — Now: ${active.title}` : ""}
        {bulkScan.error ? ` — Scan error: ${bulkScan.error}` : ""}
      </div>

      {queue.length > 0 ? (
        <div className="catalogList" style={{ marginTop: 10 }}>
          {queue.slice().reverse().map((t) => (
            <div key={t.gutenbergId} className="catalogRow">
              <div style={{ minWidth: 0 }}>
                <div className="bookTitle">{t.title}</div>
                <div className="muted">
                  #{t.gutenbergId} · {t.status} · attempts {t.attempts}
                </div>
                {t.error ? <div className="error">{t.error}</div> : null}
              </div>
              <div className="row">
                {t.status === "failed" ? (
                  <button
                    className="buttonSecondary"
                    onClick={() =>
                      setQueue((prev) =>
                        prev.map((x) =>
                          x.gutenbergId === t.gutenbergId ? { ...x, status: "queued", error: null } : x,
                        ),
                      )
                    }
                  >
                    Retry
                  </button>
                ) : null}
                {t.status === "queued" || t.status === "failed" || t.status === "done" ? (
                  <button
                    className="buttonSecondary"
                    onClick={() => setQueue((prev) => prev.filter((x) => x.gutenbergId !== t.gutenbergId))}
                    title="Remove from queue"
                  >
                    Remove
                  </button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <h3>Downloaded</h3>
      {booksQ.isLoading ? (
        <div className="muted">Loading…</div>
      ) : (booksQ.data ?? []).length === 0 ? (
        <div className="muted">No books yet. Download from the catalog below.</div>
      ) : (
        <div className="bookGrid">
          {(booksQ.data ?? []).map((b) => (
            <div key={b.id} className="bookCard">
              {b.cover_url ? (
                <img className="bookCover" src={b.cover_url} alt="" />
              ) : (
                <div className="bookCoverPlaceholder" />
              )}
              <div style={{ minWidth: 0 }}>
                <Link to="/book/$bookId" params={{ bookId: String(b.id) }} className="bookOpenLink">
                  <div className="bookTitle">{b.title}</div>
                  <div className="muted">{b.authors}</div>
                  {b.publication_year && <div className="muted">Published: {b.publication_year}</div>}
                  <div className="muted">#{b.gutenberg_id}</div>
                </Link>
                <div className="row" style={{ justifyContent: "space-between", marginTop: 8 }}>
                  <button
                    className="buttonSecondary"
                    onClick={() => {
                      const ok = window.confirm(`Delete “${b.title}” and its downloaded files?`);
                      if (!ok) return;
                      deleteM.mutate(b.id);
                    }}
                    disabled={deleteM.isPending}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <h3>Shakespeare catalog</h3>
      {catalogQ.isLoading ? (
        <div className="muted">Loading…</div>
      ) : catalogQ.isError ? (
        <div className="error">Failed to load catalog.</div>
      ) : (
        <>
          <div className="muted">
            Showing {(catalogQ.data?.results ?? []).length} of {catalogQ.data?.count ?? 0}
          </div>
          <div className="catalogList">
            {(catalogQ.data?.results ?? []).map((b) => {
              const mobiUrl = bestMobiUrl(b);
              const already = localGutenbergIds.has(b.id);
              const queued = queue.some((t) => t.gutenbergId === b.id);
              return (
                <div key={b.id} className="catalogRow">
                  <div style={{ minWidth: 0 }}>
                    <div className="bookTitle">{b.title}</div>
                    <div className="muted">{authorsString(b)}</div>
                    <div className="muted">Gutenberg #{b.id}</div>
                  </div>
                  <div className="row">
                    <button
                      className="button"
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
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="row" style={{ justifyContent: "space-between" }}>
            <button
              className="buttonSecondary"
              disabled={!catalogQ.data?.previous}
              onClick={() => setCatalogPageUrl(catalogQ.data?.previous ?? null)}
            >
              Prev
            </button>
            <button
              className="buttonSecondary"
              disabled={!catalogQ.data?.next}
              onClick={() => setCatalogPageUrl(catalogQ.data?.next ?? null)}
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
}
