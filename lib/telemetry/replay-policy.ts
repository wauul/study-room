/** Raw rrweb metadata is not scrubbed by beforeAddRecordingEvent. Restrict capture to public pages. */
export function replayAllowed(location: {
  pathname: string;
  search: string;
  hash: string;
}) {
  return (
    !location.search &&
    !location.hash &&
    ["/help", "/privacy", "/guides"].includes(location.pathname)
  );
}
export const replayPrivacyOptions = {
  maskAllText: true,
  maskAllInputs: true,
  blockAllMedia: true,
  block: ["main", "header", "footer", "[data-sentry-block]"],
  maskAttributes: ["href", "src", "title", "alt", "aria-label"],
  networkDetailAllowUrls: [] as string[],
  networkCaptureBodies: false,
  // Drop custom recording breadcrumbs, including navigation/console/network metadata.
  beforeAddRecordingEvent: () => null,
};
