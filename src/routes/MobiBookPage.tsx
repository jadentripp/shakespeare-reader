import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { getBook, getBookHtml } from "../lib/tauri";
import ReaderLayout from "../components/ReaderLayout";
import AppearancePanel from "../components/AppearancePanel";
import { useReaderAppearance } from "../lib/appearance";

export interface Scene {
  label: string;
  href: string;
}

export interface Act {
  label: string;
  href: string;
  scenes: Scene[];
}

const DESIRED_PAGE_WIDTH = 750;

function injectHead(html: string, css: string): string {
  const styleTag = `<style>${css}</style>`;
  const headInsert = `${styleTag}`.trim();
  if (/<head[\s>]/i.test(html)) {
    return html.replace(/<head(\s[^>]*)?>/i, (m) => `${m}\n${headInsert}`);
  }
  return `<!doctype html><html><head>${headInsert}</head><body>${html}</body></html>`;
}

function normalizeHtmlFragment(html: string): string {
  return html
    .replace(/<\?xml[\s\S]*?\?>/gi, "")
    .replace(/<!doctype[\s\S]*?>/gi, "")
    .replace(/<\/?(html|head|body)[^>]*>/gi, "")
    .trim();
}

function wrapBody(html: string): string {
  if (html.includes('id="reader-root"')) return html;
  const normalized = normalizeHtmlFragment(html);
  return `<!doctype html><html><head></head><body><div id="reader-root">${normalized}</div></body></html>`;
}

export function parseSceneLinksHierarchical(html: string): Act[] {
  try {
    const normalized = normalizeHtmlFragment(html);
    const doc = new DOMParser().parseFromString(normalized, "text/html");
    const out: Act[] = [];
    let currentAct: Act | null = null;

    const anchors = Array.from(doc.querySelectorAll('a[href^="#"]')) as HTMLAnchorElement[];
    for (const a of anchors) {
      const href = a.getAttribute("href") ?? "";
      const label = (a.textContent ?? "").trim().replace(/\s+/g, " ");
      if (!href || href === "#" || !label) continue;

      const upper = label.toUpperCase();
      const isAct = upper.includes("ACT");
      const isScene = upper.includes("SCENE");

      if (isAct) {
        currentAct = { label, href, scenes: [] };
        out.push(currentAct);
      } else if (isScene) {
        if (!currentAct) {
          currentAct = { label: "Front Matter", href: "#", scenes: [] };
          out.push(currentAct);
        }
        currentAct.scenes.push({ label, href });
      }
    }
    return out;
  } catch {
    return [];
  }
}

export default function MobiBookPage(props: { bookId: number }) {
  const id = props.bookId;
  const bookQ = useQuery({ queryKey: ["book", id], queryFn: () => getBook(id) });
  const htmlQ = useQuery({ queryKey: ["bookHtml", id], queryFn: () => getBookHtml(id) });

  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const layoutRafRef = useRef<number | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const saveTimeoutRef = useRef<number | null>(null);
  const lockTimeoutRef = useRef<number | null>(null);
  const pageLockRef = useRef(1);
  const restoredRef = useRef(false);
  const pendingRestoreRef = useRef<{ page?: number } | null>(null);
  const [columns, setColumns] = useState<1 | 2>(1);
  const [showAppearance, setShowAppearance] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [jumpPage, setJumpPage] = useState("");

  const {
    fontFamily,
    lineHeight,
    margin,
    setFontFamily,
    setLineHeight,
    setMargin
  } = useReaderAppearance(id);

  const progressKey = `reader-progress-${id}`;

  const pageGap = columns === 2 ? 80 : 0;
  const readerWidth =
    columns === 2
      ? DESIRED_PAGE_WIDTH * 2 + pageGap + margin * 2
      : DESIRED_PAGE_WIDTH + margin * 2;

  const srcDoc = useMemo(() => {
    if (!htmlQ.data) return "";
    const gap = pageGap;
    let css = `
      :root {
        --page-gap: ${gap}px;
        --page-content-width: ${DESIRED_PAGE_WIDTH}px;
        --column-width: var(--page-content-width);
        --page-ink: #2c2722;
        --page-muted: #6d645c;
        --page-link: #b24a2f;
        --page-link-hover: #8f2f1c;
        --page-rule: rgba(44, 39, 34, 0.18);
        --page-mark: rgba(178, 74, 47, 0.18);
      }
      html, body {
        width: 100%;
        height: 100%;
        margin: 0;
        padding: 0;
        overflow: hidden;
      }
      body {
        font-family: ${fontFamily};
        line-height: ${lineHeight};
        font-size: 1.1rem;
        color: var(--page-ink);
        letter-spacing: 0.01em;
        background-color: transparent;
        text-rendering: optimizeLegibility;
      }
      #reader-root {
        height: 100vh;
        padding: 52px 0 64px;
        box-sizing: border-box;
        column-fill: auto;
        column-width: var(--column-width);
        column-gap: var(--page-gap);
        column-rule: ${columns === 2 ? "1px solid var(--page-rule)" : "none"};
        column-count: auto;
        width: ${columns === 2 ? DESIRED_PAGE_WIDTH * 2 + gap + margin * 2 : DESIRED_PAGE_WIDTH + margin * 2}px;
        max-width: 100%;
        margin: 0 auto;
        overflow-x: hidden;
        overflow-y: hidden;
        scroll-behavior: smooth;
        color: var(--page-ink);
        touch-action: pan-y;
      }
      #reader-root::-webkit-scrollbar {
        display: none;
      }
      #reader-root > * {
        break-inside: avoid;
        padding-left: ${margin}px;
        padding-right: ${margin}px;
        box-sizing: border-box;
      }
      h1, h2, h3, h4, h5, h6 {
        margin: 1.6rem 0 0.7rem;
        line-height: 1.2;
        font-weight: 700;
        color: var(--page-ink);
      }
      h1 {
        font-size: 2.1rem;
        letter-spacing: 0.02em;
      }
      h2 {
        font-size: 1.6rem;
      }
      h3 {
        font-size: 1.3rem;
      }
      h4, h5, h6 {
        font-size: 1.05rem;
        letter-spacing: 0.02em;
        font-weight: 600;
      }
      p {
        margin: 0 0 0.9rem;
      }
      ul, ol {
        margin: 0 0 1rem;
        padding-left: 1.4rem;
      }
      li {
        margin-bottom: 0.45rem;
      }
      li::marker {
        color: var(--page-muted);
      }
      a {
        color: var(--page-link);
        text-decoration: none;
        border-bottom: 1px solid transparent;
      }
      a:hover {
        color: var(--page-link-hover);
        border-bottom-color: currentColor;
      }
      strong, b {
        font-weight: 600;
      }
      hr {
        border: 0;
        border-top: 1px solid var(--page-rule);
        margin: 1.6rem 0;
      }
      blockquote {
        margin: 1.2rem 0;
        padding: 0 0 0 1rem;
        border-left: 3px solid var(--page-rule);
        color: var(--page-muted);
      }
      pre, code {
        font-family: "SFMono-Regular", Menlo, Consolas, "Liberation Mono", monospace;
        font-size: 0.92em;
        background: rgba(0, 0, 0, 0.05);
      }
      pre {
        padding: 0.8rem 1rem;
        border-radius: 10px;
        overflow: auto;
      }
      code {
        padding: 0.1em 0.3em;
        border-radius: 6px;
      }
      table {
        width: 100%;
        border-collapse: separate;
        border-spacing: 0 0.35rem;
        margin: 1rem 0;
        font-size: 0.98rem;
      }
      th, td {
        border: none;
        padding: 0;
        text-align: left;
      }
      img {
        max-width: 100%;
        height: auto;
      }
      img[src^="kindle:"], img[src^="cid:"] {
        display: none;
      }
      .pg-boilerplate {
        font-size: 0.95rem;
        color: var(--page-muted);
      }
      .pg-boilerplate a {
        color: var(--page-link);
      }
      ::selection {
        background: var(--page-mark);
      }
      @media (prefers-color-scheme: dark) {
        :root {
          --page-ink: #f1e9dc;
          --page-muted: rgba(241, 233, 220, 0.7);
          --page-link: #e28a6d;
          --page-link-hover: #f0a08a;
          --page-rule: rgba(241, 233, 220, 0.22);
          --page-mark: rgba(208, 107, 76, 0.25);
        }
        body {
          color: var(--page-ink);
        }
        pre,
        code {
          background: rgba(0, 0, 0, 0.35);
        }
      }
    `;
    return injectHead(wrapBody(htmlQ.data), css);
  }, [htmlQ.data, fontFamily, lineHeight, margin, columns, pageGap]);

  const getScrollRoot = () => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return null;
    return (doc.getElementById("reader-root") as HTMLElement | null) ?? doc.documentElement;
  };

  const getPageMetrics = () => {
    const root = getScrollRoot();
    if (!root) {
      const fallbackWidth = iframeRef.current?.clientWidth || window.innerWidth;
      return { pageWidth: fallbackWidth, gap: 0, paddingLeft: 0, paddingRight: 0, scrollWidth: 0 };
    }
    const styles = root.ownerDocument?.defaultView?.getComputedStyle(root);
    const paddingLeft = styles ? parseFloat(styles.paddingLeft || "0") : 0;
    const paddingRight = styles ? parseFloat(styles.paddingRight || "0") : 0;
    const pageWidthVar = styles ? parseFloat(styles.getPropertyValue("--page-content-width")) : NaN;
    const gapVar = styles ? parseFloat(styles.getPropertyValue("--page-gap")) : NaN;
    const fallbackPageWidth = Math.max(0, root.clientWidth - paddingLeft - paddingRight);
    const pageWidth = Number.isFinite(pageWidthVar) && pageWidthVar > 0 ? pageWidthVar : fallbackPageWidth;
    const gap = Number.isFinite(gapVar) && gapVar > 0 ? gapVar : 0;
    return { pageWidth, gap, paddingLeft, paddingRight, scrollWidth: root.scrollWidth };
  };

  const syncPageMetrics = () => {
    const root = getScrollRoot();
    if (!root) return;
    const styles = root.ownerDocument?.defaultView?.getComputedStyle(root);
    const paddingLeft = styles ? parseFloat(styles.paddingLeft || "0") : 0;
    const paddingRight = styles ? parseFloat(styles.paddingRight || "0") : 0;
    const gap = columns === 2 ? 80 : 0;
    const docWidth = root.ownerDocument?.documentElement?.clientWidth || root.clientWidth;
    const maxPageWidth = Math.max(
      0,
      (docWidth - paddingLeft - paddingRight - gap * (columns - 1)) / columns
    );
    const pageWidth = Math.min(DESIRED_PAGE_WIDTH, maxPageWidth);
    const containerWidth = pageWidth * columns + gap * (columns - 1) + paddingLeft + paddingRight;
    root.style.width = `${containerWidth}px`;
    root.style.setProperty("--page-content-width", `${pageWidth}px`);
    root.style.setProperty("--page-gap", `${gap}px`);
    root.style.setProperty("--column-width", `${pageWidth}px`);
  };

  const scheduleSaveProgress = (page: number) => {
    if (saveTimeoutRef.current !== null) return;
    saveTimeoutRef.current = window.setTimeout(() => {
      saveTimeoutRef.current = null;
      localStorage.setItem(progressKey, JSON.stringify({ page }));
    }, 400);
  };

  const lockToPage = (page = pageLockRef.current) => {
    const root = getScrollRoot();
    if (!root) return;
    const { pageWidth, gap } = getPageMetrics();
    if (!pageWidth) return;
    const stride = pageWidth + gap;
    const target = Math.max(0, (page - 1) * stride);
    if (Math.abs(root.scrollLeft - target) > 1) {
      root.scrollLeft = target;
    }
  };

  const scrollToPage = (page: number) => {
    const root = getScrollRoot();
    if (!root) return;
    const { pageWidth, gap } = getPageMetrics();
    if (!pageWidth) return;
    const stride = pageWidth + gap;
    const target = Math.max(0, (page - 1) * stride);
    pageLockRef.current = page;
    root.scrollTo({ left: target, behavior: "smooth" });
  };

  const updatePagination = () => {
    const root = getScrollRoot();
    if (!root) return;
    const { pageWidth, gap, paddingLeft, paddingRight, scrollWidth } = getPageMetrics();
    if (!pageWidth) return;
    const usableWidth = Math.max(0, scrollWidth - paddingLeft - paddingRight);
    const stride = pageWidth + gap;
    const total = Math.max(1, Math.ceil((usableWidth + gap) / stride));
    const current = Math.min(total, Math.max(1, Math.round(root.scrollLeft / stride) + 1));
    setTotalPages(total);
    const lockedPage = Math.min(total, Math.max(1, pageLockRef.current));
    setCurrentPage(lockedPage);
    scheduleSaveProgress(lockedPage);
  };

  const schedulePaginationUpdate = () => {
    if (rafRef.current !== null) return;
    rafRef.current = window.requestAnimationFrame(() => {
      rafRef.current = null;
      updatePagination();
    });
  };

  const scheduleLock = () => {
    if (lockTimeoutRef.current !== null) {
      window.clearTimeout(lockTimeoutRef.current);
    }
    lockTimeoutRef.current = window.setTimeout(() => {
      lockTimeoutRef.current = null;
      lockToPage();
    }, 140);
  };

  const scheduleLayoutRebuild = () => {
    if (layoutRafRef.current !== null) return;
    layoutRafRef.current = window.requestAnimationFrame(() => {
      layoutRafRef.current = null;
      syncPageMetrics();
      lockToPage();
      updatePagination();
    });
  };

  const prev = () => {
    scrollToPage(Math.max(1, pageLockRef.current - 1));
  };

  const next = () => {
    scrollToPage(Math.min(totalPages, pageLockRef.current + 1));
  };

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && /input|textarea|select|button/i.test(target.tagName)) return;
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        prev();
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        next();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        window.requestAnimationFrame(() => lockToPage());
      }
    };
    const handleFocusChange = () => {
      window.requestAnimationFrame(() => lockToPage());
    };
    window.addEventListener("focus", handleFocusChange);
    window.addEventListener("blur", handleFocusChange);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.removeEventListener("focus", handleFocusChange);
      window.removeEventListener("blur", handleFocusChange);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      if (layoutRafRef.current !== null) {
        window.cancelAnimationFrame(layoutRafRef.current);
        layoutRafRef.current = null;
      }
      if (saveTimeoutRef.current !== null) {
        window.clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
      if (lockTimeoutRef.current !== null) {
        window.clearTimeout(lockTimeoutRef.current);
        lockTimeoutRef.current = null;
      }
      resizeObserverRef.current?.disconnect();
      resizeObserverRef.current = null;
    };
  }, []);

  useEffect(() => {
    restoredRef.current = false;
    if (!htmlQ.data) return;
    const raw = localStorage.getItem(progressKey);
    if (!raw) {
      pendingRestoreRef.current = null;
      return;
    }
    try {
      const parsed = JSON.parse(raw) as { page?: number };
      pendingRestoreRef.current = {
        page: typeof parsed.page === "number" ? parsed.page : undefined
      };
    } catch {
      pendingRestoreRef.current = null;
    }
  }, [htmlQ.data, progressKey]);

  const handleIframeLoad = () => {
    const doc = iframeRef.current?.contentDocument;
    const root = getScrollRoot();
    if (!doc || !root) return;

    syncPageMetrics();
    const handleScroll = () => {
      schedulePaginationUpdate();
      scheduleLock();
    };
    root.addEventListener("scroll", handleScroll, { passive: true });
    root.addEventListener(
      "wheel",
      (event) => {
        if (Math.abs(event.deltaX) > 0 || event.shiftKey) {
          event.preventDefault();
        }
      },
      { passive: false }
    );
    resizeObserverRef.current?.disconnect();
    resizeObserverRef.current = new ResizeObserver(() => scheduleLayoutRebuild());
    resizeObserverRef.current.observe(root);

    scheduleLayoutRebuild();
  };

  useEffect(() => {
    if (restoredRef.current) return;
    const pending = pendingRestoreRef.current;
    if (!pending) {
      restoredRef.current = true;
      return;
    }
    if (pending.page) {
      scrollToPage(pending.page);
      restoredRef.current = true;
    }
  }, [totalPages]);

  if (htmlQ.isLoading) return <div className="page">Loading Book Content...</div>;
  if (htmlQ.isError) {
    return (
      <div className="page error">
        Failed to load book content. The downloaded files may be missing. Re-download this book from Library.
      </div>
    );
  }

  return (
    <div className="bookShell">
      <div className="bookTopBar">
        <div className="bookHeaderLeft">
          <button className="buttonSecondary" onClick={() => window.history.back()}>Back</button>
          <span style={{ marginLeft: 12, fontWeight: 600 }}>{bookQ.data?.title}</span>
        </div>

        <div className="row" style={{ marginLeft: "auto", gap: 8, position: 'relative' }}>
          <button 
            className={`buttonSecondary ${showAppearance ? 'buttonToggleActive' : ''}`}
            onClick={() => setShowAppearance(!showAppearance)}
          >
            Appearance
          </button>

          {showAppearance && (
            <div style={{ position: 'absolute', top: '100%', right: 0, zIndex: 100, marginTop: 8 }}>
              <AppearancePanel 
                fontFamily={fontFamily}
                lineHeight={lineHeight}
                margin={margin}
                onFontFamilyChange={setFontFamily}
                onLineHeightChange={setLineHeight}
                onMarginChange={setMargin}
              />
            </div>
          )}

          <div className="divider" style={{ width: 1, height: 24, margin: '0 4px', background: 'var(--glass-border)' }} />
          
          <button 
            className={`buttonSecondary ${columns === 2 ? 'buttonToggleActive' : ''}`}
            onClick={() => setColumns(columns === 1 ? 2 : 1)}
          >
            {columns === 1 ? 'Single' : 'Dual'}
          </button>

          <div className="divider" style={{ width: 1, height: 24, margin: '0 4px', background: 'var(--glass-border)' }} />
          
          <button className="buttonSecondary" onClick={prev}>Prev</button>
          <button className="buttonSecondary" onClick={next}>Next</button>
          <div className="muted" style={{ marginLeft: 8, fontSize: "0.85rem", display: "flex", gap: 12 }}>
            <span>Page {currentPage} / {totalPages}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: 12 }}>
            <input
              className="input"
              style={{ width: 80, padding: "6px 8px" }}
              placeholder="Page"
              value={jumpPage}
              onChange={(e) => setJumpPage(e.currentTarget.value)}
              onKeyDown={(e) => {
                if (e.key !== "Enter") return;
                const value = Number(jumpPage);
                if (Number.isFinite(value) && value >= 1) scrollToPage(Math.min(value, totalPages));
              }}
            />
            <button
              className="buttonSecondary"
              onClick={() => {
                const value = Number(jumpPage);
                if (Number.isFinite(value) && value >= 1) scrollToPage(Math.min(value, totalPages));
              }}
            >
              Go
            </button>
          </div>
        </div>
      </div>

      <div className="bookReaderGrid" style={{ height: "calc(100vh - 64px)" }}>
        <main style={{ position: "relative", overflow: "hidden" }}>
          <ReaderLayout
            columns={columns}
            style={{ width: readerWidth, maxWidth: "100%", margin: "0 auto" }}
          >
            <iframe
              ref={iframeRef}
              title="mobi"
              sandbox="allow-same-origin allow-scripts"
              style={{ width: "100%", height: "100%", border: 0, display: "block", background: "transparent" }}
              srcDoc={srcDoc}
              onLoad={handleIframeLoad}
            />
          </ReaderLayout>
        </main>
      </div>
    </div>
  );
}
