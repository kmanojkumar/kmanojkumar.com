import type { APIRoute } from "astro";
import { getEntry } from "astro:content";

export const GET: APIRoute = async () => {
  const about = await getEntry("pages", "about");
  if (!about) return new Response("Not found", { status: 404 });

  // Re-emit a minimal frontmatter + body so the .md twin is self-describing.
  // (`about.body` is the raw markdown without frontmatter.)
  const frontmatter = [
    "---",
    `title: ${JSON.stringify(about.data.title)}`,
    about.data.description
      ? `description: ${JSON.stringify(about.data.description)}`
      : null,
    "---",
    "",
  ]
    .filter(l => l !== null)
    .join("\n");

  return new Response(frontmatter + (about.body ?? ""), {
    status: 200,
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
};
