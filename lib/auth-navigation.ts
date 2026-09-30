/** Only return to local routes. Used by password and provider sign-in alike. */
export function signInReturnPath(search: string) {
  const params = new URLSearchParams(search);
  const next = params.get("next") || params.get("callbackUrl");
  return next?.startsWith("/") && !next.startsWith("//") && !next.includes("\\")
    ? next
    : "/";
}
export function signInError(code: string | null) {
  if (!code) return "";
  if (code === "OAuthAccountNotLinked")
    return "Sign in with the method you originally used for this account. You can then connect another provider.";
  if (code === "AccessDenied")
    return "Sign-in was cancelled or denied. Try again when you’re ready.";
  if (code === "CredentialsSignin")
    return "Email or password was not recognized.";
  return "Unable to sign in. Please try again.";
}
