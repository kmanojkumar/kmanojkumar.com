import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { getSortedPosts } from "@/utils/getSortedPosts";
import { getPostSlug } from "@/utils/getPostPaths";
import { getUniqueTopics } from "@/utils/getUniqueTopics";
import config from "@/config";

/**
 * Build-time generator for /llms.txt (per https://llmstxt.org/).
 *
 * Replaces the previous static public/llms.txt so new posts and topics show up
 * in the crawler-facing index automatically on every build. No manual edits
 * needed when a post is published.
 */
export const GET: APIRoute = async () => {
  const all = await getCollection("posts");
  const recent = getSortedPosts(all).slice(0, 5);
  const topics = getUniqueTopics(all);
  const base = config.site.url.replace(/\/+$/, "");

  const lines: string[] = [];
  lines.push(`# ${config.site.title}`);
  lines.push("");
  lines.push(
    "> CS Engineer & Entrepreneur based in Bengaluru, India. Founder and CEO of VegaStack. Writes about DevOps for businesses, process automation, AI agents, and the startup journey."
  );
  lines.push("");
  lines.push(
    "Every page on this site has a markdown twin: append `.md` to any URL (e.g. `/about.md`, `/posts/automate-devops-with-ai-agents.md`) or send `Accept: text/markdown` to get the source-of-truth Markdown instead of the rendered HTML."
  );
  lines.push("");

  lines.push("## Core documentation");
  lines.push("");
  lines.push(
    `- [About](${base}/about.md): bio, career, current focus, tech stack`
  );
  lines.push(
    `- [All posts](${base}/posts.md): year-by-year index of every post (links to \`.md\` files)`
  );
  lines.push(`- [All topics](${base}/topics.md): every topic with post counts`);
  lines.push("");

  lines.push("## Recent posts");
  lines.push("");
  for (const post of recent) {
    const slug = getPostSlug(post.id, post.filePath).replace(/^\/+/, "");
    const url = `${base}/posts/${slug}.md`;
    const desc = post.data.description?.trim();
    if (desc) {
      lines.push(`- [${post.data.title}](${url}) — ${desc}`);
    } else {
      lines.push(`- [${post.data.title}](${url})`);
    }
  }
  lines.push("");

  if (topics.length > 0) {
    lines.push("## Topics");
    lines.push("");
    for (const { slug, name } of topics) {
      lines.push(`- [${name}](${base}/topics/${slug}.md)`);
    }
    lines.push("");
  }

  lines.push("## Feeds");
  lines.push("");
  lines.push(`- [RSS](${base}/rss.xml)`);
  lines.push(`- [Atom](${base}/feed.atom.xml)`);
  lines.push(`- [JSON Feed](${base}/feed.json)`);
  lines.push("");

  lines.push("## Contact");
  lines.push("");
  for (const s of config.socials) {
    if (s.name === "x") {
      lines.push(`- X: ${s.url}`);
    } else if (s.name === "linkedin") {
      lines.push(`- LinkedIn: ${s.url}`);
    } else if (s.name === "github") {
      lines.push(`- GitHub: ${s.url}`);
    } else if (s.name === "mail") {
      const email = s.url.replace(/^mailto:/, "");
      lines.push(`- Email: ${email}`);
    }
  }

  return new Response(lines.join("\n") + "\n", {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
};
