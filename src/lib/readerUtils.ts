/**
 * Pure utility functions for the reader component.
 * These have no React dependencies and can be tested in isolation.
 */

// ============================================================================
// Types
// ============================================================================

export interface PageContentResult {
    text: string;
    blocks: Array<{ text: string; blockIndex: number; pageNumber: number }>;
}

export interface PageMetrics {
    pageWidth: number;
    gap: number;
    stride: number;
    scrollLeft: number;
    rootRect: DOMRect;
}

// ============================================================================
// Text Normalization
// ============================================================================

/**
 * Normalize text for link matching - removes special chars, lowercases.
 */
export function normalizeLinkText(text: string): string {
    return text
        .toLowerCase()
        .replace(/&nbsp;/g, " ")
        .replace(/[^a-z0-9]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

/**
 * Ultra-fuzzy normalization: Keep only alphanumeric characters.
 */
export function ultraNormalize(s: string): string {
    return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

// ============================================================================
// DOM Path Utilities
// ============================================================================

/**
 * Get the path from root to a node as an array of child indices.
 */
export function getNodePath(root: Node, node: Node): number[] | null {
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
}

/**
 * Resolve a node path back to a node.
 */
export function resolveNodePath(root: Node, path: number[]): Node | null {
    let current: Node | null = root;
    for (const index of path) {
        if (!current || !current.childNodes[index]) return null;
        current = current.childNodes[index];
    }
    return current;
}

// ============================================================================
// Text Range Finding
// ============================================================================

/**
 * Find a text range in the DOM that matches the target text.
 * Uses fuzzy matching to handle whitespace and punctuation differences.
 */
export function findTextRange(
    root: HTMLElement,
    targetText: string,
    blockIndex?: number
): Range | null {
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

// ============================================================================
// Content Cleaning
// ============================================================================

/**
 * Clean footnote content by removing return links and citation prefixes.
 */
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

// ============================================================================
// Page Content Extraction
// ============================================================================

/**
 * Extracts the text content for a specific page number.
 * Handles paragraphs that span page boundaries by splitting at the exact character.
 * Works for ANY page, not just the currently visible one.
 * 
 * @param doc - The iframe's document
 * @param pageNumber - The target page (1-indexed)
 * @param metrics - Page layout metrics (pageWidth, gap, stride, scrollLeft, rootRect)
 * @returns The text content and block information for the specified page
 */
export function getPageContent(
    doc: Document,
    pageNumber: number,
    metrics: PageMetrics
): PageContentResult {
    const { pageWidth, stride, scrollLeft, rootRect } = metrics;
    const blocks = Array.from(doc.querySelectorAll("[data-block-index]")) as HTMLElement[];
    const result: PageContentResult = { text: "", blocks: [] };
    const textParts: string[] = [];

    // Calculate the absolute x-coordinate range for the target page
    // Page 1: 0 to stride, Page 2: stride to 2*stride, etc.
    // (stride = pageWidth + gap)
    const pageStartX = (pageNumber - 1) * stride;
    const pageEndX = pageStartX + pageWidth; // Don't include the gap

    blocks.forEach((block) => {
        const indexAttr = block.getAttribute("data-block-index");
        if (!indexAttr) return;
        const blockIndex = parseInt(indexAttr, 10);

        // Quick check: does this block have any rects that could be on the target page?
        const blockRects = Array.from(block.getClientRects());
        const blockMightBeOnPage = blockRects.some(rect => {
            // Convert viewport-relative coords to absolute document coords
            const absLeft = rect.left - rootRect.left + scrollLeft;
            const absRight = rect.right - rootRect.left + scrollLeft;
            return absRight > pageStartX && absLeft < pageEndX;
        });

        if (!blockMightBeOnPage) return;

        // Walk through text nodes and extract only characters on this page
        const visibleTextParts: string[] = [];
        const walker = doc.createTreeWalker(block, NodeFilter.SHOW_TEXT, null);
        let node: Node | null;

        while ((node = walker.nextNode())) {
            const textContent = node.textContent || "";
            if (!textContent.trim()) continue;

            // Check each character to find the portion on this page
            let visibleStart = -1;
            let visibleEnd = -1;

            for (let i = 0; i < textContent.length; i++) {
                const range = doc.createRange();
                range.setStart(node, i);
                range.setEnd(node, Math.min(i + 1, textContent.length));
                const rect = range.getBoundingClientRect();

                // Convert viewport-relative to absolute document coordinates
                const absCharLeft = rect.left - rootRect.left + scrollLeft;
                const absCharRight = rect.right - rootRect.left + scrollLeft;

                // Character is on this page if it falls within the page's x-range
                const isOnPage = absCharRight > pageStartX && absCharLeft < pageEndX;

                if (isOnPage) {
                    if (visibleStart === -1) visibleStart = i;
                    visibleEnd = i + 1;
                } else if (visibleStart !== -1 && absCharLeft >= pageEndX) {
                    // We've passed this page, stop
                    break;
                }
            }

            if (visibleStart !== -1 && visibleEnd !== -1) {
                visibleTextParts.push(textContent.slice(visibleStart, visibleEnd));
            }
        }

        const blockText = visibleTextParts.join(" ").replace(/\s+/g, " ").trim();
        if (blockText) {
            result.blocks.push({ text: blockText, blockIndex, pageNumber });
            textParts.push(blockText);
        }
    });

    result.text = textParts.join("\n\n");
    return result;
}

// ============================================================================
// Highlight Utilities
// ============================================================================

/**
 * Clear all existing highlight spans from the document.
 */
export function clearExistingHighlights(doc: Document): void {
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
}

/**
 * Apply a highlight to a range by wrapping text nodes in highlight spans.
 */
export function applyHighlightToRange(range: Range, highlightId: number): void {
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
}
