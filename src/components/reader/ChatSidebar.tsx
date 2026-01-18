import { useState, type RefObject, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  ChatContainerRoot,
  ChatContainerContent,
  ChatContainerScrollAnchor,
} from "@/components/ui/chat-container";
import { Message, MessageAvatar, MessageContent, MessageAction } from "@/components/ui/message";
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
import { Input } from "@/components/ui/input";
import { Loader } from "@/components/ui/loader";
import { cn } from "@/lib/utils";
import type { BookChatThread, ChatPrompt, LocalChatMessage } from "@/lib/readerTypes";
import type { Highlight } from "@/lib/tauri";
import { Send, Sparkles, ChevronDown, Check, Settings2, PanelRightClose, PlusSquare, History, MessageSquare, X, Trash2, Edit2, Eraser, Brain, ChevronRight, MapPin, BookOpen, Feather, Quote, Lightbulb } from "lucide-react";

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
  onRenameThread?: (id: number, title: string) => void;
  onClearDefaultChat?: () => void;
  onClearThreadChat?: (id: number) => void;
  onDeleteMessage?: (id: number) => void;
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
          className="h-7 gap-1.5 rounded-full border border-border/40 bg-background/80 px-3 text-[11px] font-medium backdrop-blur-sm transition-all hover:border-primary/30 hover:bg-primary/5"
        >
          <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          {modelsLoading ? "..." : formatModelName(currentModel)}
          <ChevronDown className="h-3 w-3 opacity-40" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56 rounded-xl border-border/50 bg-popover/95 p-2 shadow-xl backdrop-blur-md">
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

function EditableThreadTitle({
  title,
  onRename,
}: {
  title: string;
  onRename: (newTitle: string) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(title);

  useEffect(() => {
    setValue(title);
  }, [title]);

  if (isEditing) {
    return (
      <form
        className="flex-1 flex items-center gap-1"
        onSubmit={(e) => {
          e.preventDefault();
          if (value.trim() && value !== title) {
            onRename(value.trim());
          }
          setIsEditing(false);
        }}
      >
        <Input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={() => {
            if (value.trim() && value !== title) {
              onRename(value.trim());
            }
            setIsEditing(false);
          }}
          className="h-7 text-xs px-1.5 py-0 min-w-0"
        />
      </form>
    );
  }

  return (
    <div className="flex-1 flex items-center gap-1 group/title min-w-0">
      <span className="truncate">{title}</span>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsEditing(true);
        }}
        className="opacity-0 group-hover/title:opacity-100 p-0.5 hover:text-primary transition-all"
        title="Rename thread"
      >
        <Edit2 className="h-2.5 w-2.5" />
      </button>
    </div>
  );
}

function ReasoningTrace({ summary }: { summary: string }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="mb-1.5 overflow-hidden rounded-lg border border-border/40 bg-muted/30">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left transition-colors hover:bg-muted/50"
      >
        <Brain className="h-3.5 w-3.5 text-primary/70" />
        <span className="flex-1 text-[11px] font-medium text-muted-foreground">
          AI Reasoning
        </span>
        <ChevronRight
          className={cn(
            "h-3 w-3 text-muted-foreground/50 transition-transform duration-200",
            isExpanded && "rotate-90"
          )}
        />
      </button>
      {isExpanded && (
        <div className="border-t border-border/20 px-2.5 py-2 text-[11px] leading-relaxed text-muted-foreground/90">
          <div className="prose-sm prose-invert max-w-none">
            {summary}
          </div>
        </div>
      )}
    </div>
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
  onRenameThread,
  onClearDefaultChat,
  onClearThreadChat,
  onDeleteMessage,
  placeholder = "Ask about the text...",
  isHighlightContext = false,
  attachedContext = [],
  onRemoveContext,
  onCitationClick,
}: ChatSidebarProps) {
  return (
    <aside className="min-h-0 flex flex-col">
      <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-border/40 bg-gradient-to-b from-card to-background shadow-xl">
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between gap-2 border-b border-border/30 bg-gradient-to-r from-muted/40 via-transparent to-muted/20 px-4 py-3">
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
            {onSelectThread && (
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
                    <div
                      className={cn(
                        "group flex items-center gap-1 rounded-md px-2 py-2 text-xs hover:bg-muted",
                        currentThreadId === null && "bg-muted font-medium"
                      )}
                    >
                      <button
                        onClick={() => onSelectThread(null)}
                        className="flex-1 text-left"
                      >
                        Default Chat
                      </button>
                      {onClearDefaultChat && currentThreadId === null && messages.length > 0 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onClearDefaultChat();
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:text-destructive transition-all"
                          title="Clear default chat"
                        >
                          <Eraser className="h-3 w-3" />
                        </button>
                      )}
                      {currentThreadId === null && <Check className="h-3 w-3 shrink-0" />}
                    </div>
                    {threads.map((thread) => (
                      <div
                        key={thread.id}
                        className={cn(
                          "group flex flex-col gap-0.5 rounded-md px-2 py-2 text-xs hover:bg-muted",
                          currentThreadId === thread.id && "bg-muted"
                        )}
                      >
                        <div className="flex items-center gap-1">
                          {onRenameThread ? (
                            <EditableThreadTitle
                              title={thread.title}
                              onRename={(newTitle) => onRenameThread(thread.id, newTitle)}
                            />
                          ) : (
                            <button
                              onClick={() => onSelectThread(thread.id)}
                              className="flex-1 text-left truncate font-medium"
                            >
                              {thread.title}
                            </button>
                          )}
                          {thread.last_cfi && (
                            <MapPin className="h-2.5 w-2.5 text-primary/60" />
                          )}
                          {onClearThreadChat && currentThreadId === thread.id && messages.length > 0 && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onClearThreadChat(thread.id);
                              }}
                              className="opacity-0 group-hover:opacity-100 p-1 hover:text-destructive transition-all"
                              title="Clear thread messages"
                            >
                              <Eraser className="h-3 w-3" />
                            </button>
                          )}
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
                        <div className="flex items-center justify-between px-0.5">
                          <span className="text-[9px] text-muted-foreground">
                            {new Date(thread.created_at).toLocaleDateString()} {new Date(thread.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className={cn(
              "relative flex h-9 w-9 items-center justify-center rounded-xl transition-all duration-300",
              chatSending 
                ? "bg-gradient-to-br from-primary/20 to-primary/10 shadow-lg shadow-primary/10" 
                : (isHighlightContext ? "bg-gradient-to-br from-primary/10 to-accent/10" : "bg-gradient-to-br from-muted to-muted/50")
            )}>
              {chatSending && (
                <div className="absolute inset-0 rounded-xl bg-primary/20 animate-ping" />
              )}
              {isHighlightContext ? (
                <MessageSquare className={cn(
                  "h-4 w-4 transition-colors",
                  chatSending ? "text-primary" : "text-primary/70"
                )} />
              ) : (
                <Sparkles className={cn(
                  "h-4 w-4 transition-colors",
                  chatSending ? "text-primary" : "text-muted-foreground"
                )} />
              )}
            </div>
            <div>
              <h2 className="font-serif text-[15px] font-semibold tracking-tight">AI Assistant</h2>
              <p className="text-[11px] text-muted-foreground/70">{contextHint}</p>
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
          <div className="shrink-0 flex flex-wrap gap-2 px-4 py-3">
            {prompts.map((prompt, index) => {
              const icons = [BookOpen, Quote, Lightbulb, Feather];
              const Icon = icons[index % icons.length];
              return (
                <Button
                  key={prompt.label}
                  variant="ghost"
                  size="sm"
                  className="group h-8 gap-2 rounded-xl border border-border/30 bg-gradient-to-br from-background to-muted/30 px-3 text-xs font-medium shadow-sm transition-all duration-200 hover:border-primary/40 hover:from-primary/5 hover:to-primary/10 hover:shadow-md"
                  onClick={() => {
                    onPromptSelect(prompt.prompt);
                    chatInputRef.current?.focus();
                  }}
                  disabled={chatSending}
                  type="button"
                >
                  <Icon className="h-3.5 w-3.5 text-muted-foreground transition-colors group-hover:text-primary" />
                  {prompt.label}
                </Button>
              );
            })}
          </div>
        )}

        {/* Messages */}
        <ChatContainerRoot className="flex-1 min-h-0">
          <ChatContainerContent className="gap-4 p-4">
            {messages.length ? (
              <>
                {messages.map((message: any) => {
                  const isUser = message.role === "user";
                  return (
                    <div key={message.id} className="group/msg relative">
                      <Message
                        className={cn(isUser && "flex-row-reverse")}
                      >
                        <MessageAvatar
                          src=""
                          alt={isUser ? "You" : "Assistant"}
                          fallback={isUser ? "U" : "✦"}
                          className={cn(
                            "h-7 w-7 text-[10px] font-medium shadow-sm",
                            isUser 
                              ? "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground" 
                              : "bg-gradient-to-br from-muted to-muted/60 border border-border/30"
                          )}
                        />
                        <div className={cn("flex max-w-[85%] flex-col", isUser && "items-end")}>
                          {message.reasoning_summary && (
                            <ReasoningTrace summary={message.reasoning_summary} />
                          )}
                          <MessageContent
                            markdown={!isUser}
                            onCitationClick={message.onCitationClick ?? onCitationClick}
                            className={cn(
                              "w-full text-[13px] leading-relaxed py-2.5 px-3.5 shadow-sm",
                              isUser 
                                ? "rounded-2xl rounded-tr-md bg-gradient-to-br from-primary to-primary/90 text-primary-foreground" 
                                : "rounded-2xl rounded-tl-md bg-gradient-to-br from-muted/70 to-muted/40 border border-border/20"
                            )}
                          >
                            {message.content}
                          </MessageContent>
                        </div>
                      </Message>
                      {onDeleteMessage && (
                        <div className={cn(
                          "absolute -top-1 opacity-0 group-hover/msg:opacity-100 transition-all duration-200",
                          isUser ? "left-8" : "right-8"
                        )}>
                          <MessageAction
                            tooltip="Delete message"
                            side="top"
                          >
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5 rounded-full bg-background/90 text-muted-foreground shadow-sm backdrop-blur-sm hover:bg-destructive/10 hover:text-destructive"
                              onClick={() => {
                                const confirmed = message.role === 'assistant' 
                                  ? window.confirm("Are you sure you want to delete this AI response?")
                                  : true;
                                if (confirmed) {
                                  onDeleteMessage(Number(message.id));
                                }
                              }}
                            >
                              <Trash2 className="h-2.5 w-2.5" />
                            </Button>
                          </MessageAction>
                        </div>
                      )}
                    </div>
                  );
                })}
                {chatSending && (
                  <Message>
                    <MessageAvatar
                      src=""
                      alt="Assistant"
                      fallback="✦"
                      className="h-7 w-7 text-[10px] font-medium bg-gradient-to-br from-muted to-muted/60 border border-border/30 shadow-sm"
                    />
                    <div className="rounded-2xl rounded-tl-md py-3 px-4 bg-gradient-to-br from-muted/70 to-muted/40 border border-border/20 shadow-sm">
                      <Loader variant="loading-dots" size="sm" text="Thinking" />
                    </div>
                  </Message>
                )}
              </>
            ) : (
              <div className="flex h-full items-center justify-center py-12">
                <div className="relative text-center max-w-[260px]">
                  {/* Decorative background */}
                  <div className="absolute inset-0 -z-10 mx-auto h-32 w-32 rounded-full bg-gradient-to-br from-primary/5 via-transparent to-accent/5 blur-2xl" />
                  
                  {/* Icon with layered rings */}
                  <div className="relative mx-auto mb-6 h-16 w-16">
                    <div className="absolute inset-0 rounded-full border border-border/20" />
                    <div className="absolute inset-2 rounded-full border border-border/30" />
                    <div className="absolute inset-4 flex items-center justify-center rounded-full bg-gradient-to-br from-muted/80 to-muted">
                      <Feather className="h-5 w-5 text-muted-foreground/70" />
                    </div>
                  </div>
                  
                  {/* Typography */}
                  <h3 className="mb-2 font-serif text-base font-medium tracking-tight text-foreground/90">
                    Literary Assistant
                  </h3>
                  <p className="text-[13px] leading-relaxed text-muted-foreground/80">
                    Ask questions, request summaries, or explore deeper interpretations of the text.
                  </p>
                  
                  {/* Decorative divider */}
                  <div className="mx-auto mt-5 flex items-center justify-center gap-2">
                    <div className="h-px w-8 bg-gradient-to-r from-transparent to-border/50" />
                    <Quote className="h-3 w-3 text-muted-foreground/30" />
                    <div className="h-px w-8 bg-gradient-to-l from-transparent to-border/50" />
                  </div>
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
        <div className="shrink-0 border-t border-border/30 bg-gradient-to-t from-muted/20 to-transparent p-4">
          <PromptInput
            value={chatInput}
            onValueChange={onChatInputChange}
            onSubmit={onSend}
            isLoading={chatSending}
            className="rounded-2xl border-border/40 bg-background/80 shadow-lg backdrop-blur-sm transition-all focus-within:border-primary/30 focus-within:shadow-xl focus-within:shadow-primary/5"
          >
            <PromptInputTextarea
              ref={chatInputRef}
              placeholder={placeholder}
              className="min-h-[48px] text-sm placeholder:text-muted-foreground/50"
            />
            <PromptInputActions className="justify-between pt-2 border-t border-border/20 mt-2">
              <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground/60">
                <kbd className="rounded bg-muted/60 px-1.5 py-0.5 font-mono text-[9px]">⌘</kbd>
                <span>+</span>
                <kbd className="rounded bg-muted/60 px-1.5 py-0.5 font-mono text-[9px]">↵</kbd>
                <span className="ml-1">to send</span>
              </span>
              <PromptInputAction tooltip="Send message">
                <Button
                  size="sm"
                  onClick={onSend}
                  disabled={chatSending || !chatInput.trim()}
                  className="h-8 gap-2 rounded-xl bg-primary px-4 font-medium shadow-md transition-all hover:shadow-lg disabled:opacity-40"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span className="text-xs">Send</span>
                </Button>
              </PromptInputAction>
            </PromptInputActions>
          </PromptInput>
        </div>
      </div>
    </aside>
  );
}
