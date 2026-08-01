"use strict";

// Rewrites built HTML to remove render-blocking / connection-stalling
// third-party requests that hang on mobile networks (notably in mainland
// China). This runs on the theme's output without editing node_modules.
//
// 1. Strips the hardcoded Google Fonts preconnect hints. The theme emits
//    them unconditionally even though no Google stylesheet is loaded
//    (custom fonts are disabled), so they only add DNS/TLS stalls.
// Visitor counting is intentionally disabled in the theme configuration. The
// old post-load loader was still executable third-party code and is therefore
// not retained here.

const GOOGLE_PRECONNECT =
  /\s*<link rel="preconnect" href="https:\/\/fonts\.(googleapis|gstatic)\.com"[^>]*>/g;

hexo.extend.filter.register("after_render:html", (html) => {
  let output = html;

  output = output.replace(GOOGLE_PRECONNECT, "");

  return output;
});
