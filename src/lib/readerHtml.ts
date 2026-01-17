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

export function processGutenbergContent(html: string): ProcessedGutenberg {
  const metadata: GutenbergMetadata = {};
  
  const titleMatch = html.match(/Title:\s*([^\n<]+)/i);
  const authorMatch = html.match(/Author:\s*([^\n<]+)/i);
  const translatorMatch = html.match(/Translator:\s*([^\n<]+)/i);
  const annotatorMatch = html.match(/Annotator:\s*([^\n<]+)/i);
  
  if (titleMatch) metadata.title = titleMatch[1].trim();
  if (authorMatch) metadata.author = authorMatch[1].trim();
  if (translatorMatch) metadata.translator = translatorMatch[1].trim();
  if (annotatorMatch) metadata.annotator = annotatorMatch[1].trim();

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
