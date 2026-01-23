import { Link } from "@tanstack/react-router";
import { BookOpen, Download, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export interface BookCardProps {
  id: number;
  gutenbergId: number;
  title: string;
  authors: string;
  coverUrl: string | null;
  progress?: number;
  isLocal: boolean;
  onDelete?: (id: number) => Promise<void>;
  // Catalog/download props
  mobiUrl?: string | null;
  alreadyInLibrary?: boolean;
  isQueued?: boolean;
  onAdd?: () => void;
  popular?: boolean;
  downloadCount?: string;
  resultType?: "primary" | "related" | "tangential";
  catalogSearch?: string;
  variant?: "grid" | "list";
}

export function BookCardMinimal({
  id,
  title,
  authors,
  coverUrl,
  progress,
  isLocal,
  onDelete,
  mobiUrl,
  alreadyInLibrary,
  isQueued,
  onAdd,
  popular,
  downloadCount,
}: BookCardProps) {
  // Determine if this is a downloadable catalog book
  const canDownload = !isLocal && !alreadyInLibrary && mobiUrl && onAdd;
  const showAsLocal = isLocal || alreadyInLibrary;

  return (
    <div className="group relative flex w-full flex-col bg-background">
      {/* Cover Container */}
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-stone-100 dark:bg-stone-800">
        {coverUrl ? (
          <img
            src={coverUrl}
            alt={title}
            width={300}
            height={450}
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <BookOpen className="h-12 w-12 text-stone-300 dark:text-stone-600" />
          </div>
        )}

        {/* Popular Badge */}
        {popular && (
          <div className="absolute left-2 top-2 bg-amber-500 px-2 py-1">
            <span className="font-mono text-[9px] font-bold uppercase tracking-widest text-black">
              Popular
            </span>
          </div>
        )}

        {/* Download Count Badge */}
        {downloadCount && !popular && (
          <div className="absolute left-2 top-2 bg-stone-900/80 px-2 py-1 backdrop-blur-sm">
            <span className="font-mono text-[9px] font-bold uppercase tracking-widest text-white tabular-nums">
              {downloadCount}
            </span>
          </div>
        )}

        {/* Hover Overlay */}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-stone-950/80 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          {showAsLocal ? (
            <>
              {/* Local book - Read button */}
              <Link to="/book/$bookId" params={{ bookId: String(id) }}>
                <Button
                  variant="outline"
                  className="h-10 w-32 rounded-none border-2 border-white bg-transparent text-xs font-bold uppercase tracking-widest text-white hover:bg-white hover:text-black hover:border-white"
                >
                  Read
                </Button>
              </Link>

              {/* Delete button */}
              {onDelete && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      className="h-10 w-32 rounded-none text-xs font-bold uppercase tracking-widest text-stone-400 hover:bg-red-900/30 hover:text-red-500"
                    >
                      Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="rounded-none border-2 border-black dark:border-white">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="font-sans text-xl font-bold uppercase">Delete Book?</AlertDialogTitle>
                      <AlertDialogDescription className="font-mono text-xs">
                        This action cannot be undone. This will permanently delete “{title}” from your library.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="rounded-none border-2 border-transparent hover:underline">Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        className="rounded-none bg-red-600 font-bold uppercase text-white hover:bg-red-700"
                        onClick={() => onDelete?.(id)}
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </>
          ) : canDownload ? (
            /* Catalog book - Download button */
            <Button
              variant="outline"
              className="h-10 w-40 rounded-none border-2 border-amber-500 bg-transparent text-xs font-bold uppercase tracking-widest text-amber-500 hover:bg-amber-500 hover:text-black"
              onClick={onAdd}
            >
              <Download className="mr-2 h-4 w-4" />
              Add to Library
            </Button>
          ) : isQueued ? (
            /* Already queued */
            <div className="flex items-center gap-2 px-4 py-2">
              <Loader2 className="h-4 w-4 animate-spin text-amber-500" />
              <span className="font-mono text-xs font-bold uppercase tracking-widest text-amber-500">
                Downloading…
              </span>
            </div>
          ) : alreadyInLibrary ? (
            /* Already in library indicator */
            <div className="flex items-center gap-2 px-4 py-2">
              <Check className="h-4 w-4 text-green-500" />
              <span className="font-mono text-xs font-bold uppercase tracking-widest text-green-500">
                In Library
              </span>
            </div>
          ) : !mobiUrl ? (
            /* No mobi available */
            <span className="font-mono text-xs font-bold uppercase tracking-widest text-stone-500">
              Not Available
            </span>
          ) : null}
        </div>

        {/* Progress Bar - Geometric Line */}
        {progress !== undefined && progress > 0 && (
          <div className="absolute bottom-0 left-0 h-1.5 w-full bg-stone-800/50 backdrop-blur-sm">
            <div
              className="h-full bg-amber-500 transition-[width] duration-300"
              style={{ width: `${Math.min(100, progress)}%` }}
              role="progressbar"
              aria-valuenow={progress}
            />
          </div>
        )}
      </div>

      {/* Typography Info */}
      <div className="mt-3 select-none">
        <h3 className="line-clamp-1 font-sans text-lg font-bold leading-none tracking-tight text-foreground transition-[color] group-hover:text-amber-600 [text-wrap:balance]">
          {title}
        </h3>
        <p className="mt-1 line-clamp-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          {authors}
        </p>
      </div>
    </div>
  );
}

