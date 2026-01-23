import { cn } from '@/lib/utils'

export function PulseDotLoader({
  className,
  size = 'md',
}: {
  className?: string
  size?: 'sm' | 'md' | 'lg'
}) {
  const sizeClasses = {
    sm: 'size-1',
    md: 'size-2',
    lg: 'size-3',
  }

  return (
    <div
      className={cn(
        'bg-primary animate-[pulse-dot_1.2s_ease-in-out_infinite] rounded-full',
        sizeClasses[size],
        className,
      )}
    >
      <span className="sr-only">Loading</span>
    </div>
  )
}
