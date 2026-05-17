# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [3.1.1] — 2026-05-18

### Fixed

- Pagefind search now loads its WebAssembly index. CSP `script-src` was blocking WASM compilation; added `'wasm-unsafe-eval'`.
- Post-title view-transition morph works for every post, including titles with apostrophes or colons (`"Didn't Catch Up"`, `"Hyperdrive:"`). Both Card and Post H1 now use Astro's `transition:name` directive (consistent CSS-ident escaping). Belt-and-suspenders: `slugifyStr` strips all non-`[a-z0-9-]` characters at the source so the bug can't recur with future titles.
- Top progress rail on post pages appears reliably on every navigation and hard refresh. Was intermittently missing due to `data-astro-rerun` racing the View Transition swap. Refactored to an idempotent `astro:page-load` listener + eager initial call.
- Progress rail is now scoped to post pages only (via `<article id="article">` marker check) — was previously rendering on homepage and other surfaces after first visiting a post in a session.

### Changed

- Hero headshot fades from grayscale → full color on hover/focus (500 ms).
- `Socials` links set `rel="noopener noreferrer"` on external `http(s)` URLs; `mailto:` and relative paths untouched.
- PWA icons regenerated (`favicon-32x32`, `icon-192`, `icon-512`, `apple-touch-icon`). `?v=2` cache-bust query appended in `<link>` hrefs to invalidate the 1-year cache from v3.1.0.
- Additional Geist Mono font preload (used in topic chips, footer, meta lines).
- `rehype-external-links` plugin added — external links inside post bodies now get `target="_blank" rel="noopener noreferrer"` automatically.

### Removed

- `lodash.kebabcase` dependency (no longer used after `slugifyStr` rewrite).

## [3.1.0] — 2026-05-18

Initial public launch of **kmanojkumar.com v3** — a Git-backed personal blog
built on Astro 6 + Tailwind 4 + Cloudflare Workers, replacing the previous
Ghost-based site at the same domain. Existing posts migrated with original
publish dates and full URL preservation (301s for every Ghost-era path).

### Added

- Site stack: Astro 6 + Tailwind 4 + Geist Sans/Mono via Astro `fontProviders.google()`; deployed on Cloudflare Workers + Static Assets with `run_worker_first: true`.
- Existing posts migrated from Ghost with original publish dates preserved.
- Save-time content pipeline: KaTeX math (`remark-math` + `rehype-katex`), Mermaid → SVG (`rehype-mermaid` + Playwright), Shiki code blocks (themes / diff markers / line highlight / file-name), auto-lazy markdown images, `astro-embed` for Tweets/YouTube/Vimeo/Gists.
- LLM-friendly markdown twins for every page: `/index.md`, `/about.md`, `/posts.md`, `/posts/<slug>.md`, `/topics.md`, `/topics/<topic>.md`. Content negotiation via `Accept: text/markdown` on any URL handled by the Worker.
- Dynamic `/llms.txt` generated at build (auto-picks-up new posts + topics; per llmstxt.org spec).
- Cloudflare Worker (`src/worker.ts`): canonical-host enforce, legacy Ghost URL → `/posts/<slug>` map, `/tags/* → /topics/*`, `/archives → /posts`, `/blog/* → /posts/*`, content-negotiation rewrite, real markdown 404 body for `.md` paths that don't exist.
- Custom design system in `src/styles/global.css`: `app-link`, `app-nav-link`, `app-h1`, `app-h2`, `app-hero`, `app-section-header`, `app-pill`, `app-btn`, `app-meta`; single `--underline-offset: 4px` token.
- Homepage hero with personal headshot (Astro-optimized, eager-loaded, `rounded-md`) clickable to `/about`; ASCII figlet README banner with `$ whoami` framing.
- Topics taxonomy (renamed from "tags" everywhere); year-folder content organization (`src/content/posts/<year>/<slug>.md` with flat URLs).
- Pagefind static search with `?q=` sync, auto-focus, `sessionStorage` back-URL.
- View Transitions (`<ClientRouter />`) — SPA-like navigation.
- PWA via `@vite-pwa/astro` (installable, offline-capable, manifest + service worker).
- RSS + Atom + JSON Feed with auto-discovery `<link rel="alternate">`; per-route sitemap priorities + change-freq.
- StructuredData JSON-LD: `BlogPosting` (with `wordCount` + `timeRequired` + `keywords`), `Person` on `/about`, `WebSite` (with `SearchAction`) on `/`.
- Reading time on post cards + post pages; surfaced in JSON-LD.
- Site-wide Satori OG image (`/og.png`) + per-post Satori fallback when frontmatter `ogImage` not set. Logo read from disk at build time (no HTTP fetch — robust against DNS bootstrap).
- Cloudflare Web Analytics support (gated by `PUBLIC_CF_ANALYTICS_TOKEN`; auto-injection at the CF edge also works when the secret is unset).
- GitHub Actions auto-deploy to Cloudflare Workers on push to `main` (`cloudflare/wrangler-action@v3`).
- Commitizen (`pnpm cz`) + husky + lint-staged for the contribution workflow.
- `/ship` skill at `.claude/skills/ship/SKILL.md` (Claude Code) + `.agents/skills/ship/SKILL.md` (Codex via symlink — same canonical SKILL.md). Workflow also described in prose in `AGENTS.md` for any other agent.
- Split-license model: code under **MIT** (`LICENSE`), posts + content under **CC BY 4.0** (`CONTENT-LICENSE.md`).
- Footer reflow: copyright + commit hash on row 1, "Code MIT · Posts CC BY 4.0" on row 2 (mobile); single line on desktop.
- Topic chips rendered in Geist Mono for visual distinction from prose links.
- `trailingSlash: "never"` + `build.format: "file"` so URLs are clean (Astro emits `/posts/foo.html`, not `/posts/foo/index.html`).
- `getSortedPosts` excludes unlisted posts from listings/feeds/search; `getRenderablePosts` includes them for direct-link rendering.

### Security

- `cf/_headers` ships strict CSP, HSTS preload (`max-age=63072000; includeSubDomains; preload`), `X-Frame-Options: DENY`, COOP `same-origin`, Permissions-Policy, `X-Content-Type-Options: nosniff`, `X-DNS-Prefetch-Control: on`.
- Public-repo-safe `wrangler.jsonc` — no account_id, no tokens; secrets injected at deploy time via `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` env.
- 1-year immutable cache for `/_astro/*`, `/*.woff2`, `/*.png`, `/*.jpg`, `/*.svg`, `/*.webp`; short browser cache + long edge cache with stale-while-revalidate for HTML and feeds.
- `unlisted: true` posts: page renders at `/posts/<slug>` and `.md` twin exists, but excluded from home/posts list/topic pages, RSS/Atom/JSON feeds, and Pagefind search index.
