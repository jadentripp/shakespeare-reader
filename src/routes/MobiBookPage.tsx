import { useMutation, useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { getBook, getBookHtml, getBookPosition, setBookPosition } from "../lib/tauri";

function injectHead(html: string, css: string): string {
  const styleTag = `<style>${css}</style>`;
  const headInsert = `${styleTag}`.trim();
  if (/<head[\s>]/i.test(html)) {
    return html.replace(/<head(\s[^>]*)?>/i, (m) => `${m}\n${headInsert}`);
  }
  return `<!doctype html><html><head>${headInsert}</head><body>${html}</body></html>`;
}

function parseSceneLinks(html: string): Array<{ label: string; href: string }> {
  try {
    const doc = new DOMParser().parseFromString(html, "text/html");
    const seen = new Set<string>();
    const out: Array<{ label: string; href: string }> = [];
    const anchors = Array.from(doc.querySelectorAll('a[href^="#"]')) as HTMLAnchorElement[];
    for (const a of anchors) {
      const href = a.getAttribute("href") ?? "";
      const label = (a.textContent ?? "").trim().replace(/\s+/g, " ");
      if (!href || href === "#" || !label) continue;
      const upper = label.toUpperCase();
      if (!upper.includes("SCENE") && !upper.includes("ACT")) continue;
      const key = `${href}::${label}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ label, href });
    }
    return out.slice(0, 500);
  } catch {
    return [];
  }
}

function parseSavedPage(cfi: string | null | undefined): number | null {
  if (!cfi) return null;
  const m = cfi.match(/^mobi:page:(\d+)$/);
  if (!m) return null;
  const n = Number(m[1]);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

function buildPrintedPageMap(doc: Document, scroller: HTMLElement): Map<number, number> {
  const map = new Map<number, number>();
  const pageWidth = Math.max(1, scroller.clientWidth);
  const scrollerRect = scroller.getBoundingClientRect();

  const candidates = Array.from(doc.querySelectorAll(".pagenum"));
  for (const el of candidates) {
    const raw = (el.textContent ?? "").trim();
    const m = raw.match(/^(\d{1,4})$/);
    if (!m) continue;
    const printed = Number(m[1]);
    if (!Number.isFinite(printed)) continue;
    if (map.has(printed)) continue;

    const r = (el as HTMLElement).getBoundingClientRect();
    const x = r.left - scrollerRect.left + scroller.scrollLeft;
    const page = Math.floor(x / pageWidth) + 1;
    map.set(printed, page);
  }

  return map;
}

export default function MobiBookPage(props: { bookId: number }) {
  const id = props.bookId;
  const bookQ = useQuery({ queryKey: ["book", id], queryFn: () => getBook(id) });
  const htmlQ = useQuery({ queryKey: ["bookHtml", id], queryFn: () => getBookHtml(id) });
  const posQ = useQuery({ queryKey: ["bookPos", id], queryFn: () => getBookPosition(id) });

  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const scrollerRef = useRef<HTMLElement | null>(null);
  const printedPageMapRef = useRef<Map<number, number>>(new Map());
  const currentPageRef = useRef(1);
  const totalPagesRef = useRef(1);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageInput, setPageInput] = useState("");
  const [sceneFilter, setSceneFilter] = useState("");
  const [zen, setZen] = useState(false);

  const setPosM = useMutation({ mutationFn: setBookPosition });

  useEffect(() => {
    totalPagesRef.current = totalPages;
  }, [totalPages]);

  const scenes = useMemo(() => parseSceneLinks(htmlQ.data ?? ""), [htmlQ.data]);
  const filteredScenes = useMemo(() => {
    const q = sceneFilter.trim().toLowerCase();
    if (!q) return scenes;
    return scenes.filter((s) => s.label.toLowerCase().includes(q)).slice(0, 200);
  }, [scenes, sceneFilter]);

  const srcDoc = useMemo(() => {
    const html = htmlQ.data ?? "";
    const css = `
      :root {
        --font-serif: 'EB Garamond', serif;
        --color-bg-light: #f8f5f2;
        --color-text-light: #2d3748;
        --color-bg-dark: #1a202c;
        --color-text-dark: #cbd5e0;
      }
      
      html, body {
        height: 100%;
        margin: 0;
        overflow: hidden !important;
        background-color: var(--color-bg-light);
        color: var(--color-text-light);
      }

      @media (prefers-color-scheme: dark) {
        html, body {
          background-color: var(--color-bg-dark);
          color: var(--color-text-dark);
        }
      }

      body {
        font-family: var(--font-serif);
        line-height: 1.65;
        font-size: 1.15rem;
      }
      
      a { color: #c0392b; }
      a:visited { color: #8e44ad; }
      img, svg { max-width: 100%; height: auto; }
      pre {
        white-space: pre-wrap;
        font-family: var(--font-serif);
      }
    `;
    return injectHead(html, css);
  }, [htmlQ.data]);

  const recomputePagination = () => {
    const scroller = scrollerRef.current;
    const iframe = iframeRef.current;
    const doc = iframe?.contentDocument;
    if (!scroller || !doc) return;
    const pageWidth = Math.max(1, scroller.clientWidth);
    const pages = Math.max(1, Math.ceil(scroller.scrollWidth / pageWidth));
    totalPagesRef.current = pages;
    setTotalPages(pages);
    printedPageMapRef.current = buildPrintedPageMap(doc, scroller);
  };

  const scrollToPage = (page: number) => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const pageWidth = Math.max(1, scroller.clientWidth);
    const p = Math.min(Math.max(1, page), totalPagesRef.current);
    scroller.scrollTo({ left: (p - 1) * pageWidth, top: 0, behavior: "auto" });
    setCurrentPage(p);
    currentPageRef.current = p;
    setPosM.mutate({ bookId: id, cfi: `mobi:page:${p}` });
  };

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    let raf = 0;
    let ro: ResizeObserver | null = null;

    const onLoad = () => {
      const doc = iframe.contentDocument;
      if (!doc) return;

      // Force-disable vertical scrolling on the document itself; paging happens via srScroller.
      try {
        doc.documentElement.style.overflow = "hidden";
        doc.body.style.overflow = "hidden";
        doc.body.style.margin = "0";
      } catch {
        // ignore
      }

      // Create a predictable horizontal scroller for pagination and move all body children into it.
      const existing = doc.getElementById("srScroller");
      if (!existing) {
        const scroller = doc.createElement("div");
        scroller.id = "srScroller";
        scroller.style.position = "fixed";
        scroller.style.inset = "0";
        scroller.style.width = "100vw";
        scroller.style.height = "100vh";
        scroller.style.overflowX = "auto";
        scroller.style.overflowY = "hidden";
        scroller.style.scrollSnapType = "x mandatory";
        scroller.style.setProperty("-webkit-overflow-scrolling", "touch");

        const content = doc.createElement("div");
        content.id = "srContent";
        content.style.height = "100%";
        content.style.padding = "24px";
        content.style.boxSizing = "border-box";
        content.style.columnWidth = "calc(100vw - 48px)";
        content.style.columnGap = "48px";
        content.style.columnFill = "auto";

        while (doc.body.firstChild) {
          content.appendChild(doc.body.firstChild);
        }
        scroller.appendChild(content);
        doc.body.appendChild(scroller);
      }

      const scroller = doc.getElementById("srScroller") as HTMLElement | null;
      if (!scroller) return;
      scrollerRef.current = scroller;

      const saved = parseSavedPage(posQ.data?.cfi);
      if (saved) setCurrentPage(saved);

      const onScroll = () => {
        if (raf) return;
        raf = window.requestAnimationFrame(() => {
          raf = 0;
          const pageWidth = Math.max(1, scroller.clientWidth);
          const p = Math.round(scroller.scrollLeft / pageWidth) + 1;
          const clamped = Math.min(Math.max(1, p), totalPagesRef.current);
          setCurrentPage(clamped);
          currentPageRef.current = clamped;
          setPosM.mutate({ bookId: id, cfi: `mobi:page:${clamped}` });
        });
      };

      scroller.addEventListener("scroll", onScroll, { passive: true });

      // Observe size changes to keep pagination stable.
      ro = new ResizeObserver(() => {
        const prev = currentPageRef.current;
        recomputePagination();
        scrollToPage(prev);
      });
      ro.observe(scroller);

      recomputePagination();
      scrollToPage(saved ?? 1);
    };

    iframe.addEventListener("load", onLoad);
    return () => {
      iframe.removeEventListener("load", onLoad);
      if (raf) window.cancelAnimationFrame(raf);
      ro?.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, posQ.data?.cfi]);

  const gotoPrintedPage = () => {
    const n = Number(pageInput);
    if (!Number.isFinite(n) || n <= 0) return;
    const mapped = printedPageMapRef.current.get(Math.round(n));
    if (mapped) {
      scrollToPage(mapped);
      return;
    }
    scrollToPage(Math.round(n));
  };

  const gotoHref = (href: string) => {
    const iframe = iframeRef.current;
    const doc = iframe?.contentDocument;
    const scroller = scrollerRef.current;
    if (!doc || !scroller) return;
    const id = href.startsWith("#") ? href.slice(1) : href;
    const el = doc.getElementById(id);
    if (!el) return;
    (el as HTMLElement).scrollIntoView({ block: "start" });
    // Let the scroll event update currentPage.
  };

  const prev = () => scrollToPage(currentPage - 1);
  const next = () => scrollToPage(currentPage + 1);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const tag = t?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select" || t?.isContentEditable) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === "ArrowRight" || e.key === "PageDown") {
        e.preventDefault();
        next();
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        prev();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, currentPage]);

  if (bookQ.isLoading || htmlQ.isLoading) return <div className="page">Loading…</div>;
  if (bookQ.isError || htmlQ.isError) return <div className="page">Failed to load book.</div>;

  return (
    <div className="page" style={{ padding: 0 }}>
      <div className="row" style={{ padding: 12, borderBottom: "1px solid var(--glass-border)", background: "var(--glass-surface)" }}>
        <Link to="/" className="buttonSecondary">
          Library
        </Link>
        <div style={{ minWidth: 0 }}>
          <div className="bookTitle" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontSize: '1.2rem' }}>
            {bookQ.data?.title}
          </div>
          <div className="muted" style={{ fontSize: 12 }}>
            Page {currentPage} / {totalPages}
          </div>
        </div>
        <div className="row" style={{ marginLeft: "auto" }}>
          <button 
            className={`buttonSecondary ${zen ? 'buttonToggleActive' : ''}`} 
            onClick={() => setZen(!zen)}
            title="Zen Mode (Distraction Free)"
          >
            {zen ? "Show Menu" : "Zen"}
          </button>
          <div className="divider" style={{ width: 1, height: 24, margin: '0 8px', background: 'var(--glass-border)' }} />
          <button className="buttonSecondary" onClick={prev} disabled={currentPage <= 1}>
            Prev
          </button>
          <button className="buttonSecondary" onClick={next} disabled={currentPage >= totalPages}>
            Next
          </button>
          <input
            className="input"
            style={{ width: 120 }}
            placeholder="Page #"
            value={pageInput}
            onChange={(e) => setPageInput(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") gotoPrintedPage();
            }}
          />
          <button className="button" onClick={gotoPrintedPage}>
            Go
          </button>
        </div>
      </div>

      <div className={`bookReaderGrid ${zen ? 'zen' : ''}`} style={{ height: "calc(100vh - 64px)" }}>
        <aside className="readerSidebar">
          <div className="muted" style={{ marginBottom: 8 }}>
            Scenes / Acts
          </div>
          <input className="input" placeholder="Filter" value={sceneFilter} onChange={(e) => setSceneFilter(e.currentTarget.value)} />
          <div style={{ height: 10 }} />
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {filteredScenes.length === 0 ? (
              <div className="muted">No scene links found.</div>
            ) : (
              filteredScenes.map((s) => (
                <button
                  key={`${s.href}:${s.label}`}
                  className="buttonSecondary"
                  style={{ textAlign: "left" }}
                  onClick={() => gotoHref(s.href)}
                >
                  {s.label}
                </button>
              ))
            )}
          </div>
        </aside>

        <main style={{ position: "relative" }}>
          <iframe
            ref={iframeRef}
            title="mobi"
            sandbox="allow-same-origin allow-scripts"
            style={{ width: "100%", height: "100%", border: 0, display: "block" }}
            srcDoc={srcDoc}
          />
        </main>
      </div>
    </div>
  );
}
