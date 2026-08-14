import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ModuleProvider } from "@/components/module-provider";
import { SiteShell } from "@/components/site-shell";

export const metadata: Metadata = {
  title: "Maestría Lab",
  description: "Laboratorio personal de aprendizaje para IA y Ciencia de Datos",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f1eee6",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>
        <ModuleProvider>
          <SiteShell>{children}</SiteShell>
        </ModuleProvider>
      </body>
    </html>
  );
}
