import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // PDF.js y @napi-rs/canvas usan capacidades específicas de Node.
  // Mantenerlos fuera del bundle evita que Turbopack/Next reubiquen los
  // archivos de PDF.js o empaqueten incorrectamente el binding nativo canvas.
  serverExternalPackages: ["pdfjs-dist", "@napi-rs/canvas"],
};

export default nextConfig;
