export interface Scene {
  label: string;
  href: string;
}

export interface Act {
  label: string;
  href: string;
  scenes: Scene[];
}

export function injectHead(html: string, css: string): string {
  const charsetTag = `<meta charset="UTF-8">`;
  const styleTag = `<style>${css}</style>`;
  const headInsert = `${charsetTag}\n${styleTag}`.trim();
  if (/<head[\s>]/i.test(html)) {
    return html.replace(/<head(\s[^>]*)?>/i, (match) => `${match}\n${headInsert}`);
  }
  return `<!doctype html><html><head>${headInsert}</head><body>${html}</body></html>`;
}

export function normalizeHtmlFragment(html: string): string {
  return html
    .replace(/<\?xml[\s\S]*?\?>/gi, "")
    .replace(/<!doctype[\s\S]*?>/gi, "")
    .replace(/<\/?(html|head|body)[^>]*>/gi, "")
    .trim();
}

export function wrapBody(html: string): string {
  if (html.includes('id="reader-root"')) return html;
  const normalized = normalizeHtmlFragment(html);
  return `<!doctype html><html><head></head><body><div id="reader-root">${normalized}</div></body></html>`;
}

export interface GutenbergMetadata {
  title?: string;
  author?: string;
  translator?: string;
  annotator?: string;
}

export interface ProcessedGutenberg {
  html: string;
  metadata: GutenbergMetadata;
}

function parseKindleIndex(s: string): number {
  // Kindle indices in kindle:embed:XXXX are Base32 (0-9, A-V).
  // Some might be decimal if they only contain digits, but parseInt with base 32 handles both.
  return parseInt(s, 32);
}

export function processGutenbergContent(html: string, bookId?: number): ProcessedGutenberg {
  const metadata: GutenbergMetadata = {};
  
  const titleMatch = html.match(/Title:\s*([^\n<]+)/i);
  const authorMatch = html.match(/Author:\s*([^\n<]+)/i);
  const translatorMatch = html.match(/Translator:\s*([^\n<]+)/i);
  const annotatorMatch = html.match(/Annotator:\s*([^\n<]+)/i);
  
  if (titleMatch) metadata.title = titleMatch[1].trim();
  if (authorMatch) metadata.author = authorMatch[1].trim();
  if (translatorMatch) metadata.translator = translatorMatch[1].trim();
  if (annotatorMatch) metadata.annotator = annotatorMatch[1].trim();

  // Inject block indices for citations
  if (typeof DOMParser !== "undefined") {
    try {
      const parser = new DOMParser();
      // Split into fragments by </html> to handle multi-part MOBI/EPUB html
      const fragments = html.split(/<\/html>/i);
      const processedFragments = fragments.map((fragment, fid) => {
        if (!fragment.trim()) return "";
        const normalized = normalizeHtmlFragment(fragment);
        if (!normalized) return "";
        
        const doc = parser.parseFromString(normalized, "text/html");
        
        // Rewrite image sources
        const images = doc.querySelectorAll("img");
        images.forEach(img => {
          const src = img.getAttribute("src") || "";
          // kindle:embed:0016?mime=image/jpeg
          if (src.startsWith("kindle:embed:")) {
            const indexPart = src.split(":")[2]?.split("?")[0];
            if (indexPart && bookId !== undefined) {
              const relativeIndex = parseKindleIndex(indexPart);
              // We'll use a data attribute and let the frontend resolve it or use a custom protocol.
              // For now, let's mark it for the MobiBookPage to resolve or use a placeholder.
              img.setAttribute("data-kindle-index", relativeIndex.toString());
              img.setAttribute("data-book-id", bookId.toString());
              img.src = ""; // Clear for now
              img.classList.add("mobi-inline-image");
            }
          }
        });

        // Mark the first element of this fragment with the fid
        const firstEl = doc.body.firstElementChild;
        if (firstEl) {
          firstEl.setAttribute("data-fid", fid.toString());
        }

        // We want to index meaningful content blocks
        const blocks = doc.querySelectorAll("p, h1, h2, h3, h4, h5, h6, blockquote, pre, table, li");
        blocks.forEach((block) => {
          // We'll need a way to keep block indices unique across fragments if needed, 
          // but for now let's just mark them.
          (block as HTMLElement).setAttribute("data-block-index", "pending");
        });
        
        return doc.body.innerHTML;
      });

      // Join and re-index blocks globally
      const fullHtml = processedFragments.join("\n");
      const doc = parser.parseFromString(fullHtml, "text/html");
      const allBlocks = doc.querySelectorAll("[data-block-index=\"pending\"]");
      allBlocks.forEach((block, index) => {
        (block as HTMLElement).setAttribute("data-block-index", index.toString());
      });

      html = doc.body.innerHTML;
    } catch (e) {
      console.error("Failed to inject block indices:", e);
    }
  }

  return { html, metadata };
}




export function parseSceneLinksHierarchical(html: string): Act[] {
  try {
    const normalized = normalizeHtmlFragment(html);
    const doc = new DOMParser().parseFromString(normalized, "text/html");
    const out: Act[] = [];
    let currentAct: Act | null = null;

    const anchors = Array.from(doc.querySelectorAll('a[href^="#"]')) as HTMLAnchorElement[];
    for (const anchor of anchors) {
      const href = anchor.getAttribute("href") ?? "";
      const label = (anchor.textContent ?? "").trim().replace(/\s+/g, " ");
      if (!href || href === "#" || !label) continue;

      const upper = label.toUpperCase();
      const isAct = upper.includes("ACT");
      const isScene = upper.includes("SCENE");

      if (isAct) {
        currentAct = { label, href, scenes: [] };
        out.push(currentAct);
      } else if (isScene) {
        if (!currentAct) {
          currentAct = { label: "Front Matter", href: "#", scenes: [] };
          out.push(currentAct);
        }
        currentAct.scenes.push({ label, href });
      }
    }
    return out;
  } catch {
    return [];
  }
}
