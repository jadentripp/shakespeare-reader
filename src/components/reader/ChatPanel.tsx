import type { RefObject } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Markdown } from '@/components/ui/markdown'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Textarea } from '@/components/ui/textarea'
import type { ChatPrompt, LocalChatMessage } from '@/lib/readerTypes'
import { cn } from '@/lib/utils'

type ChatPanelProps = {
  contextHint: string
  messages: LocalChatMessage[]
  prompts: ChatPrompt[]
  chatInput: string
  onChatInputChange: (value: string) => void
  onPromptSelect: (prompt: string) => void
  onSend: () => void
  chatSending: boolean
  chatInputRef: RefObject<HTMLTextAreaElement | null>
}

export default function ChatPanel({
  contextHint,
  messages,
  prompts,
  chatInput,
  onChatInputChange,
  onPromptSelect,
  onSend,
  chatSending,
  chatInputRef,
}: ChatPanelProps) {
  return (
    <div className="flex flex-1 min-h-0 flex-col gap-3 rounded-xl border bg-card/70 p-3 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">Ask the Folio Guide</div>
          <div className="text-xs text-muted-foreground">{contextHint}</div>
        </div>
        <Badge
          variant={chatSending ? 'secondary' : 'outline'}
          className={cn(chatSending && 'bg-primary/10 text-primary')}
        >
          {chatSending ? 'Thinking...' : 'Ready'}
        </Badge>
      </div>

      <div className="flex flex-wrap gap-2">
        {prompts.map((prompt) => (
          <Button
            key={prompt.label}
            variant="secondary"
            size="sm"
            className="h-7 rounded-full px-3 text-xs"
            onClick={() => {
              onPromptSelect(prompt.prompt)
              chatInputRef.current?.focus()
            }}
            disabled={chatSending}
            type="button"
          >
            {prompt.label}
          </Button>
        ))}
      </div>

      <ScrollArea className="flex-1 min-h-0 pr-3">
        {messages.length ? (
          <div className="space-y-3">
            {messages.map((message) => {
              const isUser = message.role === 'user'
              const roleLabel = isUser ? 'You' : 'AI Guide'
              return (
                <div
                  key={message.id}
                  className={cn('flex', isUser ? 'justify-end' : 'justify-start')}
                >
                  <div
                    className={cn(
                      'max-w-[85%] rounded-xl border p-3 text-sm shadow-sm',
                      isUser ? 'bg-primary text-primary-foreground' : 'bg-muted/40',
                    )}
                  >
                    <div
                      className={cn(
                        'text-[10px] uppercase tracking-wide',
                        isUser ? 'text-primary-foreground/70' : 'text-muted-foreground',
                      )}
                    >
                      {roleLabel}
                    </div>
                    {isUser ? (
                      <div className="whitespace-pre-wrap leading-relaxed">{message.content}</div>
                    ) : (
                      <Markdown
                        className="leading-relaxed"
                        onCitationClick={message.onCitationClick}
                      >
                        {message.content}
                      </Markdown>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed p-3 text-center text-sm text-muted-foreground">
            Ask for a summary, translation, or explanation of the passage.
          </div>
        )}
      </ScrollArea>

      <div className="space-y-2">
        <Textarea
          ref={chatInputRef}
          className="min-h-[64px] max-h-28 resize-y"
          value={chatInput}
          onChange={(e) => onChatInputChange(e.currentTarget.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
              e.preventDefault()
              onSend()
            }
          }}
          placeholder="Ask about the meaning, context, or interpretation…"
        />
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">Press Cmd/Ctrl + Enter to send</span>
          <Button onClick={onSend} disabled={chatSending}>
            {chatSending ? 'Sending...' : 'Send'}
          </Button>
        </div>
      </div>
    </div>
  )
}
