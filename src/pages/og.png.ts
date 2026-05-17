import type { APIRoute } from "astro";
import { readFile } from "node:fs/promises";
import path from "node:path";
import satori from "satori";
import sharp from "sharp";
import { fontData, experimental_getFontFileURL } from "astro:assets";
import { getFontPathByWeight } from "@/utils/getFontPathByWeight";
import config from "@/config";

let cachedLogoDataUri: string | null = null;
async function getLogoDataUri(): Promise<string> {
  if (cachedLogoDataUri) return cachedLogoDataUri;
  // Read the logo from source. Earlier this fetched `${site.url}${logoImage.src}`,
  // which broke first-time deploys when the canonical domain didn't resolve yet
  // (DNS-vs-Custom-Domain chicken-and-egg). process.cwd() is the project root
  // during `astro build`.
  const logoPath = path.join(
    process.cwd(),
    "src/assets/images/kmanojkumar-com-logo-light.png"
  );
  const buf = await readFile(logoPath);
  cachedLogoDataUri = `data:image/png;base64,${buf.toString("base64")}`;
  return cachedLogoDataUri;
}

export const GET: APIRoute = async context => {
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

  if (
    sansRegularPath === undefined ||
    sansSemiboldPath === undefined ||
    monoRegularPath === undefined
  ) {
    throw new Error("Cannot find the font path.");
  }

  const fetchFont = (p: string) =>
    fetch(experimental_getFontFileURL(p, context.url)).then(r =>
      r.arrayBuffer()
    );

  const [sansRegular, sansSemibold, monoRegular, logoDataUri] =
    await Promise.all([
      fetchFont(sansRegularPath),
      fetchFont(sansSemiboldPath),
      fetchFont(monoRegularPath),
      getLogoDataUri(),
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
            type: "div",
            props: {
              style: {
                display: "flex",
                flexDirection: "column",
                justifyContent: "flex-start",
              },
              children: [
                {
                  type: "img",
                  props: {
                    src: logoDataUri,
                    width: 96,
                    height: 96,
                    style: { marginBottom: 32, borderRadius: 16 },
                  },
                },
                {
                  type: "p",
                  props: {
                    style: {
                      fontFamily: "Geist Mono",
                      fontSize: 76,
                      fontWeight: 400,
                      lineHeight: 1.1,
                      margin: 0,
                      letterSpacing: "-0.025em",
                    },
                    children: config.site.title,
                  },
                },
                {
                  type: "p",
                  props: {
                    style: {
                      fontSize: 32,
                      fontWeight: 400,
                      lineHeight: 1.35,
                      marginTop: 24,
                      color: "#525252",
                      maxWidth: "85%",
                    },
                    children: config.site.description,
                  },
                },
              ],
            },
          },
          {
            type: "div",
            props: {
              style: {
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontFamily: "Geist Mono",
                fontSize: 26,
                borderTop: "1px solid #e5e5e5",
                paddingTop: 24,
              },
              children: [
                {
                  type: "span",
                  props: {
                    children: new URL(config.site.url).hostname,
                  },
                },
                {
                  type: "span",
                  props: {
                    style: { color: "#525252" },
                    children: "@kmanojkumar",
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
      ],
    }
  );

  const pngBuffer = await sharp(Buffer.from(svg)).png().toBuffer();

  return new Response(new Uint8Array(pngBuffer), {
    headers: { "Content-Type": "image/png" },
  });
};
