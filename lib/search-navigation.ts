const key = "study-search-return";
export function rememberSearchOrigin() {
  if (window.location.pathname === "/search") return;
  try { sessionStorage.setItem(key, window.location.pathname + window.location.search + window.location.hash); } catch {}
}
export function searchReturnPath() {
  try {
    const saved = sessionStorage.getItem(key);
    if (saved) {
      const url = new URL(saved, window.location.origin);
      if (url.origin === window.location.origin && url.pathname !== "/search")
        return url.pathname + url.search + url.hash;
    }
  } catch {}
  return "/";
}
