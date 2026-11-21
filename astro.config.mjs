import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import { unified } from "@astrojs/markdown-remark";
import { fileURLToPath } from "url";
import path from "path";
import { loadEnv } from "vite";
import rehypeCloudinaryPicture from "./src/plugins/rehype-cloudinary-picture.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const env = loadEnv(process.env.NODE_ENV || "production", __dirname, "PUBLIC_");
const siteUrl = env.PUBLIC_SITE_URL || "https://paulapplegate.com";

// https://astro.build/config
export default defineConfig({
  site: siteUrl,
  base: "/",
  envPrefix: "PUBLIC_",

  markdown: {
    processor: unified({
      rehypePlugins: [
        [rehypeCloudinaryPicture, { cloudName: env.PUBLIC_CLOUDINARY_CLOUD_NAME }],
      ],
    }),
  },

  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  },

  server: {
    host: "127.0.0.1",
    port: 4327,
  },

  integrations: [mdx(), sitemap()],
});