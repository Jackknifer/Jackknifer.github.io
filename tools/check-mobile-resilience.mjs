import fs from "node:fs";
import path from "node:path";

const homePath = "public/index.html";
const postPath = "public/2026/06/14/welcome/index.html";
const categoriesPath = "public/categories/index.html";
const archivePath = "public/archives/index.html";
const tagDetailPath = "public/tags/求职/index.html";
const categoryDetailPath = "public/categories/写作/index.html";
const stylesPath = "public/css/blog-enhancements.css";
const bundlePath = "public/js/blog-experience.js";

for (const filePath of [
  homePath,
  postPath,
  categoriesPath,
  archivePath,
  tagDetailPath,
  categoryDetailPath,
  stylesPath,
  bundlePath,
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
const bundle = fs.readFileSync(bundlePath, "utf8");
const noScriptHome = home
  .replace(/<script\b[\s\S]*?<\/script>/gi, "")
  .replace(/<link[^>]+fontawesome[^>]*>/gi, "");
const noScriptPost = post.replace(/<script\b[\s\S]*?<\/script>/gi, "");
const categoryCardLinks =
  categories.match(
    /<a class="all-category-list-link" href="[^"]+"><span class="all-category-list-label">[\s\S]*?<\/span><span class="all-category-list-count">[\s\S]*?<\/span><\/a>/g,
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
  "home player has native fallback":
    /data-player-surface="home"[\s\S]*?blog-player-native-fallback/.test(
      noScriptHome,
    ),
  "weather card has static status":
    /data-weather-widget[\s\S]*?若长时间没有更新/.test(noScriptHome),
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
    !/replaceAll|matchAll|Promise\.allSettled|queueMicrotask|\?\./.test(bundle),
  "counter is not parser blocking":
    !/<script[^>]+src="https:\/\/cn\.vercount\.one\/js/.test(home),
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
}

checks["all local asset references exist"] = missingAssets.length === 0;

for (const [name, passed] of Object.entries(checks)) {
  console.log(`${passed ? "PASS" : "FAIL"} ${name}`);
}

if (missingAssets.length) {
  console.error(missingAssets.slice(0, 20).join("\n"));
}

if (Object.values(checks).some((passed) => !passed)) {
  process.exitCode = 1;
}
