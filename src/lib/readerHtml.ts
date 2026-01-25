export interface Scene {
  label: string
  href: string
}

export interface Act {
  label: string
  href: string
  scenes: Scene[]
}

export function injectHead(html: string, css: string): string {
  const charsetTag = `<meta charset="UTF-8">`
  const styleTag = `<style>${css}</style>`
  const headInsert = `${charsetTag}\n${styleTag}`.trim()
  if (/<head[\s>]/i.test(html)) {
    return html.replace(/<head(\s[^>]*)?>/i, (match) => `${match}\n${headInsert}`)
  }
  return `<!doctype html><html><head>${headInsert}</head><body>${html}</body></html>`
}

export function normalizeHtmlFragment(html: string): string {
  return html
    .replace(/<\?xml[\s\S]*?\?>/gi, '')
    .replace(/<!doctype[\s\S]*?>/gi, '')
    .replace(/<\/?(html|head|body)[^>]*>/gi, '')
    .replace(/<(\s+class=["'])/gi, '<p$1') // Fix malformed < class=" tags
    .trim()
}

export function wrapBody(html: string): string {
  if (html.includes('id="reader-root"')) return html
  const normalized = normalizeHtmlFragment(html)
  return `<!doctype html><html><head></head><body><div id="reader-root">${normalized}</div></body></html>`
}

export interface GutenbergMetadata {
  title?: string
  author?: string
  translator?: string
  annotator?: string
}

export interface ProcessedGutenberg {
  html: string
  metadata: GutenbergMetadata
}

function parseKindleIndex(s: string): number {
  // Kindle indices in kindle:embed:XXXX are Base32 (0-9, A-V).
  // Some might be decimal if they only contain digits, but parseInt with base 32 handles both.
  return parseInt(s, 32)
}

export function processGutenbergContent(
  html: string,
  bookId?: number,
  baseUrl?: string,
): ProcessedGutenberg {
  const metadata: GutenbergMetadata = {}

  const titleMatch = html.match(/Title:\s*([^\n<]+)/i)
  const authorMatch = html.match(/Author:\s*([^\n<]+)/i)
  const translatorMatch = html.match(/Translator:\s*([^\n<]+)/i)
  const annotatorMatch = html.match(/Annotator:\s*([^\n<]+)/i)

  if (titleMatch) metadata.title = titleMatch[1].trim()
  if (authorMatch) metadata.author = authorMatch[1].trim()
  if (translatorMatch) metadata.translator = translatorMatch[1].trim()
  if (annotatorMatch) metadata.annotator = annotatorMatch[1].trim()

  // Inject block indices for citations
  if (typeof DOMParser !== 'undefined') {
    try {
      const parser = new DOMParser()
      const fid = 1
      const normalized = normalizeHtmlFragment(html)
      if (normalized) {
        const doc = parser.parseFromString(normalized, 'text/html')

        // Rewrite image sources
        const images = doc.querySelectorAll('img')
        images.forEach((img) => {
          const src = img.getAttribute('src') || ''
          if (src.startsWith('kindle:')) {
            let relativeIndex = 0
            if (src.startsWith('kindle:embed:')) {
              const indexPart = src.split(':')[2]?.split('?')[0]
              if (indexPart) {
                relativeIndex = parseKindleIndex(indexPart)
              }
            } else if (src.startsWith('kindle:flow:')) {
              const indexPart = src.split(':')[2]?.split('?')[0]
              if (indexPart) {
                relativeIndex = parseKindleIndex(indexPart)
              }
            }

            if (bookId !== undefined) {
              img.setAttribute('data-kindle-index', relativeIndex.toString())
              img.setAttribute('data-book-id', bookId.toString())
              img.setAttribute('data-src', src)
              img.removeAttribute('src')
              img.classList.add('mobi-inline-image')
            }
          } else if (baseUrl && src && !src.startsWith('http') && !src.startsWith('data:')) {
            // Rewrite relative paths for web fallback
            img.setAttribute('src', `${baseUrl.endsWith('/') ? baseUrl : baseUrl + '/'}${src}`)
          }
        })

        // Remove kindle:flow link tags which cause browser errors
        const links = doc.querySelectorAll('link[href^="kindle:flow"]')
        links.forEach((link) => link.remove())

        // Mark the first element
        const firstEl = doc.body.firstElementChild
        if (firstEl) {
          firstEl.setAttribute('data-fid', fid.toString())
        }

        // Index blocks
        const blocks = doc.querySelectorAll('p, h1, h2, h3, h4, h5, h6, blockquote, pre, table, li')
        blocks.forEach((block, index) => {
          ;(block as HTMLElement).setAttribute('data-block-index', index.toString())
        })

        html = doc.body.innerHTML
      }
    } catch (e) {
      console.error('Failed to inject block indices:', e)
    }
  }

  return { html, metadata }
}

export function parseSceneLinksHierarchical(html: string): Act[] {
  try {
    const normalized = normalizeHtmlFragment(html)
    const doc = new DOMParser().parseFromString(normalized, 'text/html')
    const out: Act[] = []
    let currentAct: Act | null = null

    const anchors = Array.from(doc.querySelectorAll('a[href^="#"]')) as HTMLAnchorElement[]
    for (const anchor of anchors) {
      const href = anchor.getAttribute('href') ?? ''
      const label = (anchor.textContent ?? '').trim().replace(/\s+/g, ' ')
      if (!href || href === '#' || !label) continue

      const upper = label.toUpperCase()
      const isAct = upper.includes('ACT')
      const isScene = upper.includes('SCENE')

      if (isAct) {
        currentAct = { label, href, scenes: [] }
        out.push(currentAct)
      } else if (isScene) {
        if (!currentAct) {
          currentAct = { label: 'Front Matter', href: '#', scenes: [] }
          out.push(currentAct)
        }
        currentAct.scenes.push({ label, href })
      }
    }
    return out
  } catch {
    return []
  }
}
