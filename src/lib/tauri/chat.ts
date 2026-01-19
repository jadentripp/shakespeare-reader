import { invoke } from "./core";
import { BookMessage, BookChatThread, ChatMessage, ChatResult, OpenAiKeyStatus } from "./types";

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
  try {
    return await invoke("openai_key_status");
  } catch (e) {
    console.warn("openai_key_status command failed or missing:", e);
    // Fallback to manual check of settings
    const savedKey = await invoke<string | null>("get_setting", { key: "openai_api_key" }).catch(() => null);
    return {
      has_env_key: false,
      has_saved_key: !!savedKey && savedKey.trim().length > 0,
    };
  }
}

export async function openAiChat(messages: ChatMessage[], model?: string): Promise<ChatResult> {
  return await invoke("openai_chat", { messages, model: model ?? null });
}

export async function openAiListModels(): Promise<string[]> {
  return (await invoke<string[]>("openai_list_models")) ?? [];
}
