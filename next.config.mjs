/** @type {import('next').NextConfig} */
const config = {
  outputFileTracingIncludes: {
    '/api/rooms/*/documents': ['./node_modules/pdf-parse/dist/**/*', './node_modules/pdfjs-dist/legacy/build/**/*', './node_modules/@napi-rs/canvas*/**/*'],
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
export default config;
