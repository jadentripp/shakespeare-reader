import { useState } from 'react'
import { ReaderContent } from '@/components/reader/ReaderContent'
import { ReaderLightbox } from '@/components/reader/ReaderLightbox'
import { ReaderToolbar } from '@/components/reader/ReaderToolbar'
import { TTSPanel } from '@/components/reader/TTSPanel'
import { useMobiReader } from '@/lib/reader/hooks/useMobiReader'

export default function MobiBookPage(props: { bookId: number }) {
  const reader = useMobiReader(props.bookId)
  const { htmlQ, lightboxImage, setLightboxImage, handleSaveImage } = reader
  const [ttsExpanded, setTtsExpanded] = useState(false)

  if (htmlQ.isLoading) {
    return <div className="px-4 py-6 text-sm text-muted-foreground">Loading book content…</div>
  }

  if (htmlQ.isError) {
    return (
      <div className="px-4 py-6 text-sm text-destructive">
        Failed to load book content. The downloaded files may be missing. Re-download this book from
        Library.
      </div>
    )
  }

  return (
    <div className="mx-auto flex h-screen w-full max-w-[1800px] flex-col overflow-hidden border-x-2 border-black dark:border-white bg-background">
      <ReaderToolbar reader={reader} onTtsSettings={() => setTtsExpanded(true)} />
      <div className="flex flex-col flex-1 h-full min-h-0 min-w-0 overflow-hidden">
        <ReaderContent reader={reader} />
      </div>
      <TTSPanel expanded={ttsExpanded} onExpandChange={setTtsExpanded} tts={reader.tts} />

      {lightboxImage && (
        <ReaderLightbox
          image={lightboxImage}
          onClose={() => setLightboxImage(null)}
          onSave={handleSaveImage}
        />
      )}
    </div>
  )
}
