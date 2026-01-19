import { Link } from "@tanstack/react-router";
import { BookOpen, Trash2, Download, Sparkles, FileText, BookMarked } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";

interface BookCardProps {
  id: number;
  gutenbergId: number;
  title: string;
  authors: string;
  coverUrl: string | null;
  progress?: number;
  isLocal: boolean;
  onDelete?: (id: number) => Promise<void>;
  // For catalog results
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

export function BookCard({
  id,
  gutenbergId,
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
  resultType,
  catalogSearch,
  variant,
}: BookCardProps) {
  const effectiveVariant = variant || (isLocal ? "grid" : "list");

  const CoverImage = ({ className = "" }: { className?: string }) => (
    <div className={`relative overflow-hidden bg-gradient-to-br from-stone-100 to-stone-200 shadow-sm transition-shadow group-hover:shadow-md dark:from-stone-800 dark:to-stone-900 ${className}`}>
      {coverUrl ? (
        <img
          src={coverUrl}
          alt=""
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      ) : (
        <div className="flex h-full items-center justify-center">
          <BookOpen className="h-8 w-8 text-stone-300 dark:text-stone-600" />
        </div>
      )}
      {popular && resultType === "primary" && effectiveVariant === "list" && (
        <div className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-[10px] shadow-sm">
          ⭐
        </div>
      )}
      {progress !== undefined && progress > 0 && (
        <div 
          className="absolute bottom-0 left-0 h-1 bg-amber-500 transition-all duration-300" 
          style={{ width: `${Math.min(100, progress)}%` }}
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      )}
    </div>
  );

  if (effectiveVariant === "grid") {
    return (
      <div className="group relative flex flex-col overflow-hidden rounded-xl border border-border/40 bg-card transition-all duration-300 hover:border-border/80 hover:shadow-xl">
        <Link to="/book/$bookId" params={{ bookId: String(id) }} className="block flex-1">
          <CoverImage className="aspect-[2/3] w-full" />
          <div className="p-4">
            <h3 className="font-serif text-lg font-medium leading-tight text-foreground line-clamp-2 transition-colors group-hover:text-amber-600 dark:group-hover:text-amber-400">
              {title}
            </h3>
            <p className="mt-1.5 text-sm text-muted-foreground line-clamp-1">{authors}</p>
            {progress !== undefined && progress > 0 && (
              <div className="mt-3 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-amber-600 dark:text-amber-400">
                <div className="h-1 flex-1 overflow-hidden rounded-full bg-stone-200 dark:bg-stone-800">
                  <div 
                    className="h-full bg-current transition-all duration-300" 
                    style={{ width: `${Math.min(100, progress)}%` }}
                  />
                </div>
                <span>{progress}%</span>
              </div>
            )}
          </div>
        </Link>
        <div className="flex items-center justify-between border-t border-border/40 bg-stone-50/50 px-4 py-2 dark:bg-stone-900/50">
          <Button asChild variant="ghost" size="sm" className="h-8 gap-1.5 px-2 text-xs font-medium">
            <Link to="/book/$bookId" params={{ bookId: String(id) }}>
              <BookOpen className="h-3.5 w-3.5" />
              {progress !== undefined && progress > 0 ? "Continue" : "Read"}
            </Link>
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5 px-2 text-xs text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete "{title}"?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete this book and its downloaded files.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={() => onDelete?.(id)}
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    );
  }

  // List Variant (Default for Catalog)
  return (
    <div
      className={`group flex gap-4 rounded-xl border p-4 transition-all duration-300 hover:shadow-md ${resultType === "primary" && popular
          ? "border-amber-200/60 bg-amber-50/10 dark:border-amber-800/40 dark:bg-amber-900/5"
          : resultType === "tangential"
            ? "border-border/20 opacity-75"
            : "border-border/40 bg-card"
        }`}
    >
      <CoverImage className="h-28 w-20 flex-shrink-0 rounded-lg" />

      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex items-start justify-between gap-2">
          <h4 className="font-serif text-base font-medium leading-tight text-foreground line-clamp-2 transition-colors group-hover:text-amber-600 dark:group-hover:text-amber-400">
            {title}
          </h4>
          <span className="text-[10px] font-mono text-muted-foreground/60">#{gutenbergId}</span>
        </div>

        <p className="text-sm text-muted-foreground line-clamp-1">{authors}</p>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          {resultType === "primary" && catalogSearch && (
            <Badge variant="secondary" className="h-5 gap-1 border-emerald-200/50 bg-emerald-50 text-[10px] font-medium text-emerald-800 dark:border-emerald-800/30 dark:bg-emerald-900/20 dark:text-emerald-300">
              <BookMarked className="h-2.5 w-2.5" />
              Primary work
            </Badge>
          )}
          {resultType === "related" && catalogSearch && (
            <Badge variant="outline" className="h-5 gap-1 text-[10px] font-medium">
              <FileText className="h-2.5 w-2.5" />
              Related
            </Badge>
          )}
          {popular && resultType === "primary" && (
            <Badge variant="secondary" className="h-5 gap-1 border-amber-200/50 bg-amber-50 text-[10px] font-medium text-amber-800 dark:border-amber-800/30 dark:bg-amber-900/20 dark:text-amber-300">
              <Sparkles className="h-2.5 w-2.5" />
              Popular
            </Badge>
          )}
          {downloadCount && (
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Download className="h-3 w-3" />
              {downloadCount}
            </span>
          )}
          {alreadyInLibrary && (
            <Badge variant="secondary" className="h-5 border-stone-200 bg-stone-100 text-[10px] font-medium dark:border-stone-800 dark:bg-stone-800/50">
              In Library
            </Badge>
          )}
          {isQueued && (
            <Badge variant="outline" className="h-5 text-[10px] font-medium animate-pulse">
              Queued
            </Badge>
          )}
        </div>
      </div>

      <div className="flex flex-shrink-0 flex-col items-end justify-center gap-2">
        {mobiUrl ? (
          <Button
            size="sm"
            variant={alreadyInLibrary ? "secondary" : "default"}
            disabled={alreadyInLibrary || isQueued}
            onClick={onAdd}
            className="h-8 min-w-[70px] text-xs font-medium"
          >
            {alreadyInLibrary ? "Added" : isQueued ? "Queued" : "Add"}
          </Button>
        ) : (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="cursor-not-allowed opacity-50">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled
                    className="h-8 min-w-[70px] text-xs"
                  >
                    N/A
                  </Button>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>No MOBI format available</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
    </div>
  );
}