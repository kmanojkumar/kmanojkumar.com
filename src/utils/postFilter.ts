import type { CollectionEntry } from "astro:content";
import config from "@/config";

const isPublished = (data: CollectionEntry<"posts">["data"]) => {
  if (data.draft) return false;
  const isPublishTimePassed =
    Date.now() >
    new Date(data.pubDatetime).getTime() - config.posts.scheduledPostMargin;
  return import.meta.env.DEV || isPublishTimePassed;
};

/**
 * Eligible to appear in listings, feeds, archives, topic pages.
 * Excludes: drafts, scheduled (in prod), unlisted.
 */
export function postFilter({ data }: CollectionEntry<"posts">): boolean {
  return isPublished(data) && !data.unlisted;
}

/**
 * Eligible to have a /posts/<slug> page rendered (and thus be reachable by direct link).
 * Excludes: drafts, scheduled (in prod). Includes unlisted (they have a page but are
 * hidden from indexes).
 */
export function postRenderable({ data }: CollectionEntry<"posts">): boolean {
  return isPublished(data);
}
