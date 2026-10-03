/*
  Site settings the team may change without touching the pages.
  Nothing here is secret: this file is public. Never put API keys or payment credentials here.
*/
window.ASSALAM_CONFIG = {
  // TikTok @rawatan.assalam live status. Set to "live" when a session starts, "offline" when it ends.
  // TikTok has no supported public LIVE-status API, so this is set by hand. If a status endpoint is
  // built later (returning {"status":"live"} or {"status":"offline"}), put its URL in `endpoint`:
  // the page calls it once on load and never polls.
  tiktokLive: {
    status: "offline",
    endpoint: null
  },

  // WhatsApp Group invite for TikTok Live announcements.
  whatsappGroupUrl: "https://chat.whatsapp.com/BvhJQwIugFgFlZB7ALGay7",

  // Confirmed TikTok Live schedule. While null, no times are shown. Example:
  // liveSchedule: { ms: "Setiap Khamis, 9:15 malam", en: "Every Thursday, 9:15pm" },
  liveSchedule: null,

  // Visitor analytics (Umami Cloud, no cookies). Paste the Website ID from the Umami dashboard
  // (Settings > Websites > Edit, a long id like "a1b2c3d4-..."). While null, nothing is loaded or sent.
  // Event names and what they mean: docs/WEBSITE-OPERATIONS.md.
  analytics: {
    umamiWebsiteId: null
  },

  // Booking and payment: "whatsapp" today. See docs/PAYMENTS.md before changing.
  // If you set an endpoint here or in tiktokLive, also add its origin to EXTRA_CONNECT_HOSTS in
  // site-src/build.py, or the browser's security policy will block the call.
  checkout: {
    mode: "whatsapp",
    endpoint: null
  }
};
