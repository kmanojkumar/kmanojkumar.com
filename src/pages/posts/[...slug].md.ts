import type { APIRoute } from "astro";
import { getCollection, type CollectionEntry } from "astro:content";
import { getRenderablePosts } from "@/utils/getSortedPosts";
import { getPostSlug } from "@/utils/getPostPaths";

export async function getStaticPaths() {
  const all = await getCollection("posts");
  // Same set as the HTML route — unlisted posts get a markdown twin too,
  // discoverable only by direct URL.
  return getRenderablePosts(all).map(post => ({
    params: { slug: getPostSlug(post.id, post.filePath).replace(/^\/+/, "") },
    props: { post },
  }));
}

type Props = { post: CollectionEntry<"posts"> };

export const GET: APIRoute<Props> = async ({ props }) => {
  const { post } = props as Props;
  // post.body is the raw markdown source (frontmatter already stripped by the
  // glob loader). We re-prepend a minimal frontmatter so the markdown twin is
  // self-describing for LLMs/curl.
  const frontmatter = [
    "---",
    `title: ${JSON.stringify(post.data.title)}`,
    `author: ${JSON.stringify(post.data.author)}`,
    `pubDatetime: ${new Date(post.data.pubDatetime).toISOString()}`,
    post.data.modDatetime
      ? `modDatetime: ${new Date(post.data.modDatetime).toISOString()}`
      : null,
    `topics: [${post.data.topics.map(t => JSON.stringify(t)).join(", ")}]`,
    `description: ${JSON.stringify(post.data.description)}`,
    "---",
    "",
  ]
    .filter(l => l !== null)
    .join("\n");

  return new Response(frontmatter + (post.body ?? ""), {
    status: 200,
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
};
