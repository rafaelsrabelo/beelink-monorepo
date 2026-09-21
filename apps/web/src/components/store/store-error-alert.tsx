/**
 * What a screen shows when a read failed. The settings form takes its refusal as a prop and draws
 * it itself; the screens that render a block with no `error` of its own use this instead of each
 * repeating the markup.
 */
export function StoreErrorAlert({ message }: { message: string }) {
  return (
    <p
      role="alert"
      className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
    >
      {message}
    </p>
  )
}
