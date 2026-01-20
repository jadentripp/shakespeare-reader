export interface CitationMapping {
  text: string;
  blockIndex?: number;
  pageNumber?: number;
  cfi?: string;
}

export const buildChatSystemPrompt = (options: {
  selectedHighlight?: { text: string; note?: string } | null;
  attachedHighlights?: Array<{ id: number; text: string; note?: string }>;
  stagedSnippets?: Array<{ text: string }>;
  pageContent?: Array<{ text: string; blockIndex: number; pageNumber: number }>;
}): string[] => {
  const { selectedHighlight, attachedHighlights = [], stagedSnippets = [], pageContent = [] } = options;

  const contextBlocks = [
    "You are a thoughtful literary companion, helping readers explore and understand the books they're reading.",
    "",
    "## YOUR ROLE",
    "- Provide insightful analysis that deepens understanding of themes, characters, and narrative techniques",
    "- Write in clear, engaging prose—as if conversing with a well-read friend",
    "- Balance scholarly insight with accessibility; avoid dry academic jargon",
    "- When summarizing, capture the essence and emotional texture, not just plot points",
    "- Draw connections to broader literary traditions or historical context when relevant",
    "- Be concise but substantive; every sentence should add value",
    "",
    "## CITATION RULES (CRITICAL)",
    "Ground your analysis in the text. After key claims, add: <cite snippet=\"...\"/>",
    "",
    "Requirements:",
    "- Copy text EXACTLY as written—preserve spelling, punctuation, capitalization",
    "- Keep snippets SHORT: 5-12 words. Cite the most distinctive, evocative phrase.",
    "- Cite 3-5 most important claims per response. Quality over quantity.",
    "- One citation per claim. Place it immediately after the claim it supports.",
    "",
    "Example:",
    "The opening establishes a world of stark dualities <cite snippet=\"it was the best of times, it was the worst of times\"/>—an era where enlightenment and folly existed side by side <cite snippet=\"it was the age of wisdom, it was the age of foolishness\"/>.",
    "",
    "Avoid:",
    "- Overly long quotes (12+ words)",
    "- Paraphrasing (\"the best and worst of times\" ✗—must be exact)",
    "- Stacking citations together",
    "",
    "## BOOK CONTENT",
  ];

  if (selectedHighlight) {
    contextBlocks.push(`Currently Focused Highlight: "${selectedHighlight.text}"`);
    if (selectedHighlight.note) {
      contextBlocks.push(`User's Note on Highlight: "${selectedHighlight.note}"`);
    }
    contextBlocks.push("");
  }

  if (stagedSnippets.length > 0) {
    contextBlocks.push("## CRITICAL CONTEXT: SPECIFIC TEXT SEGMENTS UNDER DISCUSSION");
    contextBlocks.push("The user has explicitly selected the following segments for focused analysis:");
    stagedSnippets.forEach((s) => {
      contextBlocks.push(`- "${s.text}"`);
    });
    contextBlocks.push("");
  }

  if (attachedHighlights.length > 0) {
    contextBlocks.push("Additional Attached Highlights:");
    attachedHighlights.forEach((h) => {
      if (selectedHighlight && h.id === (selectedHighlight as any).id) return;
      contextBlocks.push(`"${h.text}"${h.note ? ` (Note: ${h.note})` : ""}`);
    });
    contextBlocks.push("");
  }

  if (pageContent.length > 0) {
    contextBlocks.push("Current View Content:");
    pageContent.forEach(block => {
      contextBlocks.push(block.text);
      contextBlocks.push("");
    });
    contextBlocks.push("```");
  }

  return contextBlocks;
};

export const processCitationsInResponse = (
  content: string,
  startIndex: number,
  blockIndexLookup: Array<{ text: string; blockIndex: number; pageNumber: number }>,
  currentPage: number
): { processedContent: string; mapping: Record<number, CitationMapping> } => {
  const mapping: Record<number, CitationMapping> = {};
  let citeIndex = startIndex;

  const processedContent = content.replace(
    /<cite\s+snippet="([^"]*)"\s*\/?>/g,
    (_match: string, snippet: string) => {
      const matchingBlock = blockIndexLookup.find(b =>
        b.text.toLowerCase().includes(snippet.toLowerCase())
      );

      const pageNum = matchingBlock?.pageNumber ?? currentPage;
      const foundBlockIndex = matchingBlock?.blockIndex;

      mapping[citeIndex] = {
        text: snippet,
        blockIndex: foundBlockIndex,
        pageNumber: pageNum,
      };

      const result = `<cite snippet="${snippet}" index="${citeIndex}" page="${pageNum}"/>`;
      citeIndex++;
      return result;
    }
  );

  return { processedContent, mapping };
};

export const parseContextMapFromMessage = (
  message: { content: string; context_map?: string }
): Record<number, CitationMapping> => {
  if (message.context_map) {
    try {
      return JSON.parse(message.context_map);
    } catch (e) {
      console.error("Failed to parse database context_map", e);
    }
  }

  const mapMatch = message.content.match(/<!-- context-map: (\{.*?\}) -->/);
  if (mapMatch) {
    try {
      return JSON.parse(mapMatch[1]);
    } catch (e) {
      console.error("Failed to parse legacy context map", e);
    }
  }

  return {};
};
