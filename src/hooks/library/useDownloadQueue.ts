import { useState, useRef, useEffect, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { downloadGutenbergMobi, gutendexCatalogPage } from "@/lib/tauri";
import { bestMobiUrl, coverUrl, authorsString } from "@/lib/gutenbergUtils";

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

export function useDownloadQueue(localGutenbergIds: Set<number>) {
  const qc = useQueryClient();
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

  function enqueue(task: Omit<DownloadTask, "status" | "attempts" | "error">) {
    setQueue((prev) => {
      if (prev.some((t) => t.gutenbergId === task.gutenbergId)) return prev;
      return [...prev, { ...task, status: "queued", attempts: 0, error: null }];
    });
  }

  async function runQueue() {
    if (runnerRef.current) return;
    if (pausedRef.current) return;
    runnerRef.current = true;
    try {
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
        }
        
        setBulkScan((prev) => ({
          ...prev,
          running: !!page.next && !pausedRef.current,
          scanned,
          enqueued,
          nextUrl: page.next ?? null,
          done: !page.next,
          catalogKey: key,
          searchQuery,
          topic,
        }));

        if (!page.next || pausedRef.current) break;
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
  }, [paused, counts.queued]);

  const active = useMemo(() => queue.find((t) => t.status === "downloading") ?? null, [queue]);

  return {
    queue,
    setQueue,
    paused,
    setPaused,
    bulkScan,
    setBulkScan,
    counts,
    active,
    enqueue,
    runQueue,
    runBulkScan,
    retryFailed: () => setQueue(prev => prev.map(t => t.status === "failed" ? { ...t, status: "queued", error: null } : t)),
    clearFailed: () => setQueue(prev => prev.filter(t => t.status !== "failed")),
    clearDone: () => setQueue(prev => prev.filter(t => t.status !== "done")),
  };
}
