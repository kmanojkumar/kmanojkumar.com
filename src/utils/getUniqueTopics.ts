import type { CollectionEntry } from "astro:content";
import { postFilter } from "./postFilter";
import { slugifyStr } from "./slugify";

type Topic = {
  /** URL slug (used in `/topics/<slug>`). */
  slug: string;
  /** Original label as written in frontmatter (used for display). */
  name: string;
};

/**
 * Builds a de-duplicated, sorted topic list from posts.
 *
 * - Drafts, scheduled, and unlisted posts are excluded via `postFilter()`.
 * - `slug` is the kebab-case identifier used in URLs; `name` is the original
 *   label as written in frontmatter (used for display).
 * - Uniqueness is based on the slug, so differently-cased labels collapse.
 */
export function getUniqueTopics(posts: CollectionEntry<"posts">[]) {
  const topics: Topic[] = posts
    .filter(postFilter)
    .flatMap(post => post.data.topics)
    .map(name => ({ slug: slugifyStr(name), name }))
    .filter(
      (value, index, self) =>
        self.findIndex(t => t.slug === value.slug) === index
    )
    .sort((a, b) => a.slug.localeCompare(b.slug));
  return topics;
}
