import { getEventTargetElement } from "./dom";
import { cleanFootnoteContent } from "@/lib/readerUtils";

export interface FootnoteResult {
  content: string;
  rect: { top: number; left: number; width: number; height: number };
}

export interface LinkClickContext {
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
  containerRef: React.RefObject<HTMLElement | null>;
  navigation: { jumpToElement: (el: HTMLElement) => void };
  toc: { findHeadingByLinkText: (text: string, anchor: HTMLAnchorElement) => HTMLElement | null };
  onFootnote: (result: FootnoteResult) => void;
}

export function parseFootnoteId(hrefAttr: string, anchorId: string, anchorHash: string): string {
  let rawHash = "";
  if (anchorHash && anchorHash !== "#") {
    rawHash = anchorHash.startsWith("#") ? anchorHash.slice(1) : anchorHash;
  } else {
    const hashIndex = hrefAttr.indexOf("#");
    if (hashIndex >= 0) {
      rawHash = hrefAttr.slice(hashIndex + 1);
    }
  }

  const lowerHref = hrefAttr.toLowerCase();
  const isFootnote = lowerHref.includes("#fn") ||
    anchorId.startsWith("fnref") ||
    anchorId.includes("footnote") ||
    anchorId.includes("noteref");

  if (!rawHash && isFootnote && anchorId) {
    if (anchorId.startsWith("fnref")) {
      rawHash = anchorId.replace("fnref", "fn");
    } else if (anchorId.startsWith("noteref")) {
      rawHash = anchorId.replace("noteref", "note");
    }
  }

  return rawHash;
}

export function isFootnoteLink(hrefAttr: string, anchorId: string, className: string): boolean {
  const lowerHref = hrefAttr.toLowerCase();
  return lowerHref.includes("#fn") ||
    anchorId.startsWith("fnref") ||
    className.includes("footnote") ||
    className.includes("noteref");
}

export function findFootnoteTarget(ownerDoc: Document, targetId: string): HTMLElement | null {
  let targetEl = ownerDoc.getElementById(targetId) ||
    ownerDoc.getElementsByName(targetId)[0] ||
    ownerDoc.querySelector(`[id="${targetId}"]`);

  if (!targetEl && targetId) {
    const numMatch = targetId.match(/\d+/);
    if (numMatch) {
      const num = numMatch[0];
      const patterns = [
        `footnote${num}`, `footnote-${num}`, `footnote_${num}`,
        `fn${num}`, `fn-${num}`, `fn_${num}`,
        `note${num}`, `note-${num}`, `note_${num}`,
        `f${num}`, `n${num}`, `ref${num}`,
        `id${num}`, `${num}`
      ];

      for (const p of patterns) {
        const found = ownerDoc.getElementById(p) ||
          ownerDoc.querySelector(`[id="${p}"]`) ||
          ownerDoc.querySelector(`[name="${p}"]`);
        if (found) {
          targetEl = found as HTMLElement;
          break;
        }
      }

      if (!targetEl) {
        const found = ownerDoc.querySelector(`[id*="footnote"][id*="${num}"]`) ||
          ownerDoc.querySelector(`[id*="note"][id*="${num}"]`) ||
          ownerDoc.querySelector(`[id*="fn"][id*="${num}"]`);
        if (found) targetEl = found as HTMLElement;
      }

      if (!targetEl) {
        const found = ownerDoc.querySelector(`[aid*="${num}"]`);
        if (found) targetEl = found as HTMLElement;
      }
    }
  }

  return targetEl as HTMLElement | null;
}

export function computeFootnoteRect(
  anchor: HTMLAnchorElement,
  iframeRef: React.RefObject<HTMLIFrameElement | null>,
  containerRef: React.RefObject<HTMLElement | null>
): { top: number; left: number; width: number; height: number } | null {
  const rect = anchor.getBoundingClientRect();
  const iframeRect = iframeRef.current?.getBoundingClientRect();
  const containerRect = containerRef.current?.getBoundingClientRect();

  if (!iframeRect || !containerRect) return null;

  return {
    top: iframeRect.top + rect.top - containerRect.top,
    left: iframeRect.left + rect.left - containerRect.left,
    width: rect.width,
    height: rect.height,
  };
}

export function createLinkClickHandler(ctx: LinkClickContext): (event: MouseEvent) => void {
  return (event: MouseEvent) => {
    if (event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

    const eventTargetEl = getEventTargetElement(event.target);
    const anchor = (eventTargetEl?.closest?.("a") as HTMLAnchorElement | null) ?? null;
    if (!anchor) return;

    const hrefAttr = anchor.getAttribute("href") ?? "";
    const lowerHref = hrefAttr.toLowerCase();
    const anchorId = anchor.id ?? "";
    const anchorHash = anchor.hash ?? "";

    const isFootnote = isFootnoteLink(hrefAttr, anchorId, anchor.className);
    const rawHash = parseFootnoteId(hrefAttr, anchorId, anchorHash);

    if (isFootnote && rawHash) {
      event.preventDefault();
      const ownerDoc = anchor.ownerDocument;
      const targetId = decodeURIComponent(rawHash);
      const targetEl = findFootnoteTarget(ownerDoc, targetId);

      if (targetEl && targetEl instanceof HTMLElement) {
        const positionRect = computeFootnoteRect(anchor, ctx.iframeRef, ctx.containerRef);
        if (positionRect) {
          ctx.onFootnote({
            content: cleanFootnoteContent(targetEl.innerHTML),
            rect: positionRect,
          });
          return;
        }
      }
    }

    if (lowerHref.startsWith("kindle:pos:")) {
      const linkText = anchor.textContent ?? "";
      const parts = lowerHref.split(":");
      const fidIndex = parts.indexOf("fid");
      const ownerDoc = anchor.ownerDocument;

      if (fidIndex !== -1) {
        const fidStr = parts[fidIndex + 1];
        const fidNum = parseInt(fidStr, 32);
        const targetEl = ownerDoc.querySelector(`[data-fid="${fidNum}"]`);
        if (targetEl && targetEl instanceof HTMLElement) {
          event.preventDefault();
          ctx.navigation.jumpToElement(targetEl);
          return;
        }
      }

      const headingMatch = ctx.toc.findHeadingByLinkText(linkText, anchor);
      if (headingMatch) {
        event.preventDefault();
        ctx.navigation.jumpToElement(headingMatch);
        return;
      }
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
    if (!anchorTargetEl) return;
    ctx.navigation.jumpToElement(anchorTargetEl as HTMLElement);
  };
}
