import { useQuery } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";
import { getBook, getBookHtml } from "../lib/tauri";
import ReaderLayout from "../components/ReaderLayout";
import AppearancePanel from "../components/AppearancePanel";
import { useReaderAppearance } from "../lib/appearance";

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

export default function MobiBookPage(props: { bookId: number }) {
  const id = props.bookId;
  const bookQ = useQuery({ queryKey: ["book", id], queryFn: () => getBook(id) });
  const htmlQ = useQuery({ queryKey: ["bookHtml", id], queryFn: () => getBookHtml(id) });

  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [columns, setColumns] = useState<1 | 2>(1);
  const [zen, setZen] = useState(false);
  const [sceneFilter, setSceneFilter] = useState("");
  const [showAppearance, setShowAppearance] = useState(false);

  const {
    fontFamily,
    lineHeight,
    margin,
    setFontFamily,
    setLineHeight,
    setMargin
  } = useReaderAppearance(id);

  const filteredScenes = useMemo(() => {
    const raw = htmlQ.data ? parseSceneLinks(htmlQ.data) : [];
    if (!sceneFilter) return raw;
    const f = sceneFilter.toLowerCase();
    return raw.filter(s => s.label.toLowerCase().includes(f));
  }, [htmlQ.data, sceneFilter]);

  const srcDoc = useMemo(() => {
    if (!htmlQ.data) return "";
    let css = `
      :root {
        --color-bg-light: #f8f5f2;
        --color-text-light: #2d3748;
        --color-bg-dark: #1a202c;
        --color-text-dark: #cbd5e0;
      }
      body {
        font-family: ${fontFamily};
        line-height: ${lineHeight};
        font-size: 1.15rem;
        padding: 40px ${margin}px;
        margin: 0;
        color: var(--color-text-light);
        background-color: transparent;
      }
      @media (prefers-color-scheme: dark) {
        body {
          color: var(--color-text-dark);
        }
      }
    `;
    if (columns === 2) {
      css += `
        body {
          column-count: 2;
          column-gap: 80px;
          height: 100vh;
          box-sizing: border-box;
        }
      `;
    }
    return injectHead(htmlQ.data, css);
  }, [htmlQ.data, fontFamily, lineHeight, margin, columns]);

  const prev = () => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.scrollBy({ left: -window.innerWidth, behavior: 'smooth' });
    }
  };

  const next = () => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.scrollBy({ left: window.innerWidth, behavior: 'smooth' });
    }
  };

  const gotoHref = (href: string) => {
    if (iframeRef.current?.contentWindow) {
      const doc = iframeRef.current.contentDocument;
      if (doc) {
        const target = doc.querySelector(href);
        if (target) {
          target.scrollIntoView({ behavior: 'smooth' });
        }
      }
    }
  };

  if (htmlQ.isLoading) return <div className="page">Loading Book Content...</div>;

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

          <button 
            className={`buttonSecondary ${zen ? 'buttonToggleActive' : ''}`}
            onClick={() => setZen(!zen)}
          >
            {zen ? 'Exit Zen' : 'Zen'}
          </button>

          <div className="divider" style={{ width: 1, height: 24, margin: '0 4px', background: 'var(--glass-border)' }} />
          
          <button className="buttonSecondary" onClick={prev}>Prev</button>
          <button className="buttonSecondary" onClick={next}>Next</button>
        </div>
      </div>

      <div className={`bookReaderGrid ${zen ? 'zen' : ''}`} style={{ height: "calc(100vh - 64px)" }}>
        <aside className="readerSidebar">
          <div className="muted" style={{ marginBottom: 8 }}>
            Scenes / Acts
          </div>
          <input 
            className="input" 
            placeholder="Filter" 
            value={sceneFilter} 
            onChange={(e) => setSceneFilter(e.currentTarget.value)} 
          />
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

        <main style={{ position: "relative", overflow: "hidden" }}>
          <ReaderLayout columns={columns}>
            <iframe
              ref={iframeRef}
              title="mobi"
              sandbox="allow-same-origin allow-scripts"
              style={{ width: "100%", height: "100%", border: 0, display: "block", background: "transparent" }}
              srcDoc={srcDoc}
            />
          </ReaderLayout>
        </main>
      </div>
    </div>
  );
}
