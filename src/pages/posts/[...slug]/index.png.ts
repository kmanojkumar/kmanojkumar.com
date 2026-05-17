import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { fontData, experimental_getFontFileURL } from "astro:assets";
import satori from "satori";
import sharp from "sharp";
import { getFontPathByWeight } from "@/utils/getFontPathByWeight";
import { getPostSlug } from "@/utils/getPostPaths";
import config from "@/config";

export async function getStaticPaths() {
  if (!config.features.dynamicOgImage) {
    return [];
  }

  const posts = await getCollection("posts").then(p =>
    p.filter(({ data }) => !data.draft && !data.ogImage)
  );

  return posts.map(post => ({
    params: { slug: getPostSlug(post.id, post.filePath) },
    props: post,
  }));
}

export const GET: APIRoute = async ({ props, url }) => {
  if (!config.features.dynamicOgImage) {
    return new Response(null, { status: 404, statusText: "Not found" });
  }

  const sansFonts = fontData["--font-sans"];
  const monoFonts = fontData["--font-mono"];
  const sansRegularPath = getFontPathByWeight(sansFonts, 400, {
    format: "woff",
  });
  // Cap at semibold (600) — matches the site-wide weight ceiling.
  const sansSemiboldPath = getFontPathByWeight(sansFonts, 600, {
    format: "woff",
  });
  const monoRegularPath = getFontPathByWeight(monoFonts, 400, {
    format: "woff",
  });
  const monoSemiboldPath = getFontPathByWeight(monoFonts, 600, {
    format: "woff",
  });

  if (
    sansRegularPath === undefined ||
    sansSemiboldPath === undefined ||
    monoRegularPath === undefined ||
    monoSemiboldPath === undefined
  ) {
    throw new Error("Cannot find the font path.");
  }

  const fetchFont = (p: string) =>
    fetch(experimental_getFontFileURL(p, url)).then(r => r.arrayBuffer());

  const [sansRegular, sansSemibold, monoRegular, monoSemibold] =
    await Promise.all([
      fetchFont(sansRegularPath),
      fetchFont(sansSemiboldPath),
      fetchFont(monoRegularPath),
      fetchFont(monoSemiboldPath),
    ]);

  const svg = await satori(
    {
      type: "div",
      props: {
        style: {
          background: "#ffffff",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px",
          fontFamily: "Geist",
          color: "#000000",
        },
        children: [
          {
            type: "p",
            props: {
              style: {
                fontFamily: "Geist Mono",
                fontSize: 64,
                fontWeight: 600,
                lineHeight: 1.15,
                margin: 0,
                letterSpacing: "-0.025em",
                maxHeight: "84%",
                overflow: "hidden",
              },
              children: props.data.title,
            },
          },
          {
            type: "div",
            props: {
              style: {
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                width: "100%",
                fontFamily: "Geist Mono",
                fontSize: 26,
                borderTop: "1px solid #e5e5e5",
                paddingTop: 24,
              },
              children: [
                {
                  type: "span",
                  props: {
                    style: { color: "#525252" },
                    children: ["by ", props.data.author],
                  },
                },
                {
                  type: "span",
                  props: {
                    children: config.site.title,
                  },
                },
              ],
            },
          },
        ],
      },
    },
    {
      width: 1200,
      height: 630,
      embedFont: true,
      fonts: [
        { name: "Geist", data: sansRegular, weight: 400, style: "normal" },
        { name: "Geist", data: sansSemibold, weight: 600, style: "normal" },
        { name: "Geist Mono", data: monoRegular, weight: 400, style: "normal" },
        {
          name: "Geist Mono",
          data: monoSemibold,
          weight: 600,
          style: "normal",
        },
      ],
    }
  );

  const pngBuffer = await sharp(Buffer.from(svg)).png().toBuffer();

  return new Response(new Uint8Array(pngBuffer), {
    headers: { "Content-Type": "image/png" },
  });
};
