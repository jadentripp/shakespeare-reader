import { cn } from '@/lib/utils'

export function BarsLoader({
  className,
  size = 'md',
}: {
  className?: string
  size?: 'sm' | 'md' | 'lg'
}) {
  const barWidths = {
    sm: 'w-1',
    md: 'w-1.5',
    lg: 'w-2',
  }

  const containerSizes = {
    sm: 'h-4 gap-1',
    md: 'h-5 gap-1.5',
    lg: 'h-6 gap-2',
  }

  return (
    <div className={cn('flex', containerSizes[size], className)}>
      {[...Array(3)].map((_, i) => (
        <div
          key={i}
          className={cn(
            'bg-primary h-full animate-[wave-bars_1.2s_ease-in-out_infinite]',
            barWidths[size],
          )}
          style={{
            animationDelay: `${i * 0.2}s`,
          }}
        />
      ))}
      <span className="sr-only">Loading</span>
    </div>
  )
}
