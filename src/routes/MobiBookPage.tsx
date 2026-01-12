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
  const [fontSize, setFontSize] = useState(1.15);

  const setPosM = useMutation({ mutationFn: setBookPosition });
...
      body {
        font-family: var(--font-serif);
        line-height: 1.65;
        font-size: ${fontSize}rem;
      }
...
        <div className="row" style={{ marginLeft: "auto" }}>
          <div className="row" style={{ gap: 4 }}>
            <button className="buttonSecondary" onClick={() => setFontSize(f => Math.max(0.8, f - 0.1))} title="Decrease Font Size">A-</button>
            <button className="buttonSecondary" onClick={() => setFontSize(f => Math.min(2.0, f + 0.1))} title="Increase Font Size">A+</button>
          </div>
          <div className="divider" style={{ width: 1, height: 24, margin: '0 8px', background: 'var(--glass-border)' }} />
          <button 
            className={`buttonSecondary ${zen ? 'buttonToggleActive' : ''}`} 
            onClick={() => setZen(!zen)}
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
