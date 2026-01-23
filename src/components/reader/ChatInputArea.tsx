import { Send } from 'lucide-react'
import type { RefObject } from 'react'
import { Button } from '@/components/ui/button'
import {
  PromptInput,
  PromptInputAction,
  PromptInputActions,
  PromptInputTextarea,
} from '@/components/ui/prompt-input'

type ChatInputAreaProps = {
  chatInput: string
  onChatInputChange: (value: string) => void
  onSend: () => void
  chatSending: boolean
  chatInputRef: RefObject<HTMLTextAreaElement | null>
  placeholder?: string
}

export function ChatInputArea({
  chatInput,
  onChatInputChange,
  onSend,
  chatSending,
  chatInputRef,
  placeholder = 'Ask about the text…',
}: ChatInputAreaProps) {
  return (
    <div className="shrink-0 border-t-2 border-black dark:border-white bg-background p-4">
      <PromptInput
        value={chatInput}
        onValueChange={onChatInputChange}
        onSubmit={onSend}
        isLoading={chatSending}
        className="rounded-none border-2 border-black/20 dark:border-white/20 bg-background shadow-none backdrop-blur-sm transition-[border-color] focus-within:border-black dark:focus-within:border-white"
      >
        <PromptInputTextarea
          ref={chatInputRef}
          placeholder={placeholder}
          className="min-h-[48px] text-sm placeholder:text-muted-foreground/50 rounded-none font-medium"
        />
        <PromptInputActions className="justify-between pt-3 border-t-2 border-black/10 dark:border-white/10 mt-2">
          <span className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60">
            <kbd className="rounded-none bg-black text-white dark:bg-white dark:text-black px-1.5 py-0.5 font-mono text-[9px]">
              CMD
            </kbd>
            <span>+</span>
            <kbd className="rounded-none bg-black text-white dark:bg-white dark:text-black px-1.5 py-0.5 font-mono text-[9px]">
              ENTER
            </kbd>
          </span>
          <PromptInputAction tooltip="Send message">
            <Button
              size="sm"
              onClick={onSend}
              disabled={chatSending || !chatInput.trim()}
              className="h-9 gap-2 rounded-none bg-[#E02E2E] px-4 font-bold uppercase tracking-widest text-[10px] text-white shadow-none transition-[background-color,opacity] hover:bg-black disabled:opacity-40"
            >
              <Send className="h-3.5 w-3.5" />
              <span>Send</span>
            </Button>
          </PromptInputAction>
        </PromptInputActions>
      </PromptInput>
    </div>
  )
}
