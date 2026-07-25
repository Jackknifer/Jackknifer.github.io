"use strict";

// Rewrites built HTML to remove render-blocking / connection-stalling
// third-party requests that hang on mobile networks (notably in mainland
// China). This runs on the theme's output without editing node_modules.
//
// 1. Strips the hardcoded Google Fonts preconnect hints. The theme emits
//    them unconditionally even though no Google stylesheet is loaded
//    (custom fonts are disabled), so they only add DNS/TLS stalls.
// 2. Adds `defer` to the visitor-counter script (cn.vercount.one/js), which
//    the theme injects as a render-blocking <script>. On a slow connection
//    it stalls HTML parsing just above the footer, delaying the footer,
//    the deferred blog-experience.js bundle (music player + weather), and
//    the local FontAwesome icon fonts used by the navbar / scroll cue /
//    settings gear.

const GOOGLE_PRECONNECT =
  /\s*<link rel="preconnect" href="https:\/\/fonts\.(googleapis|gstatic)\.com"[^>]*>/g;

const COUNTER_SCRIPT =
  /<script((?:(?!\bdefer\b)[^>])*?)\ssrc="https:\/\/cn\.vercount\.one\/js"([^>]*)><\/script>/g;

hexo.extend.filter.register("after_render:html", (html) => {
  let output = html;

  output = output.replace(GOOGLE_PRECONNECT, "");

  output = output.replace(
    COUNTER_SCRIPT,
    (match) =>
      match.includes(" defer")
        ? match
        : match.replace("<script", "<script defer"),
  );

  return output;
});
