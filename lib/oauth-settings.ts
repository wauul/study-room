/** Only complete provider configurations become public sign-in options. */
export function oauthSettings(env: Record<string, string | undefined>) {
  return [
    {
      id: "google",
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    },
    {
      id: "azure-ad",
      clientId: env.AZURE_AD_CLIENT_ID,
      clientSecret: env.AZURE_AD_CLIENT_SECRET,
      tenantId: env.AZURE_AD_TENANT_ID || "common",
    },
    { id: "github", clientId: env.GITHUB_ID, clientSecret: env.GITHUB_SECRET },
  ].filter(
    (
      settings,
    ): settings is typeof settings & {
      clientId: string;
      clientSecret: string;
    } => !!settings.clientId && !!settings.clientSecret,
  );
}
