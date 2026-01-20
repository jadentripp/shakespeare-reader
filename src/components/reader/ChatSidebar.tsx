import { type RefObject } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { BookChatThread, ChatPrompt, LocalChatMessage } from "@/lib/readerTypes";
import type { Highlight } from "@/lib/tauri";
import { Check, PanelRightClose, PlusSquare, History, MessageSquare, X, Eraser, Trash2, MapPin, BookOpen, Feather, Quote, Lightbulb } from "lucide-react";
import { ChatModelSelector } from "./ChatModelSelector";
import { ChatThreadItem } from "./ChatThreadItem";
import { ChatMessageList } from "./ChatMessageList";
import { ChatInputArea } from "./ChatInputArea";

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

      <div className="flex h-full flex-col overflow-hidden rounded-none border-2 border-black dark:border-white bg-background shadow-xl">

        {/* Header */}

        <div className="shrink-0 flex items-center justify-between gap-2 border-b-2 border-black dark:border-white bg-background px-4 py-3">

          <div className="flex items-center gap-1">

            <Button

              variant="ghost"

              size="sm"

              className="h-8 w-8 p-0 rounded-none hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black"

              onClick={onCollapse}

              title="Collapse right panel"

            >

              <PanelRightClose className="h-4 w-4" />

            </Button>

            {onNewChat && (

              <Button

                variant="ghost"

                size="sm"

                className="h-8 w-8 p-0 rounded-none text-muted-foreground hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black"

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

                    className="h-8 w-8 p-0 rounded-none text-muted-foreground hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black"

                    title="Chat history"

                  >

                    <History className="h-4 w-4" />

                  </Button>

                </PopoverTrigger>

                <PopoverContent align="start" className="w-64 p-2 rounded-none border-2 border-black dark:border-white">

                  <div className="mb-2 px-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">

                    Chat History

                  </div>

                  <div className="max-h-64 overflow-y-auto space-y-1">

                    <div

                      className={cn(

                        "group flex items-center gap-1 rounded-none px-2 py-2 text-[10px] font-bold uppercase tracking-widest hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors",

                        currentThreadId === null && "bg-black text-white dark:bg-white dark:text-black"

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

                          className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 transition-all"

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

                          "group flex flex-col gap-0.5 rounded-none px-2 py-2 text-[10px] font-bold uppercase tracking-widest hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors",

                          currentThreadId === thread.id && "bg-black text-white dark:bg-white dark:text-black"

                        )}

                      >

                        <div className="flex items-center gap-1">

                          {onRenameThread ? (

                            <ChatThreadItem

                              title={thread.title}

                              onRename={(newTitle) => onRenameThread(thread.id, newTitle)}

                            />

                          ) : (

                            <button

                              onClick={() => onSelectThread(thread.id)}

                              className="flex-1 text-left truncate"

                            >

                              {thread.title}

                            </button>

                          )}

                          {thread.last_cfi && (

                            <MapPin className="h-2.5 w-2.5" />

                          )}

                          {onClearThreadChat && currentThreadId === thread.id && messages.length > 0 && (

                            <button

                              onClick={(e) => {

                                e.stopPropagation();

                                onClearThreadChat(thread.id);

                              }}

                              className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 transition-all"

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

                              className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 transition-all"

                              title="Delete thread"

                            >

                              <Trash2 className="h-3 w-3" />

                            </button>

                          )}

                          {currentThreadId === thread.id && <Check className="h-3 w-3 shrink-0" />}

                        </div>

                      </div>

                    ))}

                  </div>

                </PopoverContent>

              </Popover>

            )}

          </div>

                                <div className={cn(

                                  "relative flex h-10 w-10 items-center justify-center rounded-none transition-all duration-300 border-[3px]",

                                  chatSending 

                                    ? "bg-[#FFD700] text-black border-black" 

                                    : (isHighlightContext ? "bg-[#E02E2E] text-white border-black" : "bg-black text-white dark:bg-white dark:text-black border-black dark:border-white")

                                )}>

                                  {isHighlightContext ? (

                                    <MessageSquare className="h-5 w-5" />

                                  ) : (

                                    <span className="text-lg font-black leading-none mt-0.5">A</span>

                                  )}

                                </div>

                    

                      <div className="flex flex-col">

                        <div className="bg-black dark:bg-white px-1.5 py-0.5 self-start">

                          <h2 className="font-sans text-[11px] font-black uppercase tracking-tighter text-white dark:text-black leading-none">AI ASSISTANT</h2>

                        </div>

                        <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground mt-1">{contextHint}</p>

                      </div>

                    </div>



          <ChatModelSelector

            currentModel={currentModel}

            availableModels={availableModels}

            onModelChange={onModelChange}

            modelsLoading={modelsLoading}

            disabled={chatSending}

          />

        </div>



        {/* Quick prompts */}

        {prompts.length > 0 && (

          <div className="shrink-0 flex flex-wrap gap-2 px-4 py-3 bg-black/5 dark:bg-white/5 border-b-2 border-black/10 dark:border-white/10">

            {prompts.map((prompt, index) => {

              const icons = [BookOpen, Quote, Lightbulb, Feather];

              const Icon = icons[index % icons.length];

              return (

                <Button

                  key={prompt.label}

                  variant="ghost"

                  size="sm"

                  className="group h-8 gap-2 rounded-none border-2 border-black/20 dark:border-white/20 bg-background px-3 text-[10px] font-bold uppercase tracking-widest transition-all duration-200 hover:border-black dark:hover:border-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black"

                  onClick={() => {

                    onPromptSelect(prompt.prompt);

                    chatInputRef.current?.focus();

                  }}

                  disabled={chatSending}

                  type="button"

                >

                  <Icon className="h-3.5 w-3.5 opacity-60 group-hover:opacity-100" />

                  {prompt.label}

                </Button>

              );

            })}

          </div>

        )}



        <ChatMessageList 

          messages={messages} 

          chatSending={chatSending} 

          onDeleteMessage={onDeleteMessage} 

          onCitationClick={onCitationClick}

        />



        {/* Context Shelf */}

        {attachedContext.length > 0 && (

          <div className="shrink-0 flex flex-wrap gap-1.5 px-3 py-2 border-t-2 border-black dark:border-white bg-black/5 dark:bg-white/5">

            {attachedContext.map((h: any) => (

              <div

                key={h.id}

                className="flex items-center gap-1.5 rounded-none bg-[#E02E2E]/10 border-2 border-[#E02E2E]/20 px-2 py-1 group"

              >

                <MessageSquare className="h-3 w-3 text-[#E02E2E]" />

                <span className="text-[10px] font-bold uppercase tracking-widest text-[#E02E2E] max-w-[120px] truncate">

                  {h.text}

                </span>

                <button

                  type="button"

                  onClick={() => onRemoveContext?.(h.id)}

                  className="hover:bg-[#E02E2E] hover:text-white p-0.5 transition-colors"

                  title="Remove context"

                >

                  <X className="h-2.5 w-2.5" />

                </button>

              </div>

            ))}

          </div>

        )}



        <ChatInputArea 

          chatInput={chatInput} 

          onChatInputChange={onChatInputChange} 

          onSend={onSend} 

          chatSending={chatSending} 

          chatInputRef={chatInputRef} 

          placeholder={placeholder}

        />

      </div>

    </aside>

  );

}
