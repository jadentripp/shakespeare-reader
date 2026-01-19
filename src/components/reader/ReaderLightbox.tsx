import { Button } from "@/components/ui/button";
import { Download, X } from "lucide-react";

type ReaderLightboxProps = {
  image: { src: string; alt?: string };
  onClose: () => void;
  onSave: (src: string) => void;
};

export function ReaderLightbox({ image, onClose, onSave }: ReaderLightboxProps) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative max-h-full max-w-full">
        <img
          src={image.src}
          alt={image.alt}
          className="max-h-[90vh] max-w-full rounded-md shadow-2xl object-contain"
        />
        <div className="absolute -top-12 right-0 flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onSave(image.src)}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Save Image
          </Button>
          <Button
            variant="secondary"
            size="icon"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        {image.alt && (
          <p className="absolute -bottom-8 left-0 right-0 text-center text-sm text-white/80 italic">
            {image.alt}
          </p>
        )}
      </div>
    </div>
  );
}
