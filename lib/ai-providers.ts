import { env } from "cloudflare:workers";

export const AI_PROVIDERS = ["gemini", "openai"] as const;
export const AI_PROVIDER_CHOICES = ["auto", ...AI_PROVIDERS] as const;

export type AiProvider = (typeof AI_PROVIDERS)[number];
export type AiProviderChoice = (typeof AI_PROVIDER_CHOICES)[number];

type StoredCredential = { provider: AiProvider; encrypted_key: string; key_iv: string };

function toBase64(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function fromBase64(value: string) {
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
}

function encryptionSecret() {
  return env.CREDENTIAL_ENCRYPTION_KEY || env.AUTH_SECRET;
}

async function encryptionKey() {
  const secret = encryptionSecret();
  if (!secret) throw new Error("Credential encryption is not configured");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));
  return crypto.subtle.importKey("raw", digest, "AES-GCM", false, ["encrypt", "decrypt"]);
}

export async function encryptApiKey(apiKey: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    await encryptionKey(),
    new TextEncoder().encode(apiKey.trim()),
  );
  return { encryptedKey: toBase64(new Uint8Array(ciphertext)), keyIv: toBase64(iv) };
}

export async function decryptApiKey(encryptedKey: string, keyIv: string) {
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: fromBase64(keyIv) },
    await encryptionKey(),
    fromBase64(encryptedKey),
  );
  return new TextDecoder().decode(plaintext);
}

export function isAiProvider(value: unknown): value is AiProvider {
  return AI_PROVIDERS.includes(value as AiProvider);
}

export function isAiProviderChoice(value: unknown): value is AiProviderChoice {
  return AI_PROVIDER_CHOICES.includes(value as AiProviderChoice);
}

export function platformApiKey(provider: AiProvider) {
  return provider === "gemini" ? env.GEMINI_API_KEY : env.OPENAI_API_KEY;
}

export function providerModel(provider: AiProvider) {
  return provider === "gemini"
    ? env.GEMINI_IMAGE_MODEL || "gemini-3.1-flash-image"
    : env.OPENAI_IMAGE_MODEL || "gpt-image-2";
}

export async function providerStatus(userId: string) {
  let activeProvider: AiProviderChoice = "auto";
  const accountConfigured = { gemini: false, openai: false };
  if (env.DB) {
    const setting = await env.DB.prepare("SELECT active_provider FROM ai_provider_settings WHERE user_id = ?")
      .bind(userId).first<{ active_provider: string }>();
    if (isAiProviderChoice(setting?.active_provider)) activeProvider = setting.active_provider;
    const credentials = await env.DB.prepare("SELECT provider FROM ai_provider_credentials WHERE user_id = ?")
      .bind(userId).all<{ provider: string }>();
    for (const row of credentials.results ?? []) {
      if (isAiProvider(row.provider)) accountConfigured[row.provider] = true;
    }
  }
  return {
    activeProvider,
    providers: {
      gemini: { accountConfigured: accountConfigured.gemini, platformConfigured: Boolean(env.GEMINI_API_KEY), model: providerModel("gemini") },
      openai: { accountConfigured: accountConfigured.openai, platformConfigured: Boolean(env.OPENAI_API_KEY), model: providerModel("openai") },
    },
  };
}

export async function resolveAiProvider(userId: string) {
  const status = await providerStatus(userId);
  const stored = new Map<AiProvider, StoredCredential>();
  if (env.DB) {
    const credentials = await env.DB.prepare("SELECT provider, encrypted_key, key_iv FROM ai_provider_credentials WHERE user_id = ?")
      .bind(userId).all<StoredCredential>();
    for (const row of credentials.results ?? []) if (isAiProvider(row.provider)) stored.set(row.provider, row);
  }
  const order: AiProvider[] = status.activeProvider === "auto" ? ["gemini", "openai"] : [status.activeProvider];
  for (const provider of order) {
    const credential = stored.get(provider);
    if (credential) {
      return { provider, apiKey: await decryptApiKey(credential.encrypted_key, credential.key_iv), model: providerModel(provider), source: "account" as const };
    }
    const apiKey = platformApiKey(provider);
    if (apiKey) return { provider, apiKey, model: providerModel(provider), source: "platform" as const };
  }
  return null;
}
