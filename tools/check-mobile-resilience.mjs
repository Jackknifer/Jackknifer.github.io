import fs from "node:fs";
import path from "node:path";

const homePath = "public/index.html";
// Hexo derives permalink date components from the process timezone. Production
// builds use UTC for deterministic paths while `_config.yml` keeps displayed
// dates in Asia/Shanghai.
const postPath = "public/2026/06/13/welcome/index.html";
const categoriesPath = "public/categories/index.html";
const archivePath = "public/archives/index.html";
const tagDetailPath = "public/tags/求职/index.html";
const categoryDetailPath = "public/categories/写作/index.html";
const stylesPath = "public/css/blog-enhancements.css";
const themeStylesPath = "public/css/style.css";
const bundlePath = "public/js/blog-experience.js";
const clientExperiencePath = "client/blog-experience.js";
const mediaResiliencePath = "scripts/media-resilience.js";
const importerPath = "tools/import-pending-posts.mjs";

for (const filePath of [
  homePath,
  postPath,
  categoriesPath,
  archivePath,
  tagDetailPath,
  categoryDetailPath,
  stylesPath,
  themeStylesPath,
  bundlePath,
  clientExperiencePath,
  mediaResiliencePath,
  importerPath,
]) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`missing generated file: ${filePath}`);
  }
}

const home = fs.readFileSync(homePath, "utf8");
const post = fs.readFileSync(postPath, "utf8");
const categories = fs.readFileSync(categoriesPath, "utf8");
const archive = fs.readFileSync(archivePath, "utf8");
const tagDetail = fs.readFileSync(tagDetailPath, "utf8");
const categoryDetail = fs.readFileSync(categoryDetailPath, "utf8");
const styles = fs.readFileSync(stylesPath, "utf8");
const themeStyles = fs.readFileSync(themeStylesPath, "utf8");
const bundle = fs.readFileSync(bundlePath, "utf8");
const clientExperience = fs.readFileSync(clientExperiencePath, "utf8");
const mediaResilience = fs.readFileSync(mediaResiliencePath, "utf8");
const importer = fs.readFileSync(importerPath, "utf8");
const noScriptHome = home
  .replace(/<script\b[\s\S]*?<\/script>/gi, "")
  .replace(/<link[^>]+fontawesome[^>]*>/gi, "");
const noScriptPost = post.replace(/<script\b[\s\S]*?<\/script>/gi, "");
const categoryCardLinks =
  categories.match(
    /<a class="all-category-list-link" href="[^"]+"><span class="all-category-list-label">[\s\S]*?<\/span><span class="all-category-list-count">[\s\S]*?<\/span><\/a>/g,
  ) || [];
const staticSearchIcons =
  noScriptHome.match(
    /<svg class="blog-inline-icon blog-search-icon"[^>]*>[\s\S]*?<\/svg>/g,
  ) || [];

const checks = {
  "home page identity is static": /data-blog-page="home"/.test(home),
  "post page identity is static": /data-blog-page="post"/.test(post),
  "profile avatar is embedded": /data:image\/jpeg;base64/.test(noScriptHome),
  "social links are static SVG":
    /blog-sidebar-socials[\s\S]*?<svg/.test(noScriptHome),
  "navigation icons do not need font files":
    (noScriptHome.match(/blog-inline-icon (?:fa-sm fa-fw|fa-fw|icon-space)/g) ||
      []).length >= 21,
  "home search icons do not need font files":
    staticSearchIcons.length >= 2 &&
    !/search-popup-trigger">\s*<i class="fa-solid fa-magnifying-glass"/.test(
      noScriptHome,
    ),
  "home core controls do not need font files":
    /blog-banner-arrow-icon/.test(noScriptHome) &&
    (noScriptHome.match(/blog-home-meta-icon/g) || []).length >= 3 &&
    (noScriptHome.match(/blog-read-more-icon/g) || []).length >= 1 &&
    /blog-side-tool-icon/.test(noScriptHome) &&
    /blog-search-field-icon/.test(noScriptHome) &&
    /blog-search-close-icon/.test(noScriptHome) &&
    /blog-search-loading-icon/.test(noScriptHome) &&
    !/<i class="fa-solid fa-(?:calendars|folders|tags|angle-right)"/.test(
      noScriptHome,
    ),
  "scroll progress swaps cleanly with the return-to-top arrow":
    /<svg class="blog-inline-icon blog-side-tool-icon arrow-up"/.test(
      noScriptHome,
    ) &&
    /\.tool-scroll-to-top[^}]*[\s\S]*?\.arrow-up[^}]*display:\s*none/.test(
      themeStyles,
    ),
  "profile typography uses the blog font":
    styles.includes(
      "html .home-sidebar-container .sidebar-content .statistics {",
    ) && styles.includes("font-family: var(--blog-serif) !important;"),
  "theme toggle has a local glyph fallback":
    home.includes(
      ".right-side-tools-container .tool-dark-light-toggle > i::before",
    ) &&
    home.includes(
      "html.dark .right-side-tools-container .tool-dark-light-toggle > i::before",
    ),
  "image viewer controls have local glyph fallbacks":
    styles.includes("html .image-viewer-close > i::before,") &&
    styles.includes("html .image-viewer-prev > i::before {") &&
    styles.includes("html .image-viewer-next > i::before {") &&
    styles.includes("html .image-viewer-exif-card-icon::before {"),
  "home player has native fallback":
    /data-player-surface="home"[\s\S]*?blog-player-native-fallback/.test(
      noScriptHome,
    ),
  "weather card loads automatically and keeps manual retry":
    /if \(state\.weather\.status === "idle"\) requestWeather\(\);/.test(
      clientExperience,
    ) &&
    /data-weather-widget[\s\S]*?data-weather-action="load"/.test(noScriptHome),
  "post player has native fallback":
    /blog-post-player-section[\s\S]*?blog-player-native-fallback/.test(
      noScriptPost,
    ),
  "category cards are complete native links": categoryCardLinks.length >= 3,
  "archive title is available without client JavaScript":
    /archive-page-title">归档<\/h1>/.test(archive),
  "archive tag and category lists share one index layout":
    /archive-container blog-index-list/.test(archive) &&
    /tag-post-list blog-index-list/.test(tagDetail) &&
    /category-post-list blog-index-list/.test(categoryDetail),
  "title underline positioning does not depend on client JavaScript":
    styles.includes(".page-template-container > .page-title-header,") &&
    styles.includes(".archive-container > .archive-page-title {"),
  "image retry and fallback are inline":
    home.includes("data-blog-retried") && home.includes("图片暂时无法加载"),
  "browser bundle excludes unsupported APIs":
    !/replaceAll|matchAll|Promise\.allSettled|queueMicrotask|URLSearchParams|toggleAttribute|\.prepend\(/.test(
      bundle,
    ),
  "theme failure has local control fallbacks":
    bundle.includes("blog-legacy-theme-fallback") &&
    bundle.includes("theme-module-error") &&
    bundle.includes("/search.json") &&
    bundle.includes('Accept:"application/json"') &&
    bundle.includes(".toggle-tools-list") &&
    bundle.includes(".hidden-tools-list") &&
    bundle.includes("navbar-drawer-show"),
  "comments have a static fallback link":
    /blog-comment-fallback[\s\S]*?github\.com\/Jackknifer\/Jackknifer\.github\.io\/discussions/.test(
      noScriptPost,
    ),
  "single-page runtime is not loaded":
    !/<script[^>]+src=["'][^"']*Swup/i.test(home),
  "build-time image reads stay inside the canonical image root":
    mediaResilience.includes("fs.realpathSync(unresolvedPath)") &&
    mediaResilience.includes("isInside(IMAGE_ROOT, resolvedPath)"),
  "pending post Markdown uses canonical inbox containment":
    importer.includes(
      "const safeMarkdownPath = await resolveSafePendingFile(candidate.mdPath)",
    ) && importer.includes("mdPath: safeIndexPath"),
  "pending post asset writes enforce destination containment":
    importer.includes("slug !== \".\" && slug !== \"..\"") &&
    importer.includes("prepareSafeDestination(imageRoot, destPath)"),
};

const missingAssets = [];
const htmlFiles = [];

function collectHtml(directory) {
  for (const name of fs.readdirSync(directory)) {
    const filePath = path.join(directory, name);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) collectHtml(filePath);
    else if (name.endsWith(".html")) htmlFiles.push(filePath);
  }
}

collectHtml("public");

const oversizedResponsiveAssets = [];

for (const filePath of htmlFiles) {
  const html = fs.readFileSync(filePath, "utf8");
  const referencePattern =
    /(?:src|href)=["'](\/[^"'#?]+)(?:[?#][^"']*)?["']/g;
  let match;
  while ((match = referencePattern.exec(html))) {
    const assetPath = path.join(
      "public",
      decodeURIComponent(match[1]).replace(/^\//, ""),
    );
    if (!fs.existsSync(assetPath)) {
      missingAssets.push(`${filePath}: ${match[1]}`);
    }
  }

  const srcsetPattern = /\bsrcset=["']([^"']+)["']/g;
  while ((match = srcsetPattern.exec(html))) {
    for (const candidate of match[1].split(",")) {
      const url = candidate.trim().split(/\s+/)[0];
      if (!url.startsWith("/images/responsive/")) continue;
      const responsivePath = path.join(
        "public",
        decodeURIComponent(url).replace(/^\//, ""),
      );
      const originalPath = responsivePath.replace(
        `${path.sep}images${path.sep}responsive${path.sep}`,
        `${path.sep}images${path.sep}`,
      );
      if (
        fs.existsSync(responsivePath) &&
        fs.existsSync(originalPath) &&
        fs.statSync(responsivePath).size >= fs.statSync(originalPath).size
      ) {
        oversizedResponsiveAssets.push(
          `${filePath}: ${url} is not smaller than its original`,
        );
      }
    }
  }
}

checks["all local asset references exist"] = missingAssets.length === 0;
checks["advertised responsive images save bytes"] =
  oversizedResponsiveAssets.length === 0;
checks["counter dependency is removed"] = !htmlFiles.some((filePath) =>
  fs.readFileSync(filePath, "utf8").includes("cn.vercount.one"),
);

for (const [name, passed] of Object.entries(checks)) {
  console.log(`${passed ? "PASS" : "FAIL"} ${name}`);
}

if (missingAssets.length) {
  console.error(missingAssets.slice(0, 20).join("\n"));
}
if (oversizedResponsiveAssets.length) {
  console.error(oversizedResponsiveAssets.slice(0, 20).join("\n"));
}

if (Object.values(checks).some((passed) => !passed)) {
  process.exitCode = 1;
}
