import { Download, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

type ReaderLightboxProps = {
  image: { src: string; alt?: string }
  onClose: () => void
  onSave: (src: string) => void
}

export function ReaderLightbox({ image, onClose, onSave }: ReaderLightboxProps) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-8 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative max-h-full max-w-full">
        <img
          src={image.src}
          alt={image.alt}
          className="max-h-[85vh] max-w-full rounded-none border-4 border-white shadow-none object-contain"
        />
        <div className="absolute -top-12 right-0 flex gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onSave(image.src)}
            className="gap-2 rounded-none bg-white text-black hover:bg-[#E02E2E] hover:text-white font-black uppercase tracking-widest text-[10px] h-9 px-4 border-2 border-white"
          >
            <Download className="h-4 w-4" />
            Save Image
          </Button>
          <Button
            variant="secondary"
            size="icon"
            onClick={onClose}
            className="rounded-none bg-white text-black hover:bg-[#E02E2E] hover:text-white border-2 border-white h-9 w-9"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        {image.alt && (
          <div className="absolute -bottom-12 left-0 right-0 bg-white/10 px-4 py-2 border-l-4 border-[#E02E2E]">
            <p className="text-center text-[10px] font-bold uppercase tracking-widest text-white">
              {image.alt}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
