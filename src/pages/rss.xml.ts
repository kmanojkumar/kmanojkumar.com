import rss from "@astrojs/rss";
import { getCollection } from "astro:content";
import { getSortedPosts } from "@/utils/getSortedPosts";
import { getPostUrl } from "@/utils/getPostPaths";
import config from "@/config";

export async function GET() {
  const posts = await getCollection("posts");
  const sortedPosts = getSortedPosts(posts);

  return rss({
    title: config.site.title,
    description: config.site.description,
    site: config.site.url,
    customData: `<language>${config.site.lang}</language><managingEditor>${config.site.author}</managingEditor>`,
    // trailingSlash: "never" → make sure RSS <link> URLs match the canonical
    // (no trailing slash). The rss() helper preserves whatever we pass.
    items: sortedPosts.map(({ data, id, filePath }) => ({
      link: new URL(
        getPostUrl(id, filePath, config.site.lang).replace(/\/+$/, ""),
        config.site.url
      ).href,
      title: data.title,
      description: data.description,
      pubDate: new Date(data.modDatetime ?? data.pubDatetime),
      author: data.author ?? config.site.author,
      categories: data.topics,
    })),
  });
}
