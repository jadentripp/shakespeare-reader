import { cn } from '@/lib/utils'

export function CircularLoader({
  className,
  size = 'md',
}: {
  className?: string
  size?: 'sm' | 'md' | 'lg'
}) {
  const sizeClasses = {
    sm: 'size-4',
    md: 'size-5',
    lg: 'size-6',
  }

  return (
    <div
      className={cn(
        'border-primary animate-spin rounded-full border-2 border-t-transparent',
        sizeClasses[size],
        className,
      )}
    >
      <span className="sr-only">Loading</span>
    </div>
  )
}
