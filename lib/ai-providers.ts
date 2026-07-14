import { cookies } from "next/headers";
import { runtimeEnv } from "@/lib/runtime-env";

export const AI_PROVIDERS = ["gemini", "openai"] as const;
export const AI_PROVIDER_CHOICES = ["auto", ...AI_PROVIDERS] as const;
export const AI_SETTINGS_COOKIE = "tryiton_ai_settings";

export type AiProvider = (typeof AI_PROVIDERS)[number];
export type AiProviderChoice = (typeof AI_PROVIDER_CHOICES)[number];
export type StoredCredential = { encryptedKey: string; keyIv: string };
export type StoredProviderSettings = {
  userId: string;
  activeProvider: AiProviderChoice;
  credentials: Partial<Record<AiProvider, StoredCredential>>;
};

function toBase64(bytes: Uint8Array) {
  return Buffer.from(bytes).toString("base64");
}

function fromBase64(value: string) {
  return new Uint8Array(Buffer.from(value, "base64"));
}

function encryptionSecret() {
  return runtimeEnv.CREDENTIAL_ENCRYPTION_KEY || runtimeEnv.AUTH_SECRET;
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

function encodeSettings(settings: StoredProviderSettings) {
  return Buffer.from(JSON.stringify(settings)).toString("base64url");
}

function decodeSettings(value: string | undefined): StoredProviderSettings | null {
  if (!value) return null;
  try {
    const candidate = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as StoredProviderSettings;
    if (!candidate.userId || !isAiProviderChoice(candidate.activeProvider) || !candidate.credentials) return null;
    return candidate;
  } catch {
    return null;
  }
}

export async function readProviderSettings(userId: string) {
  const store = await cookies();
  const settings = decodeSettings(store.get(AI_SETTINGS_COOKIE)?.value);
  if (!settings || settings.userId !== userId) {
    return { userId, activeProvider: "auto" as const, credentials: {} };
  }
  return settings;
}

export function serializedProviderSettings(settings: StoredProviderSettings) {
  return encodeSettings(settings);
}

export function isAiProvider(value: unknown): value is AiProvider {
  return AI_PROVIDERS.includes(value as AiProvider);
}

export function isAiProviderChoice(value: unknown): value is AiProviderChoice {
  return AI_PROVIDER_CHOICES.includes(value as AiProviderChoice);
}

export function platformApiKey(provider: AiProvider) {
  return provider === "gemini" ? runtimeEnv.GEMINI_API_KEY : runtimeEnv.OPENAI_API_KEY;
}

export function providerModel(provider: AiProvider) {
  return provider === "gemini"
    ? runtimeEnv.GEMINI_IMAGE_MODEL || "gemini-3.1-flash-image"
    : runtimeEnv.OPENAI_IMAGE_MODEL || "gpt-image-2";
}

export async function providerStatus(userId: string, supplied?: StoredProviderSettings) {
  const settings = supplied ?? await readProviderSettings(userId);
  return {
    activeProvider: settings.activeProvider,
    providers: {
      gemini: { accountConfigured: Boolean(settings.credentials.gemini), platformConfigured: Boolean(runtimeEnv.GEMINI_API_KEY), model: providerModel("gemini") },
      openai: { accountConfigured: Boolean(settings.credentials.openai), platformConfigured: Boolean(runtimeEnv.OPENAI_API_KEY), model: providerModel("openai") },
    },
  };
}

export async function resolveAiProvider(userId: string) {
  const settings = await readProviderSettings(userId);
  const order: AiProvider[] = settings.activeProvider === "auto" ? ["gemini", "openai"] : [settings.activeProvider];
  for (const provider of order) {
    const credential = settings.credentials[provider];
    if (credential) {
      try {
        return { provider, apiKey: await decryptApiKey(credential.encryptedKey, credential.keyIv), model: providerModel(provider), source: "account" as const };
      } catch {
        continue;
      }
    }
    const apiKey = platformApiKey(provider);
    if (apiKey) return { provider, apiKey, model: providerModel(provider), source: "platform" as const };
  }
  return null;
}
