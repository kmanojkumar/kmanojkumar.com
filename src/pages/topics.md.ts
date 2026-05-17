import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { getUniqueTopics } from "@/utils/getUniqueTopics";
import { slugifyAll } from "@/utils/slugify";
import { postFilter } from "@/utils/postFilter";
import config from "@/config";

export const GET: APIRoute = async () => {
  const all = await getCollection("posts");
  const listed = all.filter(postFilter);
  const topics = getUniqueTopics(listed);

  // Count posts per topic.
  const counts = new Map<string, number>();
  for (const post of listed) {
    for (const t of slugifyAll(post.data.topics)) {
      counts.set(t, (counts.get(t) ?? 0) + 1);
    }
  }

  const lines: string[] = [];
  lines.push(`# Topics — ${config.site.title}`);
  lines.push("");
  lines.push(
    `Total: ${topics.length} topic${topics.length === 1 ? "" : "s"} across the blog.`
  );
  lines.push("");

  for (const { slug, name } of topics) {
    const count = counts.get(slug) ?? 0;
    const noun = count === 1 ? "post" : "posts";
    lines.push(`- [${name}](/topics/${slug}.md) — ${count} ${noun}`);
  }

  lines.push("");
  lines.push("---");
  lines.push("[Home](/index.md) · [Posts](/posts.md) · [About](/about.md)");

  return new Response(lines.join("\n"), {
    status: 200,
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
};
