# OAuth sign-in

Google, Microsoft and GitHub use the existing NextAuth v4 flow. The same buttons handle signup and returning users. Email/password remains available. Providers are enabled only when both their client ID and secret exist; unavailable buttons explain that configuration is pending.

## Enable providers

1. Apply the additive database migration with `npm run db:migrate` against the intended database. Existing users retain their IDs, password hashes and room memberships. New OAuth users have no password hash. The Account table identifies users by provider and provider account ID; the Prisma adapter also supplies standard Session and VerificationToken tables, while sessions continue using JWTs.
2. Set `NEXTAUTH_SECRET`, `NEXTAUTH_URL` and `DATABASE_URL` in the server environment. `NEXTAUTH_URL` must be the app's actual origin, including the development port. Do not put provider secrets in `NEXT_PUBLIC_*` variables or commit them.
3. Register each application below, set its environment variables, and restart/redeploy the app. Check `/api/auth/providers` to confirm the desired providers are enabled.

| Provider | Environment variables | Redirect URI suffix |
| --- | --- | --- |
| Google | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | `/api/auth/callback/google` |
| Microsoft | `AZURE_AD_CLIENT_ID`, `AZURE_AD_CLIENT_SECRET`, `AZURE_AD_TENANT_ID` | `/api/auth/callback/azure-ad` |
| GitHub | `GITHUB_ID`, `GITHUB_SECRET` | `/api/auth/callback/github` |

For the configured local preview, prefix each suffix with `http://localhost:3101` and run `npm run dev -- --hostname 127.0.0.1 --port 3101`. For production, prefix it with `https://study-room-ten-blond.vercel.app`. Each registered provider now has both exact callbacks. GitHub currently supports multiple redirect URIs; wildcard matching is disabled. Keep separate registrations when development and production require separate credentials or access policies.

- Google: create a Web application OAuth client, configure its consent screen and test users if the application is in testing. Add the exact authorized redirect URI. [Google provider documentation](https://next-auth.js.org/providers/google).
- Microsoft: create a Microsoft Entra app registration with the Web platform. To support work/school and personal Microsoft accounts, select the corresponding account audience and use tenant `common` (the default). For one organization, configure its tenant ID and matching audience. Use the client secret's **value**, not its identifier. No profile-photo Graph request is made. [Microsoft provider documentation](https://next-auth.js.org/providers/azure-ad).
- GitHub: create an OAuth App with the application homepage and exact authorization callback URL. [GitHub provider documentation](https://next-auth.js.org/providers/github).

## Existing accounts

An email match alone never links accounts. If a user gets the account-linking message, they sign in with their original method, visit `/login` while still signed in, and choose the new provider. NextAuth links the provider to that authenticated user. No provider enables `allowDangerousEmailAccountLinking`. OAuth identities must provide an email because membership and personal reports require one. Provider email addresses are normalized before account lookup.

Both password and OAuth sign-in preserve a local `next`/`callbackUrl` destination; external and protocol-relative destinations are rejected. Provider errors return to `/login` and have English/French recovery messages.

## Provisioned on 30 September 2026

Google uses the dedicated **Study Room** Cloud project (`sixth-now-510214-p9`) and **Study Room Web** client. Its external audience is published in production, with the live homepage and privacy URL. Only OpenID, profile and email scopes are requested.

Microsoft uses the **Study Room** registration in the owner's new Entra directory. It supports personal accounts and accounts from any Entra tenant through `common`, with the Web platform and both callbacks. Its homepage and privacy links are saved. The client secret uses the longest standard lifetime, **730 days (24 months)**, and expires **29 September 2028**. Replace it in Vercel and the local environment before then. Publisher verification remains unavailable without a verified custom domain and Partner Center account; personal-account consent succeeded, while organizational policies can require administrator approval.

GitHub uses the owner's **Study Room** OAuth app. Both callbacks are registered without wildcards or Device Flow. Its requested access is read-only profile and email. The Account schema supports `refresh_token_expires_in` as well as the access-token expiration fields supplied by expiring GitHub tokens.

All provider credentials are stored as server environment variables on `wauuls-projects/study-room`, for Production and Development. Client secrets use Vercel's Secret type. Development credentials are also present in ignored `.env.local`; the local session secret is separate from production. Production's existing session secret was preserved. Vercel does not expose production Secret values through environment pulls.

The original six-month Microsoft secret was replaced in both Vercel environments and locally, production was redeployed, and the old secret was retired after successful login checks. Fresh production sign-ins through Google, Microsoft and GitHub returned to the existing user's study rooms.

The additive OAuth migration was applied successfully to both databases. Live provider callbacks and authenticated room access were verified locally and in production. The owner's existing test account was linked with explicit authorization; its user ID, password hash and memberships were preserved. This one-time setup does not enable automatic email-based linking for future users. Typecheck, all 16 tests and the Vercel production build passed.

This verifies authentication and account persistence. AI/indexing, email delivery and personalized exports were outside this credential setup.
