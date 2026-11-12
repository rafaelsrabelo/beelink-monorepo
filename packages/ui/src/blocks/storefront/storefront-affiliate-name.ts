/** The first word of a name, as the strip and the order's line call the affiliate; the whole name when it is one word. */
export function firstNameOf(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name
}
