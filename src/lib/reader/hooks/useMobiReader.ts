import { useState, useMemo, useRef, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getBook, getBookHtml } from "@/lib/tauri";
import { useReaderAppearance } from "@/lib/appearance";
import { processGutenbergContent, wrapBody, injectHead } from "@/lib/readerHtml";
import { buildReaderCss } from "@/lib/reader/styles";
import { computePageGap, computeReaderWidth } from "@/lib/reader/pagination";
import { findTextRange } from "@/lib/readerUtils";

import {
  useIframeDocument,
  usePagination,
  useNavigation,
  useProgressPersistence,
  useToc,
  useModels,
  useHighlights,
  useChat,
} from "@/lib/reader/hooks";
import { useMobiIframe } from "./useMobiIframe";

export function useMobiReader(bookId: number) {
  const [columns, setColumns] = useState<1 | 2>(1);
  const [showAppearance, setShowAppearance] = useState(false);
  const [jumpPage, setJumpPage] = useState("");
  const [highlightLibraryExpanded, setHighlightLibraryExpanded] = useState(false);
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);
  const [activeCitation, setActiveCitation] = useState<{ content: string; rect: { top: number; left: number; width: number; height: number } } | null>(null);
  const [lightboxImage, setLightboxImage] = useState<{ src: string; alt?: string } | null>(null);

  const queryClient = useQueryClient();
  const bookQ = useQuery({ queryKey: ["book", bookId], queryFn: () => getBook(bookId) });
  const htmlQ = useQuery({ queryKey: ["bookHtml", bookId], queryFn: () => getBookHtml(bookId) });

  const restoredRef = useRef(false);
  const pendingRestoreRef = useRef<{ page?: number } | null>(null);

  const {
    fontFamily,
    lineHeight,
    margin,
    setFontFamily,
    setLineHeight,
    setMargin,
  } = useReaderAppearance(bookId);

  const {
    iframeRef,
    rootRef,
    containerRef,
    iframeReady,
    setIframeReady,
    getDoc,
    getScrollRoot,
    setDocRef,
    setRootRef,
  } = useIframeDocument();

  const gutenbergId = bookQ.data?.gutenberg_id;
  const progressKey = gutenbergId ? `reader-progress-gutenberg-${gutenbergId}` : null;

  const pageGap = computePageGap(columns);
  const readerWidth = computeReaderWidth(columns, margin, pageGap);

  const pagination = usePagination({
    columns,
    margin,
    getScrollRoot,
    fallbackWidth: typeof window !== 'undefined' ? window.innerWidth : 1200,
    onPageChange: (page) => {
      progressPersistence.scheduleSaveProgress(page);
      progressPersistence.scheduleSaveThreadProgress();
    },
  });

  const progressPersistence = useProgressPersistence({
    progressKey,
    currentPage: pagination.currentPage,
    currentThreadId: null,
    bookId: bookId,
    getScrollRoot,
    queryClient: queryClient as any,
  });

  const navigation = useNavigation({
    getScrollRoot,
    getDoc,
    getPageMetrics: pagination.getPageMetrics,
    columns,
    margin,
    pageLockRef: pagination.pageLockRef,
    isNavigatingRef: pagination.isNavigatingRef,
    updatePagination: pagination.updatePagination,
  });

  const toc = useToc({
    getDoc,
    getScrollRoot,
    jumpToElement: navigation.jumpToElement,
  });

  const models = useModels();

  const highlightsHook = useHighlights({
    bookId: bookId,
    getDoc,
    getScrollRoot,
  });

  const scrollToQuote = (text: string, index?: number) => {
    const root = getScrollRoot();
    if (!root) return;

    const range = findTextRange(root, text, index);
    if (range) {
      const rect = range.getBoundingClientRect();
      const rootRect = root.getBoundingClientRect();
      const offsetLeft = rect.left - rootRect.left + root.scrollLeft;
      const metrics = pagination.getPageMetrics();
      const stride = metrics.pageWidth + metrics.gap;
      const page = stride ? Math.max(1, Math.floor(offsetLeft / stride) + 1) : 1;
      pagination.scrollToPage(page);
    }
  };

  const chatHook = useChat(
    {
      bookId: bookId,
      getDoc,
      getScrollRoot,
      getPageMetrics: pagination.getPageMetrics,
      currentPage: pagination.currentPage,
      selectedHighlight: highlightsHook.selectedHighlight,
      attachedHighlights: highlightsHook.attachedHighlights,
    },
    navigation,
    scrollToQuote,
    highlightsHook.setActiveAiQuote,
    highlightsHook.setActiveAiBlockIndex,
    highlightsHook.setSelectedHighlightId
  );

  const { handleIframeLoad } = useMobiIframe({
    iframeRef,
    rootRef,
    containerRef,
    getScrollRoot,
    setDocRef,
    setRootRef,
    setIframeReady,
    pagination,
    toc,
    navigation,
    highlightsHook,
    setActiveCitation,
    setLightboxImage,
  });

  const srcDoc = useMemo(() => {
    if (!htmlQ.data) return "";
    const isTauri = typeof window !== "undefined" && (window as any).__TAURI_INTERNALS__ !== undefined;
    const baseUrl = !isTauri && bookQ.data?.gutenberg_id
      ? `https://www.gutenberg.org/cache/epub/${bookQ.data.gutenberg_id}/`
      : undefined;
    const { html: processedHtml } = processGutenbergContent(htmlQ.data, bookId, baseUrl);
    const css = buildReaderCss({ columns, margin, pageGap, fontFamily, lineHeight });
    const wrappedBody = wrapBody(processedHtml);
    return injectHead(wrappedBody, css);
  }, [htmlQ.data, bookQ.data?.gutenberg_id, bookId, fontFamily, lineHeight, margin, columns, pageGap]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && /input|textarea|select|button/i.test(target.tagName)) return;
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        pagination.prev();
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        pagination.next();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [pagination.totalPages]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        window.requestAnimationFrame(() => pagination.lockToPage());
      }
    };
    const handleFocusChange = () => {
      window.requestAnimationFrame(() => pagination.lockToPage());
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
        page: typeof parsed.page === "number" ? parsed.page : undefined,
      };
    } catch {
      pendingRestoreRef.current = null;
    }
  }, [htmlQ.data, progressKey]);

  useEffect(() => {
    toc.resetHeadingIndex();
  }, [iframeReady, htmlQ.data]);

  useEffect(() => {
    if (restoredRef.current) return;
    const pending = pendingRestoreRef.current;
    if (!pending) {
      restoredRef.current = true;
      return;
    }
    if (pending.page) {
      pagination.scrollToPage(pending.page);
      restoredRef.current = true;
    }
  }, [pagination.totalPages]);

  useEffect(() => {
    if (!iframeReady || !highlightsHook.highlights) return;
    highlightsHook.renderHighlights(
      highlightsHook.selectedHighlightId,
      highlightsHook.activeAiQuote,
      highlightsHook.activeAiBlockIndex
    );
  }, [iframeReady, highlightsHook.highlights, highlightsHook.activeAiQuote, highlightsHook.activeAiBlockIndex, highlightsHook.selectedHighlightId]);

  useEffect(() => {
    if (!iframeReady) return;
    highlightsHook.renderHighlights(
      highlightsHook.selectedHighlightId,
      highlightsHook.activeAiQuote,
      highlightsHook.activeAiBlockIndex
    );
  }, [highlightsHook.selectedHighlightId, highlightsHook.activeAiQuote, highlightsHook.activeAiBlockIndex, iframeReady]);

  const scrollToHighlight = (highlightId: number) => {
    let attempts = 0;
    const attempt = () => {
      const doc = iframeRef.current?.contentDocument;
      const el = doc?.querySelector(`span.readerHighlight[data-highlight-id="${highlightId}"]`) as HTMLElement | null;
      if (el) {
        navigation.jumpToElement(el);
        return;
      }
      if (attempts === 0 && iframeReady && highlightsHook.highlights) {
        highlightsHook.renderHighlights(highlightId, highlightsHook.activeAiQuote);
      }
      if (attempts < 4) {
        attempts += 1;
        window.requestAnimationFrame(attempt);
      }
    };
    attempt();
  };

  const handleSaveImage = async (src: string) => {
    try {
      const { save } = await import("@tauri-apps/plugin-dialog");
      const { writeFile } = await import("@tauri-apps/plugin-fs");

      const filePath = await save({
        filters: [{ name: "Image", extensions: ["jpg", "png", "gif"] }],
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

  const toggleColumns = () => setColumns(prev => prev === 1 ? 2 : 1);

  return {
    // State
    columns,
    setColumns,
    toggleColumns,
    showAppearance,
    setShowAppearance,
    jumpPage,
    setJumpPage,
    highlightLibraryExpanded,
    setHighlightLibraryExpanded,
    leftPanelCollapsed,
    setLeftPanelCollapsed,
    rightPanelCollapsed,
    setRightPanelCollapsed,
    activeCitation,
    setActiveCitation,
    lightboxImage,
    setLightboxImage,

    // Queries
    bookQ,
    htmlQ,

    // Appearance
    appearance: {
      fontFamily,
      lineHeight,
      margin,
      setFontFamily,
      setLineHeight,
      setMargin,
    },

    // Iframe / Document
    iframe: {
      iframeRef,
      containerRef,
      iframeReady,
    },

    // Sub-hooks
    pagination,
    navigation,
    toc,
    models,
    highlights: highlightsHook,
    chat: chatHook,

    // Derived
    readerWidth,
    srcDoc,

    // Handlers
    handleIframeLoad,
    scrollToHighlight,
    handleSaveImage,
  };
}