import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Source_Serif_4 } from "next/font/google";
import { AppProviders } from "@/components/AppProviders";
import "./globals.css";

const sans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700", "800"],
});

const serif = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-serif",
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Oposiciones JEX — Junta de Extremadura",
  description: "Tests de oposición jurídica JEX",
  applicationName: "Oposiciones JEX",
};

export const viewport: Viewport = {
  themeColor: "#1e4d7b",
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
    <html lang="es" className={`${sans.variable} ${serif.variable}`} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("opo_jex_theme");var s=localStorage.getItem("opo_jex_text_size");if(t==="dark")document.documentElement.dataset.theme="dark";if(s==="large")document.documentElement.dataset.textSize="large";}catch(e){}})();`,
          }}
        />
      </head>
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
