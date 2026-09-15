// Libs
import { expect } from "@playwright/test"
import type { APIRequestContext } from "@playwright/test"

const MAILPIT_URL = process.env.MAILPIT_URL ?? "http://localhost:8025"

interface MailpitSearch {
  messages: { ID: string }[]
}

interface MailpitMessage {
  Subject: string
  Text: string
}

/** A fresh address per run, so a test never reads an e-mail another one caused. */
export function newEmail(label: string): string {
  return `e2e-${label}-${Date.now()}@exemplo.test`
}

/** Waits for the newest message sent to an address — mail leaves the API after the response does. */
export async function waitForMessage(request: APIRequestContext, to: string): Promise<MailpitMessage> {
  let id = ""

  await expect
    .poll(
      async () => {
        const response = await request.get(`${MAILPIT_URL}/api/v1/search`, {
          params: { query: `to:"${to}"`, limit: 1 },
        })
        const { messages } = (await response.json()) as MailpitSearch
        id = messages[0]?.ID ?? ""
        return id
      },
      { message: `no e-mail reached ${to}`, timeout: 15_000 },
    )
    .not.toBe("")

  const message = await request.get(`${MAILPIT_URL}/api/v1/message/${id}`)
  return (await message.json()) as MailpitMessage
}

export function linkFrom(text: string, path: string): string {
  const match = new RegExp(`https?://\\S+${path}\\?token=[\\w%.-]+`).exec(text)
  if (!match) throw new Error(`No ${path} link in the e-mail:\n${text}`)
  return match[0]
}
