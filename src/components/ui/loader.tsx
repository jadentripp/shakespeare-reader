import { CircularLoader } from "./loaders/CircularLoader"
import { ClassicLoader } from "./loaders/ClassicLoader"
import { PulseLoader } from "./loaders/PulseLoader"
import { PulseDotLoader } from "./loaders/PulseDotLoader"
import { DotsLoader } from "./loaders/DotsLoader"
import { TypingLoader } from "./loaders/TypingLoader"
import { WaveLoader } from "./loaders/WaveLoader"
import { BarsLoader } from "./loaders/BarsLoader"
import { TerminalLoader } from "./loaders/TerminalLoader"
import { TextBlinkLoader } from "./loaders/TextBlinkLoader"
import { TextShimmerLoader } from "./loaders/TextShimmerLoader"
import { TextDotsLoader } from "./loaders/TextDotsLoader"

export interface LoaderProps {
  variant?:
    | "circular"
    | "classic"
    | "pulse"
    | "pulse-dot"
    | "dots"
    | "typing"
    | "wave"
    | "bars"
    | "terminal"
    | "text-blink"
    | "text-shimmer"
    | "loading-dots"
  size?: "sm" | "md" | "lg"
  text?: string
  className?: string
}

export function Loader({
  variant = "circular",
  size = "md",
  text,
  className,
}: LoaderProps) {
  switch (variant) {
    case "circular":
      return <CircularLoader size={size} className={className} />
    case "classic":
      return <ClassicLoader size={size} className={className} />
    case "pulse":
      return <PulseLoader size={size} className={className} />
    case "pulse-dot":
      return <PulseDotLoader size={size} className={className} />
    case "dots":
      return <DotsLoader size={size} className={className} />
    case "typing":
      return <TypingLoader size={size} className={className} />
    case "wave":
      return <WaveLoader size={size} className={className} />
    case "bars":
      return <BarsLoader size={size} className={className} />
    case "terminal":
      return <TerminalLoader size={size} className={className} />
    case "text-blink":
      return <TextBlinkLoader text={text} size={size} className={className} />
    case "text-shimmer":
      return <TextShimmerLoader text={text} size={size} className={className} />
    case "loading-dots":
      return <TextDotsLoader text={text} size={size} className={className} />
    default:
      return <CircularLoader size={size} className={className} />
  }
}

export {
  CircularLoader,
  ClassicLoader,
  PulseLoader,
  PulseDotLoader,
  DotsLoader,
  TypingLoader,
  WaveLoader,
  BarsLoader,
  TerminalLoader,
  TextBlinkLoader,
  TextShimmerLoader,
  TextDotsLoader,
}