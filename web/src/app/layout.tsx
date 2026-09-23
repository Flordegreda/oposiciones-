import type { Metadata, Viewport } from "next";
import { AppProviders } from "@/components/AppProviders";
import "./globals.css";

export const metadata: Metadata = {
  title: "Oposiciones JEX — Junta de Extremadura",
  description: "Tests de oposición jurídica JEX",
  applicationName: "Oposiciones JEX",
  appleWebApp: {
    capable: true,
    title: "JEX",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#007a33",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
