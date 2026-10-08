// Letters caught by Mailpit (compose.dev.yml, and a service in CI).
const MAILPIT_URL = process.env.MAILPIT_URL ?? "http://localhost:8025";

export type CaughtLetter = {
  Subject: string;
  From: { Name: string; Address: string };
  To: { Name: string; Address: string }[];
  HTML: string;
  Text: string;
};

/**
 * The latest letter to an address, with that subject if given; waits a
 * little for it to arrive.
 */
export async function findLetter(
  to: string,
  subject?: string,
): Promise<CaughtLetter> {
  const query = encodeURIComponent(
    subject ? `to:"${to}" subject:"${subject}"` : `to:"${to}"`,
  );
  for (let attempt = 0; attempt < 20; attempt++) {
    const { messages } = (await fetch(
      `${MAILPIT_URL}/api/v1/search?query=${query}`,
    ).then((response) => response.json())) as { messages: { ID: string }[] };
    const [latest] = messages;
    if (latest) {
      return fetch(`${MAILPIT_URL}/api/v1/message/${latest.ID}`).then(
        (response) => response.json() as Promise<CaughtLetter>,
      );
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`No letter to ${to} in Mailpit`);
}

/** How many letters an address has received. */
export async function countLetters(to: string): Promise<number> {
  const query = encodeURIComponent(`to:"${to}"`);
  const { messages_count } = (await fetch(
    `${MAILPIT_URL}/api/v1/search?query=${query}`,
  ).then((response) => response.json())) as { messages_count: number };
  return messages_count;
}
