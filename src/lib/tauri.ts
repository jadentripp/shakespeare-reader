import { invoke as tauriInvoke } from "@tauri-apps/api/core";

const isTauri = typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__ !== undefined;

async function invoke<T>(cmd: string, args?: any): Promise<T> {
  if (isTauri) {
    return await tauriInvoke(cmd, args);
  }
  console.warn(`Tauri invoke "${cmd}" suppressed - not in Tauri environment.`);
  return null as any;
}

export type Book = {
  id: number;
  gutenberg_id: number;
  title: string;
  authors: string;
  publication_year: number | null;
  cover_url: string | null;
  mobi_path: string | null;
  html_path: string | null;
  first_image_index: number | null;
  created_at: string;
};

export type BookPosition = {
  cfi: string;
  updated_at: string;
};

export type GutendexAuthor = {
  name: string;
  birth_year: number | null;
  death_year: number | null;
};

export type GutendexBook = {
  id: number;
  title: string;
  authors: GutendexAuthor[];
  copyright: boolean | null;
  formats: Record<string, string>;
  download_count?: number;
};

export type GutendexResponse = {
  count: number;
  next: string | null;
  previous: string | null;
  results: GutendexBook[];
};

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type Highlight = {
  id: number;
  book_id: number;
  start_path: string;
  start_offset: number;
  end_path: string;
  end_offset: number;
  text: string;
  note: string | null;
  created_at: string;
  updated_at: string;
};

export type HighlightMessage = {
  id: number;
  highlight_id: number;
  role: "system" | "user" | "assistant";
  content: string;
  created_at: string;
};

export type BookMessage = {
  id: number;
  book_id: number;
  thread_id: number | null;
  role: "system" | "user" | "assistant";
  content: string;
  reasoning_summary: string | null;
  context_map: string | null;
  created_at: string;
};

export type BookChatThread = {
  id: number;
  book_id: number;
  title: string;
  last_cfi: string | null;
  created_at: string;
  updated_at: string;
};

export type OpenAiKeyStatus = {
  has_env_key: boolean;
  has_saved_key: boolean;
};

export async function dbInit(): Promise<void> {
  await invoke("db_init");
}

const WEB_BOOKS_KEY = 'reader-web-books';

function getWebBooks(): Book[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(WEB_BOOKS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveWebBooks(books: Book[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(WEB_BOOKS_KEY, JSON.stringify(books));
}

export async function listBooks(): Promise<Book[]> {
  if (!isTauri) {
    return getWebBooks();
  }
  return (await invoke<Book[]>("list_books")) ?? [];
}

export async function getBook(bookId: number): Promise<Book> {
  if (!isTauri) {
    const books = getWebBooks();
    const b = books.find(x => x.id === bookId);
    if (!b) throw new Error("Book not found in web library");
    return b;
  }
  return await invoke("get_book", { bookId });
}

export async function hardDeleteBook(bookId: number): Promise<void> {
  if (!isTauri) {
    const books = getWebBooks();
    saveWebBooks(books.filter(x => x.id !== bookId));
    return;
  }
  await invoke("hard_delete_book", { bookId });
}

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
  console.log("Using web-fetch fallback for Gutendex");
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
    const base = bases[params.catalogKey] || bases["collection-all"];
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
    // First try direct fetch
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

export async function getBookPosition(bookId: number): Promise<BookPosition | null> {
  return await invoke("get_book_position", { bookId });
}

export async function setBookPosition(params: { bookId: number; cfi: string }): Promise<void> {
  await invoke("set_book_position", { bookId: params.bookId, cfi: params.cfi });
}

export async function setSetting(params: { key: string; value: string }): Promise<void> {
  await invoke("set_setting", { key: params.key, value: params.value });
}

export async function getSetting(key: string): Promise<string | null> {
  return await invoke("get_setting", { key });
}

export async function listHighlights(bookId: number): Promise<Highlight[]> {
  return (await invoke<Highlight[]>("list_highlights", { bookId })) ?? [];
}

export async function createHighlight(params: {
  bookId: number;
  startPath: string;
  startOffset: number;
  endPath: string;
  endOffset: number;
  text: string;
  note?: string | null;
}): Promise<Highlight> {
  return await invoke("create_highlight", {
    bookId: params.bookId,
    startPath: params.startPath,
    startOffset: params.startOffset,
    endPath: params.endPath,
    endOffset: params.endOffset,
    text: params.text,
    note: params.note ?? null,
  });
}

export async function updateHighlightNote(params: {
  highlightId: number;
  note?: string | null;
}): Promise<Highlight> {
  return await invoke("update_highlight_note", {
    highlightId: params.highlightId,
    note: params.note ?? null,
  });
}

export async function deleteHighlight(highlightId: number): Promise<void> {
  await invoke("delete_highlight", { highlightId });
}

export async function listHighlightMessages(highlightId: number): Promise<HighlightMessage[]> {
  return (await invoke<HighlightMessage[]>("list_highlight_messages", { highlightId })) ?? [];
}

export async function addHighlightMessage(params: {
  highlightId: number;
  role: "system" | "user" | "assistant";
  content: string;
}): Promise<HighlightMessage> {
  return await invoke("add_highlight_message", {
    highlightId: params.highlightId,
    role: params.role,
    content: params.content,
  });
}

export async function listBookMessages(bookId: number, threadId: number | null = null): Promise<BookMessage[]> {
  return (await invoke<BookMessage[]>("list_book_messages", { bookId, threadId })) ?? [];
}

export async function addBookMessage(params: {
  bookId: number;
  threadId?: number | null;
  role: "system" | "user" | "assistant";
  content: string;
  reasoningSummary?: string | null;
  contextMap?: string | null;
}): Promise<BookMessage> {
  return await invoke("add_book_message", {
    bookId: params.bookId,
    threadId: params.threadId ?? null,
    role: params.role,
    content: params.content,
    reasoningSummary: params.reasoningSummary ?? null,
    contextMap: params.contextMap ?? null,
  });
}

export async function setThreadLastCfi(params: {
  threadId: number;
  cfi: string;
}): Promise<void> {
  await invoke("set_thread_last_cfi", {
    threadId: params.threadId,
    cfi: params.cfi,
  });
}

export async function listBookChatThreads(bookId: number): Promise<BookChatThread[]> {
  return (await invoke<BookChatThread[]>("list_book_chat_threads", { bookId })) ?? [];
}

export async function createBookChatThread(params: {
  bookId: number;
  title: string;
}): Promise<BookChatThread> {
  return await invoke("create_book_chat_thread", {
    bookId: params.bookId,
    title: params.title,
  });
}

export async function getThreadMaxCitationIndex(bookId: number, threadId: number | null): Promise<number> {
  return await invoke("get_thread_max_citation_index", { bookId, threadId });
}

export async function deleteBookChatThread(threadId: number): Promise<void> {
  await invoke("delete_book_chat_thread", { threadId });
}

export async function renameBookChatThread(params: {
  threadId: number;
  title: string;
}): Promise<void> {
  await invoke("rename_book_chat_thread", {
    threadId: params.threadId,
    title: params.title,
  });
}

export async function deleteBookMessage(messageId: number): Promise<void> {
  await invoke("delete_book_message", { messageId });
}

export async function clearDefaultBookMessages(bookId: number): Promise<void> {
  await invoke("clear_default_book_messages", { bookId });
}

export async function deleteBookThreadMessages(threadId: number): Promise<void> {
  await invoke("delete_book_thread_messages", { threadId });
}

export async function deleteBookMessages(bookId: number): Promise<void> {
  await invoke("delete_book_messages", { bookId });
}

export async function openAiKeyStatus(): Promise<OpenAiKeyStatus> {
  return await invoke("openai_key_status");
}

export type ChatResult = {
  content: string;
  reasoning_summary: string | null;
};

export async function openAiChat(messages: ChatMessage[], model?: string): Promise<ChatResult> {
  return await invoke("openai_chat", { messages, model: model ?? null });
}

export async function openAiListModels(): Promise<string[]> {
  return (await invoke<string[]>("openai_list_models")) ?? [];
}

export async function getBookImageData(bookId: number, relativeIndex: number): Promise<string> {
  if (isTauri) {
    return await invoke("get_book_image_data", { bookId, relativeIndex });
  }

  // For web fallback, we might not be able to easily map relativeIndex to a URL 
  // without parsing the original MOBI (which is what the backend does).
  // However, Gutenberg HTML usually uses standard filenames.
  // If we are here, it means processGutenbergContent found a kindle: link.
  // Since we don't have the MOBI extraction logic in web, we might just have to 
  // return a placeholder or try to guess if the HTML was from Gutenberg.
  return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==";
}
