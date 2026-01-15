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

function injectHead(html: string, css: string): string {
  const styleTag = `<style>${css}</style>`;
  const headInsert = `${styleTag}`.trim();
  if (/<head[\s>]/i.test(html)) {
    return html.replace(/<head(\s[^>]*)?>/i, (m) => `${m}\n${headInsert}`);
  }
  return `<!doctype html><html><head>${headInsert}</head><body>${html}</body></html>`;
}

function wrapBody(html: string): string {
  if (html.includes('id="reader-root"')) return html;
  if (/<body[\s>]/i.test(html)) {
    return html
      .replace(/<body(\s[^>]*)?>/i, (m) => `${m}<div id="reader-root">`)
      .replace(/<\/body>/i, "</div></body>");
  }
  return `<!doctype html><html><head></head><body><div id="reader-root">${html}</div></body></html>`;
}

export function parseSceneLinksHierarchical(html: string): Act[] {
  try {
    const doc = new DOMParser().parseFromString(html, "text/html");
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
  const [columns, setColumns] = useState<1 | 2>(1);
  const [zen, setZen] = useState(false);
  const [sceneFilter, setSceneFilter] = useState("");
  const [showAppearance, setShowAppearance] = useState(false);
  const [activeHref, setActiveHref] = useState("");

  const {
    fontFamily,
    lineHeight,
    margin,
    setFontFamily,
    setLineHeight,
    setMargin
  } = useReaderAppearance(id);

  const hierarchicalToC = useMemo(() => {
    const raw = htmlQ.data ? parseSceneLinksHierarchical(htmlQ.data) : [];
    if (!sceneFilter) return raw;
    
    const f = sceneFilter.toLowerCase();
    return raw.map(act => ({
      ...act,
      scenes: act.scenes.filter(s => s.label.toLowerCase().includes(f) || act.label.toLowerCase().includes(f))
    })).filter(act => act.scenes.length > 0 || act.label.toLowerCase().includes(f));
  }, [htmlQ.data, sceneFilter]);

  const srcDoc = useMemo(() => {
    if (!htmlQ.data) return "";
    const gap = columns === 2 ? 80 : 0;
    let css = `
      :root {
        --color-bg-light: #f8f5f2;
        --color-text-light: #2d3748;
        --color-bg-dark: #1a202c;
        --color-text-dark: #cbd5e0;
        --page-gap: ${gap}px;
        --page-width: ${
          columns === 2
            ? `calc((100vw - (${margin * 2}px + var(--page-gap))) / 2)`
            : `calc(100vw - (${margin * 2}px))`
        };
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
        font-size: 1.15rem;
        color: var(--color-text-light);
        background-color: transparent;
      }
      #reader-root {
        height: 100vh;
        padding: 40px ${margin}px;
        box-sizing: border-box;
        column-fill: auto;
        column-width: var(--page-width);
        column-gap: var(--page-gap);
        column-count: auto;
        overflow-x: auto;
        overflow-y: hidden;
        scroll-behavior: smooth;
        scroll-snap-type: x mandatory;
      }
      #reader-root::-webkit-scrollbar {
        display: none;
      }
      #reader-root > * {
        break-inside: avoid;
      }
      @media (prefers-color-scheme: dark) {
        body {
          color: var(--color-text-dark);
        }
      }
    `;
    return injectHead(wrapBody(htmlQ.data), css);
  }, [htmlQ.data, fontFamily, lineHeight, margin, columns]);

  const getScrollRoot = () => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return null;
    return (doc.getElementById("reader-root") as HTMLElement | null) ?? doc.documentElement;
  };

  const prev = () => {
    const root = getScrollRoot();
    if (!root) return;
    const width = iframeRef.current?.clientWidth || window.innerWidth;
    root.scrollBy({ left: -width, behavior: "smooth" });
  };

  const next = () => {
    const root = getScrollRoot();
    if (!root) return;
    const width = iframeRef.current?.clientWidth || window.innerWidth;
    root.scrollBy({ left: width, behavior: "smooth" });
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

  const gotoHref = (href: string) => {
    setActiveHref(href);
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;
    const target = doc.querySelector(href) as HTMLElement | null;
    if (target) {
      target.scrollIntoView({ behavior: "smooth", inline: "start", block: "start" });
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
          <div className="muted" style={{ marginBottom: 8, fontSize: '0.8rem', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Table of Contents
          </div>
          <input 
            className="input" 
            placeholder="Filter scenes..." 
            value={sceneFilter} 
            onChange={(e) => setSceneFilter(e.currentTarget.value)} 
          />
          <div style={{ height: 16 }} />
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {hierarchicalToC.length === 0 ? (
              <div className="muted">No matches found.</div>
            ) : (
              hierarchicalToC.map((act) => (
                <div key={`${act.href}:${act.label}`} className="tocActGroup">
                  <div 
                    className="tocActLabel"
                    style={{ 
                      fontWeight: 700, 
                      fontSize: '0.9rem', 
                      marginBottom: 4, 
                      color: 'var(--color-accent)',
                      cursor: act.href !== '#' ? 'pointer' : 'default'
                    }}
                    onClick={() => act.href !== '#' && gotoHref(act.href)}
                  >
                    {act.label}
                  </div>
                  <div className="tocSceneList" style={{ display: 'flex', flexDirection: 'column', gap: 2, paddingLeft: 8 }}>
                    {act.scenes.map((scene) => (
                      <button
                        key={`${scene.href}:${scene.label}`}
                        className={`tocSceneButton ${activeHref === scene.href ? 'active' : ''}`}
                        style={{ 
                          textAlign: "left",
                          background: 'transparent',
                          border: 'none',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                          color: activeHref === scene.href ? 'var(--color-accent)' : 'inherit',
                          fontWeight: activeHref === scene.href ? 600 : 400
                        }}
                        onClick={() => gotoHref(scene.href)}
                      >
                        {scene.label}
                      </button>
                    ))}
                  </div>
                </div>
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
