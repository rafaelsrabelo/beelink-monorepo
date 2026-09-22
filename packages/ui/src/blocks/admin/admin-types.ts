/**
 * The shapes the admin chrome renders, restated here rather than imported from the wire.
 *
 * This package declares no dependency on the contracts, which is what lets every block render in
 * Storybook with nothing behind it. `WorkspaceOption` moved here from the sidebar's old workspace
 * switcher when that block was replaced by the header's menu — the type outlived the component.
 */
export interface WorkspaceOption {
  slug: string
  name: string
  logoUrl?: string | null
  /** Built by the screen: a block never knows a shop's panel lives at `/admin/<slug>`. */
  href: string
}
