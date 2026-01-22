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
  summaries?: string[];
  subjects?: string[];
  bookshelves?: string[];
  languages?: string[];
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

export type ChatResult = {
  content: string;
  reasoning_summary: string | null;
};
