import {
  defineConfig,
  envField,
  fontProviders,
  svgoOptimizer,
} from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import mdx from "@astrojs/mdx";
import sitemap, { ChangeFreqEnum } from "@astrojs/sitemap";
import remarkToc from "remark-toc";
import remarkCollapse from "remark-collapse";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeExternalLinks from "rehype-external-links";
import rehypeMermaid from "rehype-mermaid";
import AstroPWA from "@vite-pwa/astro";
import {
  transformerNotationDiff,
  transformerNotationHighlight,
  transformerNotationWordHighlight,
} from "@shikijs/transformers";
import { transformerFileName } from "./src/utils/transformers/fileName";
import { remarkLazyLoadImages } from "./src/utils/remarkLazyLoadImages.mjs";
import { remarkSidenotes } from "./src/utils/remarkSidenotes.mjs";
import config from "./site.config";

export default defineConfig({
  site: config.site.url,
  trailingSlash: "never",
  build: {
    // Pair with trailingSlash: "never" — emit /posts/foo.html instead of
    // /posts/foo/index.html so the static asset binding serves the path
    // directly without a 307 redirect to add a trailing slash.
    format: "file",
    // Inline all CSS into HTML <head> instead of emitting an external
    // stylesheet link. Removes the render-blocking CSS request (saves
    // ~160ms LCP/FCP per PageSpeed). Trade-off: each HTML page grows by
    // the bundle size (~19 KiB today) and CSS no longer caches across
    // pages — fine for a blog where pages are mostly read once.
    inlineStylesheets: "always",
  },
  integrations: [
    mdx(),
    sitemap({
      filter: page =>
        config.features?.showArchives !== false || !page.endsWith("/archives/"),
      // Per-route priorities + changefreq. Crawlers treat these as hints,
      // not commands — the goal is to nudge Google toward fresh content first.
      serialize: item => {
        const url = item.url.replace(/\/$/, "") || item.url;
        const isHome = url === config.site.url.replace(/\/$/, "");
        const isTopNav =
          url.endsWith("/posts") ||
          url.endsWith("/about") ||
          url.endsWith("/archives");
        const isPost = /\/posts\/[^/]+$/.test(url);
        const isTopic = /\/topics(\/|$)/.test(url);
        const isPagination = /\/posts\/\d+$|\/page\/\d+$/.test(url);

        if (isHome) {
          item.priority = 1.0;
          item.changefreq = ChangeFreqEnum.DAILY;
        } else if (isTopNav) {
          item.priority = 0.9;
          item.changefreq = ChangeFreqEnum.WEEKLY;
        } else if (isPost) {
          item.priority = 0.8;
          item.changefreq = ChangeFreqEnum.MONTHLY;
        } else if (isPagination) {
          item.priority = 0.4;
          item.changefreq = ChangeFreqEnum.WEEKLY;
        } else if (isTopic) {
          item.priority = 0.3;
          item.changefreq = ChangeFreqEnum.MONTHLY;
        } else {
          item.priority = 0.5;
          item.changefreq = ChangeFreqEnum.MONTHLY;
        }
        return item;
      },
    }),
    AstroPWA({
      registerType: "autoUpdate",
      includeAssets: [
        "favicon-32x32.png",
        "apple-touch-icon.png",
        "kmanojkumar-com-logo-light.svg",
        "kmanojkumar-com-logo-dark.svg",
      ],
      manifest: {
        name: "K Manoj Kumar",
        short_name: "kmanojkumar",
        description:
          "CS Engineer & Entrepreneur based in Bengaluru. Sharing insights on DevOps for businesses, Process Automation and my Startup journey.",
        theme_color: "#ffffff",
        background_color: "#ffffff",
        display: "standalone",
        orientation: "portrait",
        scope: "/",
        start_url: "/",
        icons: [
          {
            src: "/icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: [
          "**/*.{css,js,html,svg,png,jpg,jpeg,webp,woff,woff2,ttf,ico}",
        ],
        // Treat all navigations as the same SPA shell; fall back to /404 on miss.
        navigateFallback: "/404",
      },
      experimental: {
        directoryAndTrailingSlashHandler: true,
      },
    }),
  ],
  i18n: {
    locales: ["en"],
    defaultLocale: "en",
    routing: {
      prefixDefaultLocale: false,
    },
  },
  markdown: {
    remarkPlugins: [
      remarkToc,
      [remarkCollapse, { test: "Table of contents" }],
      remarkMath,
      // Pandoc-style `^[inline footnote]` -> marginalia. Runs after math so it
      // doesn't eat $…$ patterns; runs before rehype so the emitted <sup> +
      // <span> nodes flow through the HAST pipeline correctly.
      remarkSidenotes,
      remarkLazyLoadImages,
    ],
    rehypePlugins: [
      rehypeKatex,
      // Any <a href="http(s)://..."> in markdown content gets target=_blank
      // and rel="noopener noreferrer" automatically. Skips internal links and
      // mailto:/tel: schemes. nofollow intentionally omitted — we want
      // citations to count for the destination's SEO.
      [
        rehypeExternalLinks,
        { target: "_blank", rel: ["noopener", "noreferrer"] },
      ],
      // Build-time Mermaid → inline SVG via headless chromium (Playwright).
      // strategy "img-svg" emits <img src="data:image/svg+xml,…"> — zero client JS.
      [rehypeMermaid, { strategy: "img-svg", dark: true }],
    ],
    syntaxHighlight: {
      // Skip Shiki for `mermaid` fences so rehype-mermaid can transform them.
      excludeLangs: ["mermaid"],
    },
    shikiConfig: {
      themes: { light: "github-light", dark: "github-dark-dimmed" },
      defaultColor: false,
      wrap: false,
      transformers: [
        transformerFileName({ style: "v2", hideDot: false }),
        transformerNotationHighlight(),
        transformerNotationWordHighlight(),
        transformerNotationDiff({ matchAlgorithm: "v3" }),
      ],
    },
  },
  prefetch: {
    prefetchAll: true,
    defaultStrategy: "viewport",
  },
  vite: {
    plugins: [tailwindcss()],
  },
  fonts: [
    {
      name: "Geist",
      cssVariable: "--font-sans",
      provider: fontProviders.google(),
      fallbacks: [
        "system-ui",
        "-apple-system",
        "BlinkMacSystemFont",
        "Segoe UI",
        "Helvetica Neue",
        "Arial",
        "sans-serif",
      ],
      // 400 body, 500 medium UI (nav, cards), 600 semibold (headings, links
      // on hover). 700 (font-bold) is unused — verified empty in `dist/`.
      weights: [400, 500, 600],
      styles: ["normal"],
      // woff2 for browsers, woff for Satori (which doesn't support woff2).
      formats: ["woff", "woff2"],
    },
    {
      name: "Geist Mono",
      cssVariable: "--font-mono",
      provider: fontProviders.google(),
      fallbacks: [
        "ui-monospace",
        "SFMono-Regular",
        "Menlo",
        "Consolas",
        "monospace",
      ],
      weights: [400, 500, 600],
      styles: ["normal"],
      formats: ["woff", "woff2"],
    },
  ],
  env: {
    schema: {
      PUBLIC_GOOGLE_SITE_VERIFICATION: envField.string({
        access: "public",
        context: "client",
        optional: true,
      }),
      PUBLIC_CF_ANALYTICS_TOKEN: envField.string({
        access: "public",
        context: "client",
        optional: true,
      }),
    },
  },
  experimental: {
    svgOptimizer: svgoOptimizer(),
  },
});
