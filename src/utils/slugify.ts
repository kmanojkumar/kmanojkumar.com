import slugify from "slugify";

/**
 * Slugify a string into a safe identifier: lowercase, letters/digits/hyphens
 * only. Non-alphanumeric characters are stripped (not replaced), consecutive
 * hyphens collapse, leading/trailing hyphens are trimmed.
 *
 * Output is simultaneously valid as:
 * - URL path segment
 * - CSS identifier (`view-transition-name`, class names, ids)
 * - HTML id attribute value
 *
 * So the same slug can be passed to `href`, `transition:name`, and inline
 * `style={{ viewTransitionName }}` without any further encoding — no
 * apostrophe-vs-colon escape mismatches between code paths.
 */
export const slugifyStr = (str: string): string =>
  slugify(str, { lower: true })
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

export const slugifyAll = (arr: string[]) => arr.map(str => slugifyStr(str));
