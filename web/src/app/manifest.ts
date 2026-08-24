import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Oposiciones JEX",
    short_name: "JEX",
    description: "Tests y fichas de oposición jurídica JEX",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f0ebe3",
    theme_color: "#1e4d7b",
    lang: "es",
    icons: [
      {
        src: "/icon",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
