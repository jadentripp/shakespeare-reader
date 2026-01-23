import { BookOpen, Download, Loader2, Trash2, X } from 'lucide-react'
import type React from 'react'
import { Button } from '@/components/ui/button'
import type { BookStatus } from './BookMesh'

interface FocusedBookUIProps {
  book: {
    id: number
    title: string
    author?: string
    cover_url?: string
    gutenberg_id?: number
  }
  status: BookStatus
  progress?: number
  onRead: () => void
  onDownload: () => void
  onDelete: () => void
  onClose: () => void
}

export const FocusedBookUI: React.FC<FocusedBookUIProps> = ({
  book,
  status,
  progress = 0,
  onRead,
  onDownload,
  onDelete,
  onClose,
}) => {
  return (
    <div className="absolute inset-0 z-40 pointer-events-none">
      {/* Subtle backdrop - only dims slightly */}
      <div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-black/40 pointer-events-auto"
        onClick={onClose}
      />

      {/* Slide-in panel from right */}
      <div className="absolute right-0 top-0 bottom-0 w-80 pointer-events-auto flex items-center pr-4">
        <div className="w-full bg-stone-950/95 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl shadow-black/50 overflow-hidden animate-in slide-in-from-right-4 fade-in duration-300">
          {/* Compact header with cover */}
          <div className="relative p-4 pb-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="absolute top-3 right-3 z-10 h-7 w-7 rounded-full bg-white/10 hover:bg-white/20 transition-[background-color,color]"
              aria-label="Close"
            >
              <X className="h-3.5 w-3.5 text-white/70" />
            </Button>

            <div className="flex gap-4">
              {/* Cover thumbnail */}
              <div className="w-20 h-28 rounded-lg overflow-hidden bg-gradient-to-br from-amber-900/30 to-stone-900 flex-shrink-0 shadow-lg">
                {book.cover_url ? (
                  <img
                    src={book.cover_url}
                    alt={book.title}
                    width={80}
                    height={112}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <BookOpen className="h-6 w-6 text-amber-200/40" />
                  </div>
                )}
              </div>

              {/* Title & meta */}
              <div className="flex-1 min-w-0 pt-1">
                <h3 className="font-serif text-base font-medium text-white line-clamp-2 leading-tight mb-1">
                  {book.title}
                </h3>
                {book.author && (
                  <p className="text-white/40 text-xs mb-2 truncate">{book.author}</p>
                )}

                {/* Status badge */}
                {status === 'local' && (
                  <span className="inline-flex px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-semibold uppercase tracking-wide">
                    Downloaded
                  </span>
                )}
                {status === 'remote' && (
                  <span className="inline-flex px-2 py-0.5 rounded-full bg-slate-500/20 text-slate-300 text-[10px] font-semibold uppercase tracking-wide">
                    Available
                  </span>
                )}
                {status === 'downloading' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-semibold uppercase tracking-wide">
                    <Loader2 className="h-2.5 w-2.5 animate-spin" />
                    Downloading
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-4">
            {/* Progress bar for local books */}
            {status === 'local' && progress > 0 && (
              <div className="mb-4">
                <div className="flex items-center justify-between text-[10px] mb-1">
                  <span className="text-white/30 uppercase tracking-wider font-medium">
                    Progress
                  </span>
                  <span className="text-amber-400 font-semibold">{Math.round(progress)}%</span>
                </div>
                <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-[width] duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              {status === 'local' ? (
                <>
                  <Button
                    onClick={onRead}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 h-10 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold text-sm shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30 hover:scale-[1.02] active:scale-[0.98] transition-[transform,box-shadow,background-color]"
                  >
                    <BookOpen className="h-4 w-4" />
                    {progress > 0 ? 'Continue' : 'Read'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onDelete}
                    className="h-10 w-10 p-2.5 rounded-xl bg-white/5 border border-white/10 text-white/50 hover:text-red-400 hover:border-red-400/30 hover:bg-red-500/10 transition-[color,border-color,background-color]"
                    title="Delete"
                    aria-label="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </>
              ) : status === 'downloading' ? (
                <Button
                  disabled
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 h-10 px-3 rounded-xl bg-white/5 border border-white/10 text-white/40 cursor-not-allowed"
                >
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Downloading…
                </Button>
              ) : (
                <Button
                  onClick={onDownload}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 h-10 px-3 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold text-sm shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 hover:scale-[1.02] active:scale-[0.98] transition-[transform,box-shadow,background-color]"
                >
                  <Download className="h-4 w-4" />
                  Download
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
