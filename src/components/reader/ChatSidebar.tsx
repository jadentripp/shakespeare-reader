import { useState, type RefObject } from "react";
import { Button } from "@/components/ui/button";
import {
  ChatContainerRoot,
  ChatContainerContent,
  ChatContainerScrollAnchor,
} from "@/components/ui/chat-container";
import { Message, MessageAvatar, MessageContent } from "@/components/ui/message";
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputActions,
  PromptInputAction,
} from "@/components/ui/prompt-input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Loader } from "@/components/ui/loader";
import { cn } from "@/lib/utils";
import type { BookChatThread, ChatPrompt, LocalChatMessage } from "@/lib/readerTypes";
import type { Highlight } from "@/lib/tauri";
import { Send, Sparkles, ChevronDown, Check, Settings2, PanelRightClose, PlusSquare, History, MessageSquare, X, Trash2 } from "lucide-react";

type ChatSidebarProps = {
  contextHint: string;
  messages: LocalChatMessage[];
  prompts: ChatPrompt[];
  chatInput: string;
  onChatInputChange: (value: string) => void;
  onPromptSelect: (value: string) => void;
  onSend: () => void;
  onNewChat?: () => void;
  chatSending: boolean;
  chatInputRef: RefObject<HTMLTextAreaElement | null>;
  currentModel: string;
  availableModels: string[];
  onModelChange: (model: string) => void;
  modelsLoading: boolean;
  onCollapse: () => void;
  threads: BookChatThread[] | undefined;
  currentThreadId: number | null;
  onSelectThread: (id: number | null) => void;
  onDeleteThread?: (id: number) => void;
  placeholder?: string;
  isHighlightContext?: boolean;
  attachedContext?: Highlight[];
  onRemoveContext?: (id: number) => void;
  onCitationClick?: (index: number, snippet?: string) => void;
};

function formatModelName(modelId: string): string {
  return modelId
    .replace(/^gpt-/, "GPT-")
    .replace(/-(\d{4})-(\d{2})-(\d{2})$/, " ($1)")
    .replace(/-preview$/, " Preview")
    .replace(/-mini$/, " Mini")
    .replace(/-turbo$/, " Turbo");
}

const RECOMMENDED_MODEL = "gpt-5.2";

type ModelSelectorProps = {
  currentModel: string;
  availableModels: string[];
  onModelChange: (model: string) => void;
  modelsLoading?: boolean;
  disabled?: boolean;
};

function ModelSelector({
  currentModel,
  availableModels,
  onModelChange,
  modelsLoading,
  disabled,
}: ModelSelectorProps) {
  const [open, setOpen] = useState(false);
  const [showMore, setShowMore] = useState(false);

  const filteredModels = availableModels.filter((m) => !m.includes("search"));
  const hasRecommended = filteredModels.includes(RECOMMENDED_MODEL);
  const otherModels = filteredModels.filter((m) => m !== RECOMMENDED_MODEL);

  const handleSelect = (model: string) => {
    onModelChange(model);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          disabled={modelsLoading || disabled}
          className="h-7 gap-1 border-0 bg-muted/50 px-2 text-[11px] hover:bg-muted"
        >
          {modelsLoading ? "..." : formatModelName(currentModel)}
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-52 p-2">
        {availableModels.length === 0 && !modelsLoading ? (
          <div className="px-2 py-1.5 text-xs text-muted-foreground">
            No models available
          </div>
        ) : (
          <>
            {hasRecommended && (
              <>
                <div className="mb-1 px-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  Recommended
                </div>
                <button
                  onClick={() => handleSelect(RECOMMENDED_MODEL)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-md px-2 py-1.5 text-xs hover:bg-muted",
                    currentModel === RECOMMENDED_MODEL && "bg-muted"
                  )}
                >
                  <span>{formatModelName(RECOMMENDED_MODEL)}</span>
                  {currentModel === RECOMMENDED_MODEL && <Check className="h-3 w-3" />}
                </button>
              </>
            )}

            {otherModels.length > 0 && (
              <>
                <button
                  onClick={() => setShowMore((v) => !v)}
                  className="mt-2 flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-[11px] text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <Settings2 className="h-3 w-3" />
                  {showMore ? "Hide" : `Show all models (${otherModels.length})`}
                </button>

                {showMore && (
                  <div className="mt-2 max-h-48 overflow-y-auto">
                    {otherModels.map((model) => (
                      <button
                        key={model}
                        onClick={() => handleSelect(model)}
                        className={cn(
                          "flex w-full items-center justify-between rounded-md px-2 py-1.5 text-xs hover:bg-muted",
                          currentModel === model && "bg-muted"
                        )}
                      >
                        <span>{formatModelName(model)}</span>
                        {currentModel === model && <Check className="h-3 w-3" />}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}

export default function ChatSidebar({
  contextHint,
  messages,
  prompts,
  chatInput,
  onChatInputChange,
  onPromptSelect,
  onSend,
  onNewChat,
  chatSending,
  chatInputRef,
  currentModel,
  availableModels,
  onModelChange,
  modelsLoading,
  onCollapse,
  threads = [],
  currentThreadId,
  onSelectThread,
  onDeleteThread,
  placeholder = "Ask about the text...",
  isHighlightContext = false,
  attachedContext = [],
  onRemoveContext,
  onCitationClick,
}: ChatSidebarProps) {
  return (
    <aside className="min-h-0 flex flex-col">
      <div className="flex h-full flex-col overflow-hidden rounded-xl border border-border/50 bg-card shadow-sm">
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between gap-3 border-b border-border/40 px-4 py-3">
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={onCollapse}
              title="Collapse right panel"
            >
              <PanelRightClose className="h-4 w-4" />
            </Button>
            {onNewChat && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-muted-foreground hover:text-primary"
                onClick={onNewChat}
                disabled={chatSending}
                title="Start new chat thread"
              >
                <PlusSquare className="h-4 w-4" />
              </Button>
            )}
            {onSelectThread && threads.length > 0 && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-primary"
                    title="Chat history"
                  >
                    <History className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-64 p-2">
                  <div className="mb-2 px-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    Chat History
                  </div>
                  <div className="max-h-64 overflow-y-auto space-y-1">
                    <button
                      onClick={() => onSelectThread(null)}
                      className={cn(
                        "flex w-full items-center justify-between rounded-md px-2 py-2 text-xs hover:bg-muted",
                        currentThreadId === null && "bg-muted font-medium"
                      )}
                    >
                      <span>Default Chat</span>
                      {currentThreadId === null && <Check className="h-3 w-3" />}
                    </button>
                    {threads.map((thread) => (
                      <div
                        key={thread.id}
                        className={cn(
                          "group flex items-center gap-1 rounded-md px-2 py-2 text-xs hover:bg-muted",
                          currentThreadId === thread.id && "bg-muted font-medium"
                        )}
                      >
                        <button
                          onClick={() => onSelectThread(thread.id)}
                          className="flex-1 text-left truncate"
                        >
                          {thread.title}
                        </button>
                        {onDeleteThread && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteThread(thread.id);
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1 hover:text-destructive transition-all"
                            title="Delete thread"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                        {currentThreadId === thread.id && <Check className="h-3 w-3 shrink-0" />}
                      </div>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className={cn(
              "flex h-7 w-7 items-center justify-center rounded-lg transition-colors",
              chatSending ? "bg-primary/20" : (isHighlightContext ? "bg-primary/10" : "bg-muted")
            )}>
              {isHighlightContext ? (
                <MessageSquare className={cn(
                  "h-4 w-4 transition-colors",
                  chatSending ? "text-primary animate-pulse" : "text-primary/70"
                )} />
              ) : (
                <Sparkles className={cn(
                  "h-4 w-4 transition-colors",
                  chatSending ? "text-primary animate-pulse" : "text-muted-foreground"
                )} />
              )}
            </div>
            <div>
              <h2 className="text-sm font-semibold">AI Assistant</h2>
              <p className="text-[11px] text-muted-foreground">{contextHint}</p>
            </div>
          </div>

          <ModelSelector
            currentModel={currentModel}
            availableModels={availableModels}
            onModelChange={onModelChange}
            modelsLoading={modelsLoading}
            disabled={chatSending}
          />
        </div>

        {/* Quick prompts */}
        {prompts.length > 0 && (
          <div className="shrink-0 flex flex-wrap gap-1.5 border-b border-border/30 px-3 py-2">
            {prompts.map((prompt) => (
              <Button
                key={prompt.label}
                variant="outline"
                size="sm"
                className="h-6 rounded-full border-dashed px-2.5 text-[11px] hover:border-primary/50 hover:bg-primary/5"
                onClick={() => {
                  onPromptSelect(prompt.prompt);
                  chatInputRef.current?.focus();
                }}
                disabled={chatSending}
                type="button"
              >
                {prompt.label}
              </Button>
            ))}
          </div>
        )}

        {/* Messages */}
        <ChatContainerRoot className="flex-1 min-h-0">
          <ChatContainerContent className="gap-3 p-3">
            {messages.length ? (
              <>
                {messages.map((message) => {
                  const isUser = message.role === "user";
                  return (
                    <Message
                      key={message.id}
                      className={cn(isUser && "flex-row-reverse")}
                    >
                      <MessageAvatar
                        src=""
                        alt={isUser ? "You" : "Assistant"}
                        fallback={isUser ? "U" : "AI"}
                        className={cn(
                          "h-6 w-6 text-[10px]",
                          isUser ? "bg-primary text-primary-foreground" : "bg-muted"
                        )}
                      />
                      <MessageContent
                        markdown={!isUser}
                        onCitationClick={message.onCitationClick ?? onCitationClick}
                        className={cn(
                          "max-w-[85%] text-sm py-2 px-3",
                          isUser ? "bg-primary text-primary-foreground" : "bg-muted/60"
                        )}
                      >
                        {message.content}
                      </MessageContent>
                    </Message>
                  );
                })}
                {chatSending && (
                  <Message>
                    <MessageAvatar
                      src=""
                      alt="Assistant"
                      fallback="AI"
                      className="h-6 w-6 text-[10px] bg-muted"
                    />
                    <div className="rounded-lg py-2 px-3 text-foreground bg-muted/60 text-sm">
                      <Loader variant="loading-dots" size="sm" text="Thinking" />
                    </div>
                  </Message>
                )}
              </>
            ) : (
              <div className="flex h-full items-center justify-center py-8">
                <div className="text-center max-w-[220px]">
                  <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-muted/50">
                    <Sparkles className="h-5 w-5 text-muted-foreground/50" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Ask questions about the text, request summaries, or explore interpretations.
                  </p>
                </div>
              </div>
            )}
            <ChatContainerScrollAnchor />
          </ChatContainerContent>
        </ChatContainerRoot>

        {/* Context Shelf */}
        {attachedContext.length > 0 && (
          <div className="shrink-0 flex flex-wrap gap-1.5 px-3 py-2 border-t border-border/20 bg-muted/20">
            {attachedContext.map((h: any) => (
              <div
                key={h.id}
                className="flex items-center gap-1.5 rounded-md bg-primary/10 border border-primary/20 px-2 py-1 group"
              >
                <MessageSquare className="h-3 w-3 text-primary/70" />
                <span className="text-[10px] font-medium text-primary max-w-[120px] truncate">
                  {h.text}
                </span>
                <button
                  type="button"
                  onClick={() => onRemoveContext?.(h.id)}
                  className="rounded-full hover:bg-primary/20 p-0.5 transition-colors"
                  title="Remove context"
                >
                  <X className="h-2.5 w-2.5 text-primary/70" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="shrink-0 border-t border-border/40 p-3">
          <PromptInput
            value={chatInput}
            onValueChange={onChatInputChange}
            onSubmit={onSend}
            isLoading={chatSending}
            className="rounded-lg border-border/50"
          >
            <PromptInputTextarea
              ref={chatInputRef}
              placeholder={placeholder}
              className="min-h-[52px] text-sm"
            />
            <PromptInputActions className="justify-between pt-2">
              <span className="text-[10px] text-muted-foreground">
                ⌘ + Enter to send
              </span>
              <PromptInputAction tooltip="Send message">
                <Button
                  size="sm"
                  onClick={onSend}
                  disabled={chatSending || !chatInput.trim()}
                  className="h-7 px-3"
                >
                  <Send className="h-3.5 w-3.5" />
                </Button>
              </PromptInputAction>
            </PromptInputActions>
          </PromptInput>
        </div>
      </div>
    </aside>
  );
}
