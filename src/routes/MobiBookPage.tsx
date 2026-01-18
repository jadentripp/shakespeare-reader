import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import ReaderPane from "@/components/reader/ReaderPane";
import HighlightsSidebar from "@/components/reader/HighlightsSidebar";
import ChatSidebar from "@/components/reader/ChatSidebar";
import ReaderTopBar from "@/components/reader/ReaderTopBar";
import { Button } from "@/components/ui/button";
import { PanelLeftOpen, PanelRightOpen, Download, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { injectHead, wrapBody, processGutenbergContent } from "@/lib/readerHtml";
import type { ChatPrompt, PendingHighlight } from "@/lib/readerTypes";
import {
  Popover,
  PopoverContent,  PopoverAnchor,
} from "@/components/ui/popover";
import {
  addBookMessage,
  createHighlight,
  deleteHighlight,
  getBook,
  getBookHtml,
  getBookImageData,
  getSetting,
  listBookMessages,
  listBookChatThreads,
  createBookChatThread,
  renameBookChatThread,
  setThreadLastCfi,
  deleteBookChatThread,
  deleteBookThreadMessages,
  deleteBookMessage,
  clearDefaultBookMessages,
  listHighlights,
  openAiChat,
  openAiListModels,
  setSetting,
  updateHighlightNote
} from "../lib/tauri";
import { useReaderAppearance } from "../lib/appearance";

const DESIRED_PAGE_WIDTH = 750;
const CHAT_PROMPTS: ChatPrompt[] = [
  { label: "Summarize", prompt: "Summarize this passage in modern English, including citations for every key claim." },
];

function findTextRange(root: HTMLElement, targetText: string, blockIndex?: number): Range | null {
  const doc = root.ownerDocument;
  let searchRoot: HTMLElement = root;
  
  if (blockIndex !== undefined) {
    const block = root.querySelector(`[data-block-index="${blockIndex}"]`);
    if (block instanceof HTMLElement) {
      searchRoot = block;
    }
  }

  // Handle snippets with ellipses by splitting them into parts
  const snippetParts = targetText.split(/\.\.\./).map(p => p.trim()).filter(p => p.length > 0);
  if (snippetParts.length > 1) {
    // For now, find the range of the longest part as a reliable anchor
    const longestPart = snippetParts.reduce((a, b) => a.length > b.length ? a : b);
    return findTextRange(root, longestPart, blockIndex);
  }

  const walker = doc.createTreeWalker(searchRoot, NodeFilter.SHOW_TEXT);
  const textNodes: Text[] = [];
  const fullTextParts: string[] = [];
  const charMap: Array<{ node: Text; offset: number }> = [];

  while (walker.nextNode()) {
    const node = walker.currentNode as Text;
    const nodeText = node.nodeValue || "";
    for (let i = 0; i < nodeText.length; i++) {
      fullTextParts.push(nodeText[i]);
      charMap.push({ node, offset: i });
    }
    textNodes.push(node);
  }

  const fullText = fullTextParts.join("");
  
  // Ultra-fuzzy normalization: Keep only alphanumeric characters for the initial match
  const ultraNormalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const normalizedTarget = ultraNormalize(targetText);
  
  if (!normalizedTarget) return null;

  let searchableStream = "";
  const searchableToFullMap: number[] = [];
  
  for (let i = 0; i < fullText.length; i++) {
    const char = fullText[i].toLowerCase();
    if (/[a-z0-9]/.test(char)) {
      searchableStream += char;
      searchableToFullMap.push(i);
    }
  }

  const matchIndex = searchableStream.indexOf(normalizedTarget);
  
  if (matchIndex === -1) {
    if (searchRoot !== root) {
      return findTextRange(root, targetText);
    }
    return null;
  }

  const startFullIndex = searchableToFullMap[matchIndex];
  const endFullIndex = searchableToFullMap[matchIndex + normalizedTarget.length - 1] + 1;

  const startInfo = charMap[startFullIndex];
  const endInfo = charMap[endFullIndex - 1];

  if (startInfo && endInfo) {
    const range = doc.createRange();
    range.setStart(startInfo.node, startInfo.offset);
    range.setEnd(endInfo.node, endInfo.offset + 1);
    return range;
  }

  return null;
}

export function cleanFootnoteContent(html: string): string {
  if (typeof document === "undefined") return html;
  const div = document.createElement("div");
  div.innerHTML = html;
  
  // Remove links that look like return links
  const links = div.querySelectorAll("a");
  links.forEach(a => {
    const text = a.textContent?.trim().toLowerCase() || "";
    // Common back-link patterns
    if (
      text.includes("back") || 
      text.includes("return") || 
      text === "↩" || 
      text === "↑" || 
      text === "top" ||
      text.includes("jump up") ||
      /^\[?\d+\]?$/.test(text)
    ) {
      a.remove();
    }
  });
  
  // Also common in Gutenberg: [1] at the start of footnote
  const firstChild = div.firstChild;
  if (firstChild && firstChild.nodeType === 3) { // Text node
     firstChild.nodeValue = firstChild.nodeValue?.replace(/^\[\d+\]\s*/, "") || "";
  }
  
  return div.innerHTML.trim();
}

export default function MobiBookPage(props: { bookId: number }) {
  const id = props.bookId;
  const [columns, setColumns] = useState<1 | 2>(1);
  const [showAppearance, setShowAppearance] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [jumpPage, setJumpPage] = useState("");
  const [pendingHighlight, setPendingHighlight] = useState<PendingHighlight | null>(null);
  const [selectedHighlightId, setSelectedHighlightId] = useState<number | null>(null);
  const [activeAiQuote, setActiveAiQuote] = useState<string | null>(null);
  const [activeAiBlockIndex, setActiveAiBlockIndex] = useState<number | null>(null);
  const [currentThreadId, setCurrentThreadId] = useState<number | null>(null);
  const [attachedHighlightIds, setAttachedHighlightIds] = useState<number[]>([]);
  const [contextMap, setContextMap] = useState<Record<number, { text: string; blockIndex?: number }>>({});
  const [highlightLibraryExpanded, setHighlightLibraryExpanded] = useState(false);
  const [highlightPageMap] = useState<Record<number, number>>({});
  const [noteDraft, setNoteDraft] = useState("");
  const [contextText] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [chatSending, setChatSending] = useState(false);
  const [iframeReady, setIframeReady] = useState(false);
  const [currentModel, setCurrentModel] = useState("gpt-4.1-mini");
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [modelsLoading, setModelsLoading] = useState(true);
  const [tocEntries, setTocEntries] = useState<Array<{ id: string; level: number; text: string; element: HTMLElement }>>([]);
  const [currentTocEntryId, setCurrentTocEntryId] = useState<string | null>(null);
  const [tocExpanded, setTocExpanded] = useState(false);
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);
  const [activeCitation, setActiveCitation] = useState<{ content: string; rect: { top: number; left: number; width: number; height: number } } | null>(null);
  const [lightboxImage, setLightboxImage] = useState<{ src: string; alt?: string } | null>(null);

  const bookQ = useQuery({ queryKey: ["book", id], queryFn: () => getBook(id) });
  const htmlQ = useQuery({ queryKey: ["bookHtml", id], queryFn: () => getBookHtml(id) });
  const highlightsQ = useQuery({ queryKey: ["bookHighlights", id], queryFn: () => listHighlights(id) });
  const bookChatThreadsQ = useQuery({
    queryKey: ["bookChatThreads", id],
    queryFn: () => listBookChatThreads(id),
  });
  const bookMessagesQ = useQuery({
    queryKey: ["bookMessages", id, currentThreadId],
    queryFn: () => listBookMessages(id, currentThreadId),
  });
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
  const threadSaveTimeoutRef = useRef<number | null>(null);
  const lockTimeoutRef = useRef<number | null>(null);
  const selectionTimeoutRef = useRef<number | null>(null);
  const scrollHandlerRef = useRef<((event: Event) => void) | null>(null);
  const wheelHandlerRef = useRef<((event: WheelEvent) => void) | null>(null);
  const selectionHandlerRef = useRef<(() => void) | null>(null);
  const highlightClickRef = useRef<((event: Event) => void) | null>(null);
  const linkClickRef = useRef<((event: MouseEvent) => void) | null>(null);
  const headingIndexRef = useRef<Array<{ norm: string; el: HTMLElement }> | null>(null);
  const pageLockRef = useRef(1);
  const isNavigatingRef = useRef(false);
  const restoredRef = useRef(false);
  const pendingRestoreRef = useRef<{ page?: number } | null>(null);

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
    const { html: processedHtml } = processGutenbergContent(htmlQ.data, id);
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
        display: block;
        margin: 1.5rem auto;
        border-radius: 4px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        cursor: zoom-in;
      }
      .fig {
        margin: 2rem 0;
        text-align: center;
      }
      .caption {
        font-size: 0.9rem;
        color: var(--page-muted);
        margin-top: 0.75rem;
        font-style: italic;
        text-align: center;
      }
      .mobi-inline-image {
        min-height: 100px;
        background: rgba(0,0,0,0.05);
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
        transition: background-color 0.2s, box-shadow 0.2s;
      }
      .readerHighlightActive {
        background: rgba(178, 74, 47, 0.2) !important;
        box-shadow: inset 0 -0.25em 0 rgba(178, 74, 47, 0.9) !important;
        color: inherit !important;
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
    return injectHead(wrapBody(processedHtml), css);
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

    // Fix: If commonAncestorContainer is a text node, TreeWalker won't find it as a child.
    // Use the parent element as the search root in that case.
    const searchRoot = range.commonAncestorContainer.nodeType === Node.TEXT_NODE
      ? range.commonAncestorContainer.parentNode!
      : range.commonAncestorContainer;

    const walker = doc.createTreeWalker(
      searchRoot,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          if (!range.intersectsNode(node)) return NodeFilter.FILTER_REJECT;
          const text = node.nodeValue;
          if (!text || !text.trim()) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );

    const nodes: Text[] = [];
    // If the search root itself is a text node and it's in range, add it
    if (searchRoot.nodeType === Node.TEXT_NODE && range.intersectsNode(searchRoot)) {
      nodes.push(searchRoot as Text);
    } else {
      while (walker.nextNode()) {
        nodes.push(walker.currentNode as Text);
      }
    }

    console.log(`[Highlight] Applying ID ${highlightId} to ${nodes.length} text nodes`);

    for (const node of nodes) {
      const text = node.nodeValue ?? "";
      let start = 0;
      let end = text.length;
      if (node === range.startContainer) start = range.startOffset;
      if (node === range.endContainer) end = range.endOffset;
      if (start >= end) continue;

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

      if (node.parentNode) {
        node.parentNode.replaceChild(fragment, node);
      }
    }
  };

  const renderHighlights = (
    activeId?: number | null,
    activeQuote?: string | null,
    activeBlockIndex?: number | null
  ) => {
    const doc = iframeRef.current?.contentDocument;
    const root = getScrollRoot();
    if (!doc || !root || !highlightsQ.data) return;
    
    console.log("[Highlight] Rendering highlights. ActiveQuote:", activeQuote, "BlockIndex:", activeBlockIndex);
    
    clearExistingHighlights(doc);
    for (const highlight of highlightsQ.data as any[]) {
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
      activeEls.forEach((el: any) => (el as HTMLElement).classList.add("readerHighlightActive"));
      
      // Clear AI quote state when a real highlight is selected
      if (activeAiQuote || activeAiBlockIndex) {
        console.log("[Highlight] Clearing AI quote because a user highlight was selected.");
        setActiveAiQuote(null);
        setActiveAiBlockIndex(null);
      }
    }

    if (activeQuote) {
      console.log("[Highlight] Searching for active AI quote...");
      const range = findTextRange(root, activeQuote, activeBlockIndex ?? undefined);
      if (range) {
        console.log("[Highlight] Found range for AI quote, applying highlight.");
        applyHighlightToRange(range, -999);
        const activeEls = doc.querySelectorAll(
          `span.readerHighlight[data-highlight-id="-999"]`
        );
        activeEls.forEach((el: any) => {
          (el as HTMLElement).classList.add("readerHighlightActive");
          console.log("[Highlight] Added readerHighlightActive class to element");
        });
      } else {
        console.warn("[Highlight] Failed to find range for active AI quote.");
      }
    }
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
      console.log("[Navigation] jumpToElement failed: no root");
      return { ok: false, reason: "no root" as const };
    }
    syncPageMetrics();
    const rect = getElementRect(element);
    if (!rect) {
      console.log("[Navigation] jumpToElement failed: no rect for element", element);
      return { ok: false, reason: "no rect" as const };
    }
    const rootRect = root.getBoundingClientRect();
    const offsetLeft = rect.left - rootRect.left + root.scrollLeft;
    const metrics = getPageMetrics();
    const stride = metrics.pageWidth + metrics.gap;
    const page = stride ? Math.max(1, Math.floor(offsetLeft / stride) + 1) : 1;
    const maxLeft = Math.max(0, root.scrollWidth - root.clientWidth);
    const targetLeft = Math.min(maxLeft, Math.max(0, offsetLeft));

    console.log("[Navigation] jumpToElement start:", {
      element,
      offsetLeft,
      targetLeft,
      page,
      currentScroll: root.scrollLeft,
      stride,
      rootScrollWidth: root.scrollWidth,
      rootClientWidth: root.clientWidth
    });

    // Start navigation lock
    isNavigatingRef.current = true;
    const oldSmooth = root.style.scrollBehavior;
    root.style.scrollBehavior = "auto";
    
    pageLockRef.current = page;
    root.scrollLeft = targetLeft;
    
    // Force immediate pagination update while locked
    updatePagination();

    // Release lock after a delay to allow scroll events to settle
    setTimeout(() => {
      root.style.scrollBehavior = oldSmooth;
      isNavigatingRef.current = false;
      console.log("[Navigation] jumpToElement: lock released");
    }, 150);

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
    const exact = entries.filter((entry: { norm: string; el: HTMLElement }) => entry.norm === target);
    const fuzzy = entries.filter(
      (entry: { norm: string; el: HTMLElement }) => entry.norm.includes(target) || target.includes(entry.norm)
    );
    let candidates = exact.length ? exact : fuzzy;

    // Fallback: search all elements if no heading match
    if (candidates.length === 0) {
      const doc = iframeRef.current?.contentDocument;
      if (doc) {
        // Only search meaningful blocks to avoid performance issues
        const allNodes = Array.from(doc.querySelectorAll("p, div, td, li, b, i, span")) as HTMLElement[];
        const matches = allNodes.filter(el => {
          const norm = normalizeLinkText(el.textContent ?? "");
          return norm === target || norm.includes(target);
        });
        if (matches.length > 0) {
          console.log("[Link] Found target in all-elements fallback:", text);
          candidates = matches.map(el => ({ el, norm: normalizeLinkText(el.textContent ?? "") }));
        }
      }
    }

    if (!candidates.length) return null;
    const refRect = referenceEl ? getElementRect(referenceEl) : null;
    const refOffset = refRect ? getOffsetLeftForRect(refRect) : null;
    const scored = candidates
      .map((entry: { norm: string; el: HTMLElement }) => {
        const rect = getElementRect(entry.el);
        const offsetLeft = rect ? getOffsetLeftForRect(rect) : null;
        return { el: entry.el, offsetLeft };
      })
      .filter((entry: { el: HTMLElement; offsetLeft: number | null }) => entry.offsetLeft !== null) as Array<{
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

  const scrollToCfi = (cfi: string) => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;

    // Simple parser for our format: epubcfi(/6/2!/4/BLOCK_INDEX)
    const match = cfi.match(/\/4\/(\d+)/);
    if (match) {
      const blockIndex = parseInt(match[1], 10) / 2;
      const element = doc.querySelector(`[data-block-index="${blockIndex}"]`) as HTMLElement | null;
      if (element) {
        jumpToElement(element);
        return true;
      }
    }
    
    // Fallback for highlight CFIs (which are JSON paths in this app currently)
    try {
      const path = JSON.parse(cfi);
      if (Array.isArray(path)) {
        const root = getScrollRoot();
        if (root) {
          const node = resolveNodePath(root, path);
          const element = node?.nodeType === Node.TEXT_NODE ? node.parentElement : (node as HTMLElement);
          if (element) {
            jumpToElement(element);
            return true;
          }
        }
      }
    } catch {
      // Not a JSON path
    }

    return false;
  };

  const getElementRect = (element: HTMLElement) => {
    const rects = Array.from(element.getClientRects());
    let directRect = rects.find((rect) => rect.width || rect.height) ?? rects[0];
    
    if (!directRect || (directRect.width === 0 && directRect.height === 0)) {
      const bcr = element.getBoundingClientRect();
      if (bcr.width || bcr.height) directRect = bcr;
    }

    if (directRect && (directRect.width || directRect.height)) return directRect;
    
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

  const scheduleSaveThreadProgress = () => {
    if (threadSaveTimeoutRef.current !== null) return;
    if (currentThreadId === null) return;
    
    threadSaveTimeoutRef.current = window.setTimeout(async () => {
      threadSaveTimeoutRef.current = null;
      const root = getScrollRoot();
      if (!root) return;
      
      const metrics = getPageMetrics();
      const stride = metrics.pageWidth + metrics.gap;
      const currentScroll = root.scrollLeft;
      
      // Find the first visible block
      const blocks = Array.from(root.querySelectorAll("[data-block-index]")) as HTMLElement[];
      const firstVisible = blocks.find(block => {
        const rect = block.getBoundingClientRect();
        const rootRect = root.getBoundingClientRect();
        const offsetLeft = rect.left - rootRect.left + currentScroll;
        // If the block starts at or after the current scroll position
        return offsetLeft >= currentScroll - 10;
      });

      if (firstVisible) {
        const blockIndex = parseInt(firstVisible.getAttribute("data-block-index") || "0", 10);
        const cfi = `epubcfi(/6/2!/4/${blockIndex * 2})`;
        console.log("[Thread] Saving last_cfi:", cfi);
        try {
          await setThreadLastCfi({ threadId: currentThreadId, cfi });
          // Invalidate to update UI if needed (though usually it's silent)
          queryClient.invalidateQueries({ queryKey: ["bookChatThreads", id] });
        } catch (e) {
          console.error("[Thread] Failed to save last_cfi:", e);
        }
      }
    }, 1000);
  };

  const lockToPage = (page = pageLockRef.current) => {
    const root = getScrollRoot();
    if (!root) return;
    const { pageWidth, gap } = getPageMetrics();
    if (!pageWidth) return;
    const stride = pageWidth + gap;
    const target = Math.max(0, (page - 1) * stride);
    
    if (Math.abs(root.scrollLeft - target) > 1) {
      console.log("[Navigation] lockToPage: Snapping to", { page, target, current: root.scrollLeft });
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
    
    console.log("[Navigation] scrollToPage:", { page, target });
    
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
    
    // Derive page from actual scroll position
    const currentScroll = root.scrollLeft;
    const calculatedPage = Math.round(currentScroll / (stride || 1)) + 1;
    const lockedPage = Math.min(total, Math.max(1, calculatedPage));
    
    if (lockedPage !== currentPage) {
      setCurrentPage(lockedPage);
    }

    // Only update pageLock if we are close to a page boundary or it's a significant move
    if (Math.abs(currentScroll - (pageLockRef.current - 1) * stride) > stride / 2) {
      pageLockRef.current = lockedPage;
    }
    scheduleSaveProgress(lockedPage);
    scheduleSaveThreadProgress();
  };

  const schedulePaginationUpdate = () => {
    if (rafRef.current !== null) return;
    rafRef.current = window.requestAnimationFrame(() => {
      rafRef.current = null;
      if (isNavigatingRef.current) return;
      updatePagination();
    });
  };

  const scheduleLock = () => {
    if (lockTimeoutRef.current !== null) {
      window.clearTimeout(lockTimeoutRef.current);
    }
    lockTimeoutRef.current = window.setTimeout(() => {
      lockTimeoutRef.current = null;
      console.log("[Navigation] scheduleLock: Firing lockToPage");
      lockToPage();
    }, 250); // Increased delay to allow smooth manual scrolling
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
        const [allModels, savedModel] = await Promise.all([
          openAiListModels().catch(() => [] as string[]),
          getSetting("openai_model").catch(() => null),
        ]);
        const chatModels = allModels.filter((model) => {
          const m = model.toLowerCase();
          if (m.includes("audio") || m.includes("transcribe") || m.includes("realtime") || m.includes("tts") || m.includes("whisper") || m.includes("embedding") || m.includes("moderation") || m.includes("dall-e") || m.includes("image")) {
            return false;
          }
          if (m.includes("gpt-") || m.includes("o1") || m.includes("o3") || m.includes("o4")) {
            return true;
          }
          return false;
        });
        const sortedModels = chatModels.sort((a, b) => {
          const aLower = a.toLowerCase();
          const bLower = b.toLowerCase();
          const aIsLatest = aLower.includes("latest");
          const bIsLatest = bLower.includes("latest");
          if (aIsLatest && !bIsLatest) return -1;
          if (!aIsLatest && bIsLatest) return 1;
          const extractVersion = (s: string) => {
            const match = s.match(/(\d+)\.(\d+)/);
            return match ? parseFloat(`${match[1]}.${match[2]}`) : 0;
          };
          return extractVersion(bLower) - extractVersion(aLower);
        });
        setAvailableModels(sortedModels);
        if (savedModel && sortedModels.includes(savedModel)) {
          setCurrentModel(savedModel);
        } else if (sortedModels.length > 0 && !sortedModels.includes(currentModel)) {
          setCurrentModel(sortedModels[0]);
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

  const stripGutenbergBoilerplate = (doc: Document) => {
    const header = doc.getElementById("pg-header");
    if (header) header.remove();
    
    const footer = doc.getElementById("pg-footer");
    if (footer) footer.remove();
  };

  const handleIframeLoad = () => {
    const doc = iframeRef.current?.contentDocument;
    const root = getScrollRoot();
    if (!doc || !root) return;

    docRef.current = doc;
    rootRef.current = root;
    
    stripGutenbergBoilerplate(doc);
    syncPageMetrics();

    console.log(`[Navigation] Total elements with data-fid: ${doc.querySelectorAll("[data-fid]").length}`);

    // Resolve MOBI images
    const resolveMobiImages = async () => {
      const imgs = doc.querySelectorAll("img.mobi-inline-image");
      for (const img of Array.from(imgs)) {
        const bookId = img.getAttribute("data-book-id");
        const relativeIndex = img.getAttribute("data-kindle-index");
        if (bookId && relativeIndex) {
          try {
            const dataUrl = await getBookImageData(parseInt(bookId), parseInt(relativeIndex));
            (img as HTMLImageElement).src = dataUrl;
          } catch (e) {
            console.error("Failed to resolve image:", e);
          }
        }
      }
    };
    resolveMobiImages();

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
      if (isNavigatingRef.current) {
        return;
      }
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
      const target = getEventTargetElement(event.target);
      if (target && target.tagName === "IMG") {
        setLightboxImage({ 
          src: (target as HTMLImageElement).src, 
          alt: (target as HTMLImageElement).alt 
        });
        return;
      }
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
      const anchorId = anchor.id ?? "";
      
      console.log("[Link] Clicked:", { href: hrefAttr, id: anchorId });

      // Check if it's a footnote/citation
      const isFootnote = lowerHref.includes("#fn") || 
                         anchorId.startsWith("fnref") || 
                         anchor.className.includes("footnote") ||
                         anchor.className.includes("noteref");

      const anchorHash = anchor.hash ?? "";
      let rawHash = "";
      if (anchorHash && anchorHash !== "#") {
        rawHash = anchorHash.startsWith("#") ? anchorHash.slice(1) : anchorHash;
      } else {
        const hashIndex = hrefAttr.indexOf("#");
        if (hashIndex >= 0) {
          rawHash = hrefAttr.slice(hashIndex + 1);
        }
      }

      // If it's a footnote but we don't have a hash from href, try to derive it from anchor ID
      // e.g. <a id="fnref40" href="kindle:pos:...">[40]</a> -> target is id="fn40"
      if (!rawHash && isFootnote && anchorId) {
        if (anchorId.startsWith("fnref")) {
          rawHash = anchorId.replace("fnref", "fn");
          console.log("[Link] Derived footnote target ID from anchor ID:", rawHash);
        } else if (anchorId.startsWith("noteref")) {
          rawHash = anchorId.replace("noteref", "note");
          console.log("[Link] Derived note target ID from anchor ID:", rawHash);
        }
      }

      if (isFootnote && rawHash) {
        event.preventDefault();
        const ownerDoc = anchor.ownerDocument;
        const targetId = decodeURIComponent(rawHash);
        
        let targetEl = ownerDoc.getElementById(targetId) || 
                       ownerDoc.getElementsByName(targetId)[0] ||
                       ownerDoc.querySelector(`[id="${targetId}"]`);

        // Robust fallback: if "fn40" fails, try common patterns
        if (!targetEl && targetId) {
          const numMatch = targetId.match(/\d+/);
          if (numMatch) {
            const num = numMatch[0];
            console.log("[Link] Searching for fallback patterns for number:", num);
            
            // Try common ID patterns
            const patterns = [
              `footnote${num}`, `footnote-${num}`, `footnote_${num}`,
              `fn${num}`, `fn-${num}`, `fn_${num}`,
              `note${num}`, `note-${num}`, `note_${num}`,
              `f${num}`, `n${num}`, `ref${num}`,
              `id${num}`, `${num}`
            ];
            
            for (const p of patterns) {
              targetEl = ownerDoc.getElementById(p) || 
                         ownerDoc.querySelector(`[id="${p}"]`) ||
                         ownerDoc.querySelector(`[name="${p}"]`);
              if (targetEl) {
                console.log("[Link] Found target with pattern:", p);
                break;
              }
            }

            // Try searching for any element containing "footnote" and the number in its ID
            if (!targetEl) {
              targetEl = ownerDoc.querySelector(`[id*="footnote"][id*="${num}"]`) ||
                         ownerDoc.querySelector(`[id*="note"][id*="${num}"]`) ||
                         ownerDoc.querySelector(`[id*="fn"][id*="${num}"]`);
              if (targetEl) console.log("[Link] Found target with fuzzy ID search");
            }

            // Try "aid" attribute - common in some MOBI/EPUB formats
            if (!targetEl) {
              targetEl = ownerDoc.querySelector(`[aid*="${num}"]`);
              if (targetEl) console.log("[Link] Found target with aid attribute search");
            }
          }
        }
        
        if (targetEl && targetEl instanceof HTMLElement) {
          console.log("[Link] Footnote target found:", targetId);
          
          let content = targetEl.innerHTML;
          // If the target is an empty anchor (common in some formats), 
          // use the parent element's content instead
          if (!content.trim() && targetEl.tagName === "A" && targetEl.parentElement) {
            content = targetEl.parentElement.innerHTML;
            console.log("[Link] Target was empty anchor, using parent element content");
          }

          const rect = anchor.getBoundingClientRect();
          const iframeRect = iframeRef.current?.getBoundingClientRect();
          const containerRect = containerRef.current?.getBoundingClientRect();
          
          if (iframeRect && containerRect) {
            setActiveCitation({
              content: cleanFootnoteContent(targetEl.innerHTML),
              rect: {
                top: iframeRect.top + rect.top - containerRect.top,
                left: iframeRect.left + rect.left - containerRect.left,
                width: rect.width,
                height: rect.height,
              }
            });
            return;
          }
        } else {
          console.log("[Link] Footnote target NOT found:", targetId);
        }
      }

      if (lowerHref.startsWith("kindle:pos:")) {
        const linkText = anchor.textContent ?? "";
        
        // Try to extract fid/off to find aid
        // kindle:pos:fid:000Q:off:000000001K
        const parts = lowerHref.split(":");
        const fidIndex = parts.indexOf("fid");
        const offIndex = parts.indexOf("off");
        const ownerDoc = anchor.ownerDocument;

        if (fidIndex !== -1) {
          const fidStr = parts[fidIndex + 1];
          // Kindle fid is base32 (0-9, A-V)
          const fidNum = parseInt(fidStr, 32);
          console.log("[Link] kindle:pos fid:", fidStr, "->", fidNum);
          
          // Use the data-fid attribute we injected in readerHtml.ts
          const targetEl = ownerDoc.querySelector(`[data-fid="${fidNum}"]`);
          if (targetEl && targetEl instanceof HTMLElement) {
             console.log("[Link] Found target by data-fid:", fidNum);
             event.preventDefault();
             jumpToElement(targetEl);
             return;
          } else {
             console.log("[Link] Target NOT found by data-fid:", fidNum);
          }
        }

        const headingMatch = findHeadingByText(linkText, anchor);
        if (headingMatch) {
          console.log("[Link] Found target by heading text match:", linkText);
          event.preventDefault();
          jumpToElement(headingMatch);
          return;
        } else {
          console.log("[Link] No heading match found for text:", linkText);
        }
        // If it's a footnote, don't return yet, let the isFootnote logic handle it
        if (!isFootnote) {
          event.preventDefault();
          return;
        }
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
        (ownerDoc.getElementsByName(targetId)[0] as HTMLElement | undefined) ??
        ownerDoc.querySelector(`[id="${targetId}"]`) ??
        ownerDoc.querySelector(`[name="${targetId}"]`);
      
      event.preventDefault();
      if (!anchorTargetEl) {
        console.log("[Link] Internal target NOT found for ID/name:", targetId);
        return;
      }
      console.log("[Link] Navigating to internal target:", targetId);
      jumpToElement(anchorTargetEl as HTMLElement);
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
    renderHighlights(selectedHighlightId, activeAiQuote, activeAiBlockIndex);
  }, [iframeReady, highlightsQ.data, activeAiQuote, activeAiBlockIndex, selectedHighlightId]);

  useEffect(() => {
    if (!iframeReady) return;
    renderHighlights(selectedHighlightId, activeAiQuote, activeAiBlockIndex);
  }, [selectedHighlightId, activeAiQuote, activeAiBlockIndex, iframeReady]);

  const selectedHighlight = useMemo(() => {
    return (highlightsQ.data as any[] | undefined)?.find((highlight: any) => highlight.id === selectedHighlightId) ?? null;
  }, [highlightsQ.data, selectedHighlightId]);

  const attachedHighlights = useMemo(() => {
    return (highlightsQ.data as any[] | undefined)?.filter((h: any) => attachedHighlightIds.includes(h.id)) ?? [];
  }, [highlightsQ.data, attachedHighlightIds]);

  const toggleHighlightAttachment = (highlightId: number) => {
    setAttachedHighlightIds((prev) =>
      prev.includes(highlightId)
        ? prev.filter((id) => id !== highlightId)
        : [...prev, highlightId]
    );
  };

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

  const handleAddToChat = async () => {
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
    toggleHighlightAttachment(highlight.id);
  };

  const handleNewChat = async () => {
    if (selectedHighlight) return;
    const title = `Chat ${new Date().toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`;
    const thread = await createBookChatThread({ bookId: id, title });
    setCurrentThreadId(thread.id);
    await queryClient.invalidateQueries({ queryKey: ["bookChatThreads", id] });
  };

  const handleDeleteThread = async (threadId: number) => {
    await deleteBookChatThread(threadId);
    if (currentThreadId === threadId) {
      setCurrentThreadId(null);
    }
    await queryClient.invalidateQueries({ queryKey: ["bookChatThreads", id] });
  };

  const handleRenameThread = async (threadId: number, title: string) => {
    await renameBookChatThread({ threadId, title });
    await queryClient.invalidateQueries({ queryKey: ["bookChatThreads", id] });
  };

  const handleClearDefaultChat = async () => {
    await clearDefaultBookMessages(id);
    await queryClient.invalidateQueries({ queryKey: ["bookMessages", id, null] });
  };

  const handleClearThreadChat = async (threadId: number) => {
    await deleteBookThreadMessages(threadId);
    await queryClient.invalidateQueries({ queryKey: ["bookMessages", id, threadId] });
  };

  const handleDeleteMessage = async (messageId: number) => {
    await deleteBookMessage(messageId);
    await queryClient.invalidateQueries({ queryKey: ["bookMessages", id, currentThreadId] });
  };

  const scrollToQuote = (text: string, index?: number) => {
    const root = getScrollRoot();
    if (!root) return;
    
    // First, try to find it on the current page/view
    const range = findTextRange(root, text, index);
    if (range) {
      const rect = range.getBoundingClientRect();
      const rootRect = root.getBoundingClientRect();
      const offsetLeft = rect.left - rootRect.left + root.scrollLeft;
      const metrics = getPageMetrics();
      const stride = metrics.pageWidth + metrics.gap;
      const page = stride ? Math.max(1, Math.floor(offsetLeft / stride) + 1) : 1;
      scrollToPage(page);
    } else {
      // If not found in the current view, we might need a more global search.
      // findTextRange handles searching within a block if index is provided, 
      // or falling back to the entire root if it fails or index is absent.
      console.warn("Snippet not found in reader-root:", text);
    }
  };

  const handleCitationClick = (citationId: number, snippet?: string) => {
    let value = contextMap[citationId];
    
    // Fallback: If not in current state, search message history for the mapping
    if (!value) {
      console.log(`[Chat:Citation] ID ${citationId} not in current contextMap. Searching message history...`);
      const messages = bookMessagesQ.data ?? [];
      for (const msg of messages) {
        if (msg.role === "assistant" && msg.content.includes("<!-- context-map:")) {
          try {
            const mapStr = msg.content.split("<!-- context-map:")[1].split("-->")[0];
            const parsedMap = JSON.parse(mapStr);
            if (parsedMap[citationId]) {
              value = parsedMap[citationId];
              console.log(`[Chat:Citation] Found ID ${citationId} in message history mapping.`);
              break;
            }
          } catch (e) {
            console.error("[Chat:Citation] Failed to parse historical context-map", e);
          }
        }
      }
    }

    if (snippet) {
      scrollToQuote(snippet, value?.blockIndex);
      setActiveAiQuote(snippet);
      setActiveAiBlockIndex(value?.blockIndex ?? null);
      setSelectedHighlightId(null);
      return;
    }

    // Otherwise, use the text from the context map
    if (value && typeof value === "object") {
      const text = value.text;
      if (text) {
        scrollToQuote(text, value.blockIndex);
        setActiveAiQuote(text);
        setActiveAiBlockIndex(value.blockIndex ?? null);
        setSelectedHighlightId(null);
      }
    }
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
        renderHighlights(highlightId, activeAiQuote);
      }
      if (attempts < 4) {
        attempts += 1;
        window.requestAnimationFrame(attempt);
      }
    };
    attempt();
  };

  const sendChat = async () => {
    if (!chatInput.trim()) return;
    const input = chatInput.trim();
    setChatSending(true);
    setChatInput("");
    
    let threadId = currentThreadId;

    try {
      // Get starting index for cumulative citations
      let localId = 1;
      if (threadId !== null) {
        const maxIdx = await getThreadMaxCitationIndex(threadId);
        localId = maxIdx + 1;
      }

      // Optimistic update: immediately show user message in UI
      const optimisticUserMsg: any = {
        id: Date.now(), // Temporary ID
        book_id: id,
        thread_id: threadId,
        role: "user",
        content: input,
        created_at: new Date().toISOString(),
        isOptimistic: true
      };

      queryClient.setQueryData(["bookMessages", id, threadId], (old: any) => {
        return [...(old || []), optimisticUserMsg];
      });
      
      // Persist the user message to DB
      await addBookMessage({
        bookId: id,
        threadId: threadId,
        role: "user",
        content: input,
      });

      // Build context blocks
      const contextBlocks = [
        "You are an assistant embedded in an AI reader.",
        "IMPORTANT: You have access to the reader's current context. Respond thoughtfully using all context provided below.",
        "CITATIONS: For every specific claim, fact, or summary point, you MUST insert a citation: <cite snippet=\"...\" index=\"...\" />.",
        "The 'snippet' MUST be the verbatim text from the book supporting that specific claim. NEVER use ellipses '...' - if a quote is too long, cite multiple shorter verbatim snippets.",
        "The 'index' MUST be the exact number from the [SOURCE_ID: ...] tag provided in the context blocks below.",
        "CRITICAL: You MUST use the unique IDs provided. Do NOT default to '1'. Each claim must point to its specific source block.",
        "Example: Agamemnon refused the ransom <cite snippet=\"The priest being refused\" index=\"1\" /> and dismissed him rudely.",
        "Always use the self-closing format <cite ... />. Do NOT wrap your summary text in the tag.",
      ];

      const idMap: Record<number, { text: string; blockIndex?: number; cfi?: string; pageNumber?: number }> = {}; 

      if (selectedHighlight) {
        idMap[localId] = { 
          text: selectedHighlight.text,
          cfi: selectedHighlight.start_path, // Highlights use start_path as CFI
        };
        contextBlocks.push(`[SOURCE_ID: ${localId}] Currently Focused Highlight: "${selectedHighlight.text}"`);
        if (selectedHighlight.note) {
          contextBlocks.push(`User's Note on Highlight: "${selectedHighlight.note}"`);
        }
        localId++;
      }

      if (attachedHighlights.length > 0) {
        contextBlocks.push("Additional Attached Highlights:");
        attachedHighlights.forEach((h: any) => {
          if (selectedHighlight && h.id === selectedHighlight.id) return;
          idMap[localId] = { 
            text: h.text,
            cfi: h.start_path
          };
          contextBlocks.push(`[SOURCE_ID: ${localId}] "${h.text}"${h.note ? ` (Note: ${h.note})` : ""}`);
          localId++;
        });
      }

      // Always add visible page content to the context
      const doc = iframeRef.current?.contentDocument;
      const root = getScrollRoot();
      if (doc && root) {
        const metrics = getPageMetrics();
        const stride = metrics.pageWidth + metrics.gap;
        const rootRect = root.getBoundingClientRect();

        console.log(`[Chat:Context] Filtering blocks. CurrentPage: ${currentPage}, Columns: ${columns}, Stride: ${stride}, scrollLeft: ${root.scrollLeft}`);

          const blocks = Array.from(doc.querySelectorAll("[data-block-index]")) as HTMLElement[];
          contextBlocks.push("Current View Content:");
          
          const visibleWidth = rootRect.width;

          blocks.forEach((block) => {
            const rects = Array.from(block.getClientRects());
            const indexAttr = block.getAttribute("data-block-index");
            if (!indexAttr) return;
            const blockIndex = parseInt(indexAttr, 10);

            // A block is visible if any of its column fragments are within the visible viewport bounds
            const isVisible = rects.some(rect => {
              const visualLeft = rect.left - rootRect.left;
              const visualRight = rect.right - rootRect.left;
              
              // We use a 2px buffer to ignore microscopic slivers on the edges
              return (visualRight > 2 && visualLeft < visibleWidth - 2);
            });
            
            if (isVisible) {
              const text = block.textContent?.trim();
              if (text) {
                const sentences = text.split(/(?<=[.!?])\s+(?=[A-Z"])/);
                sentences.forEach(sentence => {
                  const cleanSentence = sentence.trim();
                  if (cleanSentence.length > 5) {
                    idMap[localId] = { 
                      text: cleanSentence, 
                      blockIndex,
                      cfi: `epubcfi(/6/2!/4/${blockIndex * 2})`, // Simple block-based CFI
                      pageNumber: currentPage
                    }; 
                    contextBlocks.push(`[SOURCE_ID: ${localId}] ${cleanSentence}`);
                    localId++;
                  }
                });
              }
            }
          });
      }

      const mapping = idMap;
      setContextMap(mapping);

      const systemContent = contextBlocks.join("\n");
      
      const messages = bookMessagesQ.data ?? [];

      const response = await openAiChat([
        { role: "system", content: systemContent },
        ...messages.map((message: any) => ({ role: message.role, content: message.content })),
        { role: "user", content: input },
      ]);

      await addBookMessage({
        bookId: id,
        threadId: threadId,
        role: "assistant",
        content: response.content,
        reasoningSummary: response.reasoning_summary,
        contextMap: JSON.stringify(mapping),
      });

      await queryClient.invalidateQueries({
        queryKey: ["bookMessages", id, threadId],
      });
    } catch (error: any) {
      const errorMessage = String(error?.message ?? error);
      await addBookMessage({
        bookId: id,
        threadId: currentThreadId,
        role: "assistant",
        content: errorMessage,
      });
      await queryClient.invalidateQueries({
        queryKey: ["bookMessages", id, currentThreadId],
      });
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
    console.log("[TOC] Navigating to entry:", entry.text, entry.id);
    setCurrentTocEntryId(entry.id);
    jumpToElement(entry.element);
  };

  const handleSelectThread = (threadId: number | null) => {
    setCurrentThreadId(threadId);
    if (threadId !== null && bookChatThreadsQ.data) {
      const thread = bookChatThreadsQ.data.find(t => t.id === threadId);
      if (thread?.last_cfi) {
        console.log("[Thread] Auto-jumping to last_cfi:", thread.last_cfi);
        // Small delay to allow the thread messages to start loading/UI to settle
        setTimeout(() => {
          scrollToCfi(thread.last_cfi!);
        }, 100);
      }
    }
  };

  const chatMessages = (bookMessagesQ.data ?? []).map((message: any) => {
    let content = message.content;
    let mapping: Record<number, any> = {};
    
    // Prioritize database context_map
    if (message.context_map) {
      try {
        mapping = JSON.parse(message.context_map);
      } catch (e) {
        console.error("Failed to parse database context_map", e);
      }
    } else {
      // Legacy fallback: parse from content comment
      const mapMatch = content.match(/<!-- context-map: (\{.*?\}) -->/);
      if (mapMatch) {
        try {
          mapping = JSON.parse(mapMatch[1]);
          content = content.replace(mapMatch[0], "").trim();
        } catch (e) {
          console.error("Failed to parse legacy context map", e);
        }
      }
    }

    return {
      id: String(message.id),
      role: message.role as "user" | "assistant",
      content: content,
      onCitationClick: (localId: number, snippet?: string) => {
        const value = mapping[localId];
        
        if (value?.cfi) {
          scrollToCfi(value.cfi);
          if (snippet) setActiveAiQuote(snippet);
          else if (value.text) setActiveAiQuote(value.text);
          setActiveAiBlockIndex(value.blockIndex ?? null);
          setSelectedHighlightId(null);
          return;
        }

        if (snippet) {
          scrollToQuote(snippet, value?.blockIndex);
          setActiveAiQuote(snippet);
          setActiveAiBlockIndex(value?.blockIndex ?? null);
          setSelectedHighlightId(null);
          return;
        }

        if (value && typeof value === "object") {
          const text = value.text;
          if (text) {
            scrollToQuote(text, value.blockIndex);
            setActiveAiQuote(text);
            setActiveAiBlockIndex(value.blockIndex ?? null);
            setSelectedHighlightId(null);
          }
        }
      },
    };
  });

  const chatContextHint = selectedHighlight
    ? "Using selected highlight as context"
    : "Using current page as context";

  const chatPlaceholder = selectedHighlight
    ? "Ask about this highlight..."
    : "Ask about the current page...";
  const handleSaveImage = async (src: string) => {
    try {
      const { save } = await import("@tauri-apps/plugin-dialog");
      const { writeFile } = await import("@tauri-apps/plugin-fs");
      
      const filePath = await save({
        filters: [{
          name: 'Image',
          extensions: ['jpg', 'png', 'gif']
        }]
      });

      if (filePath) {
        const response = await fetch(src);
        const arrayBuffer = await response.arrayBuffer();
        await writeFile(filePath, new Uint8Array(arrayBuffer));
      }
    } catch (e) {
      console.error("Failed to save image:", e);
    }
  };

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

      <div
        className={cn(
          "grid flex-1 min-h-0 gap-3",
          leftPanelCollapsed && rightPanelCollapsed && "grid-cols-[40px_minmax(0,1fr)_40px]",
          leftPanelCollapsed && !rightPanelCollapsed && "grid-cols-[40px_minmax(0,1fr)_400px]",
          !leftPanelCollapsed && rightPanelCollapsed && "grid-cols-[280px_minmax(0,1fr)_40px]",
          !leftPanelCollapsed && !rightPanelCollapsed && "grid-cols-[280px_minmax(0,1fr)_400px]"
        )}
      >
        <div className="relative flex min-h-0">
          {leftPanelCollapsed ? (
            <div className="flex h-full items-start pt-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setLeftPanelCollapsed(false)}
                title="Expand left panel"
              >
                <PanelLeftOpen className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <>
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
                onCollapse={() => setLeftPanelCollapsed(true)}
                onToggleContext={toggleHighlightAttachment}
                attachedHighlightIds={attachedHighlightIds}
              />
            </>
          )}
        </div>

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
          onAddToChat={handleAddToChat}
          activeCitation={activeCitation}
          onActiveCitationChange={setActiveCitation}
        />

        <div className="relative flex min-h-0">
          {rightPanelCollapsed ? (
            <div className="flex h-full items-start pt-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setRightPanelCollapsed(false)}
                title="Expand right panel"
              >
                <PanelRightOpen className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <ChatSidebar
              contextHint={chatContextHint}
              messages={chatMessages}
              prompts={CHAT_PROMPTS}
              chatInput={chatInput}
              onChatInputChange={setChatInput}
              onPromptSelect={setChatInput}
              onSend={sendChat}
              onNewChat={!selectedHighlight ? handleNewChat : undefined}
              onDeleteThread={handleDeleteThread}
              onRenameThread={handleRenameThread}
              onClearDefaultChat={handleClearDefaultChat}
              onClearThreadChat={handleClearThreadChat}
              onDeleteMessage={handleDeleteMessage}
              chatSending={chatSending}
              chatInputRef={chatInputRef}
              currentModel={currentModel}
              availableModels={availableModels}
              onModelChange={handleModelChange}
              modelsLoading={modelsLoading}
              onCollapse={() => setRightPanelCollapsed(true)}
              threads={bookChatThreadsQ.data}
              currentThreadId={currentThreadId}
              onSelectThread={handleSelectThread}
              placeholder={chatPlaceholder}
              isHighlightContext={!!selectedHighlight}
              attachedContext={attachedHighlights}
              onRemoveContext={toggleHighlightAttachment}
              onCitationClick={handleCitationClick}
            />
          )}
        </div>
      </div>

      {lightboxImage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative max-h-full max-w-full">
            <img 
              src={lightboxImage.src} 
              alt={lightboxImage.alt} 
              className="max-h-[90vh] max-w-full rounded-md shadow-2xl object-contain"
            />
            <div className="absolute -top-12 right-0 flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleSaveImage(lightboxImage.src)}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Save Image
              </Button>
              <Button
                variant="secondary"
                size="icon"
                onClick={() => setLightboxImage(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            {lightboxImage.alt && (
              <p className="absolute -bottom-8 left-0 right-0 text-center text-sm text-white/80 italic">
                {lightboxImage.alt}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
