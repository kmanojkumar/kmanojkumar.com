import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { getSortedPosts } from "@/utils/getSortedPosts";
import { getPostUrl } from "@/utils/getPostPaths";
import config from "@/config";

const xmlEscape = (s: string) =>
  s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");

const isoDate = (d: Date | string) =>
  (d instanceof Date ? d : new Date(d)).toISOString();

export const GET: APIRoute = async () => {
  const posts = await getCollection("posts");
  const sortedPosts = getSortedPosts(posts);

  const siteUrl = config.site.url.replace(/\/+$/, "");
  const feedUrl = `${siteUrl}/feed.atom.xml`;
  const updated =
    sortedPosts.length > 0
      ? isoDate(
          sortedPosts[0].data.modDatetime ?? sortedPosts[0].data.pubDatetime
        )
      : new Date().toISOString();

  const entries = sortedPosts
    .map(({ data, id, filePath }) => {
      const postUrl = new URL(
        getPostUrl(id, filePath, config.site.lang),
        siteUrl + "/"
      ).href;
      return `  <entry>
    <id>${xmlEscape(postUrl)}</id>
    <title>${xmlEscape(data.title)}</title>
    <link rel="alternate" type="text/html" href="${xmlEscape(postUrl)}"/>
    <updated>${isoDate(data.modDatetime ?? data.pubDatetime)}</updated>
    <published>${isoDate(data.pubDatetime)}</published>
    <author><name>${xmlEscape(data.author ?? config.site.author)}</name></author>
    <summary>${xmlEscape(data.description)}</summary>${data.topics
      .map(t => `\n    <category term="${xmlEscape(t)}"/>`)
      .join("")}
  </entry>`;
    })
    .join("\n");

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xml:lang="${config.site.lang}">
  <id>${xmlEscape(siteUrl + "/")}</id>
  <title>${xmlEscape(config.site.title)}</title>
  <subtitle>${xmlEscape(config.site.description)}</subtitle>
  <link rel="self" href="${xmlEscape(feedUrl)}"/>
  <link rel="alternate" type="text/html" href="${xmlEscape(siteUrl + "/")}"/>
  <updated>${updated}</updated>
  <author><name>${xmlEscape(config.site.author)}</name></author>
  <generator uri="https://astro.build">Astro</generator>
${entries}
</feed>
`;

  return new Response(body, {
    headers: { "Content-Type": "application/atom+xml; charset=utf-8" },
  });
};
