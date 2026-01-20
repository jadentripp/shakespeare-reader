import { DESIRED_PAGE_WIDTH } from "./constants";

export interface ReaderStyleOptions {
  columns: 1 | 2;
  margin: number;
  pageGap: number;
  fontFamily: string;
  lineHeight: number;
}

export function buildReaderCss(options: ReaderStyleOptions): string {
  const { columns, margin, pageGap, fontFamily, lineHeight } = options;
  const gap = pageGap;

  return `
    :root {
      --page-gap: ${gap}px;
      --page-content-width: ${DESIRED_PAGE_WIDTH}px;
      --column-width: var(--page-content-width);
      --page-ink: #1f1b16;
      --page-muted: #4b4138;
      --page-link: #8b3b1f;
      --page-link-hover: #6f2b14;
      --page-rule: rgba(31, 27, 22, 0.24);
      --page-mark: rgba(139, 59, 31, 0.22);
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
      color: var(--page-ink) !important;
      letter-spacing: 0.01em;
      background-color: #fdf8f1;
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
      color: var(--page-ink) !important;
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
    h1 { font-size: 2.1rem; letter-spacing: 0.02em; }
    h2 { font-size: 1.6rem; }
    h3 { font-size: 1.3rem; }
    h4, h5, h6 { font-size: 1.05rem; letter-spacing: 0.02em; font-weight: 600; }
    p { margin: 0 0 0.9rem; }
    ul, ol { margin: 0 0 1rem; padding-left: 1.4rem; }
    li { margin-bottom: 0.45rem; }
    li::marker { color: var(--page-muted); }
    a { color: var(--page-link) !important; text-decoration: none; border-bottom: 1px solid transparent; }
    a:hover { color: var(--page-link-hover) !important; border-bottom-color: currentColor; }
    strong, b { font-weight: 600; }
    em, i { font-style: italic; }
    blockquote {
      margin: 1.2rem 0;
      padding: 0.6rem 1.2rem;
      border-left: 3px solid var(--page-rule);
      font-style: italic;
      color: var(--page-muted);
      background: rgba(31, 27, 22, 0.03);
    }
    hr {
      border: none;
      border-top: 1px solid var(--page-rule);
      margin: 2rem auto;
      width: 60%;
    }
    img, svg {
      display: block;
      max-width: 100%;
      height: auto;
      margin: 1rem auto;
      cursor: pointer;
    }
    pre, code {
      font-family: "JetBrains Mono", "Fira Code", Consolas, monospace;
      font-size: 0.95em;
    }
    pre {
      padding: 1rem;
      background: rgba(31, 27, 22, 0.04);
      border-radius: 4px;
      overflow-x: auto;
      margin: 1rem 0;
    }
    code { background: rgba(31, 27, 22, 0.06); padding: 0.15em 0.35em; border-radius: 3px; }
    pre code { background: transparent; padding: 0; }
    table { border-collapse: collapse; width: 100%; margin: 1rem 0; }
    th, td { border: 1px solid var(--page-rule); padding: 0.5rem 0.75rem; text-align: left; }
    th { background: rgba(31, 27, 22, 0.04); font-weight: 600; }
    ::selection { background: var(--page-mark); }
    .readerHighlight {
      background-color: rgba(224, 46, 46, 0.25);
      border-radius: 0;
      cursor: pointer;
      transition: background-color 0.15s ease;
      scroll-margin: 40px;
    }
    .readerHighlight:hover { background-color: rgba(224, 46, 46, 0.4); }
    .readerHighlightActive { 
      background-color: rgba(224, 46, 46, 0.45) !important; 
      outline: 2px solid #E02E2E;
      animation: pulse-highlight 1.5s ease-in-out; 
    }
    .readerContextSnippet {
      background-color: rgba(0, 85, 164, 0.35);
      border-radius: 0;
      cursor: pointer;
      transition: background-color 0.15s ease;
    }
    .readerContextSnippet:hover { background-color: rgba(0, 85, 164, 0.5); }
    @keyframes pulse-highlight { 0%, 100% { background-color: rgba(224, 46, 46, 0.45); } 50% { background-color: rgba(224, 46, 46, 0.6); } }
  `;
}
