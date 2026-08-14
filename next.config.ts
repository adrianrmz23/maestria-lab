import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // PDF.js resolves its fake worker relative to its own package files in Node.
  // Keeping pdfjs-dist external prevents Turbopack from relocating pdf.mjs into
  // .next/server/chunks, where the sibling pdf.worker.mjs no longer exists.
  serverExternalPackages: ["pdfjs-dist"],
};

export default nextConfig;
