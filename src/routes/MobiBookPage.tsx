import { useState } from "react";
import { useMobiReader } from "@/lib/reader/hooks/useMobiReader";
import { ReaderToolbar } from "@/components/reader/ReaderToolbar";
import { ReaderContent } from "@/components/reader/ReaderContent";
import { ReaderLightbox } from "@/components/reader/ReaderLightbox";
import { TTSPanel } from "@/components/reader/TTSPanel";

export default function MobiBookPage(props: { bookId: number }) {
  const reader = useMobiReader(props.bookId);
  const { htmlQ, lightboxImage, setLightboxImage, handleSaveImage } = reader;
  const [ttsExpanded, setTtsExpanded] = useState(false);

  if (htmlQ.isLoading) {
    return <div className="px-4 py-6 text-sm text-muted-foreground">Loading book content...</div>;
  }
  
  if (htmlQ.isError) {
    return (
      <div className="px-4 py-6 text-sm text-destructive">
        Failed to load book content. The downloaded files may be missing. Re-download this book from Library.
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-3rem)] max-w-[1800px] flex-col gap-2 overflow-hidden px-4 py-2">
      <ReaderToolbar 
        reader={reader} 
        onTtsSettings={() => setTtsExpanded(true)}
      />
      <ReaderContent reader={reader} />
      <TTSPanel 
        expanded={ttsExpanded} 
        onExpandChange={setTtsExpanded}
      />
      {lightboxImage && (
        <ReaderLightbox 
          image={lightboxImage} 
          onClose={() => setLightboxImage(null)} 
          onSave={handleSaveImage} 
        />
      )}
    </div>
  );
}