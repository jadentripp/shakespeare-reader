export const isElement = (node: any): node is Element => {
  return !!node && typeof node === "object" && node.nodeType === 1;
};

export const isTextNode = (node: any): node is Text => {
  return !!node && typeof node === "object" && node.nodeType === 3;
};

export const getEventTargetElement = (target: EventTarget | null): HTMLElement | null => {
  if (!target) return null;
  if (isElement(target)) return target as HTMLElement;
  if (isTextNode(target)) {
    return (target as Text).parentElement;
  }
  return null;
};

export const getElementRect = (element: HTMLElement): DOMRect | null => {
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

export const findHighlightFromEvent = (event: Event): HTMLElement | null => {
  const target = getEventTargetElement(event.target);
  return (target?.closest?.(".readerHighlight") as HTMLElement | null) ?? null;
};

export const normalizeLinkText = (text: string): string => {
  return text
    .toLowerCase()
    .replace(/&nbsp;/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};
