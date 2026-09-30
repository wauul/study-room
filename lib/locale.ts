import "server-only";
import { cookies, headers } from "next/headers";
import { cache } from "react";
import { localeCookie, resolveLocale } from "./i18n";

export const getLocale = cache(async () => {
  const [jar, requestHeaders] = await Promise.all([cookies(), headers()]);
  return resolveLocale(
    jar.get(localeCookie)?.value,
    requestHeaders.get("accept-language") ?? "",
  );
});
