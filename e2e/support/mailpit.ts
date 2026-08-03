import { getTestEnvironment } from "./test-environment";

type MailpitAddress = { Address: string };
type MailpitMessage = {
  ID: string;
  To: MailpitAddress[];
  Subject: string;
  Created: string;
  Snippet: string;
};
type MailpitMessages = { messages: MailpitMessage[] };

export function extractSixDigitCode(value: string) {
  return value.match(/(?:^|\D)(\d{6})(?:\D|$)/)?.[1];
}

export async function waitForMailpitCode(
  email: string,
  options: {
    subject?: string;
    after?: Date;
    timeoutMs?: number;
  } = {},
) {
  const environment = await getTestEnvironment();
  if (!environment.mailpitUrl) {
    throw new Error(
      "Mailpit is required for account email E2E tests. Set E2E_MAILPIT_URL for an explicit test environment.",
    );
  }

  const deadline = Date.now() + (options.timeoutMs ?? 15_000);
  const normalizedEmail = email.toLowerCase();
  while (Date.now() < deadline) {
    const response = await fetch(
      `${environment.mailpitUrl}/api/v1/messages?limit=100`,
    );
    if (!response.ok) {
      throw new Error(`Mailpit returned HTTP ${response.status}.`);
    }

    const { messages } = (await response.json()) as MailpitMessages;
    const match = messages.find(
      (message) =>
        message.To.some(
          ({ Address }) => Address.toLowerCase() === normalizedEmail,
        ) &&
        (!options.subject || message.Subject.includes(options.subject)) &&
        (!options.after || new Date(message.Created) >= options.after),
    );
    const code = match ? extractSixDigitCode(match.Snippet) : undefined;
    if (code) return code;

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error(`Timed out waiting for a Mailpit code for ${email}.`);
}
