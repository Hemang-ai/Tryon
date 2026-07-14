/**
 * Database-backed cloud sync is intentionally not initialized in the Vercel
 * build. The live MVP stores generated looks in the signed-in user's browser.
 */
export function getDb(): never {
  throw new Error("Database storage is not configured for this deployment.");
}
