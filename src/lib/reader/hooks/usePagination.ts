import { useRef, useState, useCallback, useEffect } from "react";
import {
  getPageMetricsFromRoot,
  computeTotalPages,
  computePageFromScroll,
  computeScrollTarget,
  syncPageMetricsToRoot,
  type PageMetricsResult,
} from "../pagination";
import { DEBOUNCE_LOCK_PAGE } from "../constants";

export interface UsePaginationOptions {
  columns: 1 | 2;
  margin: number;
  getScrollRoot: () => HTMLElement | null;
  fallbackWidth?: number;
  onPageChange?: (page: number) => void;
}

export interface UsePaginationResult {
  currentPage: number;
  totalPages: number;
  pageLockRef: React.RefObject<number>;
  isNavigatingRef: React.RefObject<boolean>;
  getPageMetrics: () => PageMetricsResult;
  syncPageMetrics: () => void;
  scrollToPage: (page: number) => void;
  lockToPage: (page?: number) => void;
  updatePagination: () => void;
  schedulePaginationUpdate: () => void;
  scheduleLock: () => void;
  scheduleLayoutRebuild: () => void;
  prev: () => void;
  next: () => void;
  cleanup: () => void;
}

export function usePagination(options: UsePaginationOptions): UsePaginationResult {
  const { columns, margin, getScrollRoot, fallbackWidth, onPageChange } = options;

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const pageLockRef = useRef(1);
  const isNavigatingRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const layoutRafRef = useRef<number | null>(null);
  const lockTimeoutRef = useRef<number | null>(null);

  const getPageMetrics = useCallback((): PageMetricsResult => {
    const root = getScrollRoot();
    return getPageMetricsFromRoot(root, fallbackWidth);
  }, [getScrollRoot, fallbackWidth]);

  const syncPageMetrics = useCallback(() => {
    const root = getScrollRoot();
    if (!root) return;
    syncPageMetricsToRoot(root, columns, margin);
  }, [getScrollRoot, columns, margin]);

  const lockToPage = useCallback((page = pageLockRef.current) => {
    const root = getScrollRoot();
    if (!root) return;
    const { pageWidth, gap } = getPageMetrics();
    if (!pageWidth) return;
    const stride = pageWidth + gap;
    const target = computeScrollTarget(page, stride);

    if (Math.abs(root.scrollLeft - target) > 1) {
      root.scrollLeft = target;
    }
  }, [getScrollRoot, getPageMetrics]);

  const scrollToPage = useCallback((page: number) => {
    const root = getScrollRoot();
    if (!root) return;
    const { pageWidth, gap } = getPageMetrics();
    if (!pageWidth) return;
    const stride = pageWidth + gap;
    const target = computeScrollTarget(page, stride);

    pageLockRef.current = page;
    root.scrollTo({ left: target, behavior: "smooth" });
  }, [getScrollRoot, getPageMetrics]);

  const updatePagination = useCallback(() => {
    const root = getScrollRoot();
    if (!root) return;
    const { pageWidth, gap, paddingLeft, paddingRight, scrollWidth } = getPageMetrics();
    if (!pageWidth) return;

    const total = computeTotalPages(scrollWidth, paddingLeft, paddingRight, pageWidth, gap);
    setTotalPages(total);

    const currentScroll = root.scrollLeft;
    const stride = pageWidth + gap;
    const lockedPage = computePageFromScroll(currentScroll, stride, total);

    if (lockedPage !== currentPage) {
      setCurrentPage(lockedPage);
      onPageChange?.(lockedPage);
    }

    if (Math.abs(currentScroll - (pageLockRef.current - 1) * stride) > stride / 2) {
      pageLockRef.current = lockedPage;
    }
  }, [getScrollRoot, getPageMetrics, currentPage, onPageChange]);

  const schedulePaginationUpdate = useCallback(() => {
    if (rafRef.current !== null) return;
    rafRef.current = window.requestAnimationFrame(() => {
      rafRef.current = null;
      if (isNavigatingRef.current) return;
      updatePagination();
    });
  }, [updatePagination]);

  const scheduleLock = useCallback(() => {
    if (lockTimeoutRef.current !== null) {
      window.clearTimeout(lockTimeoutRef.current);
    }
    lockTimeoutRef.current = window.setTimeout(() => {
      lockTimeoutRef.current = null;
      lockToPage();
    }, DEBOUNCE_LOCK_PAGE);
  }, [lockToPage]);

  const scheduleLayoutRebuild = useCallback(() => {
    if (layoutRafRef.current !== null) return;
    layoutRafRef.current = window.requestAnimationFrame(() => {
      layoutRafRef.current = null;
      syncPageMetrics();
      lockToPage();
      updatePagination();
    });
  }, [syncPageMetrics, lockToPage, updatePagination]);

  const prev = useCallback(() => {
    scrollToPage(Math.max(1, pageLockRef.current - 1));
  }, [scrollToPage]);

  const next = useCallback(() => {
    scrollToPage(Math.min(totalPages, pageLockRef.current + 1));
  }, [scrollToPage, totalPages]);

  const cleanup = useCallback(() => {
    if (rafRef.current !== null) {
      window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (layoutRafRef.current !== null) {
      window.cancelAnimationFrame(layoutRafRef.current);
      layoutRafRef.current = null;
    }
    if (lockTimeoutRef.current !== null) {
      window.clearTimeout(lockTimeoutRef.current);
      lockTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return {
    currentPage,
    totalPages,
    pageLockRef,
    isNavigatingRef,
    getPageMetrics,
    syncPageMetrics,
    scrollToPage,
    lockToPage,
    updatePagination,
    schedulePaginationUpdate,
    scheduleLock,
    scheduleLayoutRebuild,
    prev,
    next,
    cleanup,
  };
}
