// No SQLite on the web (see client.web.ts).
export function useDatabaseReady(): { done: boolean; error: Error | undefined } {
  return { done: true, error: undefined };
}
