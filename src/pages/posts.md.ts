import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { getSortedPosts } from "@/utils/getSortedPosts";
import { getPostSlug } from "@/utils/getPostPaths";
import config from "@/config";

export const GET: APIRoute = async () => {
  const all = await getCollection("posts");
  const sorted = getSortedPosts(all);

  // Group by year for an at-a-glance index.
  const byYear = new Map<number, typeof sorted>();
  for (const post of sorted) {
    const y = new Date(post.data.pubDatetime).getFullYear();
    if (!byYear.has(y)) byYear.set(y, [] as typeof sorted);
    byYear.get(y)!.push(post);
  }

  const lines: string[] = [];
  lines.push(`# All Posts — ${config.site.title}`);
  lines.push("");
  lines.push(`Total: ${sorted.length} post${sorted.length === 1 ? "" : "s"}.`);
  lines.push("");

  const years = [...byYear.keys()].sort((a, b) => b - a);
  for (const year of years) {
    lines.push(`## ${year}`);
    lines.push("");
    for (const post of byYear.get(year)!) {
      const date = new Date(post.data.pubDatetime).toISOString().slice(0, 10);
      const slug = getPostSlug(post.id, post.filePath).replace(/^\/+/, "");
      lines.push(`- ${date}: [${post.data.title}](/posts/${slug}.md)`);
    }
    lines.push("");
  }

  lines.push("---");
  lines.push("[Home](/index.md) · [About](/about.md) · [Topics](/topics.md)");

  return new Response(lines.join("\n"), {
    status: 200,
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
};
