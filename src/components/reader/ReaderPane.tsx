import { Button } from "@/components/ui/button";
import ReaderLayout from "@/components/ReaderLayout";
import type { RefObject } from "react";
import type { PendingHighlight } from "@/lib/readerTypes";

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
      {pendingHighlight ? (
        <div
          className="absolute z-20 flex -translate-x-1/2 items-center gap-2 rounded-lg border bg-popover p-2 shadow-lg"
          style={{
            top: Math.max(16, pendingHighlight.rect.top - 44),
            left: pendingHighlight.rect.left + pendingHighlight.rect.width / 2,
          }}
        >
          <Button size="sm" onClick={onCreateHighlight}>
            Highlight &amp; Note
          </Button>
          <Button variant="outline" size="sm" onClick={onCancelHighlight}>
            Cancel
          </Button>
        </div>
      ) : null}
    </main>
  );
}
