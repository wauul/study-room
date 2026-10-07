/** The app uses OAuth only for identity. It never needs provider bearer tokens after sign-in. */
export function minimizeProviderAccount(account: Record<string, unknown>) {
  const result = { ...account };
  for (const field of ["access_token", "refresh_token", "id_token", "session_state"]) delete result[field];
  return result;
}
