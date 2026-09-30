import french from "./translations/fr.json";

export type Locale = "en" | "fr";
export const localeCookie = "study-locale";
export function resolveLocale(
  preference?: string,
  acceptLanguage = "",
): Locale {
  if (preference === "en" || preference === "fr") return preference;
  const languages = acceptLanguage
    .split(",")
    .map((part, index) => {
      const [tag, weight] = part.trim().split(";");
      const quality = weight?.match(/^q=([0-9.]+)$/)?.[1];
      return {
        tag: tag.toLowerCase().split("-")[0],
        quality: quality ? Number(quality) : 1,
        index,
      };
    })
    .filter(({ quality }) => quality > 0 && quality <= 1)
    .sort((a, b) => b.quality - a.quality || a.index - b.index);
  return (
    (languages.find(({ tag }) => tag === "en" || tag === "fr")
      ?.tag as Locale) || "en"
  );
}
export function translator(locale: Locale) {
  return (message: string, values: Record<string, string | number> = {}) => {
    let translated =
      locale === "fr"
        ? Object.hasOwn(french, message)
          ? (french as Record<string, string>)[message]
          : message
        : message;
    if (locale === "fr" && translated === message) {
      const size = message.match(
        /^String must contain (at least|at most) (\d+) character\(s\)$/,
      );
      if (size)
        translated = `Le texte doit contenir ${size[1] === "at least" ? "au moins" : "au plus"} ${size[2]} caractères.`;
      const sends = message.match(
        /^Email delivery failed after (\d+) sends\. Check your verified sender and Resend limits\.$/,
      );
      if (sends)
        translated = `L’envoi d’e-mails a échoué après ${sends[1]} envois. Vérifiez votre expéditeur validé et les limites de Resend.`;
    }
    return translated.replace(/\{(\w+)\}/g, (match, key: string) =>
      values[key] === undefined ? match : String(values[key]),
    );
  };
}
