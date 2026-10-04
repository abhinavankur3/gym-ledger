import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

describe("describeFetchError", () => {
  it("unwraps the network cause behind 'fetch failed'", async () => {
    const { describeFetchError } = await import("./openrouter");
    const dns = Object.assign(new Error("getaddrinfo EAI_AGAIN openrouter.ai"), { code: "EAI_AGAIN", syscall: "getaddrinfo", hostname: "openrouter.ai" });
    const text = describeFetchError(new TypeError("fetch failed", { cause: dns }));
    expect(text).toContain("TypeError fetch failed");
    expect(text).toContain("EAI_AGAIN getaddrinfo openrouter.ai");
  });

  it("lists per-address attempts for connection failures", async () => {
    const { describeFetchError } = await import("./openrouter");
    const agg = Object.assign(new AggregateError([
      Object.assign(new Error("x"), { code: "ENETUNREACH", address: "2606:4700::1", port: 443 }),
      Object.assign(new Error("y"), { code: "ETIMEDOUT", address: "104.18.2.1", port: 443 }),
    ], "connect failed"), { code: "ETIMEDOUT" });
    const text = describeFetchError(new TypeError("fetch failed", { cause: agg }));
    expect(text).toContain("ENETUNREACH 2606:4700::1:443");
    expect(text).toContain("ETIMEDOUT 104.18.2.1:443");
  });

  it("handles non-errors", async () => {
    const { describeFetchError } = await import("./openrouter");
    expect(describeFetchError("boom")).toBe("unknown error");
  });
});
