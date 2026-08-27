import OpenAI from "openai";

/**
 * Lazily-constructed OpenAI client.
 *
 * The SDK throws at construction when no key is present, so building one at
 * module scope makes the whole server refuse to boot without an AI key — even
 * though the app runs perfectly well against the mock backend or a database
 * without ever calling OpenAI. That made the app undeployable anywhere the key
 * was not set. Construct on first use instead, and let the routes that
 * genuinely need it fail with something a human can act on.
 */
let client: OpenAI | null = null;

export function isAiConfigured(): boolean {
  return Boolean(process.env.AI_INTEGRATIONS_OPENAI_API_KEY);
}

export function getOpenAI(): OpenAI {
  if (!isAiConfigured()) {
    throw new AiNotConfiguredError();
  }
  if (!client) {
    client = new OpenAI({
      apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
      baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
    });
  }
  return client;
}

export class AiNotConfiguredError extends Error {
  readonly status = 503;
  constructor() {
    super(
      "AI features are unavailable: set AI_INTEGRATIONS_OPENAI_API_KEY to enable analysis, chat and image generation.",
    );
    this.name = "AiNotConfiguredError";
  }
}
