import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { getSortedPosts } from "@/utils/getSortedPosts";
import { getPostUrl } from "@/utils/getPostPaths";
import config from "@/config";

export const GET: APIRoute = async () => {
  const posts = await getCollection("posts");
  const sortedPosts = getSortedPosts(posts);

  const siteUrl = config.site.url.replace(/\/+$/, "");

  const feed = {
    version: "https://jsonfeed.org/version/1.1",
    title: config.site.title,
    home_page_url: siteUrl + "/",
    feed_url: `${siteUrl}/feed.json`,
    description: config.site.description,
    language: config.site.lang,
    authors: [
      {
        name: config.site.author,
        url: config.site.profile ?? siteUrl,
      },
    ],
    items: sortedPosts.map(({ data, id, filePath }) => {
      const postUrl = new URL(
        getPostUrl(id, filePath, config.site.lang),
        siteUrl + "/"
      ).href;
      return {
        id: postUrl,
        url: postUrl,
        title: data.title,
        summary: data.description,
        content_text: data.description,
        date_published: new Date(data.pubDatetime).toISOString(),
        date_modified: new Date(
          data.modDatetime ?? data.pubDatetime
        ).toISOString(),
        authors: [{ name: data.author ?? config.site.author }],
        // JSON Feed 1.1 names this field `tags` — values come from our `topics` schema field.
        tags: data.topics,
      };
    }),
  };

  return new Response(JSON.stringify(feed, null, 2), {
    headers: { "Content-Type": "application/feed+json; charset=utf-8" },
  });
};
