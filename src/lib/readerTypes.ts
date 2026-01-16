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
};

export type ChatPrompt = {
  label: string;
  prompt: string;
};
