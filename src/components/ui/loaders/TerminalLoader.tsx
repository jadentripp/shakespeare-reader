import { cn } from '@/lib/utils'

export function TerminalLoader({
  className,
  size = 'md',
}: {
  className?: string
  size?: 'sm' | 'md' | 'lg'
}) {
  const cursorSizes = {
    sm: 'h-3 w-1.5',
    md: 'h-4 w-2',
    lg: 'h-5 w-2.5',
  }

  const textSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  }

  const containerSizes = {
    sm: 'h-4',
    md: 'h-5',
    lg: 'h-6',
  }

  return (
    <div className={cn('flex items-center space-x-1', containerSizes[size], className)}>
      <span className={cn('text-primary font-mono', textSizes[size])}>{'>'}</span>
      <div className={cn('bg-primary animate-[blink_1s_step-end_infinite]', cursorSizes[size])} />
      <span className="sr-only">Loading</span>
    </div>
  )
}
