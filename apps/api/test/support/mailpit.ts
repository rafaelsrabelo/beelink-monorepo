/** Mailpit's REST API. Its shapes are a third-party wire, so they are declared here, not in contracts. */
const MAILPIT_URL = process.env.MAILPIT_URL ?? 'http://localhost:8025';

interface MailpitSearch {
  messages: { ID: string }[];
}

interface MailpitMessage {
  Subject: string;
  Text: string;
  HTML: string;
}

export async function clearInbox(): Promise<void> {
  await fetch(`${MAILPIT_URL}/api/v1/messages`, { method: 'DELETE' });
}

/** Waits for the newest message sent to an address. Mail leaves the API asynchronously. */
export async function waitForMessage(to: string, timeoutMs = 10_000): Promise<MailpitMessage> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const query = new URLSearchParams({ query: `to:"${to}"`, limit: '1' });
    const response = await fetch(`${MAILPIT_URL}/api/v1/search?${query.toString()}`);
    const { messages } = (await response.json()) as MailpitSearch;

    if (messages.length > 0) {
      const message = await fetch(`${MAILPIT_URL}/api/v1/message/${messages[0]!.ID}`);
      return (await message.json()) as MailpitMessage;
    }

    await new Promise((resolve) => setTimeout(resolve, 150));
  }

  throw new Error(`No e-mail reached ${to} within ${timeoutMs}ms`);
}

/** Pulls the token out of the link the e-mail carries, the way a person clicking it would. */
export function tokenFromLink(text: string, path: string): string {
  const match = new RegExp(`${path}\\?token=([\\w%.-]+)`).exec(text);
  if (!match?.[1]) throw new Error(`No ${path} link in the e-mail:\n${text}`);
  return decodeURIComponent(match[1]);
}
