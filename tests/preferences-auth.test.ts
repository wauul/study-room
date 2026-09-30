import test from "node:test";
import assert from "node:assert/strict";
import { resolveLocale, translator } from "../lib/i18n";
import { getPosts, getFaqs, posts } from "../lib/content";
import { signInReturnPath, signInError } from "../lib/auth-navigation";
import { oauthSettings } from "../lib/oauth-settings";

test("explicit language wins; browser languages respect weights and regional tags", () => {
  assert.equal(resolveLocale("en", "fr-FR"), "en");
  assert.equal(resolveLocale("fr", "en-US"), "fr");
  assert.equal(resolveLocale(undefined, "de-DE,fr-CA;q=0.9,en;q=0.5"), "fr");
  assert.equal(resolveLocale("invalid", "fr;q=0,en;q=0.8"), "en");
  assert.equal(resolveLocale(undefined, "ja"), "en");
});
test("French templates interpolate values without altering names or unknown content", () => {
  const t = translator("fr");
  assert.equal(
    t("Continue with {provider}", { provider: "GitHub" }),
    "Continuer avec GitHub",
  );
  assert.equal(
    t("{filename} is ready — {count} passages added.", {
      filename: "Cours.pdf",
      count: 0,
    }),
    "Cours.pdf est prêt — 0 passages ajoutés.",
  );
  assert.equal(
    t("Student's custom course title"),
    "Student's custom course title",
  );
  assert.equal(t("constructor"), "constructor");
});
test("French public content remains addressable using the original guide routes and code", () => {
  const translated = getPosts("fr");
  assert.deepEqual(
    translated.map((p) => p.slug),
    posts.map((p) => p.slug),
  );
  assert.equal(translated[1].code, posts[1].code);
  assert.match(translated[1].intro, /certain/);
  assert.match(getFaqs("fr")[0][1], /Copier le lien/);
});
test("password and OAuth redirects retain a local destination and reject external redirects", () => {
  assert.equal(signInReturnPath("?next=/rooms/abc/notes"), "/rooms/abc/notes");
  for (const next of [
    "//evil.example",
    "https://evil.example",
    "/\\evil.example",
  ])
    assert.equal(
      signInReturnPath("?callbackUrl=" + encodeURIComponent(next)),
      "/",
    );
  assert.match(signInError("OAuthAccountNotLinked"), /originally used/);
});
test("OAuth settings require complete credentials and default Microsoft to common", () => {
  assert.equal(oauthSettings({}).length, 0);
  assert.equal(oauthSettings({ GOOGLE_CLIENT_ID: "test-client" }).length, 0);
  const providers = oauthSettings({
    GOOGLE_CLIENT_ID: "test",
    GOOGLE_CLIENT_SECRET: "test",
    AZURE_AD_CLIENT_ID: "test",
    AZURE_AD_CLIENT_SECRET: "test",
    GITHUB_ID: "test",
    GITHUB_SECRET: "test",
  });
  assert.deepEqual(
    providers.map((p) => p.id),
    ["google", "azure-ad", "github"],
  );
  assert.equal(providers[1].tenantId, "common");
});
