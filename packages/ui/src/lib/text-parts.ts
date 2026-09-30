// React
import { createElement, Fragment, type ReactNode } from "react"

/**
 * A dictionary sentence with nodes where its placeholders are — "você aceita os {terms}" with a link
 * where `{terms}` stands — so a translation moves the link with the words, and the block that draws
 * it holds none of them. A placeholder with no part given stays as written, so a missing one shows.
 */
export function withParts(template: string, parts: Readonly<Record<string, ReactNode>>): ReactNode[] {
  return template
    .split(/(\{[A-Za-z]+\})/)
    .filter((piece) => piece !== "")
    .map((piece, index) => {
      const key = /^\{([A-Za-z]+)\}$/.exec(piece)?.[1]
      return key !== undefined && key in parts ? createElement(Fragment, { key: index }, parts[key]) : piece
    })
}
