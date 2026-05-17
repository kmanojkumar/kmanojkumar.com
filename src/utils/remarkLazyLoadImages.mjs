import { visit } from "unist-util-visit";

/**
 * Add loading="lazy" + decoding="async" to every image node in markdown.
 *
 * Astro's <Image /> component already does this for processed images, but
 * raw markdown `![alt](src)` doesn't always go through the image pipeline
 * (external URLs, public/ assets, etc.). This belt-and-suspenders plugin
 * ensures every image is lazy regardless of source.
 */
export function remarkLazyLoadImages() {
  return tree => {
    visit(tree, "image", node => {
      node.data ??= {};
      node.data.hProperties ??= {};
      node.data.hProperties.loading = "lazy";
      node.data.hProperties.decoding = "async";
    });
  };
}
