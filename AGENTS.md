# AGENTS.md

Short workflow recipes for AI agents working on this repo. See `CLAUDE.md` for
the deeper rules + file conventions.

## New blog post

When the user says "new blog post" or "draft a post":

1. **Ask for the topic / title first** if not provided.
2. Pick a short kebab-case slug from the title.
3. Create the file at `src/content/posts/<current-year>/<slug>.md`.
4. Use this minimal frontmatter — don't invent body content unless the user
   provides an outline:

   ```yaml
   ---
   title: "<the title>"
   description: "TBD (1-2 sentences, ~150 chars)"
   pubDatetime: <today, ISO 8601 e.g. 2026-05-17T00:00:00Z>
   draft: true
   ---
   ```

   Omit `topics:` if you don't know yet — the schema defaults to an empty
   array. Adding `topics: []` works too.

5. Open the file for the user (`code <path>`).

## Image handling

- Source under `src/assets/images/posts/`.
- Reference from markdown with a relative path: `../../../assets/images/posts/foo.jpg`
  (three levels up because of the year folder).
- Astro processes these through the Image pipeline automatically (responsive
  sizes, lazy-loading, WebP/AVIF where supported).
- Use `ogImage` in frontmatter for the social share preview; `heroImage` for an
  in-body hero (cards + post detail fall back to `ogImage`).

## Release workflow (`/ship`)

**Never commit + push manually.** Use the `ship` workflow for every release —
hot fixes, doc tweaks, new posts, code features, anything. Single entry point.

- **Claude Code:** type `/ship` (or "ship it", "release", "commit and push"). Claude auto-loads the skill at `.claude/skills/ship/SKILL.md`.
- **Codex:** type `$ship` to mention the skill directly, run `/skills` to browse available skills, or just say "ship it" / "release" in natural language. Codex auto-discovers the skill from `.agents/skills/ship/SKILL.md` (which is a symlink to `.claude/skills/ship/SKILL.md` — single source of truth, both agents read identical content).
- **Other agents** (Cursor, Aider, Goose, etc.) — no native skill auto-discovery. Follow the prose pipeline below, or point the agent at `.claude/skills/ship/SKILL.md` directly.

### Pipeline at a glance

1. **Detect type from the diff:**
   - **POST** — only changes under `src/content/posts/`, `src/assets/images/posts/`, or `public/llms.txt`
   - **CODE** — any change outside those paths
   - **MIXED** — both kinds; treat as CODE for bump logic, surface posts separately in the changelog
2. **Analyze diff** — parallel: `git status`, `git diff --stat`, `git diff`, `git log -5`, `gh release list --limit 1`, read CHANGELOG head + `package.json` version. The latest GH release tag is the source of truth (local `package.json` may be stale).
3. **Audit docs** — scope by type:
   - POST → `public/llms.txt` recent-posts list, frontmatter `pubDatetime`/`modDatetime`, homepage `featured: true` toggle
   - CODE → glob `**/*.md`, grep every renamed flag / path / utility across `README.md`, `CLAUDE.md`, `AGENTS.md`, `public/llms.txt`. Look for stale, missing, inconsistent refs. Fix in place.
4. **Draft** — suggest version, draft Keep-A-Changelog entry, conventional commit message (HEREDOC body, no `Co-Authored-By`), GitHub release title + body. Wait for user version confirmation.
5. **Bump** — update `package.json` `"version"` and prepend the new entry to `CHANGELOG.md`. No script-header bumps.
6. **Confirm** — show "Ready to ship vX.Y.Z" summary. Wait for explicit "push".
7. **Execute** — `git add` specific files (never `-A`), commit with HEREDOC, `git pull --rebase`, `git push`, `gh release create vX.Y.Z`. Print release + Actions URLs.

### Versioning rules

- New / updated post → **patch** (X.Y.**Z**)
- `fix:` / `refactor:` / `perf:` / `style:` / `docs:` / `chore:` → **patch**
- `feat:` (new feature) → **minor** (X.**Y**.0)
- Breaking → **minor** + `### Changed (breaking)` flag in changelog
- Major (X.0.0) — **never** auto-suggest; only on explicit user request
- Starting version: `3.1.0`

Commit prefixes: `post:` (new/updated post), `feat:`, `fix:`, `refactor:`, `perf:`, `style:`, `docs:`, `chore:`.

### Commit + changelog by release type

| Type | Commit prefix | Commit body template | Changelog sections |
|---|---|---|---|
| POST (new) | `post: <title>` | `## Summary` + `## What Changed` | `### Published` |
| POST (update) | `post: update <title>` | same as POST | `### Updated` |
| CODE | `feat:` / `fix:` / etc. | `## What Changed` + `## Why` + `## Technical Details` + `## Documentation` | `### Added` / `### Changed` / `### Fixed` / `### Removed` / `### Security` |
| MIXED | dominant CODE type (`feat:` if any feature, else `fix:` / `refactor:` / etc.) — **never `post:`** | CODE template; posts surface as `## What Changed` bullets labeled "Published:" / "Updated:" | both — `### Published`/`### Updated` first, then code sections, in the same `## [X.Y.Z]` entry |

See `.claude/skills/ship/SKILL.md` for full worked examples.

### Hard rules

- No commit or push without an explicit "push" signal.
- No `git add -A` / `git add .` — stage by filename.
- Always `git pull --rebase` before push.
- No `--force`, no `--no-verify`. If a pre-commit hook fails, fix the root cause and make a **new** commit (never `--amend` after hook failure).
- No `Co-Authored-By` trailer in commit messages.
- Push back on out-of-sequence versions (gap or rollback) — don't silently accept.

### Pre-ship sanity (built into `/ship`)

- `pnpm exec astro check` — 0 errors required.
- `pnpm build` — must succeed end-to-end (including Mermaid render). CI re-runs this; passing locally avoids burning a failed deploy.

## Validating Worker logic (redirects + md content negotiation)

Use `pnpm preview:wrangler` (not `pnpm dev`) and test:

```bash
# Old Ghost URL should 301:
curl -sI http://localhost:8787/automate-devops-with-ai-agents | head -2

# Old /tags/* path should 301 to /topics/*:
curl -sI http://localhost:8787/tags/devops | head -2

# Accept-based markdown negotiation:
curl -s -H "Accept: text/markdown" http://localhost:8787/posts/automate-devops-with-ai-agents | head -10

# Direct .md route:
curl -s http://localhost:8787/posts/automate-devops-with-ai-agents.md | head -10

# llms.txt + sitemap:
curl -s http://localhost:8787/llms.txt | head -5
curl -s http://localhost:8787/sitemap-index.xml | head -3
```

## Styling — use the design-system utilities

`src/styles/global.css` defines reusable `@utility` classes (`app-link`,
`app-h1`, `app-h2`, `app-hero`, `app-section-header`, `app-pill`, `app-btn`,
`app-meta`, etc.). **Use those instead of repeating Tailwind chains.** If you
find yourself writing the same 5+ class combination twice, promote it to a
new `@utility` rather than copy-pasting.

Site-wide tokens live in `src/styles/theme.css`:
- `--background` / `--foreground` / `--accent` / `--muted` / `--border` (theme)
- `--underline-offset: 4px` (link offset)

## Things NOT to do

- Don't add `topics: [others]` — pick a specific topic or leave the array
  empty. The default is `[]`.
- Don't add posts with `draft: false` that haven't been reviewed.
- Don't change post slugs after publish — update the redirect map in
  `src/worker.ts` if you must.
- Don't add client-side JS for things that can render at build time (math,
  diagrams, embeds, code highlighting). Zero-JS is the whole point.
- Don't inline Tailwind chains that duplicate a utility class. Use the utility.
- Don't add `font-bold`/`font-extrabold`/`font-black` — `font-semibold` is the
  site-wide cap (`Cap font weights at semibold` rule).
- Don't run `pnpm dev` in an agent loop — it never exits.

## Page anatomy quick reference

| Page | Top spacing | Top heading |
| --- | --- | --- |
| `/`, `/about`, `/posts`, `/topics`, `/search`, post pages | `pt-12` (48px) | h1 with `app-h1` (or `app-hero` on `/`) |
| Section header inside a page (Featured, Recent, year groups) | `mt-12` (48px) | h2 with `app-h2` inside `app-section-header` |

Every gap above a heading is **48px**. Don't introduce other values.
