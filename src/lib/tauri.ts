import { invoke } from "@tauri-apps/api/core";

export type Book = {
  id: number;
  gutenberg_id: number;
  title: string;
  authors: string;
  publication_year: number | null;
  cover_url: string | null;
  mobi_path: string | null;
  html_path: string | null;
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

export type OpenAiKeyStatus = {
  has_env_key: boolean;
  has_saved_key: boolean;
};

export async function dbInit(): Promise<void> {
  await invoke("db_init");
}

export async function listBooks(): Promise<Book[]> {
  return await invoke("list_books");
}

export async function getBook(bookId: number): Promise<Book> {
  return await invoke("get_book", { bookId });
}

export async function hardDeleteBook(bookId: number): Promise<void> {
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
  return await invoke("gutendex_catalog_page", {
    catalogKey: params.catalogKey,
    pageUrl: params.pageUrl ?? null,
    searchQuery: params.searchQuery ?? null,
    topic: params.topic ?? null,
  });
}

export async function downloadGutenbergMobi(params: {
  gutenbergId: number;
  title: string;
  authors: string;
  publicationYear: number | null;
  coverUrl: string | null;
  mobiUrl: string;
}): Promise<number> {
  return await invoke("download_gutenberg_mobi", {
    gutenbergId: params.gutenbergId,
    title: params.title,
    authors: params.authors,
    publicationYear: params.publicationYear,
    coverUrl: params.coverUrl,
    mobiUrl: params.mobiUrl,
  });
}

export async function getBookHtml(bookId: number): Promise<string> {
  return await invoke("get_book_html", { bookId });
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
  return await invoke("list_highlights", { bookId });
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
  return await invoke("list_highlight_messages", { highlightId });
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

export async function openAiKeyStatus(): Promise<OpenAiKeyStatus> {
  return await invoke("openai_key_status");
}

export async function openAiChat(messages: ChatMessage[]): Promise<string> {
  return await invoke("openai_chat", { messages });
}

export async function openAiListModels(): Promise<string[]> {
  return await invoke("openai_list_models");
}
