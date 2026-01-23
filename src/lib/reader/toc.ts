import { normalizeLinkText } from "./dom";
import { getElementRect } from "./dom";
import { getOffsetLeftForRect } from "./navigation";

export interface TocEntry {
  id: string;
  level: number;
  text: string;
  element: HTMLElement;
}

export interface HeadingIndexEntry {
  norm: string;
  el: HTMLElement;
}

export const buildHeadingIndex = (doc: Document): HeadingIndexEntry[] => {
  const nodes = Array.from(doc.querySelectorAll("h1, h2, h3, h4, h5, h6")) as HTMLElement[];
  return nodes
    .map((el) => ({ el, norm: normalizeLinkText(el.textContent ?? "") }))
    .filter((entry) => entry.norm.length > 0);
};

export const buildTocFromAnchors = (doc: Document): TocEntry[] => {
  const anchors = Array.from(doc.querySelectorAll('a[href^="#"]')) as HTMLAnchorElement[];
  const tocFromAnchors: TocEntry[] = [];
  const seenHrefs = new Set<string>();

  for (const anchor of anchors) {
    const href = anchor.getAttribute("href") ?? "";
    const text = (anchor.textContent ?? "").trim().replace(/\s+/g, " ");
    if (!href || href === "#" || !text || seenHrefs.has(href)) continue;

    const targetId = href.slice(1);
    const target = doc.getElementById(targetId) || doc.querySelector(`[name="${targetId}"]`);
    if (!target || !(target instanceof HTMLElement)) continue;

    let level = 3;
    const upper = text.toUpperCase();

    // Level 1: Major works or sections
    if (upper.match(/^BOOK\s+/)) level = 1;
    else if (upper.match(/^(THE\s+)?SONNETS$/)) level = 1;
    else if (upper.match(/^(THE\s+)?(TRAGEDY|PLAY|COMEDY|HISTORY|POEM|LIFE)\s+OF\b/)) level = 1;
    else if (upper.match(/^(ALL’S|AS\s+YOU|MUCH\s+ADO|A\s+MIDSUMMER|TWELFTH\s+NIGHT|THE\s+TAMING|THE\s+TEMPEST|THE\s+WINTER’S|THE\s+TWO\s+NOBLE)\b/)) level = 1;

    // Level 2: Chapters or large subdivisions
    else if (upper.match(/^(CHAPTER|PART|ACT)\s+/)) level = 2;

    // Level 3: Scenes or sections
    else if (upper.match(/^(SCENE|SECTION)\s+/)) level = 3;

    seenHrefs.add(href);
    tocFromAnchors.push({
      id: `toc-${tocFromAnchors.length}`,
      level,
      text,
      element: target,
    });
  }

  return tocFromAnchors;
};

export const buildTocFromHeadings = (doc: Document): TocEntry[] => {
  const headings = Array.from(doc.querySelectorAll("h1, h2, h3, h4, h5, h6")) as HTMLElement[];
  return headings
    .filter((el) => {
      const text = el.textContent?.trim().toLowerCase();
      if (!text) return false;
      if (text === "original" || text === "original transcription") return false;
      return true;
    })
    .map((el, idx) => ({
      id: `toc-${idx}`,
      level: parseInt(el.tagName.charAt(1), 10),
      text: el.textContent?.trim() ?? "",
      element: el,
    }));
};

export const chooseBestHeadingCandidate = (
  candidates: HeadingIndexEntry[],
  root: HTMLElement,
  referenceEl?: HTMLElement | null
): HTMLElement | null => {
  if (!candidates.length) return null;

  const refRect = referenceEl ? getElementRect(referenceEl) : null;
  const refOffset = refRect ? getOffsetLeftForRect(refRect, root) : null;

  const scored = candidates
    .map((entry) => {
      const rect = getElementRect(entry.el);
      const offsetLeft = rect ? getOffsetLeftForRect(rect, root) : null;
      return { el: entry.el, offsetLeft };
    })
    .filter((entry): entry is { el: HTMLElement; offsetLeft: number } => entry.offsetLeft !== null);

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

export const findHeadingByText = (
  text: string,
  headingIndex: HeadingIndexEntry[],
  doc: Document,
  root: HTMLElement,
  referenceEl?: HTMLElement | null
): HTMLElement | null => {
  const target = normalizeLinkText(text);
  if (!target) return null;

  const exact = headingIndex.filter((entry) => entry.norm === target);
  const fuzzy = headingIndex.filter(
    (entry) => entry.norm.includes(target) || target.includes(entry.norm)
  );
  let candidates = exact.length ? exact : fuzzy;

  if (candidates.length === 0) {
    const allNodes = Array.from(doc.querySelectorAll("p, div, td, li, b, i, span")) as HTMLElement[];
    const matches = allNodes.filter(el => {
      const norm = normalizeLinkText(el.textContent ?? "");
      return norm === target || norm.includes(target);
    });
    if (matches.length > 0) {
      candidates = matches.map(el => ({ el, norm: normalizeLinkText(el.textContent ?? "") }));
    }
  }

  return chooseBestHeadingCandidate(candidates, root, referenceEl);
};
