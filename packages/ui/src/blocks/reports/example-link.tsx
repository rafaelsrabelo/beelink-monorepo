export interface ExampleLinkProps {
  url: string
  /** What the text is, for a screen reader: it reads as an address, and is not a link. */
  label: string
}

/** An address shown to be copied, not followed: text that wraps anywhere and can be selected whole. */
export function ExampleLink({ url, label }: ExampleLinkProps) {
  return (
    <span className="block max-w-full">
      <span className="sr-only">{label}: </span>
      <code className="bg-muted inline-block max-w-full rounded-md px-2 py-1 text-left text-xs break-all select-all">{url}</code>
    </span>
  )
}
