import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Loader } from "@/components/ui/loader";
import { cn } from "@/lib/utils";
import type { ChatPrompt, LocalChatMessage } from "@/lib/readerTypes";
import type { RefObject } from "react";
import { Send } from "lucide-react";

type ChatSidebarProps = {
  contextHint: string;
  messages: LocalChatMessage[];
  prompts: ChatPrompt[];
  chatInput: string;
  onChatInputChange: (value: string) => void;
  onPromptSelect: (prompt: string) => void;
  onSend: () => void;
  chatSending: boolean;
  chatInputRef: RefObject<HTMLTextAreaElement | null>;
};

export default function ChatSidebar({
  contextHint,
  messages,
  prompts,
  chatInput,
  onChatInputChange,
  onPromptSelect,
  onSend,
  chatSending,
  chatInputRef,
}: ChatSidebarProps) {
  return (
    <aside className="min-h-0">
      <Card className="flex h-full flex-col overflow-hidden">
        <CardHeader className="flex flex-row items-start justify-between gap-4 pb-3">
          <div>
            <CardTitle>AI Assistant</CardTitle>
            <p className="text-sm text-muted-foreground">{contextHint}</p>
          </div>
          <Badge
            variant={chatSending ? "secondary" : "outline"}
            className={cn(chatSending && "bg-primary/10 text-primary")}
          >
            {chatSending ? "Thinking..." : "Ready"}
          </Badge>
        </CardHeader>
        <CardContent className="flex flex-1 min-h-0 flex-col gap-3 pb-4">
          {prompts.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {prompts.map((prompt) => (
                <Button
                  key={prompt.label}
                  variant="secondary"
                  size="sm"
                  className="h-7 rounded-full px-3 text-xs"
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

          <ChatContainerRoot className="flex-1 min-h-0">
            <ChatContainerContent className="gap-4 p-1">
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
                          src={isUser ? "" : ""}
                          alt={isUser ? "You" : "Assistant"}
                          fallback={isUser ? "U" : "AI"}
                          className={cn(
                            "h-7 w-7 text-xs",
                            isUser ? "bg-primary text-primary-foreground" : "bg-muted"
                          )}
                        />
                        <MessageContent
                          className={cn(
                            "max-w-[85%] text-sm",
                            isUser && "bg-primary text-primary-foreground"
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
                        className="h-7 w-7 text-xs bg-muted"
                      />
                      <div className="rounded-lg p-2 text-foreground bg-secondary max-w-[85%] text-sm">
                        <Loader variant="loading-dots" size="sm" text="Thinking" />
                      </div>
                    </Message>
                  )}
                </>
              ) : (
                <div className="flex h-full items-center justify-center">
                  <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground max-w-[260px]">
                    Ask questions about the text, request summaries, or explore interpretations.
                  </div>
                </div>
              )}
              <ChatContainerScrollAnchor />
            </ChatContainerContent>
          </ChatContainerRoot>

          <div className="pt-2 border-t">
            <PromptInput
              value={chatInput}
              onValueChange={onChatInputChange}
              onSubmit={onSend}
              isLoading={chatSending}
              className="rounded-xl"
            >
              <PromptInputTextarea
                ref={chatInputRef}
                placeholder="Ask about the text..."
                className="min-h-[60px]"
              />
              <PromptInputActions className="justify-end pt-2">
                <PromptInputAction tooltip="Send message">
                  <Button
                    size="sm"
                    onClick={onSend}
                    disabled={chatSending || !chatInput.trim()}
                  >
                    <Send className="h-4 w-4 mr-1.5" />
                    Send
                  </Button>
                </PromptInputAction>
              </PromptInputActions>
            </PromptInput>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Press Enter to send
            </p>
          </div>
        </CardContent>
      </Card>
    </aside>
  );
}
