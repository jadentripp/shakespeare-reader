import { resolveNodePath } from "@/lib/readerUtils";

export const parseCfiToBlockIndex = (cfi: string): number | null => {
  const match = cfi.match(/\/4\/(\d+)/);
  if (match) {
    return parseInt(match[1], 10) / 2;
  }
  return null;
};

export const makeBlockCfi = (blockIndex: number): string => {
  return `epubcfi(/6/2!/4/${blockIndex * 2})`;
};

export const getOffsetLeftForRect = (
  rect: DOMRect,
  root: HTMLElement
): number | null => {
  const rootRect = root.getBoundingClientRect();
  return rect.left - rootRect.left + root.scrollLeft;
};

export const resolveElementFromCfi = (
  doc: Document,
  root: HTMLElement,
  cfi: string
): HTMLElement | null => {
  const blockIndex = parseCfiToBlockIndex(cfi);
  if (blockIndex !== null) {
    const element = doc.querySelector(`[data-block-index="${blockIndex}"]`) as HTMLElement | null;
    if (element) return element;
  }

  try {
    const path = JSON.parse(cfi);
    if (Array.isArray(path)) {
      const node = resolveNodePath(root, path);
      const element = node?.nodeType === Node.TEXT_NODE ? node.parentElement : (node as HTMLElement);
      if (element) return element;
    }
  } catch {
    // Not a JSON path
  }

  return null;
};

export const findFirstVisibleBlock = (
  root: HTMLElement,
  currentScroll: number
): HTMLElement | null => {
  const blocks = Array.from(root.querySelectorAll("[data-block-index]")) as HTMLElement[];
  return blocks.find(block => {
    const rect = block.getBoundingClientRect();
    const rootRect = root.getBoundingClientRect();
    const offsetLeft = rect.left - rootRect.left + currentScroll;
    return offsetLeft >= currentScroll - 10;
  }) ?? null;
};
