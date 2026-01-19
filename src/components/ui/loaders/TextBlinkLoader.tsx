import { cn } from "@/lib/utils"

export function TextBlinkLoader({
  text = "Thinking",
  className,
  size = "md",
}: {
  text?: string
  className?: string
  size?: "sm" | "md" | "lg"
}) {
  const textSizes = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  }

  return (
    <div
      className={cn(
        "animate-[text-blink_2s_ease-in-out_infinite] font-medium",
        textSizes[size],
        className
      )}
    >
      {text}
    </div>
  )
}
