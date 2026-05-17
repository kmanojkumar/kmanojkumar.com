import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { getSortedPosts } from "@/utils/getSortedPosts";
import { getPostSlug } from "@/utils/getPostPaths";
import config from "@/config";

export const GET: APIRoute = async () => {
  const all = await getCollection("posts");
  const recent = getSortedPosts(all).slice(0, 5);

  const lines: string[] = [];
  lines.push(`# ${config.site.title}`);
  lines.push("");
  lines.push(`> ${config.site.description}`);
  lines.push("");
  lines.push("## Navigation");
  lines.push("");
  lines.push("- [About](/about.md)");
  lines.push("- [All Posts](/posts.md)");
  lines.push("- [Topics](/topics.md)");
  lines.push(
    "- [RSS Feed](/rss.xml) · [Atom](/feed.atom.xml) · [JSON Feed](/feed.json)"
  );
  lines.push("");
  lines.push("## Recent Posts");
  lines.push("");
  for (const post of recent) {
    const date = new Date(post.data.pubDatetime).toISOString().slice(0, 10);
    const slug = getPostSlug(post.id, post.filePath).replace(/^\/+/, "");
    lines.push(`- ${date}: [${post.data.title}](/posts/${slug}.md)`);
  }
  lines.push("");
  lines.push("## Links");
  for (const s of config.socials) {
    lines.push(`- ${s.name}: ${s.url}`);
  }
  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push(
    `*Markdown-only version of [${new URL(config.site.url).hostname}](${config.site.url}). Add \`Accept: text/markdown\` to any URL on the live site to get its markdown twin.*`
  );

  return new Response(lines.join("\n"), {
    status: 200,
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
};
