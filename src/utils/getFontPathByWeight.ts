import type { FontData } from "astro:assets";

/**
 * Find the URL of a font file matching the given weight, style and format.
 *
 * Astro emits one `FontData` entry per (weight, style, format) combination, so a
 * single `find()` on weight+style alone returns the first format only. We instead
 * filter to all matching weight/style entries, then look up the requested format
 * across their `src` arrays.
 */
export function getFontPathByWeight(
  fonts: FontData[],
  weight: number,
  options?: {
    style?: "normal" | "italic";
    format?: string;
  }
): string | undefined {
  const style = options?.style ?? "normal";
  const format = options?.format ?? "truetype";

  return fonts
    .filter(font => font.weight === String(weight) && font.style === style)
    .flatMap(font => font.src)
    .find(file => file.format === format)?.url;
}
