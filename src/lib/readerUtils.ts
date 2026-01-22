/**
 * Pure utility functions for the reader component.
 * These have no React dependencies and can be tested in isolation.
 */

// ============================================================================
// Types
// ============================================================================

export interface CharacterMapping {
    node: Text;
    offset: number;
}

export interface PageContentResult {
    text: string;
    blocks: Array<{ text: string; blockIndex: number; pageNumber: number }>;
    charMap: CharacterMapping[];
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
    console.log(`[getPageContent] Page: ${pageNumber}, Metrics:`, { pageWidth, stride, scrollLeft, rootRect: { left: rootRect.left, right: rootRect.right, width: rootRect.width } });
    const blocks = Array.from(doc.querySelectorAll("[data-block-index]")) as HTMLElement[];
    console.log(`[getPageContent] Found ${blocks.length} blocks in document`);
    const result: PageContentResult = { text: "", blocks: [], charMap: [] };
    const textParts: string[] = [];
    
    // Global character map: maps each character position in result.text to its DOM location
    const globalCharMap: CharacterMapping[] = [];
    let globalCharOffset = 0;

    // Calculate the absolute x-coordinate range for the target page
    const pageStartX = (pageNumber - 1) * stride;
    const pageEndX = pageStartX + pageWidth;

    blocks.forEach((block, blockArrayIndex) => {
        const indexAttr = block.getAttribute("data-block-index");
        if (!indexAttr) return;
        const blockIndex = parseInt(indexAttr, 10);

        // Quick check: does this block have any rects that could be on the target page?
        const blockRects = Array.from(block.getClientRects());
        const blockMightBeOnPage = blockRects.some(rect => {
            const absLeft = rect.left - rootRect.left + scrollLeft;
            const absRight = rect.right - rootRect.left + scrollLeft;
            return absRight > pageStartX && absLeft < pageEndX;
        });

        if (!blockMightBeOnPage) return;

        // Collect visible characters with their DOM positions
        const visibleChars: Array<{ char: string; node: Text; offset: number }> = [];
        const walker = doc.createTreeWalker(block, NodeFilter.SHOW_TEXT, null);
        let node: Node | null;

        while ((node = walker.nextNode())) {
            const textNode = node as Text;
            const textContent = textNode.textContent || "";
            if (!textContent.trim()) continue;

            for (let i = 0; i < textContent.length; i++) {
                const range = doc.createRange();
                range.setStart(node, i);
                range.setEnd(node, Math.min(i + 1, textContent.length));
                const rect = range.getBoundingClientRect();

                const absCharLeft = rect.left - rootRect.left + scrollLeft;
                const absCharRight = rect.right - rootRect.left + scrollLeft;
                const isOnPage = absCharRight > pageStartX && absCharLeft < pageEndX;

                if (isOnPage) {
                    visibleChars.push({ char: textContent[i], node: textNode, offset: i });
                } else if (visibleChars.length > 0 && absCharLeft >= pageEndX) {
                    break;
                }
            }
        }

        if (visibleChars.length === 0) return;

        // Build block text with whitespace normalization, tracking char mappings
        let blockText = "";
        let lastWasSpace = true; // Start true to trim leading whitespace
        
        for (const { char, node, offset } of visibleChars) {
            const isSpace = /\s/.test(char);
            
            if (isSpace) {
                if (!lastWasSpace) {
                    // Add single space, map to first whitespace char
                    blockText += " ";
                    globalCharMap.push({ node, offset });
                    lastWasSpace = true;
                }
                // Skip additional whitespace
            } else {
                blockText += char;
                globalCharMap.push({ node, offset });
                lastWasSpace = false;
            }
        }
        
        // Trim trailing space
        if (blockText.endsWith(" ")) {
            blockText = blockText.slice(0, -1);
            globalCharMap.pop();
        }

        if (blockText) {
            result.blocks.push({ text: blockText, blockIndex, pageNumber });
            textParts.push(blockText);
            globalCharOffset += blockText.length;
            
            // Add block separator "\n\n" (will be added between blocks in final text)
            // We don't map these to DOM nodes since they're synthetic
        }
    });

    // Now build final text with block separators and adjust charMap
    // The globalCharMap was built per-block, we need to account for "\n\n" separators
    result.charMap = [];
    let finalCharOffset = 0;
    let blockCharOffset = 0;
    
    for (let i = 0; i < textParts.length; i++) {
        const blockLen = textParts[i].length;
        
        // Copy mappings for this block
        for (let j = 0; j < blockLen; j++) {
            result.charMap.push(globalCharMap[blockCharOffset + j]);
        }
        blockCharOffset += blockLen;
        finalCharOffset += blockLen;
        
        // Add separator (not mapped to DOM)
        if (i < textParts.length - 1) {
            // "\n\n" - these won't have DOM mappings, push null placeholders
            result.charMap.push({ node: null as any, offset: -1 }); // \n
            result.charMap.push({ node: null as any, offset: -1 }); // \n
            finalCharOffset += 2;
        }
    }

    result.text = textParts.join("\n\n");
    console.log(`[getPageContent] Result: ${result.blocks.length} blocks, ${result.text.length} chars, ${result.charMap.length} mapped chars`);
    return result;
}

// ============================================================================
// Highlight Utilities
// ============================================================================

/**
 * Clear all existing highlight spans from the document.
 */
export function clearExistingHighlights(doc: Document): void {
    const spans = Array.from(doc.querySelectorAll("span.readerHighlight, span.readerContextSnippet"));
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
export function applyHighlightToRange(
    range: Range, 
    highlightId: number | string, 
    className = "readerHighlight",
    explicitStartOffset?: number,
    explicitEndOffset?: number,
    explicitStartNode?: Node,
    explicitEndNode?: Node,
    searchRootOverride?: Node
): void {
    const doc = range.startContainer.ownerDocument;
    if (!doc) return;

    const startNode = explicitStartNode ?? range.startContainer;
    const startOffset = explicitStartOffset ?? range.startOffset;
    const endNode = explicitEndNode ?? range.endContainer;
    const endOffset = explicitEndOffset ?? range.endOffset;

    const common = range.commonAncestorContainer;
    const searchRoot = searchRootOverride ?? (common.nodeType === Node.TEXT_NODE ? common.parentNode! : common);

    const walker = doc.createTreeWalker(
        searchRoot,
        NodeFilter.SHOW_TEXT,
        null
    );

    const targetNodes: Array<{ node: Text; start: number; end: number }> = [];
    let currentNode = walker.nextNode() as Text | null;
    let inRange = false;

    // Single text node case
    if (startNode === endNode && startNode.nodeType === Node.TEXT_NODE) {
        targetNodes.push({
            node: startNode as Text,
            start: startOffset,
            end: endOffset
        });
    } else {
        while (currentNode) {
            if (currentNode === startNode) {
                inRange = true;
            }
            
            if (inRange) {
                const text = currentNode.nodeValue || "";
                if (text.length > 0) {
                    const nodeStart = (currentNode === startNode) ? startOffset : 0;
                    const nodeEnd = (currentNode === endNode) ? endOffset : text.length;
                    
                    if (nodeStart < nodeEnd) {
                        targetNodes.push({
                            node: currentNode,
                            start: nodeStart,
                            end: nodeEnd
                        });
                    }
                }
            }

            if (currentNode === endNode) {
                inRange = false;
            }
            currentNode = walker.nextNode() as Text | null;
        }
    }

    for (const { node, start, end } of targetNodes) {
        const text = node.nodeValue ?? "";
        const before = text.slice(0, start);
        const middle = text.slice(start, end);
        const after = text.slice(end);
        
        const fragment = doc.createDocumentFragment();
        if (before) fragment.appendChild(doc.createTextNode(before));
        
        const span = doc.createElement("span");
        span.className = className;
        span.dataset.highlightId = String(highlightId);
        span.textContent = middle;
        fragment.appendChild(span);
        
        if (after) fragment.appendChild(doc.createTextNode(after));

        if (node.parentNode) {
            node.parentNode.replaceChild(fragment, node);
        }
    }
}
