/// <reference types="@cloudflare/workers-types" />
/**
 * Cloudflare Worker entry — runs before the static assets binding (run_worker_first=true)
 * and handles:
 *   1. Canonical hostname redirect (avoid duplicate content from preview surfaces).
 *   2. Permanent 301 redirects from old Ghost URLs to /posts/<slug>.
 *   3. Content negotiation: requests with `Accept: text/markdown` get the .md twin.
 *   4. Everything else falls through to the static asset.
 *
 * Note: keep this file dependency-free — it runs on the Workers runtime and any
 * import beyond `@cloudflare/workers-types` adds runtime cost. The redirect map
 * is intentionally inline.
 */

interface Env {
  ASSETS: Fetcher;
}

const CANONICAL_HOST = "kmanojkumar.com";

/**
 * Posts that lived at the Ghost-era flat root path. Mapping each to its new
 * /posts/<slug> location preserves SEO + any inbound links shared on X/LinkedIn.
 */
const POST_REDIRECTS: Record<string, string> = {
  "/automate-devops-with-ai-agents": "/posts/automate-devops-with-ai-agents",
  "/stop-comparing-backend-frontend-devops-whats-actually-hard":
    "/posts/stop-comparing-backend-frontend-devops-whats-actually-hard",
  "/cloudflare-hyperdrive-heres-what-you-need-to-know":
    "/posts/cloudflare-hyperdrive-heres-what-you-need-to-know",
  "/ai-made-your-developers-10x-faster-your-devops-didnt-catch-up":
    "/posts/ai-made-your-developers-10x-faster-your-devops-didnt-catch-up",
};

function wantsMarkdown(req: Request): boolean {
  const accept = req.headers.get("accept") ?? "";
  return accept.includes("text/markdown");
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);

    // 1. Canonical hostname enforcement — only on the real production domain.
    // Local dev (.workers.dev preview, localhost) is exempt.
    if (
      url.hostname !== CANONICAL_HOST &&
      url.hostname !== "localhost" &&
      !url.hostname.endsWith(".workers.dev") &&
      !url.hostname.startsWith("127.")
    ) {
      const canonical = new URL(
        url.pathname + url.search,
        `https://${CANONICAL_HOST}`
      );
      return Response.redirect(canonical.toString(), 301);
    }

    // 2. Permanent redirects: old Ghost URLs → new /posts/<slug> paths.
    const path = url.pathname.replace(/\/+$/, "") || "/";
    const direct = POST_REDIRECTS[path];
    if (direct) {
      return Response.redirect(new URL(direct, url).toString(), 301);
    }

    // 3. /blog/<slug> catch-all (covers Ghost variants and any old internal links).
    if (path.startsWith("/blog/")) {
      const newPath = path.replace(/^\/blog\//, "/posts/");
      return Response.redirect(new URL(newPath, url).toString(), 301);
    }

    // /archives + /archives.md were merged into /posts.
    if (path === "/archives" || path === "/archives.md") {
      return Response.redirect(new URL("/posts", url).toString(), 301);
    }

    // /tags → /topics (renamed). Covers the index and any /tags/<slug> link.
    if (path === "/tags" || path === "/tags.md") {
      return Response.redirect(new URL("/topics", url).toString(), 301);
    }
    if (path.startsWith("/tags/")) {
      return Response.redirect(
        new URL(path.replace(/^\/tags\//, "/topics/"), url).toString(),
        301
      );
    }

    // 4. Content negotiation: if the client wants markdown and the path doesn't
    // already end with .md, look up the markdown twin.
    if (wantsMarkdown(req) && !path.endsWith(".md")) {
      const mdUrl = new URL(url);
      mdUrl.pathname = path + ".md";
      const md = await env.ASSETS.fetch(new Request(mdUrl.toString(), req));
      if (md.ok) {
        // Re-wrap to control headers (assets binding may set text/plain otherwise).
        const headers = new Headers(md.headers);
        headers.set("Content-Type", "text/markdown; charset=utf-8");
        headers.set("Vary", "Accept");
        return new Response(md.body, { status: md.status, headers });
      }
      // Fall through to HTML if the .md twin doesn't exist for this path.
    }

    // 5. Default: hand off to the static assets binding.
    // Always advertise Vary: Accept so shared caches don't serve the wrong
    // representation to a later Accept: text/markdown request.
    const assetResp = await env.ASSETS.fetch(req);

    // Fix content-type lie for .md 404s: when an unknown .md path falls back
    // to the HTML 404 page (via `not_found_handling: "404-page"`), the static
    // asset handler still applies the `/*.md` Content-Type: text/markdown rule
    // from _headers — leaving an HTML body wrapped in a markdown content-type.
    // Replace the body with an actual markdown 404 so the response matches.
    if (assetResp.status === 404 && path.endsWith(".md")) {
      return new Response(
        "# 404 Not Found\n\nThe page you requested does not exist.\n\n" +
          "- [Home](/)\n" +
          "- [Posts](/posts.md)\n" +
          "- [About](/about.md)\n",
        {
          status: 404,
          headers: {
            "Content-Type": "text/markdown; charset=utf-8",
            Vary: "Accept",
            "Cache-Control": "public, max-age=300, s-maxage=300",
          },
        }
      );
    }

    const headers = new Headers(assetResp.headers);
    const existingVary = headers.get("Vary");
    if (existingVary) {
      if (!/\baccept\b/i.test(existingVary)) {
        headers.set("Vary", `${existingVary}, Accept`);
      }
    } else {
      headers.set("Vary", "Accept");
    }
    return new Response(assetResp.body, {
      status: assetResp.status,
      statusText: assetResp.statusText,
      headers,
    });
  },
};
