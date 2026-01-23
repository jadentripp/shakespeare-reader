import {
  BookOpen,
  Check,
  Eraser,
  Feather,
  History,
  Lightbulb,
  MapPin,
  MessageSquare,
  PanelRightClose,
  PlusSquare,
  Quote,
  Trash2,
  X,
} from 'lucide-react'
import type { RefObject } from 'react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import type { BookChatThread, ChatPrompt, LocalChatMessage, StagedSnippet } from '@/lib/readerTypes'
import type { Highlight } from '@/lib/tauri'
import { cn } from '@/lib/utils'
import { ChatInputArea } from './ChatInputArea'
import { ChatMessageList } from './ChatMessageList'
import { ChatModelSelector } from './ChatModelSelector'
import { ChatThreadItem } from './ChatThreadItem'
import { ContextTray } from './ContextTray'

type ChatSidebarProps = {
  contextHint: string
  messages: LocalChatMessage[]
  prompts: ChatPrompt[]
  chatInput: string
  onChatInputChange: (value: string) => void
  onPromptSelect: (value: string) => void
  onSend: () => void
  onNewChat?: (() => void) | undefined
  chatSending: boolean
  chatInputRef: RefObject<HTMLTextAreaElement | null>
  currentModel: string
  availableModels: string[]
  onModelChange: (model: string) => void
  modelsLoading: boolean
  onCollapse: () => void
  threads: BookChatThread[] | undefined
  currentThreadId: number | null
  onSelectThread: (id: number | null) => void
  onDeleteThread?: ((id: number) => void) | undefined
  onRenameThread?: ((id: number, title: string) => void) | undefined
  onClearDefaultChat?: (() => void) | undefined
  onClearThreadChat?: ((id: number) => void) | undefined
  onDeleteMessage?: ((id: number) => void) | undefined
  placeholder?: string
  isHighlightContext?: boolean
  attachedContext?: Highlight[]
  onRemoveContext?: ((id: number) => void) | undefined
  stagedSnippets?: StagedSnippet[]
  onRemoveSnippet?: ((id: string) => void) | undefined
  onClearSnippets?: (() => void) | undefined
  onCitationClick?: ((index: number, snippet?: string) => void) | undefined
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
  placeholder = 'Ask about the text…',
  isHighlightContext = false,
  attachedContext = [],
  onRemoveContext,
  stagedSnippets = [],
  onRemoveSnippet,
  onClearSnippets,
  onCitationClick,
}: ChatSidebarProps) {
  return (
    <aside className="h-full min-h-0 min-w-0 w-full flex flex-col overflow-hidden">
      <div className="flex h-full flex-col overflow-hidden rounded-none border-2 border-black dark:border-white bg-background shadow-xl">
        {/* Header - Compact stacked layout */}
        <div className="shrink-0 border-b-2 border-black dark:border-white bg-background">
          {/* Top row: actions + model */}
          <div className="flex items-center justify-between px-2 py-1.5 border-b border-black/10 dark:border-white/10">
            <div className="flex items-center gap-0.5">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 rounded-none hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black"
                onClick={onCollapse}
                title="Collapse right panel"
              >
                <PanelRightClose className="h-3.5 w-3.5" />
              </Button>
              {onNewChat && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 rounded-none text-muted-foreground hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black"
                  onClick={onNewChat}
                  disabled={chatSending}
                  title="Start new chat thread"
                >
                  <PlusSquare className="h-3.5 w-3.5" />
                </Button>
              )}
              {onSelectThread && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 rounded-none text-muted-foreground hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black"
                      title="Chat history"
                    >
                      <History className="h-3.5 w-3.5" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    align="start"
                    className="w-64 p-2 rounded-none border-2 border-black dark:border-white"
                  >
                    <div className="mb-2 px-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      Chat History
                    </div>
                    <div className="max-h-64 overflow-y-auto space-y-1">
                      <div
                        className={cn(
                          'group flex items-center gap-1 rounded-none px-2 py-2 text-[10px] font-bold uppercase tracking-widest hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors',
                          currentThreadId === null &&
                          'bg-black text-white dark:bg-white dark:text-black',
                        )}
                      >
                        <button onClick={() => onSelectThread(null)} className="flex-1 text-left">
                          Default Chat
                        </button>
                        {onClearDefaultChat && currentThreadId === null && messages.length > 0 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              onClearDefaultChat()
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 transition-[opacity,color]"
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
                            'group flex flex-col gap-0.5 rounded-none px-2 py-2 text-[10px] font-bold uppercase tracking-widest hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors',
                            currentThreadId === thread.id &&
                            'bg-black text-white dark:bg-white dark:text-black',
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
                            {thread.last_cfi && <MapPin className="h-2.5 w-2.5" />}
                            {onClearThreadChat &&
                              currentThreadId === thread.id &&
                              messages.length > 0 && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    onClearThreadChat(thread.id)
                                  }}
                                  className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 transition-[opacity,color]"
                                  title="Clear thread messages"
                                >
                                  <Eraser className="h-3 w-3" />
                                </button>
                              )}
                            {onDeleteThread && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onDeleteThread(thread.id)
                                }}
                                className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 transition-[opacity,color]"
                                title="Delete thread"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            )}
                            {currentThreadId === thread.id && (
                              <Check className="h-3 w-3 shrink-0" />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              )}
            </div>
            <ChatModelSelector
              currentModel={currentModel}
              availableModels={availableModels}
              onModelChange={onModelChange}
              modelsLoading={modelsLoading}
              disabled={chatSending}
            />
          </div>
          {/* Bottom row: title + context */}
          <div className="flex items-center gap-2 px-3 py-1.5">
            <div className="bg-black dark:bg-white px-1.5 py-0.5 shrink-0">
              <span className="text-[9px] font-black uppercase tracking-tight text-white dark:text-black leading-none">
                AI
              </span>
            </div>
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              <div className="bg-[#E02E2E] px-1 py-0.5 shrink-0">
                <span className="text-[7px] font-black uppercase tracking-widest text-white leading-none">
                  {isHighlightContext ? 'SEL' : 'PG'}
                </span>
              </div>
              <span className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground truncate">
                {contextHint}
              </span>
            </div>
          </div>
        </div>

        {/* Quick prompts */}
        {prompts.length > 0 && (
          <div className="shrink-0 flex flex-wrap gap-2 px-4 py-3 bg-black/5 dark:bg-white/5 border-b-2 border-black/10 dark:border-white/10">
            {prompts.map((prompt, index) => {
              const icons = [BookOpen, Quote, Lightbulb, Feather]
              const Icon = icons[index % icons.length]
              return (
                <Button
                  key={prompt.label}
                  variant="ghost"
                  size="sm"
                  className="group h-8 gap-2 rounded-none border-2 border-black/20 dark:border-white/20 bg-background px-3 text-[10px] font-bold uppercase tracking-widest transition-[border-color,background-color,color] duration-200 hover:border-black dark:hover:border-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black"
                  onClick={() => {
                    onPromptSelect(prompt.prompt)
                    chatInputRef.current?.focus()
                  }}
                  disabled={chatSending}
                  type="button"
                >
                  {Icon && <Icon className="h-3.5 w-3.5 opacity-60 group-hover:opacity-100" />}
                  {prompt.label}
                </Button>
              )
            })}
          </div>
        )}

        <ChatMessageList
          messages={messages}
          chatSending={chatSending}
          onDeleteMessage={onDeleteMessage}
          onCitationClick={onCitationClick}
        />

        {onRemoveSnippet && onClearSnippets && (
          <ContextTray
            snippets={stagedSnippets}
            onRemove={onRemoveSnippet}
            onClear={onClearSnippets}
            className="border-x-0 border-t-2 border-b-0 mb-0"
          />
        )}

        {/* Context Shelf */}
        {attachedContext.length > 0 && (
          <div className="shrink-0 flex flex-wrap gap-1.5 px-3 py-2 border-t-2 border-black dark:border-white bg-black/5 dark:bg-white/5">
            {attachedContext.map((h: Highlight) => (
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
  )
}
