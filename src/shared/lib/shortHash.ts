/**
 * Short hex hash of a string, using the platform's Web Crypto (available in
 * both Node.js and Edge runtimes — no extra dependency). Used to give the
 * Sync feature a lightweight "CSV version" indicator, not for any security
 * purpose.
 */
export async function shortHash(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", data);
  const hex = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return hex.slice(0, 12);
}
