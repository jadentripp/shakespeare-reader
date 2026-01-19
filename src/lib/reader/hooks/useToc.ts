import { useState, useRef, useCallback } from "react";
import {
  buildHeadingIndex,
  buildTocFromAnchors,
  buildTocFromHeadings,
  findHeadingByText,
  type TocEntry,
  type HeadingIndexEntry,
} from "../toc";

export interface UseTocOptions {
  getDoc: () => Document | null;
  getScrollRoot: () => HTMLElement | null;
  jumpToElement: (element: HTMLElement) => void;
}

export interface UseTocResult {
  tocEntries: TocEntry[];
  currentTocEntryId: string | null;
  tocExpanded: boolean;
  setTocExpanded: (expanded: boolean) => void;
  setTocEntries: (entries: TocEntry[]) => void;
  setCurrentTocEntryId: (id: string | null) => void;
  buildToc: () => void;
  resetHeadingIndex: () => void;
  getHeadingIndex: () => HeadingIndexEntry[];
  handleTocNavigate: (entry: TocEntry) => void;
  findHeadingByLinkText: (text: string, referenceEl?: HTMLElement | null) => HTMLElement | null;
}

export function useToc(options: UseTocOptions): UseTocResult {
  const { getDoc, getScrollRoot, jumpToElement } = options;

  const [tocEntries, setTocEntries] = useState<TocEntry[]>([]);
  const [currentTocEntryId, setCurrentTocEntryId] = useState<string | null>(null);
  const [tocExpanded, setTocExpanded] = useState(false);
  const headingIndexRef = useRef<HeadingIndexEntry[] | null>(null);

  const resetHeadingIndex = useCallback(() => {
    headingIndexRef.current = null;
  }, []);

  const getHeadingIndex = useCallback((): HeadingIndexEntry[] => {
    const doc = getDoc();
    if (!doc) return [];
    if (!headingIndexRef.current) {
      headingIndexRef.current = buildHeadingIndex(doc);
    }
    return headingIndexRef.current;
  }, [getDoc]);

  const buildToc = useCallback(() => {
    const doc = getDoc();
    if (!doc) return;

    const tocFromAnchors = buildTocFromAnchors(doc);
    if (tocFromAnchors.length >= 3) {
      setTocEntries(tocFromAnchors);
    } else {
      const tocFromHeadings = buildTocFromHeadings(doc);
      setTocEntries(tocFromHeadings);
    }
  }, [getDoc]);

  const handleTocNavigate = useCallback((entry: TocEntry) => {
    setCurrentTocEntryId(entry.id);
    jumpToElement(entry.element);
  }, [jumpToElement]);

  const findHeadingByLinkText = useCallback((text: string, referenceEl?: HTMLElement | null): HTMLElement | null => {
    const doc = getDoc();
    const root = getScrollRoot();
    if (!doc || !root) return null;

    const headingIndex = getHeadingIndex();
    return findHeadingByText(text, headingIndex, doc, root, referenceEl);
  }, [getDoc, getScrollRoot, getHeadingIndex]);

  return {
    tocEntries,
    currentTocEntryId,
    tocExpanded,
    setTocExpanded,
    setTocEntries,
    setCurrentTocEntryId,
    buildToc,
    resetHeadingIndex,
    getHeadingIndex,
    handleTocNavigate,
    findHeadingByLinkText,
  };
}
