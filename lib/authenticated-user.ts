export type AuthenticatedUser = {
  id: string;
  email: string;
  name: string;
  picture: null;
};

function decodeFullName(headers: Headers) {
  const value = headers.get("oai-authenticated-user-full-name");
  if (!value || headers.get("oai-authenticated-user-full-name-encoding") !== "percent-encoded-utf-8") return null;
  try {
    return decodeURIComponent(value).trim() || null;
  } catch {
    return null;
  }
}

async function userIdFor(email: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(email));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function getAuthenticatedUser(request: Request): Promise<AuthenticatedUser | null> {
  const email = request.headers.get("oai-authenticated-user-email")?.trim().toLowerCase();
  if (!email) return null;
  return {
    id: await userIdFor(email),
    email,
    name: decodeFullName(request.headers) ?? email.split("@")[0],
    picture: null,
  };
}
