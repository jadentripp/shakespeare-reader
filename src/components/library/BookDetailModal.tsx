import {
  BookOpen,
  Calendar,
  Check,
  Download,
  ExternalLink,
  Globe,
  Library,
  Loader2,
  Tag,
  Users,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { authorsString, coverUrl, formatDownloadCount, isPopular } from '../../lib/gutenbergUtils'
import type { GutendexBook } from '../../lib/tauri'

export interface BookDetailModalProps {
  book: GutendexBook | null
  open: boolean
  onOpenChange: (open: boolean) => void
  isLocal: boolean
  isQueued: boolean
  mobiUrl: string | null
  onAdd: () => void
}

export function BookDetailModal({
  book,
  open,
  onOpenChange,
  isLocal,
  isQueued,
  mobiUrl,
  onAdd,
}: BookDetailModalProps) {
  if (!book) return null

  const cover = coverUrl(book)
  const authors = authorsString(book)
  const popular = isPopular(book.download_count)
  const downloadStr = formatDownloadCount(book.download_count)
  const canDownload = !isLocal && mobiUrl

  // Get first author's dates for display
  const firstAuthor = book.authors?.[0]
  const authorDates =
    firstAuthor?.birth_year || firstAuthor?.death_year
      ? `${firstAuthor.birth_year ?? '?'} – ${firstAuthor.death_year ?? '?'}`
      : null

  // Clean up bookshelves (remove "Category: " prefix)
  const cleanBookshelves = book.bookshelves?.map((b) => b.replace(/^Category:\s*/i, '')) ?? []

  // Get primary language
  const language = book.languages?.[0]?.toUpperCase() ?? 'EN'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl overflow-hidden rounded-none border-4 border-black p-0 dark:border-white">
        <DialogDescription className="sr-only">
          Details and download options for {book.title}
        </DialogDescription>
        {/* Header with cover background */}
        <div className="relative bg-gradient-to-br from-stone-900 via-stone-800 to-stone-900">
          {/* Background blur of cover */}
          {cover && (
            <div
              className="absolute inset-0 opacity-30 blur-2xl"
              style={{ backgroundImage: `url(${cover})`, backgroundSize: 'cover' }}
            />
          )}

          <div className="relative flex gap-6 p-6">
            {/* Cover Image */}
            <div className="relative flex-shrink-0">
              <div className="relative aspect-[2/3] w-32 overflow-hidden bg-stone-800 shadow-2xl ring-2 ring-white/20">
                {cover ? (
                  <img
                    src={cover}
                    alt={book.title}
                    width={128}
                    height={192}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <BookOpen className="h-10 w-10 text-stone-600" />
                  </div>
                )}
              </div>

              {/* Popular badge */}
              {popular && (
                <div className="absolute -right-2 -top-2 bg-amber-500 px-2 py-1 shadow-lg">
                  <span className="font-mono text-[9px] font-bold uppercase tracking-widest text-black">
                    Popular
                  </span>
                </div>
              )}
            </div>

            {/* Title & Author Info */}
            <div className="flex flex-1 flex-col justify-center text-white">
              <DialogHeader className="text-left">
                <DialogTitle className="font-sans text-2xl font-black leading-tight tracking-tight text-white">
                  {book.title}
                </DialogTitle>
              </DialogHeader>

              <div className="mt-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-stone-400" />
                  <span className="font-mono text-sm text-stone-300">
                    {authors || 'Unknown author'}
                  </span>
                </div>

                {authorDates && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-stone-400" />
                    <span className="font-mono text-xs text-stone-400">{authorDates}</span>
                  </div>
                )}

                <div className="flex items-center gap-4">
                  {downloadStr && (
                    <div className="flex items-center gap-1.5">
                      <Download className="h-3.5 w-3.5 text-stone-400" />
                      <span className="font-mono text-xs font-bold text-stone-300 tabular-nums">
                        {downloadStr} downloads
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5">
                    <Globe className="h-3.5 w-3.5 text-stone-400" />
                    <span className="font-mono text-xs text-stone-400">{language}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="space-y-6 p-6">
          {/* Summary */}
          {book.summaries && book.summaries.length > 0 && (
            <div>
              <h3 className="mb-2 font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground">
                About this book
              </h3>
              <p className="text-sm leading-relaxed text-foreground">{book.summaries[0]}</p>
            </div>
          )}

          {/* Subjects */}
          {book.subjects && book.subjects.length > 0 && (
            <div>
              <h3 className="mb-2 flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground">
                <Tag className="h-3.5 w-3.5" />
                Subjects
              </h3>
              <div className="flex flex-wrap gap-2">
                {book.subjects.slice(0, 8).map((subject, i) => (
                  <span
                    key={i}
                    className="border border-stone-300 bg-stone-100 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-stone-700 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300"
                  >
                    {subject.split(' -- ')[0]}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Bookshelves */}
          {cleanBookshelves.length > 0 && (
            <div>
              <h3 className="mb-2 flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground">
                <Library className="h-3.5 w-3.5" />
                Categories
              </h3>
              <div className="flex flex-wrap gap-2">
                {cleanBookshelves.slice(0, 6).map((shelf, i) => (
                  <span
                    key={i}
                    className="bg-amber-100 px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
                  >
                    {shelf}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between border-t-2 border-stone-200 pt-6 dark:border-stone-800">
            <a
              href={`https://www.gutenberg.org/ebooks/${book.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 font-mono text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              View on Gutenberg
            </a>

            {isLocal ? (
              <div className="flex items-center gap-2 text-green-600">
                <Check className="h-4 w-4" />
                <span className="font-mono text-xs font-bold uppercase tracking-widest">
                  In Your Library
                </span>
              </div>
            ) : isQueued ? (
              <div className="flex items-center gap-2 text-amber-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="font-mono text-xs font-bold uppercase tracking-widest">
                  Downloading…
                </span>
              </div>
            ) : canDownload ? (
              <Button
                onClick={() => {
                  onAdd()
                  onOpenChange(false)
                }}
                className="h-11 rounded-none bg-black px-6 font-bold uppercase tracking-widest text-white hover:bg-amber-500 hover:text-black dark:bg-white dark:text-black dark:hover:bg-amber-500"
              >
                <Download className="mr-2 h-4 w-4" />
                Add to Library
              </Button>
            ) : (
              <span className="font-mono text-xs font-bold uppercase tracking-widest text-stone-500">
                MOBI Not Available
              </span>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
