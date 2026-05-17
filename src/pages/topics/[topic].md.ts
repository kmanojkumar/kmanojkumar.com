import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { getSortedPosts } from "@/utils/getSortedPosts";
import { getUniqueTopics } from "@/utils/getUniqueTopics";
import { slugifyAll } from "@/utils/slugify";
import { getPostSlug } from "@/utils/getPostPaths";
import config from "@/config";

export async function getStaticPaths() {
  const all = await getCollection("posts");
  const topics = getUniqueTopics(all);
  return topics.map(({ slug, name }) => ({
    params: { topic: slug },
    props: { name },
  }));
}

export const GET: APIRoute = async ({ params, props }) => {
  const slug = params.topic as string;
  const name = (props as { name: string }).name;

  const all = await getCollection("posts");
  const posts = getSortedPosts(
    all.filter(({ data }) => slugifyAll(data.topics).includes(slug))
  );

  const lines: string[] = [];
  lines.push(`# Topic: ${name} — ${config.site.title}`);
  lines.push("");
  lines.push(
    `Posts tagged \`${slug}\` — ${posts.length} post${posts.length === 1 ? "" : "s"}.`
  );
  lines.push("");

  for (const post of posts) {
    const date = new Date(post.data.pubDatetime).toISOString().slice(0, 10);
    const postSlug = getPostSlug(post.id, post.filePath).replace(/^\/+/, "");
    lines.push(`## ${post.data.title}`);
    lines.push("");
    lines.push(`${date} · [Read](/posts/${postSlug}.md)`);
    if (post.data.description) {
      lines.push("");
      lines.push(`> ${post.data.description}`);
    }
    lines.push("");
  }

  lines.push("---");
  lines.push(
    "[← All Topics](/topics.md) · [Home](/index.md) · [Posts](/posts.md)"
  );

  return new Response(lines.join("\n"), {
    status: 200,
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
};
