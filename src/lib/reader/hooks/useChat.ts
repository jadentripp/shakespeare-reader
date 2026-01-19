import { useState, useCallback, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addBookMessage,
  listBookMessages,
  listBookChatThreads,
  createBookChatThread,
  renameBookChatThread,
  deleteBookChatThread,
  deleteBookThreadMessages,
  deleteBookMessage,
  clearDefaultBookMessages,
  getThreadMaxCitationIndex,
} from "@/lib/tauri";
import { chat, generateThreadTitle } from "@/lib/openai";
import { getPageContent, type PageMetrics } from "@/lib/readerUtils";
import { buildChatSystemPrompt, processCitationsInResponse, parseContextMapFromMessage, type CitationMapping } from "../citations";

export interface UseChatOptions {
  bookId: number;
  getDoc: () => Document | null;
  getScrollRoot: () => HTMLElement | null;
  getPageMetrics: () => { pageWidth: number; gap: number };
  currentPage: number;
  selectedHighlight: { id?: number; text: string; note?: string } | null;
  attachedHighlights: Array<{ id: number; text: string; note?: string }>;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  onCitationClick: (localId: number, snippet?: string) => void;
}

export interface UseChatResult {
  threads: any[] | undefined;
  messages: any[] | undefined;
  chatMessages: ChatMessage[];
  currentThreadId: number | null;
  setCurrentThreadId: (id: number | null) => void;
  chatInput: string;
  setChatInput: (input: string) => void;
  chatSending: boolean;
  chatInputRef: React.RefObject<HTMLTextAreaElement | null>;
  contextMap: Record<number, CitationMapping>;
  sendChat: () => Promise<void>;
  handleNewChat: () => Promise<void>;
  handleDeleteThread: (threadId: number) => Promise<void>;
  handleRenameThread: (threadId: number, title: string) => Promise<void>;
  handleClearDefaultChat: () => Promise<void>;
  handleClearThreadChat: (threadId: number) => Promise<void>;
  handleDeleteMessage: (messageId: number) => Promise<void>;
  handleSelectThread: (threadId: number | null) => void;
  handleCitationClick: (citationId: number, snippet?: string) => void;
  contextHint: string;
  placeholder: string;
}

export function useChat(
  options: UseChatOptions,
  navigation: { scrollToCfi: (cfi: string) => boolean },
  scrollToQuote: (text: string, blockIndex?: number) => void,
  activeAiQuote: string | null,
  setActiveAiQuote: (q: string | null) => void,
  setActiveAiBlockIndex: (i: number | null) => void,
  setSelectedHighlightId: (id: number | null) => void
): UseChatResult {
  const {
    bookId,
    getDoc,
    getScrollRoot,
    getPageMetrics,
    currentPage,
    selectedHighlight,
    attachedHighlights,
  } = options;

  const queryClient = useQueryClient();
  const chatInputRef = useRef<HTMLTextAreaElement | null>(null);

  const [currentThreadId, setCurrentThreadId] = useState<number | null>(null);
  const [chatInput, setChatInput] = useState("");
  const [chatSending, setChatSending] = useState(false);
  const [contextMap, setContextMap] = useState<Record<number, CitationMapping>>({});

  const bookChatThreadsQ = useQuery({
    queryKey: ["bookChatThreads", bookId],
    queryFn: () => listBookChatThreads(bookId),
  });

  const bookMessagesQ = useQuery({
    queryKey: ["bookMessages", bookId, currentThreadId],
    queryFn: () => listBookMessages(bookId, currentThreadId),
  });

  const sendChat = useCallback(async () => {
    if (!chatInput.trim()) return;
    const input = chatInput.trim();
    setChatSending(true);
    setChatInput("");

    const threadId = currentThreadId;

    try {
      const maxIdx = await getThreadMaxCitationIndex(bookId, threadId);
      let localId = maxIdx + 1;

      const optimisticUserMsg: any = {
        id: Date.now(),
        book_id: bookId,
        thread_id: threadId,
        role: "user",
        content: input,
        created_at: new Date().toISOString(),
        isOptimistic: true,
      };

      queryClient.setQueryData(["bookMessages", bookId, threadId], (old: any) => {
        return [...(old || []), optimisticUserMsg];
      });

      await addBookMessage({
        bookId,
        threadId,
        role: "user",
        content: input,
      });

      const blockIndexLookup: Array<{ text: string; blockIndex: number; pageNumber: number }> = [];

      const doc = getDoc();
      const root = getScrollRoot();
      let pageContent: Array<{ text: string; blockIndex: number; pageNumber: number }> = [];

      if (doc && root) {
        const { pageWidth, gap } = getPageMetrics();
        const stride = pageWidth + gap;
        const rootRect = root.getBoundingClientRect();
        const scrollLeft = root.scrollLeft;

        const metrics: PageMetrics = {
          pageWidth,
          gap,
          stride,
          scrollLeft,
          rootRect,
        };

        const pageContentResult = getPageContent(doc, currentPage, metrics);
        pageContent = pageContentResult.blocks;
        pageContent.forEach((block) => blockIndexLookup.push(block));
      }

      const contextBlocks = buildChatSystemPrompt({
        selectedHighlight: selectedHighlight ? { text: selectedHighlight.text, note: selectedHighlight.note } : null,
        attachedHighlights: attachedHighlights.map((h) => ({ id: h.id, text: h.text, note: h.note })),
        pageContent,
      });

      const systemContent = contextBlocks.join("\n");
      const messages = bookMessagesQ.data ?? [];

      const response = await chat([
        { role: "system", content: systemContent },
        ...messages.map((message: any) => ({ role: message.role, content: message.content })),
        { role: "user", content: input },
      ]);

      const { processedContent, mapping } = processCitationsInResponse(
        response.content,
        localId,
        blockIndexLookup,
        currentPage
      );

      setContextMap(mapping);

      await addBookMessage({
        bookId,
        threadId,
        role: "assistant",
        content: processedContent,
        contextMap: JSON.stringify(mapping),
      });

      await queryClient.invalidateQueries({
        queryKey: ["bookMessages", bookId, threadId],
      });

      console.log("[Chat:Title] sendChat finished assistant response. threadId:", threadId);

      // AI Title Generation: If this is a real thread (not default chat)
      if (threadId !== null) {
        // We look for the thread in the cache, but even if not found (stale cache), 
        // we can proceed if we know we just sent the first interaction.
        const thread = bookChatThreadsQ.data?.find((t: any) => t.id === threadId);
        
        console.log("[Chat:Title] Checking conditions...", { 
          threadFound: !!thread, 
          title: thread?.title,
          isNewChat: thread?.title === "New Chat"
        });

        // If we don't have the thread in cache yet, or it's named "New Chat", 
        // we should attempt to generate a title if this is the first interaction.
        // We'll trust the logic that if we just got processedContent and it's a thread, 
        // and we haven't renamed it yet, it's time.
        if (!thread || thread.title === "New Chat") {
          console.log("[Chat:Title] Triggering AI title generation...");
          try {
            const aiTitle = await generateThreadTitle([
              { role: "user", content: input },
              { role: "assistant", content: processedContent }
            ]);
            
            if (aiTitle) {
              console.log("[Chat:Title] Success. Renaming thread to:", aiTitle);
              await handleRenameThread(threadId, aiTitle);
            }
          } catch (e) {
            console.error("[Chat:Title] Failed to generate AI title:", e);
          }
        }
      }
    } catch (error: any) {
      const errorMessage = String(error?.message ?? error);
      await addBookMessage({
        bookId,
        threadId: currentThreadId,
        role: "assistant",
        content: errorMessage,
      });
      await queryClient.invalidateQueries({
        queryKey: ["bookMessages", bookId, currentThreadId],
      });
    } finally {
      setChatSending(false);
    }
  }, [
    chatInput,
    currentThreadId,
    bookId,
    getDoc,
    getScrollRoot,
    getPageMetrics,
    currentPage,
    selectedHighlight,
    attachedHighlights,
    bookMessagesQ.data,
    queryClient,
  ]);

  const handleNewChat = useCallback(async () => {
    if (selectedHighlight) return;
    const title = "New Chat";
    const thread = await createBookChatThread({ bookId, title });
    setCurrentThreadId(thread.id);
    await queryClient.invalidateQueries({ queryKey: ["bookChatThreads", bookId] });
  }, [selectedHighlight, bookId, queryClient]);

  const handleDeleteThread = useCallback(async (threadId: number) => {
    await deleteBookChatThread(threadId);
    if (currentThreadId === threadId) {
      setCurrentThreadId(null);
    }
    await queryClient.invalidateQueries({ queryKey: ["bookChatThreads", bookId] });
  }, [currentThreadId, bookId, queryClient]);

  const handleRenameThread = useCallback(async (threadId: number, title: string) => {
    await renameBookChatThread({ threadId, title });
    await queryClient.invalidateQueries({ queryKey: ["bookChatThreads", bookId] });
  }, [bookId, queryClient]);

  const handleClearDefaultChat = useCallback(async () => {
    await clearDefaultBookMessages(bookId);
    await queryClient.invalidateQueries({ queryKey: ["bookMessages", bookId, null] });
  }, [bookId, queryClient]);

  const handleClearThreadChat = useCallback(async (threadId: number) => {
    await deleteBookThreadMessages(threadId);
    await queryClient.invalidateQueries({ queryKey: ["bookMessages", bookId, threadId] });
  }, [bookId, queryClient]);

  const handleDeleteMessage = useCallback(async (messageId: number) => {
    await deleteBookMessage(messageId);
    await queryClient.invalidateQueries({ queryKey: ["bookMessages", bookId, currentThreadId] });
  }, [bookId, currentThreadId, queryClient]);

  const handleSelectThread = useCallback((threadId: number | null) => {
    setCurrentThreadId(threadId);
    if (threadId !== null && bookChatThreadsQ.data) {
      const thread = bookChatThreadsQ.data.find((t: any) => t.id === threadId);
      if (thread?.last_cfi) {
        setTimeout(() => {
          navigation.scrollToCfi(thread.last_cfi!);
        }, 100);
      }
    }
  }, [bookChatThreadsQ.data, navigation]);

  const handleCitationClick = useCallback((citationId: number, snippet?: string) => {
    let value = contextMap[citationId];

    if (!value) {
      const messages = bookMessagesQ.data ?? [];
      for (const msg of messages) {
        if (msg.role === "assistant" && msg.content.includes("<!-- context-map:")) {
          try {
            const mapStr = msg.content.split("<!-- context-map:")[1].split("-->")[0];
            const parsedMap = JSON.parse(mapStr);
            if (parsedMap[citationId]) {
              value = parsedMap[citationId];
              break;
            }
          } catch (e) {
            console.error("[Chat:Citation] Failed to parse historical context-map", e);
          }
        }
      }
    }

    const textToUse = snippet || (value && typeof value === "object" ? value.text : null);

    // Toggle off if clicking the same citation
    if (activeAiQuote === textToUse && textToUse !== null) {
      setActiveAiQuote(null);
      setActiveAiBlockIndex(null);
      return;
    }

    if (textToUse) {
      scrollToQuote(textToUse, value?.blockIndex);
      setActiveAiQuote(textToUse);
      setActiveAiBlockIndex(value?.blockIndex ?? null);
      setSelectedHighlightId(null);
      return;
    }
  }, [contextMap, bookMessagesQ.data, scrollToQuote, activeAiQuote, setActiveAiQuote, setActiveAiBlockIndex, setSelectedHighlightId]);

  const chatMessages: ChatMessage[] = (bookMessagesQ.data ?? []).map((message: any) => {
    let content = message.content;
    const mapping = parseContextMapFromMessage(message);

    if (!message.context_map) {
      const mapMatch = content.match(/<!-- context-map: (\{.*?\}) -->/);
      if (mapMatch) {
        content = content.replace(mapMatch[0], "").trim();
      }
    }

    return {
      id: String(message.id),
      role: message.role as "user" | "assistant",
      content,
      onCitationClick: (localId: number, snippet?: string) => {
        const value = mapping[localId];
        const textToUse = snippet || (value && typeof value === "object" ? value.text : null);

        // Toggle off if clicking the same citation
        if (activeAiQuote === textToUse && textToUse !== null) {
          setActiveAiQuote(null);
          setActiveAiBlockIndex(null);
          return;
        }

        if (value?.cfi) {
          navigation.scrollToCfi(value.cfi);
          if (textToUse) setActiveAiQuote(textToUse);
          setActiveAiBlockIndex(value.blockIndex ?? null);
          setSelectedHighlightId(null);
          return;
        }

        if (textToUse) {
          scrollToQuote(textToUse, value?.blockIndex);
          setActiveAiQuote(textToUse);
          setActiveAiBlockIndex(value?.blockIndex ?? null);
          setSelectedHighlightId(null);
          return;
        }
      },
    };
  });

  const contextHint = selectedHighlight
    ? "Using selected highlight as context"
    : "Using current page as context";

  const placeholder = selectedHighlight
    ? "Ask about this highlight..."
    : "Ask about the current page...";

  return {
    threads: bookChatThreadsQ.data,
    messages: bookMessagesQ.data,
    chatMessages,
    currentThreadId,
    setCurrentThreadId,
    chatInput,
    setChatInput,
    chatSending,
    chatInputRef,
    contextMap,
    sendChat,
    handleNewChat,
    handleDeleteThread,
    handleRenameThread,
    handleClearDefaultChat,
    handleClearThreadChat,
    handleDeleteMessage,
    handleSelectThread,
    handleCitationClick,
    contextHint,
    placeholder,
  };
}
