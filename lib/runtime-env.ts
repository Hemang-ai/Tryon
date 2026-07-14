/** Server-only environment access that works in the Next.js Node runtime. */
export const runtimeEnv = {
  get AUTH_SECRET() { return process.env.AUTH_SECRET; },
  get CREDENTIAL_ENCRYPTION_KEY() { return process.env.CREDENTIAL_ENCRYPTION_KEY; },
  get DAILY_GENERATION_LIMIT() { return process.env.DAILY_GENERATION_LIMIT; },
  get GEMINI_API_KEY() { return process.env.GEMINI_API_KEY; },
  get GEMINI_IMAGE_MODEL() { return process.env.GEMINI_IMAGE_MODEL; },
  get GOOGLE_CLIENT_ID() { return process.env.GOOGLE_CLIENT_ID; },
  get OPENAI_API_KEY() { return process.env.OPENAI_API_KEY; },
  get OPENAI_IMAGE_MODEL() { return process.env.OPENAI_IMAGE_MODEL; },
  get TEST_LOGIN_ENABLED() { return process.env.TEST_LOGIN_ENABLED; },
};
