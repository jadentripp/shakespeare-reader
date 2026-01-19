import type { ChatPrompt } from "@/lib/readerTypes";

export const DESIRED_PAGE_WIDTH = 750;

export const CHAT_PROMPTS: ChatPrompt[] = [
  { label: "Summarize", prompt: "Summarize this passage in modern English, including citations for every key claim." },
];

export const DEFAULT_MODEL = "gpt-4.1-mini";

export const DEBOUNCE_SAVE_PROGRESS = 400;
export const DEBOUNCE_SAVE_THREAD_PROGRESS = 1000;
export const DEBOUNCE_LOCK_PAGE = 250;
export const DEBOUNCE_SELECTION = 40;

export const TWO_COLUMN_GAP = 80;
