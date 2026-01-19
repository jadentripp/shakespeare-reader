import { useRef, useEffect } from "react";
import { getBookImageData } from "@/lib/tauri";
import { DEBOUNCE_SELECTION } from "@/lib/reader/constants";
import { getNodePath } from "@/lib/readerUtils";
import { getEventTargetElement, findHighlightFromEvent } from "@/lib/reader/dom";
import { createLinkClickHandler } from "@/lib/reader/links";

export function useMobiIframe(params: {
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
  rootRef: React.RefObject<HTMLElement | null>;
  containerRef: React.RefObject<HTMLElement | null>;
  getScrollRoot: () => HTMLElement | null;
  setDocRef: (doc: Document) => void;
  setRootRef: (root: HTMLElement) => void;
  setIframeReady: (ready: boolean) => void;
  pagination: any;
  toc: any;
  navigation: any;
  highlightsHook: any;
  setActiveCitation: (citation: any) => void;
  setLightboxImage: (image: any) => void;
}) {
  const {
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
  } = params;

  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const selectionTimeoutRef = useRef<number | null>(null);
  const scrollHandlerRef = useRef<((event: Event) => void) | null>(null);
  const wheelHandlerRef = useRef<((event: WheelEvent) => void) | null>(null);
  const selectionHandlerRef = useRef<(() => void) | null>(null);
  const highlightClickRef = useRef<((event: Event) => void) | null>(null);
  const linkClickRef = useRef<((event: MouseEvent) => void) | null>(null);

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

    setDocRef(doc);
    setRootRef(root);

    stripGutenbergBoilerplate(doc);
    pagination.syncPageMetrics();

    const resolveMobiImages = async () => {
      const imgs = doc.querySelectorAll("img.mobi-inline-image");
      for (const img of Array.from(imgs)) {
        const bId = img.getAttribute("data-book-id");
        const relativeIndex = img.getAttribute("data-kindle-index");
        if (bId && relativeIndex) {
          try {
            const dataUrl = await getBookImageData(parseInt(bId), parseInt(relativeIndex));
            (img as HTMLImageElement).src = dataUrl;
          } catch (e) {
            console.error("Failed to resolve image:", e);
          }
        }
      }
    };
    resolveMobiImages();

    toc.buildToc();

    const handleScroll = () => {
      if (pagination.isNavigatingRef.current) return;
      pagination.schedulePaginationUpdate();
      pagination.scheduleLock();
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
    resizeObserverRef.current = new ResizeObserver(() => pagination.scheduleLayoutRebuild());
    resizeObserverRef.current.observe(root);

    const handleSelection = () => {
      if (selectionTimeoutRef.current !== null) {
        window.clearTimeout(selectionTimeoutRef.current);
      }
      selectionTimeoutRef.current = window.setTimeout(() => {
        selectionTimeoutRef.current = null;
        const selection = doc.getSelection();
        if (!selection || selection.rangeCount === 0) {
          highlightsHook.setPendingHighlight(null);
          return;
        }
        const range = selection.getRangeAt(0);
        if (range.collapsed) {
          highlightsHook.setPendingHighlight(null);
          return;
        }
        const rootNode = rootRef.current ?? root;
        if (!rootNode.contains(range.startContainer) || !rootNode.contains(range.endContainer)) {
          highlightsHook.setPendingHighlight(null);
          return;
        }
        const startPath = getNodePath(rootNode, range.startContainer);
        const endPath = getNodePath(rootNode, range.endContainer);
        const text = range.toString().trim();
        if (!startPath || !endPath || !text) {
          highlightsHook.setPendingHighlight(null);
          return;
        }
        const rangeRect = range.getBoundingClientRect();
        const iRect = iframeRef.current?.getBoundingClientRect();
        const cRect = containerRef.current?.getBoundingClientRect();
        if (!iRect || !cRect) {
          highlightsHook.setPendingHighlight(null);
          return;
        }
        highlightsHook.setPendingHighlight({
          startPath,
          startOffset: range.startOffset,
          endPath,
          endOffset: range.endOffset,
          text,
          rect: {
            top: iRect.top + rangeRect.top - cRect.top,
            left: iRect.left + rangeRect.left - cRect.left,
            width: rangeRect.width,
            height: rangeRect.height,
          },
        });
      }, DEBOUNCE_SELECTION);
    };
    selectionHandlerRef.current = handleSelection;
    doc.addEventListener("mouseup", handleSelection);
    doc.addEventListener("keyup", handleSelection);

    const handleHighlightClick = (event: Event) => {
      const target = getEventTargetElement(event.target);
      if (target && target.tagName === "IMG") {
        setLightboxImage({
          src: (target as HTMLImageElement).src,
          alt: (target as HTMLImageElement).alt,
        });
        return;
      }
      const highlightEl = findHighlightFromEvent(event);
      const highlightId = highlightEl?.dataset?.highlightId;
      if (highlightId) {
        highlightsHook.setSelectedHighlightId(Number(highlightId));
      }
    };
    highlightClickRef.current = handleHighlightClick;
    root.addEventListener("click", handleHighlightClick);

    const handleLinkClick = createLinkClickHandler({
      iframeRef,
      containerRef,
      navigation,
      toc,
      onFootnote: (result) => setActiveCitation(result),
    });
    linkClickRef.current = handleLinkClick;
    doc.addEventListener("click", handleLinkClick, true);

    pagination.scheduleLayoutRebuild();
    setIframeReady(true);
  };

  useEffect(() => {
    return () => {
      if (selectionTimeoutRef.current !== null) {
        window.clearTimeout(selectionTimeoutRef.current);
        selectionTimeoutRef.current = null;
      }
      resizeObserverRef.current?.disconnect();
      resizeObserverRef.current = null;
      
      const root = getScrollRoot();
      const doc = iframeRef.current?.contentDocument;

      if (root && scrollHandlerRef.current) {
        root.removeEventListener("scroll", scrollHandlerRef.current);
      }
      if (root && wheelHandlerRef.current) {
        root.removeEventListener("wheel", wheelHandlerRef.current);
      }
      if (doc && selectionHandlerRef.current) {
        doc.removeEventListener("mouseup", selectionHandlerRef.current);
        doc.removeEventListener("keyup", selectionHandlerRef.current);
      }
      if (doc && linkClickRef.current) {
        doc.removeEventListener("click", linkClickRef.current, true);
      }
      if (root && highlightClickRef.current) {
        root.removeEventListener("click", highlightClickRef.current);
      }
    };
  }, []);

  return {
    handleIframeLoad,
  };
}
