import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import ReaderPane from "@/components/reader/ReaderPane";
import HighlightsSidebar from "@/components/reader/HighlightsSidebar";
import ChatSidebar from "@/components/reader/ChatSidebar";
import ReaderTopBar from "@/components/reader/ReaderTopBar";
import { injectHead, wrapBody } from "@/lib/readerHtml";
import type { ChatPrompt, LocalChatMessage, PendingHighlight } from "@/lib/readerTypes";
import {
  addHighlightMessage,
  createHighlight,
  deleteHighlight,
  getBook,
  getBookHtml,
  getSetting,
  listHighlightMessages,
  listHighlights,
  openAiChat,
  openAiListModels,
  setSetting,
  updateHighlightNote
} from "../lib/tauri";
import { useReaderAppearance } from "../lib/appearance";

const DESIRED_PAGE_WIDTH = 750;
const HIGHLIGHT_PROMPT =
  "You are an assistant embedded in an AI reader. Respond with concise, thoughtful guidance using the selected highlight as context.";
const CHAT_PROMPTS: ChatPrompt[] = [
  { label: "Summarize", prompt: "Summarize this passage in modern English." },
];

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
  const chatInputRef = useRef<HTMLTextAreaElement | null>(null);
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
  const linkClickRef = useRef<((event: MouseEvent) => void) | null>(null);
  const headingIndexRef = useRef<Array<{ norm: string; el: HTMLElement }> | null>(null);
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
  const [highlightLibraryExpanded, setHighlightLibraryExpanded] = useState(false);
  const [highlightPageMap, setHighlightPageMap] = useState<Record<number, number>>({});
  const [noteDraft, setNoteDraft] = useState("");
  const [contextText, setContextText] = useState("");
  const [generalMessages, setGeneralMessages] = useState<LocalChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatSending, setChatSending] = useState(false);
  const [iframeReady, setIframeReady] = useState(false);
  const [currentModel, setCurrentModel] = useState("gpt-4.1-mini");
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [modelsLoading, setModelsLoading] = useState(true);
  const [tocEntries, setTocEntries] = useState<Array<{ id: string; level: number; text: string; element: HTMLElement }>>([]);
  const [currentTocEntryId, setCurrentTocEntryId] = useState<string | null>(null);
  const [tocExpanded, setTocExpanded] = useState(false);

  const {
    fontFamily,
    lineHeight,
    margin,
    setFontFamily,
    setLineHeight,
    setMargin
  } = useReaderAppearance(id);

  // Use gutenberg_id for progress key to avoid conflicts when database IDs are reused
  const gutenbergId = bookQ.data?.gutenberg_id;
  const progressKey = gutenbergId ? `reader-progress-gutenberg-${gutenbergId}` : null;

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
        color: var(--page-link) !important;
        text-decoration: none;
        border-bottom: 1px solid transparent;
      }
      a:hover {
        color: var(--page-link-hover) !important;
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
          --page-ink: #f7efe4;
          --page-muted: rgba(247, 239, 228, 0.78);
          --page-link: #f3a07f;
          --page-link-hover: #f7b097;
          --page-rule: rgba(247, 239, 228, 0.26);
          --page-mark: rgba(243, 160, 127, 0.28);
        }
        body {
          color: var(--page-ink);
          background-color: #141210;
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
      const parentNode: Node | null = current.parentNode;
      if (!parentNode) return null;
      const index = Array.prototype.indexOf.call(parentNode.childNodes, current);
      if (index < 0) return null;
      path.unshift(index);
      current = parentNode;
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
    if (!doc) return;
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

  const getPageForRect = (rect: DOMRect) => {
    const root = getScrollRoot();
    if (!root) return null;
    const { pageWidth, gap, paddingLeft, paddingRight, scrollWidth } = getPageMetrics();
    if (!pageWidth) return null;
    const stride = pageWidth + gap;
    const rootRect = root.getBoundingClientRect();
    const offsetLeft = rect.left - rootRect.left + root.scrollLeft;
    const page = Math.floor(offsetLeft / stride) + 1;
    if (!Number.isFinite(page)) return null;
    const usableWidth = Math.max(0, scrollWidth - paddingLeft - paddingRight);
    const total = Math.max(1, Math.ceil((usableWidth + gap) / stride));
    return Math.min(total, Math.max(1, page));
  };

  const resetHeadingIndex = () => {
    headingIndexRef.current = null;
  };

  const normalizeLinkText = (text: string) => {
    return text
      .toLowerCase()
      .replace(/&nbsp;/g, " ")
      .replace(/[^a-z0-9]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  };

  const buildHeadingIndex = (doc: Document) => {
    const nodes = Array.from(doc.querySelectorAll("h1, h2, h3, h4, h5, h6")) as HTMLElement[];
    headingIndexRef.current = nodes
      .map((el) => ({ el, norm: normalizeLinkText(el.textContent ?? "") }))
      .filter((entry) => entry.norm.length > 0);
    return headingIndexRef.current;
  };

  const getHeadingIndex = () => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return [];
    return headingIndexRef.current ?? buildHeadingIndex(doc);
  };

  const getOffsetLeftForRect = (rect: DOMRect) => {
    const root = getScrollRoot();
    if (!root) return null;
    const rootRect = root.getBoundingClientRect();
    return rect.left - rootRect.left + root.scrollLeft;
  };

  const jumpToElement = (element: HTMLElement) => {
    const root = getScrollRoot();
    if (!root) {
      return { ok: false, reason: "no root" as const };
    }
    syncPageMetrics();
    const rect = getElementRect(element);
    if (!rect) {
      return { ok: false, reason: "no rect" as const };
    }
    const rootRect = root.getBoundingClientRect();
    const offsetLeft = rect.left - rootRect.left + root.scrollLeft;
    const metrics = getPageMetrics();
    const stride = metrics.pageWidth + metrics.gap;
    const page = stride ? Math.max(1, Math.floor(offsetLeft / stride) + 1) : 1;
    const maxLeft = Math.max(0, root.scrollWidth - root.clientWidth);
    const targetLeft = Math.min(maxLeft, Math.max(0, offsetLeft));
    pageLockRef.current = page;
    root.scrollLeft = targetLeft;
    schedulePaginationUpdate();
    return {
      ok: true,
      rect,
      page,
      offsetLeft,
      targetLeft,
      pageWidth: metrics.pageWidth,
      gap: metrics.gap,
      stride,
      scrollWidth: root.scrollWidth,
      rootWidth: root.clientWidth,
    };
  };

  const findHeadingByText = (text: string, referenceEl?: HTMLElement | null) => {
    const target = normalizeLinkText(text);
    if (!target) return null;
    const entries = getHeadingIndex();
    const exact = entries.filter((entry) => entry.norm === target);
    const fuzzy = entries.filter(
      (entry) => entry.norm.includes(target) || target.includes(entry.norm)
    );
    const candidates = exact.length ? exact : fuzzy;
    if (!candidates.length) return null;
    const refRect = referenceEl ? getElementRect(referenceEl) : null;
    const refOffset = refRect ? getOffsetLeftForRect(refRect) : null;
    const scored = candidates
      .map((entry) => {
        const rect = getElementRect(entry.el);
        const offsetLeft = rect ? getOffsetLeftForRect(rect) : null;
        return { el: entry.el, offsetLeft };
      })
      .filter((entry) => entry.offsetLeft !== null) as Array<{
      el: HTMLElement;
      offsetLeft: number;
    }>;
    if (!scored.length) return candidates[0].el;
    if (refOffset !== null) {
      const after = scored
        .filter((entry) => entry.offsetLeft > refOffset + 12)
        .sort((a, b) => a.offsetLeft - b.offsetLeft);
      if (after.length) return after[0].el;
    }
    scored.sort((a, b) => a.offsetLeft - b.offsetLeft);
    return scored[0].el;
  };

  const getElementRect = (element: HTMLElement) => {
    const rects = Array.from(element.getClientRects());
    const directRect = rects.find((rect) => rect.width || rect.height) ?? rects[0];
    if (directRect) return directRect;
    const doc = element.ownerDocument;
    if (doc) {
      const range = doc.createRange();
      try {
        range.selectNode(element);
      } catch {
        // noop
      }
      const rangeRects = Array.from(range.getClientRects());
      const rangeRect = rangeRects.find((rect) => rect.width || rect.height) ?? rangeRects[0];
      if (rangeRect) return rangeRect;
    }
    const fallback =
      element.nextElementSibling ?? element.previousElementSibling ?? element.parentElement;
    if (fallback && fallback instanceof HTMLElement) {
      return fallback.getBoundingClientRect();
    }
    return null;
  };

  const isElement = (node: any): node is Element => {
    return !!node && typeof node === "object" && node.nodeType === 1;
  };

  const isTextNode = (node: any): node is Text => {
    return !!node && typeof node === "object" && node.nodeType === 3;
  };

  const getEventTargetElement = (target: EventTarget | null) => {
    if (!target) return null;
    if (isElement(target)) return target as HTMLElement;
    if (isTextNode(target)) {
      return (target as Text).parentElement;
    }
    return null;
  };

  const findHighlightFromEvent = (event: Event) => {
    const target = getEventTargetElement(event.target);
    return (target?.closest?.(".readerHighlight") as HTMLElement | null) ?? null;
  };

  const getHighlightPage = (highlightId: number) => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return null;
    const elements = Array.from(
      doc.querySelectorAll(`span.readerHighlight[data-highlight-id="${highlightId}"]`)
    ) as HTMLElement[];
    if (!elements.length) return null;
    let bestRect: DOMRect | null = null;
    for (const el of elements) {
      const rect = el.getBoundingClientRect();
      if (!bestRect || rect.left < bestRect.left) {
        bestRect = rect;
      }
    }
    if (!bestRect) return null;
    return getPageForRect(bestRect);
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
    if (!progressKey) return;
    const key = progressKey;
    saveTimeoutRef.current = window.setTimeout(() => {
      saveTimeoutRef.current = null;
      localStorage.setItem(key, JSON.stringify({ page }));
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
  }, [totalPages]);

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
    const loadModels = async () => {
      setModelsLoading(true);
      try {
        const [models, savedModel] = await Promise.all([
          openAiListModels().catch(() => [] as string[]),
          getSetting("openai_model").catch(() => null),
        ]);
        setAvailableModels(models);
        if (savedModel) {
          setCurrentModel(savedModel);
        } else if (models.length > 0 && !models.includes(currentModel)) {
          setCurrentModel(models[0]);
        }
      } catch (error) {
        console.error("Failed to load models:", error);
      } finally {
        setModelsLoading(false);
      }
    };
    loadModels();
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
      if (docRef.current && linkClickRef.current) {
        docRef.current.removeEventListener("click", linkClickRef.current, true);
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
    if (!htmlQ.data || !progressKey) {
      pendingRestoreRef.current = null;
      return;
    }
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

    // Build TOC from headings
    const headings = Array.from(doc.querySelectorAll("h1, h2, h3, h4, h5, h6")) as HTMLElement[];
    const entries = headings
      .filter((el) => el.textContent?.trim())
      .map((el, idx) => ({
        id: `toc-${idx}`,
        level: parseInt(el.tagName.charAt(1), 10),
        text: el.textContent?.trim() ?? "",
        element: el,
      }));
    setTocEntries(entries);

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
      const highlightEl = findHighlightFromEvent(event);
      const highlightId = highlightEl?.dataset?.highlightId;
      if (highlightId) {
        setSelectedHighlightId(Number(highlightId));
      }
    };
    highlightClickRef.current = handleHighlightClick;
    root.addEventListener("click", handleHighlightClick);

    const handleLinkClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const eventTargetEl = getEventTargetElement(event.target);
      const anchor = (eventTargetEl?.closest?.("a") as HTMLAnchorElement | null) ?? null;
      if (!anchor) return;
      const hrefAttr = anchor.getAttribute("href") ?? "";
      const lowerHref = hrefAttr.toLowerCase();
      if (lowerHref.startsWith("kindle:pos:")) {
        event.preventDefault();
        const linkText = anchor.textContent ?? "";
        const headingMatch = findHeadingByText(linkText, anchor);
        if (headingMatch) {
          jumpToElement(headingMatch);
          return;
        }
        return;
      }
      const anchorHash = anchor.hash ?? "";
      let rawHash = "";
      if (anchorHash && anchorHash !== "#") {
        rawHash = anchorHash.startsWith("#") ? anchorHash.slice(1) : anchorHash;
      } else {
        if (!hrefAttr || hrefAttr === "#") return;
        const hashIndex = hrefAttr.indexOf("#");
        if (hashIndex < 0) return;
        rawHash = hrefAttr.slice(hashIndex + 1);
      }
      if (!rawHash) return;
      let targetId = rawHash;
      try {
        targetId = decodeURIComponent(rawHash);
      } catch {
        targetId = rawHash;
      }
      const ownerDoc = anchor.ownerDocument;
      const anchorTargetEl =
        (ownerDoc.getElementById(targetId) as HTMLElement | null) ??
        (ownerDoc.getElementsByName(targetId)[0] as HTMLElement | undefined);
      event.preventDefault();
      if (!anchorTargetEl) {
        return;
      }
      jumpToElement(anchorTargetEl);
    };
    linkClickRef.current = handleLinkClick;
    doc.addEventListener("click", handleLinkClick, true);

    scheduleLayoutRebuild();
    setIframeReady(true);
  };

  useEffect(() => {
    resetHeadingIndex();
  }, [iframeReady, htmlQ.data]);

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

  useEffect(() => {
    if (!highlightLibraryExpanded) {
      setHighlightPageMap({});
      return;
    }
    if (!iframeReady || !highlightsQ.data) return;
    const handle = window.requestAnimationFrame(() => {
      const nextMap: Record<number, number> = {};
      for (const highlight of highlightsQ.data) {
        const page = getHighlightPage(highlight.id);
        if (page) {
          nextMap[highlight.id] = page;
        }
      }
      setHighlightPageMap(nextMap);
    });
    return () => window.cancelAnimationFrame(handle);
  }, [
    highlightLibraryExpanded,
    iframeReady,
    highlightsQ.data,
    columns,
    fontFamily,
    lineHeight,
    margin,
    totalPages,
  ]);

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

  const handleDeleteHighlight = async (highlightId: number) => {
    await deleteHighlight(highlightId);
    if (selectedHighlightId === highlightId) {
      setSelectedHighlightId(null);
      setNoteDraft("");
    }
    await queryClient.invalidateQueries({ queryKey: ["bookHighlights", id] });
  };

  const scrollToHighlight = (highlightId: number) => {
    let attempts = 0;
    const attempt = () => {
      const doc = iframeRef.current?.contentDocument;
      const el = doc?.querySelector(`span.readerHighlight[data-highlight-id="${highlightId}"]`) as
        | HTMLElement
        | null;
      if (el) {
        jumpToElement(el);
        return;
      }
      if (attempts === 0 && iframeReady && highlightsQ.data) {
        renderHighlights(highlightId);
      }
      if (attempts < 4) {
        attempts += 1;
        window.requestAnimationFrame(attempt);
      }
    };
    attempt();
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

  const handleModelChange = async (model: string) => {
    setCurrentModel(model);
    try {
      await setSetting({ key: "openai_model", value: model });
    } catch (error) {
      console.error("Failed to save model setting:", error);
    }
  };

  const handleTocNavigate = (entry: { id: string; element: HTMLElement }) => {
    setCurrentTocEntryId(entry.id);
    jumpToElement(entry.element);
  };

  const chatMessages = selectedHighlight
    ? (messagesQ.data ?? []).map((message) => ({
        id: String(message.id),
        role: message.role,
        content: message.content,
      }))
    : generalMessages;

  const chatContextHint = selectedHighlight
    ? "Using selected highlight as context"
    : "Using current page as context";
  if (htmlQ.isLoading) {
    return <div className="px-4 py-6 text-sm text-muted-foreground">Loading book content...</div>;
  }
  if (htmlQ.isError) {
    return (
      <div className="px-4 py-6 text-sm text-destructive">
        Failed to load book content. The downloaded files may be missing. Re-download this book from Library.
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-3.5rem)] max-w-[1800px] flex-col gap-3 overflow-hidden px-3 py-3">
      <ReaderTopBar
        title={bookQ.data?.title}
        showAppearance={showAppearance}
        onShowAppearanceChange={setShowAppearance}
        fontFamily={fontFamily}
        lineHeight={lineHeight}
        margin={margin}
        onFontFamilyChange={setFontFamily}
        onLineHeightChange={setLineHeight}
        onMarginChange={setMargin}
        columns={columns}
        onToggleColumns={() => setColumns(columns === 1 ? 2 : 1)}
        onPrev={prev}
        onNext={next}
        currentPage={currentPage}
        totalPages={totalPages}
        jumpPage={jumpPage}
        onJumpPageChange={setJumpPage}
        onJumpPageGo={() => {
          const value = Number(jumpPage);
          if (Number.isFinite(value) && value >= 1) {
            scrollToPage(Math.min(value, totalPages));
          }
        }}
        onBack={() => window.history.back()}
      />

      <div className="grid flex-1 min-h-0 grid-cols-[280px_minmax(0,1fr)_400px] gap-3">
        <HighlightsSidebar
          highlights={highlightsQ.data}
          selectedHighlightId={selectedHighlightId}
          onSelectHighlight={(highlightId) => {
            setSelectedHighlightId(highlightId);
            scrollToHighlight(highlightId);
          }}
          onDeleteHighlight={handleDeleteHighlight}
          onClearSelection={() => {
            setSelectedHighlightId(null);
            setNoteDraft("");
          }}
          highlightLibraryExpanded={highlightLibraryExpanded}
          onToggleHighlightLibrary={() => setHighlightLibraryExpanded((prev) => !prev)}
          highlightPageMap={highlightPageMap}
          selectedHighlight={selectedHighlight}
          noteDraft={noteDraft}
          onNoteDraftChange={setNoteDraft}
          onSaveNote={handleSaveNote}
          tocEntries={tocEntries}
          currentTocEntryId={currentTocEntryId}
          onTocNavigate={handleTocNavigate}
          tocExpanded={tocExpanded}
          onToggleTocExpanded={() => setTocExpanded((prev) => !prev)}
        />

        <ReaderPane
          columns={columns}
          readerWidth={readerWidth}
          iframeRef={iframeRef}
          containerRef={containerRef}
          srcDoc={srcDoc}
          onLoad={handleIframeLoad}
          pendingHighlight={pendingHighlight}
          onCreateHighlight={handleCreateHighlight}
          onCancelHighlight={() => setPendingHighlight(null)}
        />

        <ChatSidebar
          contextHint={chatContextHint}
          messages={chatMessages}
          prompts={CHAT_PROMPTS}
          chatInput={chatInput}
          onChatInputChange={setChatInput}
          onPromptSelect={setChatInput}
          onSend={sendChat}
          chatSending={chatSending}
          chatInputRef={chatInputRef}
          currentModel={currentModel}
          availableModels={availableModels}
          onModelChange={handleModelChange}
          modelsLoading={modelsLoading}
        />
      </div>
    </div>
  );
}
