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

export async function listBookMessages(bookId: number, threadId: number | null = null): Promise<BookMessage[]> {
  return await invoke("list_book_messages", { bookId, threadId });
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
  return await invoke("list_book_chat_threads", { bookId });
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
  return await invoke("openai_list_models");
}

export async function getBookImageData(bookId: number, relativeIndex: number): Promise<string> {
  return await invoke("get_book_image_data", { bookId, relativeIndex });
}
