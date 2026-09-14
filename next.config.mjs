/** @type {import('next').NextConfig} */
const config = {
  serverExternalPackages: ['@xenova/transformers', 'onnxruntime-node', 'sharp', 'pdf-parse'],
  poweredByHeader: false,
};
export default config;
