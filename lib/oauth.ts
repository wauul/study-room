import Google from "next-auth/providers/google";
import AzureAD from "next-auth/providers/azure-ad";
import GitHub from "next-auth/providers/github";
import { oauthSettings } from "./oauth-settings";
export function oauthProviders(env: Record<string, string | undefined>) {
  return oauthSettings(env).map(({ id, clientId, clientSecret, tenantId }) => {
    if (id === "google") return Google({ clientId, clientSecret });
    if (id === "github") return GitHub({ clientId, clientSecret });
    return AzureAD({
      name: "Microsoft",
      clientId,
      clientSecret,
      tenantId,
      // The app does not use profile pictures; avoid an extra Graph request and a large JWT.
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email || profile.preferred_username,
          image: null,
        };
      },
    });
  });
}
