import "server-only";

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
  /** Optional photo as a data URL (image/jpeg|png|webp, base64) sent alongside the JSON */
  image?: string;
};

const MAX_IMAGE_DATA_URL = 2_000_000;

/**
 * Explains a failed fetch. Node reports network problems as a bare
 * "TypeError: fetch failed" and keeps the real reason (DNS, TLS, timeout,
 * refused connection) on `error.cause`, so unwrap it for the logs.
 */
export function describeFetchError(error: unknown): string {
  if (!(error instanceof Error)) return "unknown error";
  const parts = [`${error.name} ${error.message.slice(0, 160)}`];
  let cause: unknown = (error as { cause?: unknown }).cause;
  for (let depth = 0; cause && depth < 3; depth++) {
    const c = cause as { code?: string; syscall?: string; hostname?: string; address?: string; message?: string; errors?: unknown[]; cause?: unknown };
    const detail = [c.code, c.syscall, c.hostname ?? c.address].filter(Boolean).join(" ");
    parts.push(`cause: ${detail || ""}${c.message ? ` (${String(c.message).slice(0, 160)})` : ""}`.trim());
    // Happy-eyeballs connection failures arrive as an AggregateError with one error per address
    if (Array.isArray(c.errors) && c.errors.length) {
      parts.push(
        `attempts: ${c.errors
          .slice(0, 4)
          .map((e) => {
            const x = e as { code?: string; address?: string; port?: number };
            return [x.code, x.address && `${x.address}:${x.port ?? ""}`].filter(Boolean).join(" ");
          })
          .join("; ")}`
      );
    }
    cause = c.cause;
  }
  return parts.join(" | ");
}

let warnedNoModel = false;

/** Accepts only base64 data URLs for common image types, within the upload limit. */
export function isSafeImageDataUrl(value: string) {
  return (
    value.length <= MAX_IMAGE_DATA_URL &&
    /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(value)
  );
}

/**
 * One structured-output call. Returns the parsed JSON, or null on any failure
 * (no key, HTTP error, timeout, empty or invalid output) so callers fall back.
 */
export async function openRouterJson({
  name,
  system,
  user,
  schema,
  maxTokens,
  timeoutMs,
  temperature = 0.4,
  image,
}: JsonCall): Promise<unknown | null> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.warn(`[openrouter] ${name}: no OPENROUTER_API_KEY, using fallback`);
    return null;
  }
  const model = process.env.OPENROUTER_GENERATION_MODEL;
  if (!model) {
    if (!warnedNoModel) console.warn("[openrouter] OPENROUTER_GENERATION_MODEL is not set; AI calls are skipped and fallbacks are used");
    warnedNoModel = true;
    return null;
  }
  if (image && !isSafeImageDataUrl(image)) {
    console.warn(`[openrouter] ${name}: rejected image (unsupported type or too large)`);
    return null;
  }
  const userContent = image
    ? [
        { type: "text", text: JSON.stringify(user) },
        { type: "image_url", image_url: { url: image } },
      ]
    : JSON.stringify(user);
  const started = Date.now();
  try {
    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
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
            { role: "user", content: userContent },
          ],
          response_format: {
            type: "json_schema",
            json_schema: { name, strict: true, schema },
          },
        }),
        signal: AbortSignal.timeout(timeoutMs),
      },
    );
    if (!response.ok) {
      console.warn(
        `[openrouter] ${name}: ${model} returned HTTP ${response.status} after ${Date.now() - started} ms: ${(await response.text()).slice(0, 300)}`,
      );
      return null;
    }
    const payload = (await response.json()) as {
      choices?: Array<{
        message?: { content?: string };
        finish_reason?: string;
      }>;
      usage?: { completion_tokens?: number };
    };
    const choice = payload.choices?.[0];
    const content = choice?.message?.content;
    if (!content) {
      console.warn(
        `[openrouter] ${name}: ${model} returned no content (finish_reason ${choice?.finish_reason ?? "unknown"}) after ${Date.now() - started} ms`,
      );
      return null;
    }
    console.info(
      `[openrouter] ${name}: ${model} ok in ${Date.now() - started} ms, ${payload.usage?.completion_tokens ?? "?"} output tokens, finish ${choice?.finish_reason}`,
    );
    return JSON.parse(content);
  } catch (error) {
    // Never log request content or keys; only what went wrong
    console.warn(
      `[openrouter] ${name}: ${model} failed after ${Date.now() - started} ms: ${describeFetchError(error)}`,
    );
    return null;
  }
}

/** Default Jev model for scoring candidate plans. */
export const DEFAULT_DECISION_MODEL = "typesafe/jev-1.13";

type ScoreQuestion = { instructions: string; criteria: string[] };

/**
 * Asks Jev (OpenRouter Decisions API) to score `state` on each question. Returns
 * the probability-weighted score per question (0 = first criterion), or null on
 * any failure so callers keep their default choice. Logs outcome, never content.
 */
export async function jevScore(name: string, state: unknown, questions: Record<string, ScoreQuestion>, timeoutMs = 10_000): Promise<Record<string, number> | null> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return null;
  const model = process.env.OPENROUTER_DECISION_MODEL ?? DEFAULT_DECISION_MODEL;
  const started = Date.now();
  try {
    const response = await fetch("https://openrouter.ai/api/alpha/decisions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "X-Title": "Kochi" },
      body: JSON.stringify({
        model,
        state,
        questions: Object.fromEntries(Object.entries(questions).map(([key, q]) => [key, { type: "score", ...q }])),
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok) {
      console.warn(`[jev] ${name}: ${model} returned HTTP ${response.status} after ${Date.now() - started} ms: ${(await response.text()).slice(0, 300)}`);
      return null;
    }
    const payload = (await response.json()) as { answers?: Record<string, { type?: string; score?: number; confidence?: number }> };
    const scores: Record<string, number> = {};
    for (const key of Object.keys(questions)) {
      const answer = payload.answers?.[key];
      if (typeof answer?.score !== "number") {
        console.warn(`[jev] ${name}: answer "${key}" missing a score (got keys: ${Object.keys(payload.answers ?? {}).join(", ") || "none"})`);
        return null;
      }
      scores[key] = answer.score;
    }
    console.info(`[jev] ${name}: ${model} ok in ${Date.now() - started} ms, scores ${Object.entries(scores).map(([k, v]) => `${k}=${v.toFixed(2)}`).join(" ")}`);
    return scores;
  } catch (error) {
    console.warn(`[jev] ${name}: ${model} failed after ${Date.now() - started} ms: ${describeFetchError(error)}`);
    return null;
  }
}
