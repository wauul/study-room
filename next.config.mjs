/** @type {import('next').NextConfig} */
const config = {
  serverExternalPackages: ['@xenova/transformers', 'onnxruntime-node', 'sharp', 'pdf-parse', '@react-pdf/renderer'],
  poweredByHeader: false,
};
export default config;
