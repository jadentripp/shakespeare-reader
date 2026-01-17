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
