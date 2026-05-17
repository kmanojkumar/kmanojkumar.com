import type { CollectionEntry } from "astro:content";
import { postFilter, postRenderable } from "./postFilter";

const byUpdatedDesc = (
  a: CollectionEntry<"posts">,
  b: CollectionEntry<"posts">
) =>
  Math.floor(
    new Date(b.data.modDatetime ?? b.data.pubDatetime).getTime() / 1000
  ) -
  Math.floor(
    new Date(a.data.modDatetime ?? a.data.pubDatetime).getTime() / 1000
  );

/**
 * Posts to show in listings (home, archives, topic pages, feeds).
 * Excludes drafts, scheduled-in-prod, and unlisted posts.
 */
export function getSortedPosts(posts: CollectionEntry<"posts">[]) {
  return posts.filter(postFilter).sort(byUpdatedDesc);
}

/**
 * Posts that should get a `/posts/<slug>` page generated.
 * Same as listed posts PLUS unlisted ones (unlisted posts are reachable by
 * direct link but hidden from indexes).
 */
export function getRenderablePosts(posts: CollectionEntry<"posts">[]) {
  return posts.filter(postRenderable).sort(byUpdatedDesc);
}
