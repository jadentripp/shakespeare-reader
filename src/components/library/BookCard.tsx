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
}: BookCardProps) {
  if (isLocal) {
    return (
      <div className="group relative overflow-hidden rounded-xl border border-border/40 bg-card transition-all duration-200 hover:border-border hover:shadow-lg">
        <Link to="/book/$bookId" params={{ bookId: String(id) }} className="block">
          <div className="aspect-[2/3] w-full overflow-hidden bg-gradient-to-br from-stone-100 to-stone-200 dark:from-stone-800 dark:to-stone-900">
            {coverUrl ? (
              <img
                src={coverUrl}
                alt=""
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <BookOpen className="h-12 w-12 text-stone-300 dark:text-stone-600" />
              </div>
            )}
          </div>
          <div className="p-4">
            <h3 className="font-medium leading-tight text-foreground line-clamp-2 group-hover:text-amber-600 dark:group-hover:text-amber-400">
              {title}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">{authors}</p>
            {progress !== undefined && progress > 0 && (
              <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                <BookOpen className="h-3 w-3" />
                Page {progress}
              </div>
            )}
          </div>
        </Link>
        <div className="flex items-center justify-between border-t border-border/40 px-4 py-2">
          <Button asChild variant="ghost" size="sm" className="h-8 gap-1.5 px-2 text-xs">
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
                className="h-8 gap-1.5 px-2 text-xs text-muted-foreground hover:text-destructive"
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

  // Gutenberg Catalog Card
  return (
    <div
      className={`group flex gap-4 rounded-xl border bg-background p-4 transition-all hover:shadow-md ${resultType === "primary" && popular
        ? "border-amber-200/60 dark:border-amber-800/40"
        : resultType === "tangential"
          ? "border-border/30 opacity-75"
          : "border-border/40"
        }`}
    >
      {/* Cover Image */}
      <div className="relative h-24 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-gradient-to-br from-stone-100 to-stone-200 shadow-sm dark:from-stone-800 dark:to-stone-900">
        {coverUrl ? (
          <img src={coverUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center">
            <BookOpen className="h-6 w-6 text-stone-400" />
          </div>
        )}
        {popular && resultType === "primary" && (
          <div className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-[10px] shadow-sm">
            ⭐
          </div>
        )}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-start gap-2">
          <h4 className="font-medium leading-tight text-foreground line-clamp-2 group-hover:text-amber-600 dark:group-hover:text-amber-400">
            {title}
          </h4>
        </div>

        <p className="text-sm text-muted-foreground">{authors}</p>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          {resultType === "primary" && catalogSearch && (
            <Badge variant="secondary" className="gap-1 bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
              <BookMarked className="h-3 w-3" />
              Primary work
            </Badge>
          )}
          {resultType === "related" && catalogSearch && (
            <Badge variant="outline" className="gap-1 text-xs">
              <FileText className="h-3 w-3" />
              Related
            </Badge>
          )}
          {resultType === "tangential" && catalogSearch && (
            <Badge variant="outline" className="gap-1 text-xs opacity-60">
              Mentions "{catalogSearch}"
            </Badge>
          )}
          {popular && resultType === "primary" && (
            <Badge variant="secondary" className="gap-1 bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
              <Sparkles className="h-3 w-3" />
              Popular
            </Badge>
          )}
          {downloadCount && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Download className="h-3 w-3" />
              {downloadCount} downloads
            </span>
          )}
          <span className="text-xs text-muted-foreground">#{gutenbergId}</span>
          {alreadyInLibrary && (
            <Badge variant="secondary" className="text-xs">
              In Library
            </Badge>
          )}
          {isQueued && (
            <Badge variant="outline" className="text-xs">
              Queued
            </Badge>
          )}
        </div>
      </div>

      {/* Action */}
      <div className="flex flex-shrink-0 flex-col items-end justify-center gap-2">
        {mobiUrl ? (
          <Button
            size="sm"
            variant={alreadyInLibrary ? "secondary" : "default"}
            disabled={alreadyInLibrary || isQueued}
            onClick={onAdd}
            className="min-w-[80px]"
          >
            {alreadyInLibrary ? "Added" : isQueued ? "Queued" : "Add"}
          </Button>
        ) : (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  disabled
                  className="min-w-[80px] cursor-not-allowed opacity-50"
                >
                  Unavailable
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>No MOBI format available for this book</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
    </div>
  );
}
