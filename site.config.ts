import { defineSiteConfig } from "./src/types/config";

export default defineSiteConfig({
  site: {
    url: "https://kmanojkumar.com/",
    title: "K Manoj Kumar",
    description:
      "CS Engineer & Entrepreneur based in Bengaluru. Sharing insights on DevOps for businesses, Process Automation and my Startup journey.",
    author: "K Manoj Kumar",
    profile: "https://kmanojkumar.com",
    ogImage: "default-og.jpg",
    lang: "en",
    timezone: "Asia/Kolkata",
    dir: "ltr",
  },
  posts: {
    perPage: 6,
    perIndex: 4,
    scheduledPostMargin: 15 * 60 * 1000,
  },
  features: {
    lightAndDarkMode: true,
    dynamicOgImage: true,
    // The /posts page itself now serves as the year/month archive view; the
    // standalone /archives route was removed.
    showArchives: false,
    showBackButton: false,
    editPost: {
      enabled: false,
    },
    search: "pagefind",
  },
  socials: [
    { name: "github", url: "https://github.com/kmanojkumar" },
    { name: "x", url: "https://x.com/kmanojkumar" },
    { name: "linkedin", url: "https://www.linkedin.com/in/kmanojkumar/" },
    { name: "mail", url: "mailto:mk@kmanojkumar.com" },
    { name: "rss", url: "/rss.xml", linkTitle: "RSS feed" },
  ],
  // Per-post share UI is a single "Copy link" button rendered by
  // `src/pages/posts/[...slug]/_components/ShareLinks.astro`. The legacy
  // multi-icon share array isn't used; left empty for back-compat with the
  // `ResolvedSiteConfig` shape.
  shareLinks: [],
});
