import Sentry from "@sentry/nextjs/config";
const { withSentryConfig } = Sentry;
import { sentryRelease } from "./scripts/sentry-release.mjs";
const release = sentryRelease();
const stage = process.env.SENTRY_ENVIRONMENT || process.env.VERCEL_ENV || "development";
/** @type {import('next').NextConfig} */
const config = {
  env: {
    NEXT_PUBLIC_SENTRY_RELEASE: release,
    NEXT_PUBLIC_SENTRY_ENVIRONMENT: stage,
  },
  experimental: { clientTraceMetadata: ["sentry-trace", "baggage"] },
  outputFileTracingIncludes: {
    '/api/rooms/*/documents': ['./node_modules/pdf-parse/dist/**/*', './node_modules/pdfjs-dist/legacy/build/**/*', './node_modules/@napi-rs/canvas*/**/*', './node_modules/@xenova/transformers/**/*', './node_modules/onnxruntime-node/dist/**/*', './node_modules/onnxruntime-node/bin/napi-v3/linux/x64/**/*', './node_modules/onnxruntime-node/bin/napi-v3/win32/x64/**/*', './node_modules/onnxruntime-web/**/*'],
    '/api/rooms/*/summary/*': ['./node_modules/pdfkit/js/standard-fonts/**/*', './node_modules/pdfkit/js/data/**/*'],
  },
  serverExternalPackages: [
    "@xenova/transformers",
    "onnxruntime-node",
    "sharp",
    "pdf-parse",
    "@napi-rs/canvas",
    "@react-pdf/renderer",
  ],
  poweredByHeader: false,
};
export default withSentryConfig(config, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: true,
  telemetry: false,
  release: { name: release },
  sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN, deleteSourcemapsAfterUpload: true },
  // Instrument only Next's own hooks; avoid AI/SQL dependency wrappers.
  buildTimeInstrumentation: false,
  webpack: { treeshake: { removeDebugLogging: true } },
});
