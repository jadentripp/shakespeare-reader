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
  );
}
