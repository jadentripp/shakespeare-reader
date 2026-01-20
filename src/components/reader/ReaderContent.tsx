import { useState } from "react";
import ReaderPane from "./ReaderPane";
import HighlightsSidebar from "./HighlightsSidebar";
import ChatSidebar from "./ChatSidebar";
import { Button } from "@/components/ui/button";
import { PanelLeftOpen, PanelRightOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { CHAT_PROMPTS } from "@/lib/reader/constants";
import { useMobiReader } from "@/lib/reader/hooks/useMobiReader";

type ReaderContentProps = {
  reader: ReturnType<typeof useMobiReader>;
};

export function ReaderContent({ reader }: ReaderContentProps) {
  const {
    columns,
    leftPanelCollapsed,
    setLeftPanelCollapsed,
    rightPanelCollapsed,
    setRightPanelCollapsed,
    highlights,
    toc,
    scrollToHighlight,
    readerWidth,
    iframe,
    srcDoc,
    handleIframeLoad,
    chat,
    models,
    activeCitation,
    setActiveCitation,
    tts,
  } = reader;

  const [highlightLibraryExpanded, setHighlightLibraryExpanded] = useState(false);
  const [highlightPageMap] = useState<Record<number, number>>({});

  return (
    <div
      className={cn(
        "grid flex-1 min-h-0 gap-2",
        leftPanelCollapsed && rightPanelCollapsed && "grid-cols-[40px_minmax(0,1fr)_40px]",
        leftPanelCollapsed && !rightPanelCollapsed && "grid-cols-[40px_minmax(0,1fr)_400px]",
        !leftPanelCollapsed && rightPanelCollapsed && "grid-cols-[280px_minmax(0,1fr)_40px]",
        !leftPanelCollapsed && !rightPanelCollapsed && "grid-cols-[280px_minmax(0,1fr)_400px]"
      )}
    >
      <div className="relative flex min-h-0">
        {leftPanelCollapsed ? (
          <div className="flex h-full items-start pt-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => setLeftPanelCollapsed(false)}
              title="Expand left panel"
            >
              <PanelLeftOpen className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <HighlightsSidebar
            highlights={highlights.highlights}
            selectedHighlightId={highlights.selectedHighlightId}
            onSelectHighlight={(highlightId) => {
              highlights.setSelectedHighlightId(highlightId);
              scrollToHighlight(highlightId);
            }}
            onDeleteHighlight={highlights.handleDelete}
            onClearSelection={() => {
              highlights.setSelectedHighlightId(null);
              highlights.setNoteDraft("");
            }}
            highlightLibraryExpanded={highlightLibraryExpanded}
            onToggleHighlightLibrary={() => setHighlightLibraryExpanded((prev) => !prev)}
            highlightPageMap={highlightPageMap}
            selectedHighlight={highlights.selectedHighlight}
            noteDraft={highlights.noteDraft}
            onNoteDraftChange={highlights.setNoteDraft}
            onSaveNote={highlights.handleSaveNote}
            tocEntries={toc.tocEntries}
            currentTocEntryId={toc.currentTocEntryId}
            onTocNavigate={toc.handleTocNavigate}
            tocExpanded={toc.tocExpanded}
            onToggleTocExpanded={() => toc.setTocExpanded(!toc.tocExpanded)}
            onCollapse={() => setLeftPanelCollapsed(true)}
            onToggleContext={highlights.toggleAttachment}
            attachedHighlightIds={highlights.attachedHighlightIds}
          />
        )}
      </div>

      <ReaderPane
        columns={columns}
        readerWidth={readerWidth}
        iframeRef={iframe.iframeRef}
        containerRef={iframe.containerRef}
        srcDoc={srcDoc}
        onLoad={handleIframeLoad}
        pendingHighlight={highlights.pendingHighlight}
        onCreateHighlight={highlights.handleCreate}
        onCancelHighlight={() => highlights.setPendingHighlight(null)}
        onAddToChat={highlights.handleAddToChat}
        onReadAloud={(text) => {
          tts.playText(text);
          highlights.setPendingHighlight(null);
        }}
        activeCitation={activeCitation}
        onActiveCitationChange={setActiveCitation}
      />

      <div className="relative flex min-h-0">
        {rightPanelCollapsed ? (
          <div className="flex h-full items-start pt-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => setRightPanelCollapsed(false)}
              title="Expand right panel"
            >
              <PanelRightOpen className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <ChatSidebar
            contextHint={chat.contextHint}
            messages={chat.chatMessages}
            prompts={CHAT_PROMPTS}
            chatInput={chat.chatInput}
            onChatInputChange={chat.setChatInput}
            onPromptSelect={chat.setChatInput}
            onSend={chat.sendChat}
            onNewChat={!highlights.selectedHighlight ? chat.handleNewChat : undefined}
            onDeleteThread={chat.handleDeleteThread}
            onRenameThread={chat.handleRenameThread}
            onClearDefaultChat={chat.handleClearDefaultChat}
            onClearThreadChat={chat.handleClearThreadChat}
            onDeleteMessage={chat.handleDeleteMessage}
            chatSending={chat.chatSending}
            chatInputRef={chat.chatInputRef}
            currentModel={models.currentModel}
            availableModels={models.availableModels}
            onModelChange={models.handleModelChange}
            modelsLoading={models.modelsLoading}
            onCollapse={() => setRightPanelCollapsed(true)}
            threads={chat.threads}
            currentThreadId={chat.currentThreadId}
            onSelectThread={chat.handleSelectThread}
            placeholder={chat.placeholder}
            isHighlightContext={!!highlights.selectedHighlight}
            attachedContext={highlights.attachedHighlights}
            onRemoveContext={highlights.toggleAttachment}
            stagedSnippets={highlights.stagedSnippets}
            onRemoveSnippet={highlights.removeSnippetFromContext}
            onClearSnippets={highlights.clearStagedSnippets}
            onCitationClick={chat.handleCitationClick}
          />
        )}
      </div>
    </div>
  );
}
