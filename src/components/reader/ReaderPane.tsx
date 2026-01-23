import { Headphones } from 'lucide-react'
import React, { type RefObject } from 'react'
import { createPortal } from 'react-dom'
import ReaderLayout from '@/components/ReaderLayout'
import { Button } from '@/components/ui/button'
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover'
import type { PendingHighlight } from '@/lib/readerTypes'

type ReaderPaneProps = {
  columns: 1 | 2
  iframeRef: RefObject<HTMLIFrameElement | null>
  containerRef: RefObject<HTMLDivElement | null>
  srcDoc: string
  onLoad: () => void
  pendingHighlight: PendingHighlight | null
  onCreateHighlight: () => void
  onCancelHighlight: () => void
  onAddToChat?: () => void
  onReadAloud?: (text: string) => void
  activeCitation: {
    content: string
    rect: { top: number; left: number; width: number; height: number }
  } | null
  onActiveCitationChange: (val: any) => void
}

export default function ReaderPane({
  columns,
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
  const [portalContainer] = React.useState(() => typeof document !== 'undefined' ? document.body : null)



  const pendingMenu = pendingHighlight && portalContainer ? createPortal(
    <div
      className="fixed z-[9999] flex flex-col items-center animate-in fade-in zoom-in-95 duration-200"
      style={{
        top: Math.max(16, (pendingHighlight.viewportRect?.top ?? 0) - 60),
        left: (pendingHighlight.viewportRect?.left ?? 0) + (pendingHighlight.viewportRect?.width ?? 0) / 2,
        transform: 'translateX(-50%)',
      }}
      onMouseDown={(e) => e.preventDefault()}
    >
      <div className="flex items-center gap-1 rounded-xl border border-black/10 dark:border-white/10 bg-background/95 backdrop-blur-md shadow-2xl p-1.5 w-max">
        <Button
          size="sm"
          onClick={onCreateHighlight}
          className="h-8 rounded-lg bg-[#E02E2E] text-white hover:bg-[#c02525] hover:scale-105 transition-all font-semibold px-3 shadow-sm text-xs"
        >
          Highlight
        </Button>
        <div className="w-px h-4 bg-border mx-1" />
        <Button
          variant="ghost"
          size="sm"
          onClick={onAddToChat}
          className="h-8 rounded-lg hover:bg-muted font-medium text-xs px-2.5"
        >
          Ask AI
        </Button>
        {onReadAloud && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onReadAloud(pendingHighlight.text)}
            className="h-8 rounded-lg hover:bg-muted font-medium text-xs px-2.5 gap-1.5"
          >
            <Headphones className="h-3.5 w-3.5 opacity-70" />
            <span>Read</span>
          </Button>
        )}
        <div className="w-px h-4 bg-border mx-1" />
        <Button
          variant="ghost"
          size="sm"
          onClick={onCancelHighlight}
          className="h-8 w-8 p-0 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground"
          title="Cancel"
        >
          <span className="sr-only">Cancel</span>
          <svg
            width="15"
            height="15"
            viewBox="0 0 15 15"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
          >
            <path
              d="M11.7816 4.03157C12.0062 3.80702 12.0062 3.44295 11.7816 3.2184C11.5571 2.99385 11.193 2.99385 10.9685 3.2184L7.50005 6.68682L4.03164 3.2184C3.80708 2.99385 3.44301 2.99385 3.21846 3.2184C2.99391 3.44295 2.99391 3.80702 3.21846 4.03157L6.68688 7.49999L3.21846 10.9684C2.99391 11.1929 2.99391 11.557 3.21846 11.7816C3.44301 12.0061 3.80708 12.0061 4.03164 11.7816L7.50005 8.31316L10.9685 11.7816C11.193 12.0061 11.5571 12.0061 11.7816 11.7816C12.0062 11.557 12.0062 11.1929 11.7816 10.9684L8.31322 7.49999L11.7816 4.03157Z"
              fill="currentColor"
              fillRule="evenodd"
              clipRule="evenodd"
            ></path>
          </svg>
        </Button>
      </div>
      {/* Triangle pointer */}
      <div
        className="w-4 h-2 overflow-hidden relative drop-shadow-sm"
        style={{ marginTop: -1 }}
      >
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3 h-3 bg-background/95 backdrop-blur-md rotate-45 border border-black/10 dark:border-white/10 shadow-xl" />
      </div>
    </div>,
    portalContainer
  ) : null

  return (
    <main className="relative h-full min-h-0 min-w-0 overflow-hidden" ref={containerRef}>
      <ReaderLayout columns={columns} style={{ width: '100%', maxWidth: '100%', margin: '0 auto' }}>
        <iframe
          ref={iframeRef}
          title="mobi"
          sandbox="allow-same-origin allow-scripts"
          className="block h-full w-full border-0 bg-transparent"
          srcDoc={srcDoc}
          onLoad={onLoad}
        />
      </ReaderLayout>

      <Popover
        open={!!activeCitation}
        onOpenChange={(open) => !open && onActiveCitationChange(null)}
      >
        {activeCitation && (
          <PopoverAnchor
            style={{
              position: 'absolute',
              top: activeCitation.rect.top,
              left: activeCitation.rect.left,
              width: activeCitation.rect.width,
              height: activeCitation.rect.height,
              pointerEvents: 'none',
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
              __html: activeCitation ? activeCitation.content : '',
            }}
          />
        </PopoverContent>
      </Popover>

      {pendingMenu}
    </main>
  )
}
