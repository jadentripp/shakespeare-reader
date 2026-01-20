import { Button } from "@/components/ui/button";
import {
  ChatContainerRoot,
  ChatContainerContent,
  ChatContainerScrollAnchor,
} from "@/components/ui/chat-container";
import { Message, MessageAvatar, MessageContent, MessageAction } from "@/components/ui/message";
import { Loader } from "@/components/ui/loader";
import { cn } from "@/lib/utils";
import { Trash2, Feather, Quote } from "lucide-react";
import type { LocalChatMessage } from "@/lib/readerTypes";

type ChatMessageListProps = {
  messages: LocalChatMessage[];
  chatSending: boolean;
  onDeleteMessage?: (id: number) => void;
  onCitationClick?: (index: number, snippet?: string) => void;
};

export function ChatMessageList({
  messages,
  chatSending,
  onDeleteMessage,
  onCitationClick,
}: ChatMessageListProps) {
  return (
    <ChatContainerRoot className="flex-1 min-h-0 bg-background">
      <ChatContainerContent className="gap-8 p-6">
        {messages.length ? (
          <>
            {messages.map((message: any) => {
              const isUser = message.role === "user";
              return (
                <div key={message.id} className="group/msg relative flex flex-col gap-2">
                  <div className={cn(
                    "flex items-center gap-2",
                    isUser ? "flex-row-reverse" : "flex-row"
                  )}>
                    <div className={cn(
                      "h-3 w-3 rounded-none",
                      isUser ? "bg-[#E02E2E]" : "bg-black dark:bg-white"
                    )} />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/50">
                      {isUser ? "READER" : "ASSISTANT"}
                    </span>
                  </div>

                  <div className={cn(
                    "relative pl-4 border-l-4 transition-all",
                    isUser 
                      ? "border-[#E02E2E] bg-[#E02E2E]/5" 
                      : "border-black dark:border-white bg-black/5 dark:bg-white/5"
                  )}>
                    <Message
                      className="bg-transparent border-none p-0 shadow-none"
                    >
                      <MessageContent
                        markdown={!isUser}
                        onCitationClick={message.onCitationClick ?? onCitationClick}
                        className="w-full text-[13px] font-medium leading-relaxed py-3 pr-4 text-foreground prose-sm dark:prose-invert"
                      >
                        {message.content}
                      </MessageContent>
                    </Message>

                    {onDeleteMessage && (
                      <div className="absolute top-2 right-2 opacity-0 group-hover/msg:opacity-100 transition-all">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 rounded-none bg-background border border-black/10 dark:border-white/10 hover:bg-[#E02E2E] hover:text-white"
                          onClick={() => onDeleteMessage(Number(message.id))}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            {chatSending && (
              <div className="flex flex-col gap-2 animate-pulse">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 bg-[#FFD700] rounded-none" />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#FFD700]">
                    THINKING
                  </span>
                </div>
                <div className="pl-4 border-l-4 border-[#FFD700] bg-[#FFD700]/5 py-4">
                  <div className="flex gap-1">
                    <div className="h-1.5 w-1.5 bg-[#FFD700]" />
                    <div className="h-1.5 w-1.5 bg-[#FFD700] opacity-50" />
                    <div className="h-1.5 w-1.5 bg-[#FFD700] opacity-25" />
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex h-full items-center justify-center py-12">
            <div className="relative text-left w-full max-w-[320px]">
              {/* Bauhaus Composition Empty State */}
              <div className="relative mb-12 h-48 border-4 border-black dark:border-white">
                <div className="absolute top-0 left-0 w-1/2 h-full border-r-4 border-black dark:border-white" />
                <div className="absolute bottom-0 left-0 w-full h-1/3 border-t-4 border-black dark:border-white" />
                <div className="absolute top-6 left-6 h-12 w-12 bg-[#E02E2E]" />
                <div className="absolute bottom-6 right-6 h-16 w-16 rounded-none bg-[#007FFF]" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-[#FFD700]" />
              </div>
              
              <div className="space-y-4">
                <div className="inline-block bg-black dark:bg-white px-2 py-1">
                  <h3 className="font-sans text-xs font-black uppercase tracking-tighter text-white dark:text-black">
                    LITERARY ASSISTANT
                  </h3>
                </div>
                <p className="text-[11px] font-bold uppercase tracking-[0.25em] leading-loose text-foreground/70">
                  DECONSTRUCT THE TEXT. <br/>
                  ANALYZE THE NARRATIVE. <br/>
                  UNCOVER THE MEANING.
                </p>
              </div>

              <div className="mt-8 h-1 w-24 bg-[#E02E2E]" />
            </div>
          </div>
        )}
        <ChatContainerScrollAnchor />
      </ChatContainerContent>
    </ChatContainerRoot>
  );
}
