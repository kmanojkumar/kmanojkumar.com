<pre>
$ whoami
 ███╗   ███╗ ██╗  ██╗   K Manoj Kumar
 ████╗ ████║ ██║ ██╔╝   ─────────────────────────────────
 ██╔████╔██║ █████╔╝    role : CS Engineer &amp; Entrepreneur
 ██║╚██╔╝██║ ██╔═██╗    org  : Founder / CEO @ <a href="https://github.com/vegastack">VegaStack</a>
 ██║ ╚═╝ ██║ ██║  ██╗   site : kmanojkumar.com
 ╚═╝     ╚═╝ ╚═╝  ╚═╝   loc  : Bengaluru, India

                        MK ▌
</pre>

# kmanojkumar.com

Personal blog of K Manoj Kumar — CS Engineer & Entrepreneur, Founder/CEO at
VegaStack. Built with [Astro](https://astro.build), deployed on Cloudflare
Workers.

## Stack

- **Astro 6** with Content Collections v2
- **Tailwind CSS 4** (CSS-first config + utility-class design system in `src/styles/global.css`)
- **Geist** font family (Sans + Mono) via Astro's built-in `fontProviders.google()`
- **MDX** for posts, with:
  - **KaTeX** for math (`$E=mc^2$` / `$$\int$$`) — rendered at build, no client JS
  - **Mermaid** diagrams (` ```mermaid ` fences) — rendered to inline SVG at build via Playwright
  - **Shiki** syntax highlighting (dark + light themes baked in)
  - **astro-embed** for Tweet / YouTube / Vimeo / GitHub Gist
  - Auto image lazy-loading via a tiny remark plugin
- **View Transitions** (`<ClientRouter />`) for SPA-like navigation
- **Pagefind** for static-site search
- **Satori** for dynamic OG images (site-wide `/og.png`; per-post fallback when a cover image isn't set)
- **RSS + Atom + JSON Feed** with auto-discovery `<link rel="alternate">`
- **LLM-friendly Markdown twins** — every page has a `.md` sibling (`/`, `/about`, `/posts`, `/posts/<slug>`) and the Worker also serves the `.md` version on `Accept: text/markdown`
- **`public/llms.txt`** per the [llms.txt](https://llmstxt.org/) spec
- **PWA** via `@vite-pwa/astro` (installable, offline-capable)
- **Cloudflare Web Analytics** (privacy-first beacon, no cookies)
- **Cloudflare Workers** + Static Assets for hosting (`wrangler.jsonc`, `cf/_headers` for security + cache)

## Local development

```bash
pnpm install
pnpm dev               # http://localhost:4321 (Astro dev)
pnpm build             # astro check + astro build + pagefind + ship _headers
pnpm preview           # astro preview from dist/
pnpm preview:wrangler  # build + run via wrangler on :8787 (exercises Worker)
```

Requires Node ≥ 22.12 and pnpm 10+. For local Mermaid rendering install the
Playwright Chromium binary once: `pnpm exec playwright install chromium`. CI
installs it automatically.

## Writing a post

Add a markdown file to `src/content/posts/<year>/<slug>.md`. Year is for IDE
sanity only — the URL stays flat at `/posts/<slug>`.

```yaml
---
author: K Manoj Kumar # optional; defaults to site.author
pubDatetime: 2026-01-30T00:00:00Z # ISO-8601 (z.coerce.date accepts strings)
modDatetime: # optional; same format
title: "Your title"
slug: your-slug # optional; derived from filename if omitted
featured: false # promote to "Featured" section on homepage
draft: false # excludes from build entirely
unlisted: false # renders /posts/<slug> but hidden from listings/feeds/search
topics: [devops, automation] # always an array; empty by default
ogImage: "../../../assets/images/posts/foo-cover.jpeg" # relative path
heroImage: # optional, in-body hero (different from ogImage)
description: "1-2 sentences for OG + feeds + listings (~150 chars ideal)"
canonicalURL: # optional; set if cross-posted
source: # optional, e.g. "x.com/kmanojkumar/status/123"
AIDescription: false # editorial transparency flag
---
```

The full schema lives in `src/content.config.ts`. Math (`$…$`), diagrams (` ```mermaid `), and `<Tweet />` / `<YouTube />` embeds all work in MDX.

## Deploy to Cloudflare Workers

### Production (GitHub Actions)

Every push to `main` triggers `.github/workflows/deploy.yml`, which:

1. Installs deps + Playwright Chromium (for Mermaid)
2. Runs `pnpm build` (astro check → astro build → pagefind → copy `cf/_headers` to dist)
3. Deploys via `cloudflare/wrangler-action@v3`

**Required GitHub repository secrets** (Settings → Secrets and variables → Actions):

| Secret                                         | What it is                                                                                                                                                 |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CLOUDFLARE_API_TOKEN`                         | API token with `Workers Scripts:Edit` permission. Create at <https://dash.cloudflare.com/profile/api-tokens> using the "Edit Cloudflare Workers" template. |
| `CLOUDFLARE_ACCOUNT_ID`                        | Account ID from the Cloudflare dashboard sidebar.                                                                                                          |
| `PUBLIC_CF_ANALYTICS_TOKEN` _(optional)_       | Cloudflare Web Analytics beacon token; embedded in HTML at build time.                                                                                     |
| `PUBLIC_GOOGLE_SITE_VERIFICATION` _(optional)_ | Meta-tag value from Google Search Console.                                                                                                                 |

The repository is **public**, so no secrets live in source. `wrangler.jsonc`
contains no account_id or tokens.

### Local preview (optional)

```bash
cp .dev.vars.example .dev.vars   # fill in values; .dev.vars is gitignored
pnpm wrangler login              # one-time, interactive
pnpm preview:wrangler            # builds + runs Workers locally on :8787
```

### Custom domain

After the first successful deploy, add `kmanojkumar.com` as a Custom Domain in
Cloudflare → Workers & Pages → `kmanojkumar-com` → Settings → Domains & Routes.
DNS records auto-populate when the domain is already on Cloudflare.

## Project structure

```
.
├── astro.config.ts          # integrations, markdown plugins, fonts, sitemap, prefetch, env
├── site.config.ts           # site title, socials, features, share links
├── wrangler.jsonc           # CF Workers config (no secrets)
├── cf/_headers              # security + cache headers (copied to dist/_headers by build)
├── public/
│   ├── llms.txt             # llms.txt spec — curated site overview for LLM crawlers
│   ├── favicon.svg, icon-*.png, kmanojkumar-com-logo-*.svg, default-og.jpg
│   └── manifest.webmanifest # generated by PWA plugin at build
├── src/
│   ├── assets/              # icons + post hero/cover images
│   ├── components/          # Astro components (Card, Header, Footer, Topic, StructuredData …)
│   ├── content/
│   │   ├── pages/about.md
│   │   └── posts/<year>/<slug>.md
│   ├── content.config.ts    # collection schemas (posts, pages)
│   ├── i18n/                # ui strings (en.ts) + types
│   ├── layouts/             # Layout.astro + PostLayout.astro
│   ├── pages/               # file-based routing
│   │   ├── index.astro, about.astro, posts.astro, search.astro, 404.astro
│   │   ├── *.md.ts          # /index.md /about.md /posts.md markdown twin endpoints
│   │   ├── topics/          # /topics + /topics/<topic>
│   │   ├── posts/[...slug].(astro|md.ts)  # post HTML + markdown twin
│   │   └── posts/[...slug]/index.png.ts   # per-post Satori OG fallback
│   ├── styles/              # theme tokens + global utilities + typography
│   ├── utils/               # slugify, postFilter, readingTime, getPostPaths, etc.
│   └── worker.ts            # CF Worker entry — redirects + Accept-based .md negotiation
├── .github/workflows/       # CI: lint + deploy
├── CLAUDE.md                # repo-specific rules for Claude / AI agents
├── AGENTS.md                # workflow recipes
└── CHANGELOG.md             # Keep-A-Changelog format
```

## Design system (`src/styles/global.css`)

Reusable utility classes. Edit one place, every consumer updates.

| Utility                    | Use for                                                   |
| -------------------------- | --------------------------------------------------------- |
| `app-link`                 | Body / inline links — permanent underline                 |
| `app-nav-link`             | Header nav, Card titles — hover-only underline            |
| `app-h1`                   | Page titles (3xl → 4xl, semibold, tracking-tight)         |
| `app-h2`                   | Section heads (2xl, medium, tracking-tight, tabular-nums) |
| `app-hero`                 | Homepage hero h1 (4xl → 5xl)                              |
| `app-section-header`       | Header wrapper with bottom border + `mt-12 mb-4` spacing  |
| `app-pill`                 | Bordered chips (month label)                              |
| `app-btn`                  | Buttons (pager, share, copy-link)                         |
| `app-meta`                 | Muted mono meta lines (dates, reading time)               |
| `active-nav`               | Active nav indicator                                      |
| `max-w-app` / `app-layout` | Container width + page padding                            |

Global `--underline-offset: 4px` token in `theme.css` drives every underline
offset on the site (links + nav + body + search input).

## Acknowledgements

Built on [AstroPaper](https://github.com/satnaing/astro-paper) — thanks for the clean foundation.

## License

This repo uses a split license:

- **Code** — [MIT](./LICENSE) © K Manoj Kumar. Use, modify, redistribute freely with attribution.
- **Content** (blog posts under `src/content/`, images under `src/assets/images/posts/`) — [CC BY 4.0](./CONTENT-LICENSE.md) © K Manoj Kumar. Share and adapt with credit + a link back to the original post.

AstroPaper portions remain under their original [MIT license](https://github.com/satnaing/astro-paper/blob/main/LICENSE).
