import "server-only";

/** Default OpenRouter model for structured generation and image understanding. */
export const DEFAULT_MODEL = "qwen/qwen3.7-flash";

type JsonCall = {
  /** Short schema name for the provider */
  name: string;
  system: string;
  /** Serialised as JSON; untrusted user text must be passed as data inside it */
  user: unknown;
  schema: Record<string, unknown>;
  maxTokens: number;
  timeoutMs: number;
  temperature?: number;
};

/**
 * One structured-output call. Returns the parsed JSON, or null on any failure
 * (no key, HTTP error, timeout, empty or invalid output) so callers fall back.
 */
export async function openRouterJson({ name, system, user, schema, maxTokens, timeoutMs, temperature = 0.4 }: JsonCall): Promise<unknown | null> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.warn(`[openrouter] ${name}: no OPENROUTER_API_KEY, using fallback`);
    return null;
  }
  const model = process.env.OPENROUTER_GENERATION_MODEL ?? DEFAULT_MODEL;
  const started = Date.now();
  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.APP_URL ?? "http://localhost:3000",
        "X-Title": "Kochi",
      },
      body: JSON.stringify({
        model,
        temperature,
        max_tokens: maxTokens,
        // Structured output only; thinking tokens would eat the budget and the timeout.
        reasoning: { enabled: false },
        messages: [
          { role: "system", content: system },
          { role: "user", content: JSON.stringify(user) },
        ],
        response_format: { type: "json_schema", json_schema: { name, strict: true, schema } },
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok) {
      console.warn(`[openrouter] ${name}: ${model} returned HTTP ${response.status} after ${Date.now() - started} ms: ${(await response.text()).slice(0, 300)}`);
      return null;
    }
    const payload = (await response.json()) as { choices?: Array<{ message?: { content?: string }; finish_reason?: string }>; usage?: { completion_tokens?: number } };
    const choice = payload.choices?.[0];
    const content = choice?.message?.content;
    if (!content) {
      console.warn(`[openrouter] ${name}: ${model} returned no content (finish_reason ${choice?.finish_reason ?? "unknown"}) after ${Date.now() - started} ms`);
      return null;
    }
    console.info(`[openrouter] ${name}: ${model} ok in ${Date.now() - started} ms, ${payload.usage?.completion_tokens ?? "?"} output tokens, finish ${choice?.finish_reason}`);
    return JSON.parse(content);
  } catch (error) {
    // Never log request content or keys; only what went wrong
    console.warn(`[openrouter] ${name}: ${model} failed after ${Date.now() - started} ms: ${error instanceof Error ? error.name + " " + error.message.slice(0, 200) : "unknown error"}`);
    return null;
  }
}
