import { useRef, useState, useCallback } from "react";

export interface UseIframeDocumentResult {
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
  docRef: React.RefObject<Document | null>;
  rootRef: React.RefObject<HTMLElement | null>;
  containerRef: React.RefObject<HTMLDivElement | null>;
  iframeReady: boolean;
  setIframeReady: (ready: boolean) => void;
  getDoc: () => Document | null;
  getScrollRoot: () => HTMLElement | null;
  setDocRef: (doc: Document | null) => void;
  setRootRef: (root: HTMLElement | null) => void;
}

export function useIframeDocument(): UseIframeDocumentResult {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const docRef = useRef<Document | null>(null);
  const rootRef = useRef<HTMLElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [iframeReady, setIframeReady] = useState(false);

  const getDoc = useCallback(() => {
    return iframeRef.current?.contentDocument ?? null;
  }, []);

  const getScrollRoot = useCallback(() => {
    const doc = iframeRef.current?.contentDocument;
    return (doc?.getElementById("reader-root") as HTMLElement | null) ?? null;
  }, []);

  const setDocRef = useCallback((doc: Document | null) => {
    docRef.current = doc;
  }, []);

  const setRootRef = useCallback((root: HTMLElement | null) => {
    rootRef.current = root;
  }, []);

  return {
    iframeRef,
    docRef,
    rootRef,
    containerRef,
    iframeReady,
    setIframeReady,
    getDoc,
    getScrollRoot,
    setDocRef,
    setRootRef,
  };
}
