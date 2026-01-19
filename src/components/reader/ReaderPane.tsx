import { Button } from "@/components/ui/button";
import ReaderLayout from "@/components/ReaderLayout";
import { Popover, PopoverContent, PopoverAnchor } from "@/components/ui/popover";
import type { RefObject } from "react";
import type { PendingHighlight } from "@/lib/readerTypes";
import { Headphones } from "lucide-react";

type ReaderPaneProps = {
  columns: 1 | 2;
  readerWidth: number;
  iframeRef: RefObject<HTMLIFrameElement | null>;
  containerRef: RefObject<HTMLDivElement | null>;
  srcDoc: string;
  onLoad: () => void;
  pendingHighlight: PendingHighlight | null;
  onCreateHighlight: () => void;
  onCancelHighlight: () => void;
  onAddToChat?: () => void;
  onReadAloud?: (text: string) => void;
  activeCitation: { content: string; rect: { top: number; left: number; width: number; height: number } } | null;
  onActiveCitationChange: (val: any) => void;
};

export default function ReaderPane({
  columns,
  readerWidth,
  iframeRef,
  containerRef,
  srcDoc,
  onLoad,
  pendingHighlight,
  onCreateHighlight,
  onCancelHighlight,
  onAddToChat,
  onReadAloud,
  activeCitation,
  onActiveCitationChange,
}: ReaderPaneProps) {
  return (
    <main className="relative min-h-0" ref={containerRef}>
      <ReaderLayout columns={columns} style={{ width: readerWidth, maxWidth: "100%", margin: "0 auto" }}>
        <iframe
          ref={iframeRef}
          title="mobi"
          sandbox="allow-same-origin allow-scripts"
          className="block h-full w-full border-0 bg-transparent"
          srcDoc={srcDoc}
          onLoad={onLoad}
        />
      </ReaderLayout>

      <Popover open={!!activeCitation} onOpenChange={(open) => !open && onActiveCitationChange(null)}>
        {activeCitation && (
          <PopoverAnchor
            style={{
              position: "absolute",
              top: activeCitation.rect.top,
              left: activeCitation.rect.left,
              width: activeCitation.rect.width,
              height: activeCitation.rect.height,
              pointerEvents: "none",
            }}
          />
        )}
        <PopoverContent 
          className="w-80 max-h-[300px] overflow-y-auto bg-popover p-4 shadow-xl border-border"
          side="top"
          align="center"
        >
          <div 
            className="text-sm leading-relaxed prose prose-sm dark:prose-invert"
            dangerouslySetInnerHTML={{ 
              __html: activeCitation ? activeCitation.content : "" 
            }} 
          />
        </PopoverContent>
      </Popover>

      {pendingHighlight ? (
        <div
          className="absolute z-20 flex -translate-x-1/2 items-center gap-2 rounded-lg border bg-popover p-2 shadow-lg animate-in fade-in zoom-in-95 duration-200"
          style={{
            top: Math.max(16, pendingHighlight.rect.top - 44),
            left: pendingHighlight.rect.left + pendingHighlight.rect.width / 2,
          }}
        >
          <Button size="sm" onClick={onCreateHighlight} className="h-8">
            Highlight
          </Button>
          <Button variant="secondary" size="sm" onClick={onAddToChat} className="h-8">
            Chat
          </Button>
          {onReadAloud && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => onReadAloud(pendingHighlight.text)}
              className="h-8 gap-1.5"
            >
              <Headphones className="h-3.5 w-3.5" />
              <span>Read</span>
            </Button>
          )}
          <div className="w-px h-4 bg-border/60 mx-0.5" />
          <Button variant="ghost" size="sm" onClick={onCancelHighlight} className="h-8 px-2 text-muted-foreground hover:text-foreground">
            Cancel
          </Button>
        </div>
      ) : null}
    </main>
  );
}
