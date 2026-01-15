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

export async function openAiChat(messages: ChatMessage[]): Promise<string> {
  return await invoke("openai_chat", { messages });
}
