"use strict";

// Rewrites built HTML to remove render-blocking / connection-stalling
// third-party requests that hang on mobile networks (notably in mainland
// China). This runs on the theme's output without editing node_modules.
//
// 1. Strips the hardcoded Google Fonts preconnect hints. The theme emits
//    them unconditionally even though no Google stylesheet is loaded
//    (custom fonts are disabled), so they only add DNS/TLS stalls.
// 2. Replaces the visitor-counter script with a post-load async loader. A
//    classic external defer still participates in ordered execution and can
//    delay later local defer scripts on weak mobile networks.

const GOOGLE_PRECONNECT =
  /\s*<link rel="preconnect" href="https:\/\/fonts\.(googleapis|gstatic)\.com"[^>]*>/g;

const COUNTER_SCRIPT =
  /<script[^>]*\ssrc="https:\/\/cn\.vercount\.one\/js"[^>]*><\/script>/g;

const COUNTER_LOADER = `<script data-swup-reload-script>
  (() => {
    const loadCounter = () => {
      document.querySelectorAll("script[data-blog-counter]").forEach((script) => script.remove());
      const script = document.createElement("script");
      script.src = "https://cn.vercount.one/js";
      script.async = true;
      script.dataset.blogCounter = "true";
      document.head.appendChild(script);
    };

    if (document.readyState === "complete") {
      window.setTimeout(loadCounter, 400);
    } else {
      window.addEventListener("load", () => window.setTimeout(loadCounter, 400), {
        once: true,
      });
    }
  })();
</script>`;

hexo.extend.filter.register("after_render:html", (html) => {
  let output = html;

  output = output.replace(GOOGLE_PRECONNECT, "");

  output = output.replace(COUNTER_SCRIPT, COUNTER_LOADER);

  return output;
});
