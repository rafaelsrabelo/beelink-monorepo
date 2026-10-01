// UI
import { cn } from "@harness-monorepo/ui/lib/utils"

export interface LandingTitleProps {
  as?: "h1" | "h2"
  /** The line in the light weight. */
  light: string
  /** The line in the heavy weight. */
  strong: string
  /** The heavy line first, as the banners' heading has it. */
  strongFirst?: boolean
  /** The yellow full stop after the heavy line. Off where the ground is yellow, or the sentence carries its own. */
  dot?: boolean
  className?: string
  lightClassName?: string
}

/**
 * A line that wraps between its words and never inside one: at these sizes a browser would break
 * "e-commerce" at its hyphen, and leave "e-" at the end of a line.
 */
function wordsOf(line: string) {
  return line.split(" ").flatMap((word, at) => [
    at > 0 ? " " : null,
    <span key={at} className="whitespace-nowrap">
      {word}
    </span>,
  ])
}

/**
 * The landing's heading: one sentence in two weights, a line each, closed by the brand's yellow
 * full stop. The stop is drawn, not read — a reader hears the sentence.
 */
export function LandingTitle({ as: Tag = "h2", light, strong, strongFirst = false, dot = true, className, lightClassName }: LandingTitleProps) {
  const lightLine = (
    <span key="light" className={cn("block font-light", lightClassName)}>
      {wordsOf(light)}
    </span>
  )
  const strongLine = (
    <span key="strong" className="block font-extrabold">
      {wordsOf(strong)}
      {dot ? (
        <span aria-hidden="true" className="text-brand-yellow">
          .
        </span>
      ) : null}
    </span>
  )

  return (
    // The space is what a reader, and a search engine, find between the two lines.
    <Tag className={cn("leading-[1.02] tracking-[-0.035em]", className)}>{strongFirst ? [strongLine, " ", lightLine] : [lightLine, " ", strongLine]}</Tag>
  )
}
