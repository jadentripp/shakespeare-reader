export type PendingHighlight = {
  startPath: number[];
  startOffset: number;
  endPath: number[];
  endOffset: number;
  text: string;
  rect: { top: number; left: number; width: number; height: number };
};

export type LocalChatMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  onCitationClick?: (index: number, snippet?: string) => void;
};

export type ChatPrompt = {
  label: string;
  prompt: string;
};

export type BookChatThread = {
  id: number;
  book_id: number;
  title: string;
  created_at: string;
  updated_at: string;
};
