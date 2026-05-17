---
name: ship
description: "Full release workflow for the kmanojkumar.com Astro blog. Detects POST vs CODE release from the diff, audits docs, bumps the version in package.json + CHANGELOG.md, writes the commit message + GitHub release notes, then commits, pushes (triggering the Cloudflare Workers auto-deploy via GitHub Actions), and creates the GitHub release. Use when the user runs `/ship` (Claude Code), `$ship` (Codex), or says 'ship it', 'ship this', 'release', 'create a release', 'commit and push', or otherwise asks to publish a new blog post or push code changes live. Only for this project (kmanojkumar.com)."
---

# Ship

Run the full release cycle for kmanojkumar.com: detect type → analyze diff → audit docs → draft → confirm → execute. Each step is gated; never skip to the next without satisfying the gate.

## Versioning rules (memorize these)

| Change scope | Bump |
|---|---|
| New post or updated post | **patch** (X.Y.**Z**) |
| `fix:` / `refactor:` / `perf:` / `style:` / `docs:` / `chore:` | **patch** |
| `feat:` (new feature) | **minor** (X.**Y**.0) |
| Breaking change | **minor** + flag in changelog under `### Changed (breaking)` |
| Major (X.0.0) | **never** auto-suggest — only on explicit user request |

Starting version: **3.1.0**. If `gh release list` returns no prior releases, use `package.json` version as the starting point.

Conventional commit prefixes:
- `post:` — new or updated blog post (patch)
- `feat:` — new feature (minor)
- `fix:` / `refactor:` / `perf:` / `style:` / `docs:` / `chore:` — patch

## Step 0 — Detect release type

Run `git diff --name-only` and `git status --porcelain` to enumerate changed paths.

Classify:
- **POST release** — every changed path is under `src/content/posts/`, `src/assets/images/posts/`, or is `public/llms.txt`
- **CODE release** — at least one changed path is outside those three locations
- **MIXED release** — both kinds of changes present; treat as CODE for bump logic, surface posts separately in the changelog

State the detected type to the user before proceeding.

## Step 1 — Analyze the diff

Run in parallel:
- `git status` (never `-uall`)
- `git diff --stat` and `git diff`
- `git log --oneline -5`
- `gh release list --limit 1 --json tagName --jq '.[0].tagName'`
- Read first 20 lines of `CHANGELOG.md`
- Read `version` field from `package.json`

The latest GitHub release tag is the **source of truth** for the current version. The local `package.json` value may be stale (someone else may have shipped). If the two disagree, note the discrepancy — the bump step will reconcile.

On first-ever release (no GH releases yet), use `package.json` version as the baseline.

## Step 1.5 — Audit docs

Scope depends on release type. Do not skip — stale docs cause real confusion.

**POST release** — focus on:
- `public/llms.txt` — recent-posts section. If the new post is featured or among the latest 3 by `pubDatetime`, add an entry pointing to `/posts/<slug>.md`.
- Post frontmatter — `pubDatetime` set (ISO-8601 with `Z` suffix); `modDatetime` set if updating an existing post.
- Homepage `featured: true` toggle — only one post may have `featured: true`. If the new post claims it, unset the old one.

**CODE release** — full sweep. Build a change manifest from the diff (every renamed file, removed flag, changed default, new utility class, new config path). Then:
- Glob `**/*.md` (skip `node_modules`, `dist`, `.astro`, `docs/plans/`, `docs/archive/`)
- Grep every item in the manifest across the matched files. Also grep adjacent terms — if a function was renamed, search for the old name too.
- Pay extra attention to: `README.md`, `CLAUDE.md`, `AGENTS.md`, `public/llms.txt`, any usage examples inside `cf/_headers` or `wrangler.jsonc` comments.

Three cases to look for:
- **Stale** — existing text now factually wrong (renamed flag, removed file, changed default)
- **Missing** — new behavior not documented anywhere
- **Inconsistent** — two docs disagree about the same thing

Fix each issue **in place**. Report to the user: which files changed, what was changed, why. If nothing needed updating, say so explicitly — don't stay silent.

**MIXED release** — run both scopes.

## Step 2 — Draft release artifacts

Produce four things and present them all together. Wait for explicit version confirmation before proceeding.

### 1. Suggested version

State the bump (`3.1.0 → 3.1.1`) and the one-line rationale (which rule from the table above applied).

### 2. Changelog entry

Append at the top of the existing entries section in `CHANGELOG.md`, below the `[Unreleased]` line if present. Format:

**POST release:**
```
## [X.Y.Z] — YYYY-MM-DD

### Published       (use "Updated" for existing-post edits)
- **<Post title>** — <one-line description>. [Read](https://kmanojkumar.com/posts/<slug>)
```

**CODE release:**
```
## [X.Y.Z] — YYYY-MM-DD

### Added / Changed / Fixed / Removed / Security
- One bullet per change. Reader-friendly, not git-jargon.
```

**MIXED release** — both `### Published`/`### Updated` and the relevant code categories in the same `## [X.Y.Z]` entry. Order: post sections first (most visible to readers of the changelog), then code sections.

Example MIXED changelog entry:
```
## [3.2.1] — 2026-05-25

### Published
- **Cloudflare Hyperdrive deep-dive** — what you need to know. [Read](https://kmanojkumar.com/posts/cloudflare-hyperdrive)

### Changed
- Tightened CSP — removed `'unsafe-inline'` for inline theme script via SHA-256 hash.

### Fixed
- RSS feed item URLs no longer emit trailing slashes.
```

### 3. Commit message

Use HEREDOC. **No `Co-Authored-By` trailer.**

**POST commit shape:**
```
post: <title>

## Summary
Published "<title>" — <description from frontmatter>.

## What Changed
- New post: src/content/posts/<year>/<slug>.md
- llms.txt updated with new entry  (omit if not updated)
- <any other relevant change>
```

For an updated post, use `post: update <title>` and replace "Published" with "Updated" in the body.

**CODE commit shape** (matches the user's global PM+Engineer template):
```
<type>: <concise summary of WHAT and WHY>

## What Changed
- [Human-readable bullets — what someone reading the release notes would care about]

## Why
[Business/technical reason]

## Technical Details
- [File / component]: [what was done]

## Documentation
- [Any docs added or updated]
```

**MIXED commit shape** — prefix is the dominant CODE type (`feat:` if a new feature is in the diff, else `fix:` / `refactor:` / `perf:` / etc.). **Never use `post:`** if any code changed. Body follows the CODE template; posts are surfaced as bullets in `## What Changed` clearly labeled "Published:" / "Updated:".

Example MIXED commit:
```
feat: tighten CSP + publish Hyperdrive post

## What Changed
- Tightened CSP — removed 'unsafe-inline' for theme script via SHA-256 hash.
- Fixed RSS trailing-slash bug in feed item URLs.
- Published: "Cloudflare Hyperdrive deep-dive".

## Why
Pre-emptive CSP hardening before the Hyperdrive post (which embeds inline
SVG diagrams). RSS bug surfaced during the post's feed-render check.

## Technical Details
- src/layouts/Layout.astro: SHA-256 hash for inline FOUC script
- src/pages/rss.xml.ts: strip trailing slash from feed item URLs
- src/content/posts/2026/cloudflare-hyperdrive.md: new post

## Documentation
- public/llms.txt: added Hyperdrive post to recent-posts list
```

### 4. GitHub release title + body

**Title:**
- POST: `vX.Y.Z — Post: <title>`
- CODE: `vX.Y.Z — <short summary>`

**Body:** Reuse the changelog entry as the spine, plus a "Files modified" table for code releases. Match the style of prior releases via `gh release view <latest> --json body` when a prior release exists.

### Version-chronology validation

When the user confirms or overrides the version:
1. Treat the latest `gh release list` tag as the authoritative current version.
2. Verify the proposed new version is strictly greater (semver ordering).
3. Verify no gaps (`3.1.0 → 3.1.2` skipping `3.1.1` requires explicit acknowledgement).
4. Reject backwards moves (e.g., proposing `3.0.5` when current is `3.1.0`).
5. If `package.json` disagrees with the latest GH tag, note it — the bump in Step 3 reconciles to the new version regardless.

Push back politely if the user's override creates a gap or goes backwards. Do not silently accept.

## Step 3 — Apply the version bump

Once the user confirms the version:

1. Edit `package.json` `"version"` field → new version.
2. Prepend the new changelog entry to `CHANGELOG.md`. If there was content under `## [Unreleased]`, move it into the new release section and leave `[Unreleased]` empty.
3. No script-header bumps needed for this project — it's just `package.json` + `CHANGELOG.md` (and possibly `public/llms.txt` from Step 1.5).

Show the user the exact file list that was modified.

## Step 4 — Confirm

Display, verbatim format:

```
Ready to ship vX.Y.Z

Type: <post | code | mixed>
Files to commit: <N>
Commit: <first line of commit message>
GH release: vX.Y.Z — <title>

Push to main → GH Actions → Cloudflare deploy (~3-5 min)

Say "push" to commit, push, and create the GitHub release.
```

Stop here. Do nothing until the user types **"push"** (or an equivalent explicit confirmation like "go ahead and push" / "ship it"). Anything ambiguous → ask.

## Step 5 — Execute

After explicit push confirmation:

1. **Stage specific files** — `git add <file1> <file2> ...`. **Never `-A`, never `.`**, never glob. List each path.
2. **Commit** using HEREDOC syntax to preserve the multi-line body:
   ```bash
   git commit -m "$(cat <<'EOF'
   <full commit message from Step 2>
   EOF
   )"
   ```
3. **Pull rebase** — `git pull --rebase origin main`. If conflicts surface, resolve and continue the rebase; do not abort and start over.
4. **Push** — `git push origin main`. If push fails, diagnose (likely auth or out-of-sync) — never `--force`.
5. **Create GH release** — `gh release create vX.Y.Z --title "..." --notes "$(cat <<'EOF' ... EOF\n)"`. Use HEREDOC for the body to preserve formatting.
6. **Print URLs** — release URL from `gh release view <tag> --json url --jq .url`, and GH Actions run URL from `gh run list --workflow deploy.yml --limit 1 --json url --jq '.[0].url'`.
7. **Offer** `gh run watch <run-id>` so the user can stream the deploy log live.

## Hard rules

- **No commit or push without explicit "push" signal.** Confirmation must be unambiguous.
- **No `git add -A` and no `git add .`** — always stage by filename.
- **Always `git pull --rebase`** before push.
- **No `--force`, no `--no-verify`.** If a hook blocks, fix the underlying cause and make a **new** commit (never `--amend` after hook failure — the hook failed, the commit didn't happen, amending modifies the previous commit).
- **No `Co-Authored-By` trailer** in commit messages.
- **Major version (X.0.0) only on explicit user request.** Default minor for breaking changes; flag the break in the changelog.
- **Push back on out-of-sequence versions.** Don't silently accept gaps or rollbacks.

## What this skill does NOT do

- Doesn't run `wrangler deploy` directly. Push to `main` triggers `.github/workflows/deploy.yml`, which deploys to Cloudflare Workers. The skill *triggers* the deploy via push; it doesn't run it.
- Doesn't write blog post content. Posts are authored manually; this skill releases them.
- Doesn't bypass any `CLAUDE.md` or `AGENTS.md` rule. Every confirmation gate is preserved.
