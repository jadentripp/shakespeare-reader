import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Highlight } from "@/lib/tauri";
import type { ChatPrompt, LocalChatMessage } from "@/lib/readerTypes";
import ChatPanel from "@/components/reader/ChatPanel";
import HighlightNote from "@/components/reader/HighlightNote";
import HighlightsList from "@/components/reader/HighlightsList";
import ReaderContextPanel from "@/components/reader/ReaderContextPanel";
import type { RefObject } from "react";

type ReaderSidebarProps = {
  highlights: Highlight[] | undefined;
  selectedHighlightId: number | null;
  onSelectHighlight: (id: number) => void;
  onClearSelection: () => void;
  highlightLibraryExpanded: boolean;
  onToggleHighlightLibrary: () => void;
  highlightPageMap: Record<number, number>;
  selectedHighlight: Highlight | null;
  noteDraft: string;
  onNoteDraftChange: (value: string) => void;
  onSaveNote: () => void;
  contextLabel: string;
  contextText: string;
  chatContextHint: string;
  chatMessages: LocalChatMessage[];
  chatPrompts: ChatPrompt[];
  chatInput: string;
  onChatInputChange: (value: string) => void;
  onChatPrompt: (prompt: string) => void;
  onSendChat: () => void;
  chatSending: boolean;
  chatInputRef: RefObject<HTMLTextAreaElement | null>;
};

export default function ReaderSidebar({
  highlights,
  selectedHighlightId,
  onSelectHighlight,
  onClearSelection,
  highlightLibraryExpanded,
  onToggleHighlightLibrary,
  highlightPageMap,
  selectedHighlight,
  noteDraft,
  onNoteDraftChange,
  onSaveNote,
  contextLabel,
  contextText,
  chatContextHint,
  chatMessages,
  chatPrompts,
  chatInput,
  onChatInputChange,
  onChatPrompt,
  onSendChat,
  chatSending,
  chatInputRef,
}: ReaderSidebarProps) {
  return (
    <aside className="min-h-0">
      <Card className="flex h-full flex-col overflow-hidden">
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>Highlights &amp; Notes</CardTitle>
            <p className="text-sm text-muted-foreground">
              {highlights ? `${highlights.length} saved` : "Loading highlights..."}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={onClearSelection}>
            Clear
          </Button>
        </CardHeader>
        <CardContent className="flex-1 min-h-0 overflow-hidden pb-6">
          <div className="flex h-full flex-col gap-4">
            <HighlightsList
              highlights={highlights}
              selectedHighlightId={selectedHighlightId}
              onSelectHighlight={onSelectHighlight}
              highlightPageMap={highlightPageMap}
              expanded={highlightLibraryExpanded}
              onToggleExpanded={onToggleHighlightLibrary}
            />

            <HighlightNote
              selectedHighlight={selectedHighlight}
              noteDraft={noteDraft}
              onNoteChange={onNoteDraftChange}
              onSaveNote={onSaveNote}
            />

            <ReaderContextPanel label={contextLabel} text={contextText} />

            <ChatPanel
              contextHint={chatContextHint}
              messages={chatMessages}
              prompts={chatPrompts}
              chatInput={chatInput}
              onChatInputChange={onChatInputChange}
              onPromptSelect={onChatPrompt}
              onSend={onSendChat}
              chatSending={chatSending}
              chatInputRef={chatInputRef}
            />
          </div>
        </CardContent>
      </Card>
    </aside>
  );
}
