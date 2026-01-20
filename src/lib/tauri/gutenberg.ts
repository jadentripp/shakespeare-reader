import { invoke, isTauri } from "./core";
import { GutendexResponse, Book } from "./types";
import { getWebBooks, saveWebBooks } from "./webStorage";
import { invoke as tauriInvoke } from "@tauri-apps/api/core";

export async function gutendexShakespearePage(pageUrl?: string | null): Promise<GutendexResponse> {
  return await invoke("gutendex_shakespeare_page", {
    pageUrl: pageUrl ?? null,
  });
}

export async function gutendexCatalogPage(params: {
  catalogKey: string;
  pageUrl?: string | null;
  searchQuery?: string | null;
  topic?: string | null;
}): Promise<GutendexResponse> {
  if (isTauri) {
    return await tauriInvoke("gutendex_catalog_page", {
      catalogKey: params.catalogKey,
      pageUrl: params.pageUrl ?? null,
      searchQuery: params.searchQuery ?? null,
      topic: params.topic ?? null,
    });
  }

  // Browse-only fallback for standard browsers
  console.log("[Gutendex] Web fallback:", params.topic || params.catalogKey);
  let urlStr = params.pageUrl;

  if (!urlStr) {
    const bases: Record<string, string> = {
      "all": "https://gutendex.com/books/",
      "shakespeare": "https://gutendex.com/books/?search=Shakespeare%2C%20William",
      "greek-tragedy": "https://gutendex.com/books/?search=greek%20tragedy",
      "greek-epic": "https://gutendex.com/books/?search=homer",
      "roman-drama": "https://gutendex.com/books/?search=roman%20drama",
    };

    // Default to 'all' if key not found
    const base = bases[params.catalogKey] || bases["all"];
    const url = new URL(base);

    if (params.searchQuery) {
      const existing = url.searchParams.get("search") || "";
      url.searchParams.set("search", existing ? `${existing} ${params.searchQuery}` : params.searchQuery);
    }

    if (params.topic) {
      url.searchParams.append("topic", params.topic);
    }

    urlStr = url.toString();
  }

  try {
    const resp = await fetch(urlStr);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    return await resp.json();
  } catch (e) {
    console.error("Web fetch fallback failed:", e);
    return { count: 0, next: null, previous: null, results: [] };
  }
}

export async function downloadGutenbergMobi(params: {
  gutenbergId: number;
  title: string;
  authors: string;
  publicationYear: number | null;
  coverUrl: string | null;
  mobiUrl: string;
}): Promise<number> {
  if (isTauri) {
    return await tauriInvoke("download_gutenberg_mobi", {
      gutenbergId: params.gutenbergId,
      title: params.title,
      authors: params.authors,
      publicationYear: params.publicationYear,
      coverUrl: params.coverUrl,
      mobiUrl: params.mobiUrl,
    });
  }

  // Browse-only mock download
  console.log("Mocking download for web library");
  const books = getWebBooks();
  if (books.some(b => b.gutenberg_id === params.gutenbergId)) {
    return books.find(b => b.gutenberg_id === params.gutenbergId)!.id;
  }

  const newId = Math.floor(Math.random() * 1000000);
  const newBook: Book = {
    id: newId,
    gutenberg_id: params.gutenbergId,
    title: params.title,
    authors: params.authors,
    publication_year: params.publicationYear,
    cover_url: params.coverUrl,
    mobi_path: null,
    html_path: null, // Will fetch dynamically in getBookHtml for web
    first_image_index: null,
    created_at: new Date().toISOString()
  };

  saveWebBooks([...books, newBook]);
  return newId;
}

export async function getBookHtml(bookId: number): Promise<string> {
  if (isTauri) {
    return await invoke("get_book_html", { bookId });
  }

  // Web fallback: try to fetch HTML directly from Project Gutenberg
  const books = getWebBooks();
  const book = books.find(b => b.id === bookId);
  if (!book) throw new Error("Book not found in web library");

  const urls = [
    `https://www.gutenberg.org/cache/epub/${book.gutenberg_id}/pg${book.gutenberg_id}-images.html`,
    `https://www.gutenberg.org/cache/epub/${book.gutenberg_id}/pg${book.gutenberg_id}.html`,
    `https://www.gutenberg.org/files/${book.gutenberg_id}/${book.gutenberg_id}-h/${book.gutenberg_id}-h.htm`,
  ];

  // Multiple CORS proxy services to try
  const corsProxies = [
    (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
    (url: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
    (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  ];

  // Try each URL with each proxy
  for (const url of urls) {
    // First try direct fetch (SKIP for Gutenberg in browser to avoid red CORS errors)
    if (!url.includes('gutenberg.org')) {
      try {
        console.log(`Web fallback: attempting direct fetch from ${url}`);
        const resp = await fetch(url);
        if (resp.ok) {
          const html = await resp.text();
          if (html && html.length > 100) {
            console.log(`✓ Successfully fetched book HTML directly from ${url}`);
            return html;
          }
        }
      } catch (e) {
        console.log(`Direct fetch failed for ${url}, trying proxies...`);
      }
    } else {
        console.log(`Skipping direct fetch for ${url} (CORS restricted)`);
    }

    // Try each CORS proxy
    for (let i = 0; i < corsProxies.length; i++) {
      try {
        const proxyUrl = corsProxies[i](url);
        console.log(`Trying CORS proxy ${i + 1}/${corsProxies.length}: ${proxyUrl.substring(0, 80)}...`);

        const proxyResp = await fetch(proxyUrl, {
          headers: {
            'Accept': 'text/html,application/xhtml+xml',
          }
        });

        if (proxyResp.ok) {
          const html = await proxyResp.text();
          if (html && html.length > 100) {
            console.log(`✓ Successfully fetched book HTML via proxy ${i + 1}`);
            return html;
          }
        }
      } catch (proxyErr) {
        console.log(`CORS proxy ${i + 1} failed:`, proxyErr);
      }
    }
  }

  return `<h1>Reading Unavailable in Browser</h1><p>Sorry, we couldn't load the HTML version of this book directly (CORS blocks or missing files). Please use the desktop version of the app for full offline reading.</p>`;
}
