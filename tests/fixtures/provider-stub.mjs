// Loaded ONLY by the isolated integration harness, never by application entrypoints.
const realFetch = globalThis.fetch;
const mockOrigin = process.env.GUARDRAIL_TEST_PROVIDER_ORIGIN;
if (!mockOrigin?.startsWith("http://127.0.0.1:")) throw new Error("Isolated provider origin required");
globalThis.fetch = (input, options) => {
  const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
  if (url.hostname === "challenges.cloudflare.com") return realFetch(`${mockOrigin}/turnstile`, options);
  if (url.hostname === "api.resend.com") return realFetch(`${mockOrigin}/email`, options);
  if (url.hostname === "api.groq.com") return realFetch(`${mockOrigin}/ai`, options);
  if (url.hostname !== "127.0.0.1" && url.hostname !== "localhost") throw new Error("External traffic forbidden in guardrail integration tests");
  return realFetch(input, options);
};
