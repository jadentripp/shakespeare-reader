import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  addHighlightMessage,
  createHighlight,
  getBook,
  getBookHtml,
  listHighlightMessages,
  listHighlights,
  openAiChat,
  updateHighlightNote
} from "../lib/tauri";
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
const HIGHLIGHT_PROMPT =
  "You are an assistant embedded in a Shakespeare reader. Respond with concise, thoughtful guidance using the selected highlight as context.";

type PendingHighlight = {
  startPath: number[];
  startOffset: number;
  endPath: number[];
  endOffset: number;
  text: string;
  rect: { top: number; left: number; width: number; height: number };
};

type LocalChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

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
  const highlightsQ = useQuery({ queryKey: ["bookHighlights", id], queryFn: () => listHighlights(id) });
  const queryClient = useQueryClient();

  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const rootRef = useRef<HTMLElement | null>(null);
  const docRef = useRef<Document | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const layoutRafRef = useRef<number | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const saveTimeoutRef = useRef<number | null>(null);
  const lockTimeoutRef = useRef<number | null>(null);
  const selectionTimeoutRef = useRef<number | null>(null);
  const scrollHandlerRef = useRef<((event: Event) => void) | null>(null);
  const wheelHandlerRef = useRef<((event: WheelEvent) => void) | null>(null);
  const selectionHandlerRef = useRef<(() => void) | null>(null);
  const highlightClickRef = useRef<((event: Event) => void) | null>(null);
  const pageLockRef = useRef(1);
  const restoredRef = useRef(false);
  const pendingRestoreRef = useRef<{ page?: number } | null>(null);
  const [columns, setColumns] = useState<1 | 2>(1);
  const [showAppearance, setShowAppearance] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [jumpPage, setJumpPage] = useState("");
  const [pendingHighlight, setPendingHighlight] = useState<PendingHighlight | null>(null);
  const [selectedHighlightId, setSelectedHighlightId] = useState<number | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [contextText, setContextText] = useState("");
  const [generalMessages, setGeneralMessages] = useState<LocalChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatSending, setChatSending] = useState(false);
  const [iframeReady, setIframeReady] = useState(false);

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
      .readerHighlight {
        background: rgba(255, 223, 128, 0.55);
        box-shadow: inset 0 -0.05em 0 rgba(178, 74, 47, 0.45);
        border-radius: 4px;
        padding: 0 0.08em;
      }
      .readerHighlightActive {
        background: rgba(178, 74, 47, 0.25);
        box-shadow: inset 0 -0.12em 0 rgba(178, 74, 47, 0.65);
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

  const getNodePath = (root: Node, node: Node): number[] | null => {
    const path: number[] = [];
    let current: Node | null = node;
    while (current && current !== root) {
      const parent = current.parentNode;
      if (!parent) return null;
      const index = Array.prototype.indexOf.call(parent.childNodes, current);
      if (index < 0) return null;
      path.unshift(index);
      current = parent;
    }
    if (current !== root) return null;
    return path;
  };

  const resolveNodePath = (root: Node, path: number[]): Node | null => {
    let current: Node | null = root;
    for (const index of path) {
      if (!current || !current.childNodes[index]) return null;
      current = current.childNodes[index];
    }
    return current;
  };

  const clearExistingHighlights = (doc: Document) => {
    const spans = Array.from(doc.querySelectorAll("span.readerHighlight"));
    for (const span of spans) {
      const parent = span.parentNode;
      if (!parent) continue;
      while (span.firstChild) {
        parent.insertBefore(span.firstChild, span);
      }
      parent.removeChild(span);
      parent.normalize();
    }
  };

  const applyHighlightToRange = (range: Range, highlightId: number) => {
    const doc = range.startContainer.ownerDocument;
    const walker = doc.createTreeWalker(
      range.commonAncestorContainer,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          if (!range.intersectsNode(node)) return NodeFilter.FILTER_REJECT;
          if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );

    const nodes: Text[] = [];
    while (walker.nextNode()) {
      nodes.push(walker.currentNode as Text);
    }

    for (const node of nodes) {
      const text = node.nodeValue ?? "";
      let start = 0;
      let end = text.length;
      if (node === range.startContainer) start = range.startOffset;
      if (node === range.endContainer) end = range.endOffset;
      if (start === end) continue;

      const before = text.slice(0, start);
      const middle = text.slice(start, end);
      const after = text.slice(end);
      const fragment = doc.createDocumentFragment();

      if (before) fragment.appendChild(doc.createTextNode(before));
      const span = doc.createElement("span");
      span.className = "readerHighlight";
      span.dataset.highlightId = String(highlightId);
      span.textContent = middle;
      fragment.appendChild(span);
      if (after) fragment.appendChild(doc.createTextNode(after));

      node.parentNode?.replaceChild(fragment, node);
    }
  };

  const renderHighlights = (activeId?: number | null) => {
    const doc = iframeRef.current?.contentDocument;
    const root = getScrollRoot();
    if (!doc || !root || !highlightsQ.data) return;
    clearExistingHighlights(doc);
    for (const highlight of highlightsQ.data) {
      let startPath: number[];
      let endPath: number[];
      try {
        startPath = JSON.parse(highlight.start_path);
        endPath = JSON.parse(highlight.end_path);
      } catch {
        continue;
      }
      const startNode = resolveNodePath(root, startPath);
      const endNode = resolveNodePath(root, endPath);
      if (!startNode || !endNode) continue;
      const range = doc.createRange();
      range.setStart(startNode, highlight.start_offset);
      range.setEnd(endNode, highlight.end_offset);
      applyHighlightToRange(range, highlight.id);
    }

    if (activeId) {
      const activeEls = doc.querySelectorAll(
        `span.readerHighlight[data-highlight-id="${activeId}"]`
      );
      activeEls.forEach((el) => el.classList.add("readerHighlightActive"));
    }
  };

  const getCurrentPageContext = () => {
    const doc = iframeRef.current?.contentDocument;
    const root = getScrollRoot();
    if (!doc || !root) return "";
    const { pageWidth, gap } = getPageMetrics();
    if (!pageWidth) return "";
    const stride = pageWidth + gap;
    const pageLeft = Math.max(0, (currentPage - 1) * stride);
    const pageRight = pageLeft + pageWidth;
    const rootRect = root.getBoundingClientRect();
    const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const pieces: string[] = [];
    while (walker.nextNode()) {
      const node = walker.currentNode as Text;
      if (!node.nodeValue || !node.nodeValue.trim()) continue;
      const range = doc.createRange();
      range.selectNodeContents(node);
      const rects = Array.from(range.getClientRects());
      const intersects = rects.some((rect) => {
        const left = rect.left - rootRect.left + root.scrollLeft;
        const right = rect.right - rootRect.left + root.scrollLeft;
        return right >= pageLeft && left <= pageRight;
      });
      if (intersects) {
        pieces.push(node.nodeValue.trim().replace(/\s+/g, " "));
      }
    }
    const text = pieces.join(" ").trim();
    if (!text) return "";
    return text.length > 1200 ? `${text.slice(0, 1200)}…` : text;
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
      if (selectionTimeoutRef.current !== null) {
        window.clearTimeout(selectionTimeoutRef.current);
        selectionTimeoutRef.current = null;
      }
      resizeObserverRef.current?.disconnect();
      resizeObserverRef.current = null;
      if (rootRef.current && scrollHandlerRef.current) {
        rootRef.current.removeEventListener("scroll", scrollHandlerRef.current);
      }
      if (rootRef.current && wheelHandlerRef.current) {
        rootRef.current.removeEventListener("wheel", wheelHandlerRef.current);
      }
      if (docRef.current && selectionHandlerRef.current) {
        docRef.current.removeEventListener("mouseup", selectionHandlerRef.current);
        docRef.current.removeEventListener("keyup", selectionHandlerRef.current);
      }
      if (rootRef.current && highlightClickRef.current) {
        rootRef.current.removeEventListener("click", highlightClickRef.current);
      }
      rootRef.current = null;
      docRef.current = null;
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

    docRef.current = doc;
    rootRef.current = root;
    syncPageMetrics();
    const handleScroll = () => {
      schedulePaginationUpdate();
      scheduleLock();
    };
    scrollHandlerRef.current = handleScroll;
    root.addEventListener("scroll", handleScroll, { passive: true });
    const handleWheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaX) > 0 || event.shiftKey) {
        event.preventDefault();
      }
    };
    wheelHandlerRef.current = handleWheel;
    root.addEventListener("wheel", handleWheel, { passive: false });
    resizeObserverRef.current?.disconnect();
    resizeObserverRef.current = new ResizeObserver(() => scheduleLayoutRebuild());
    resizeObserverRef.current.observe(root);

    const handleSelection = () => {
      if (selectionTimeoutRef.current !== null) {
        window.clearTimeout(selectionTimeoutRef.current);
      }
      selectionTimeoutRef.current = window.setTimeout(() => {
        selectionTimeoutRef.current = null;
        const selection = doc.getSelection();
        if (!selection || selection.rangeCount === 0) {
          setPendingHighlight(null);
          return;
        }
        const range = selection.getRangeAt(0);
        if (range.collapsed) {
          setPendingHighlight(null);
          return;
        }
        const rootNode = rootRef.current ?? root;
        if (!rootNode.contains(range.startContainer) || !rootNode.contains(range.endContainer)) {
          setPendingHighlight(null);
          return;
        }
        const startPath = getNodePath(rootNode, range.startContainer);
        const endPath = getNodePath(rootNode, range.endContainer);
        const text = range.toString().trim();
        if (!startPath || !endPath || !text) {
          setPendingHighlight(null);
          return;
        }
        const rangeRect = range.getBoundingClientRect();
        const iframeRect = iframeRef.current?.getBoundingClientRect();
        const containerRect = containerRef.current?.getBoundingClientRect();
        if (!iframeRect || !containerRect) {
          setPendingHighlight(null);
          return;
        }
        setPendingHighlight({
          startPath,
          startOffset: range.startOffset,
          endPath,
          endOffset: range.endOffset,
          text,
          rect: {
            top: iframeRect.top + rangeRect.top - containerRect.top,
            left: iframeRect.left + rangeRect.left - containerRect.left,
            width: rangeRect.width,
            height: rangeRect.height,
          },
        });
      }, 40);
    };

    selectionHandlerRef.current = handleSelection;
    doc.addEventListener("mouseup", handleSelection);
    doc.addEventListener("keyup", handleSelection);

    const handleHighlightClick = (event: Event) => {
      const target = event.target as HTMLElement | null;
      const highlightEl = target?.closest?.(".readerHighlight") as HTMLElement | null;
      const highlightId = highlightEl?.dataset?.highlightId;
      if (highlightId) {
        setSelectedHighlightId(Number(highlightId));
      }
    };
    highlightClickRef.current = handleHighlightClick;
    root.addEventListener("click", handleHighlightClick);

    scheduleLayoutRebuild();
    setIframeReady(true);
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

  useEffect(() => {
    if (!iframeReady || !highlightsQ.data) return;
    renderHighlights(selectedHighlightId);
  }, [iframeReady, highlightsQ.data]);

  useEffect(() => {
    if (!iframeReady) return;
    renderHighlights(selectedHighlightId);
  }, [selectedHighlightId, iframeReady]);

  const selectedHighlight = useMemo(() => {
    return highlightsQ.data?.find((highlight) => highlight.id === selectedHighlightId) ?? null;
  }, [highlightsQ.data, selectedHighlightId]);

  useEffect(() => {
    if (!selectedHighlightId || !highlightsQ.data) return;
    const exists = highlightsQ.data.some((highlight) => highlight.id === selectedHighlightId);
    if (!exists) {
      setSelectedHighlightId(null);
    }
  }, [highlightsQ.data, selectedHighlightId]);

  useEffect(() => {
    if (selectedHighlight) {
      setNoteDraft(selectedHighlight.note ?? "");
    } else {
      setNoteDraft("");
    }
  }, [selectedHighlight?.id]);

  useEffect(() => {
    if (!iframeReady) return;
    if (selectedHighlight) {
      setContextText(selectedHighlight.text);
      return;
    }
    setContextText(getCurrentPageContext());
  }, [iframeReady, selectedHighlight?.id, currentPage]);

  const messagesQ = useQuery({
    queryKey: ["highlightMessages", selectedHighlightId],
    queryFn: () => listHighlightMessages(selectedHighlightId ?? 0),
    enabled: !!selectedHighlightId,
  });

  const handleCreateHighlight = async () => {
    if (!pendingHighlight) return;
    const highlight = await createHighlight({
      bookId: id,
      startPath: JSON.stringify(pendingHighlight.startPath),
      startOffset: pendingHighlight.startOffset,
      endPath: JSON.stringify(pendingHighlight.endPath),
      endOffset: pendingHighlight.endOffset,
      text: pendingHighlight.text,
      note: "",
    });
    setPendingHighlight(null);
    await queryClient.invalidateQueries({ queryKey: ["bookHighlights", id] });
    setSelectedHighlightId(highlight.id);
  };

  const handleSaveNote = async () => {
    if (!selectedHighlight) return;
    await updateHighlightNote({
      highlightId: selectedHighlight.id,
      note: noteDraft.trim() ? noteDraft.trim() : null,
    });
    await queryClient.invalidateQueries({ queryKey: ["bookHighlights", id] });
  };

  const scrollToHighlight = (highlightId: number) => {
    const doc = iframeRef.current?.contentDocument;
    const el = doc?.querySelector(`span.readerHighlight[data-highlight-id="${highlightId}"]`) as
      | HTMLElement
      | null;
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
    }
  };

  const buildLocalMessage = (role: "user" | "assistant", content: string): LocalChatMessage => ({
    id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
    role,
    content,
  });

  const sendChat = async () => {
    if (!chatInput.trim()) return;
    const input = chatInput.trim();
    setChatSending(true);
    setChatInput("");
    try {
      if (selectedHighlight) {
        await addHighlightMessage({
          highlightId: selectedHighlight.id,
          role: "user",
          content: input,
        });
        const messages = messagesQ.data ?? [];
        const systemContent = [
          HIGHLIGHT_PROMPT,
          `Highlight: "${selectedHighlight.text}"`,
          selectedHighlight.note ? `Note: ${selectedHighlight.note}` : null,
        ]
          .filter(Boolean)
          .join("\n");
        const response = await openAiChat([
          { role: "system", content: systemContent },
          ...messages.map((message) => ({ role: message.role, content: message.content })),
          { role: "user", content: input },
        ]);
        await addHighlightMessage({
          highlightId: selectedHighlight.id,
          role: "assistant",
          content: response,
        });
        await queryClient.invalidateQueries({
          queryKey: ["highlightMessages", selectedHighlight.id],
        });
      } else {
        const nextMessages = [...generalMessages, { role: "user" as const, content: input }];
        setGeneralMessages((prev) => [...prev, buildLocalMessage("user", input)]);
        const systemContent = [
          HIGHLIGHT_PROMPT,
          contextText ? `Current page context: "${contextText}"` : "Current page context unavailable.",
        ]
          .filter(Boolean)
          .join("\n");
        const response = await openAiChat([
          { role: "system", content: systemContent },
          ...nextMessages.map((message) => ({ role: message.role, content: message.content })),
        ]);
        setGeneralMessages((prev) => [...prev, buildLocalMessage("assistant", response)]);
      }
    } catch (error: any) {
      const errorMessage = String(error?.message ?? error);
      if (selectedHighlight) {
        await addHighlightMessage({
          highlightId: selectedHighlight.id,
          role: "assistant",
          content: errorMessage,
        });
        await queryClient.invalidateQueries({
          queryKey: ["highlightMessages", selectedHighlight.id],
        });
      } else {
        setGeneralMessages((prev) => [...prev, buildLocalMessage("assistant", errorMessage)]);
      }
    } finally {
      setChatSending(false);
    }
  };

  const chatMessages = selectedHighlight
    ? (messagesQ.data ?? []).map((message) => ({
        id: String(message.id),
        role: message.role,
        content: message.content,
      }))
    : generalMessages;

  const contextLabel = selectedHighlight ? "Highlight Context" : "Current Page Context";

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
        <main style={{ position: "relative", overflow: "hidden" }} ref={containerRef}>
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
          {pendingHighlight ? (
            <div
              className="highlightToolbar"
              style={{
                top: Math.max(16, pendingHighlight.rect.top - 44),
                left: pendingHighlight.rect.left + pendingHighlight.rect.width / 2,
              }}
            >
              <button className="button" onClick={handleCreateHighlight}>
                Highlight &amp; Note
              </button>
              <button className="buttonSecondary" onClick={() => setPendingHighlight(null)}>
                Cancel
              </button>
            </div>
          ) : null}
        </main>
        <aside className="highlightPane">
          <div className="highlightPaneHeader">
            <div>
              <div className="highlightPaneTitle">Highlights &amp; Notes</div>
              <div className="muted">
                {highlightsQ.data ? `${highlightsQ.data.length} saved` : "Loading highlights..."}
              </div>
            </div>
            <button
              className="buttonSecondary"
              onClick={() => {
                setSelectedHighlightId(null);
                setNoteDraft("");
              }}
            >
              Clear
            </button>
          </div>
          <div className="highlightList">
            {highlightsQ.data?.length ? (
              highlightsQ.data.map((highlight) => (
                <button
                  key={highlight.id}
                  className={`highlightCard ${
                    highlight.id === selectedHighlightId ? "highlightCardActive" : ""
                  }`}
                  onClick={() => {
                    setSelectedHighlightId(highlight.id);
                    scrollToHighlight(highlight.id);
                  }}
                >
                  <div className="highlightText">“{highlight.text}”</div>
                  <div className="highlightMeta">
                    {highlight.note ? "Note attached" : "No note yet"}
                  </div>
                </button>
              ))
            ) : (
              <div className="emptyState">
                <div className="emptyStateTitle">Highlight your favorite lines</div>
                <div className="muted">Select text in the reader to add a note and start a chat.</div>
              </div>
            )}
          </div>

          <div className="highlightDetail">
            {selectedHighlight ? (
              <>
                <div className="highlightDetailHeader">Note</div>
                <textarea
                  className="textarea"
                  value={noteDraft}
                  onChange={(e) => setNoteDraft(e.currentTarget.value)}
                  placeholder="Leave a note about this passage…"
                />
                <div className="row">
                  <button className="buttonSecondary" onClick={handleSaveNote}>
                    Save note
                  </button>
                </div>
              </>
            ) : (
              <div className="muted">Select a highlight to attach a note or keep chatting on this page.</div>
            )}

            <div className="highlightDetailHeader" style={{ marginTop: 16 }}>
              {contextLabel}
            </div>
            <div className="highlightContext">
              {contextText || "No readable context found on this page yet."}
            </div>

            <div className="highlightDetailHeader" style={{ marginTop: 16 }}>
              Chat
            </div>
            <div className="highlightChat">
              {chatMessages.length ? (
                chatMessages.map((message) => (
                  <div key={message.id} className={`highlightChatBubble role-${message.role}`}>
                    <div className="highlightChatRole">{message.role}</div>
                    <div className="highlightChatContent">{message.content}</div>
                  </div>
                ))
              ) : (
                <div className="muted">Ask a question to begin.</div>
              )}
            </div>
            <div className="highlightChatComposer">
              <textarea
                className="textarea"
                value={chatInput}
                onChange={(e) => setChatInput(e.currentTarget.value)}
                placeholder="Ask about the meaning, context, or interpretation…"
                style={{ minHeight: 80 }}
              />
              <button className="button" onClick={sendChat} disabled={chatSending}>
                {chatSending ? "Sending…" : "Send"}
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
