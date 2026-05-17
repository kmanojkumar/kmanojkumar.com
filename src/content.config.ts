import { defineCollection } from "astro:content";
import { z } from "astro/zod";
import { glob } from "astro/loaders";
import config from "@/config";

export const BLOG_PATH = "src/content/posts";

const posts = defineCollection({
  loader: glob({ pattern: "**/[^_]*.{md,mdx}", base: `./${BLOG_PATH}` }),
  schema: ({ image }) =>
    z.object({
      author: z.string().default(config.site.author),
      // z.coerce.date accepts both Date objects and ISO strings — easier for
      // hand-written frontmatter.
      pubDatetime: z.coerce.date(),
      modDatetime: z.coerce.date().optional().nullable(),
      title: z.string(),
      featured: z.boolean().optional(),
      draft: z.boolean().optional(),
      // Renders at /posts/<slug> but excluded from listing/feed pages.
      unlisted: z.boolean().optional(),
      // Default is no topics — keeps topic pages clean. Add explicit topics
      // in frontmatter to make a post discoverable under one.
      topics: z.array(z.string()).default([]),
      // Used for og:image meta tag.
      ogImage: image().or(z.string()).optional(),
      // Optional in-body hero image (different concern from ogImage).
      heroImage: image().or(z.string()).optional(),
      description: z.string(),
      canonicalURL: z.string().optional(),
      hideEditPost: z.boolean().optional(),
      timezone: z.string().optional(),
      // Origin URL when the post was first published elsewhere (e.g., an X thread).
      source: z.string().optional(),
      // Editorial transparency: flag when the description was AI-generated.
      AIDescription: z.boolean().optional(),
    }),
});

const pages = defineCollection({
  loader: glob({ pattern: "**/[^_]*.{md,mdx}", base: "./src/content/pages" }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    ogImage: z.string().optional(),
    canonicalURL: z.string().optional(),
  }),
});

export const collections = { posts, pages };
