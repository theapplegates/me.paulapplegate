const SITE_URL = import.meta.env.PUBLIC_SITE_URL || "https://paulapplegate.com";
export const siteConfig = {
  title: "Living Life", author: "", url: SITE_URL,
  utm: { source: SITE_URL, medium: "referral", campaign: "navigation" },
  meta: { title: "Living Life — Fieldnotes", description: "Fieldnotes on everyday moments, curious detours, and making a little more room for life.", keywords: "living life, fieldnotes, journal, everyday life, design", image: `${SITE_URL}/assets/journal/lake.jpg`, twitterHandle: "" },
  social: { github: "https://github.com/theapplegates/me.paulapplegate" },
};
