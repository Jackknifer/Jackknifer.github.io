#!/usr/bin/env node
import { copyFile, mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const pendingDir = path.join(root, "pending-posts");
const postsDir = path.join(root, "source", "_posts");
const imageRoot = path.join(root, "source", "images", "posts");

const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");
const force = args.has("--force");

const imageExtension = /\.(avif|bmp|gif|jpe?g|png|svg|webp)$/i;

function formatDate(date = new Date()) {
  const pad = (value) => String(value).padStart(2, "0");
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
  ].join("-") + " " + [
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
  ].join(":");
}

function formatDateOnly(date = new Date()) {
  const pad = (value) => String(value).padStart(2, "0");
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
  ].join("-");
}

function isIgnoredInboxEntry(name) {
  return name === "README.md" || name === ".DS_Store" || name.startsWith("_");
}

function isLocalUrl(url) {
  return !/^(?:[a-z][a-z0-9+.-]*:|\/\/|\/|#)/i.test(url);
}

function parseMarkdownTargets(rawTarget) {
  const trimmed = rawTarget.trim();
  if (!trimmed) return [];

  if (trimmed.startsWith("<")) {
    const end = trimmed.indexOf(">");
    if (end === -1) return [];
    return [{
      target: trimmed.slice(1, end),
      suffix: trimmed.slice(end + 1),
      angleWrapped: true,
    }];
  }

  const match = trimmed.match(/^(\S+)(\s+.*)?$/);
  if (!match) return [];

  const candidates = [];
  if (match[2] && !/["']/.test(match[2])) {
    candidates.push({
      target: trimmed,
      suffix: "",
      angleWrapped: false,
    });
  }

  candidates.push({
    target: match[1],
    suffix: match[2] || "",
    angleWrapped: false,
  });

  return candidates;
}

function decodePathPart(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function toPosixPath(value) {
  return value.split(path.sep).join("/");
}

function safePathPart(value) {
  const safe = value
    .normalize("NFKC")
    .replace(/[\\/:*?"<>|#%{}[\]^~`]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return safe || "asset";
}

function slugify(value) {
  const slug = value
    .normalize("NFKC")
    .replace(/[\\/:*?"<>|#%{}[\]^~`]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return slug || `post-${Date.now()}`;
}

function validDateParts(year, month, day) {
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year
    && date.getMonth() === month - 1
    && date.getDate() === day;
}

function parseDatedName(value, fallbackYear = new Date().getFullYear()) {
  const text = String(value || "").trim();
  const patterns = [
    /^(?<title>.+?)[\s_-]+(?<year>\d{4})[./_-](?<month>\d{1,2})[./_-](?<day>\d{1,2})$/,
    /^(?<year>\d{4})[./_-](?<month>\d{1,2})[./_-](?<day>\d{1,2})[\s_-]+(?<title>.+)$/,
    /^(?<title>.+?)[\s_-]+(?<month>\d{1,2})[.月/_-](?<day>\d{1,2})日?$/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match?.groups) continue;

    const year = Number(match.groups.year || fallbackYear);
    const month = Number(match.groups.month);
    const day = Number(match.groups.day);
    const title = String(match.groups.title || "").trim();

    if (title && validDateParts(year, month, day)) {
      return {
        title,
        date: formatDateOnly(new Date(year, month - 1, day)),
      };
    }
  }

  return { title: text, date: "" };
}

function escapeYamlScalar(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  if (/[:#\n\r"'{}\[\],&*!|>]/.test(text)) {
    return JSON.stringify(text);
  }
  return text;
}

function parseFrontMatter(markdown) {
  const normalized = markdown.replace(/\r\n/g, "\n");
  if (!normalized.startsWith("---\n")) {
    return { frontMatter: "", body: normalized, hasFrontMatter: false };
  }

  const end = normalized.indexOf("\n---", 4);
  if (end === -1) {
    return { frontMatter: "", body: normalized, hasFrontMatter: false };
  }

  const afterFence = normalized.indexOf("\n", end + 4);
  return {
    frontMatter: normalized.slice(4, end).trimEnd(),
    body: afterFence === -1 ? "" : normalized.slice(afterFence + 1).replace(/^\n+/, ""),
    hasFrontMatter: true,
  };
}

function getFrontMatterValue(frontMatter, key) {
  const match = frontMatter.match(new RegExp(`^${key}:\\s*(.*)$`, "m"));
  if (!match) return "";
  return match[1].trim().replace(/^['"]|['"]$/g, "");
}

function hasFrontMatterKey(frontMatter, key) {
  return new RegExp(`^${key}:`, "m").test(frontMatter);
}

function upsertScalar(frontMatter, key, value) {
  const line = `${key}: ${escapeYamlScalar(value)}`;
  if (hasFrontMatterKey(frontMatter, key)) {
    return frontMatter.replace(new RegExp(`^${key}:.*$`, "m"), line);
  }
  return `${frontMatter.trimEnd()}\n${line}`.trim();
}

function appendBlockIfMissing(frontMatter, key, block) {
  if (hasFrontMatterKey(frontMatter, key)) return frontMatter;
  return `${frontMatter.trimEnd()}\n${block}`.trim();
}

function inferTitle(body, fallback) {
  const heading = body.match(/^#\s+(.+)$/m);
  const fallbackInfo = parseDatedName(fallback);
  const fallbackTitle = fallbackInfo.title || fallback;

  if (heading) {
    return parseDatedName(heading[1]).title || heading[1].trim();
  }

  const firstTextLine = body
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line && !line.startsWith("!["));

  if (firstTextLine) {
    const firstTitle = parseDatedName(firstTextLine.replace(/^#{1,6}\s+/, "")).title;
    if (firstTitle === fallbackTitle) return firstTitle;
  }

  return fallbackTitle;
}

function removeLeadingTitleLine(body, title) {
  const lines = body.replace(/\r\n/g, "\n").split("\n");
  const index = lines.findIndex((line) => line.trim());
  if (index === -1) return body;

  const firstLine = lines[index].trim().replace(/^#{1,6}\s+/, "");
  const firstTitle = parseDatedName(firstLine).title;
  if (firstTitle !== title) return body;

  lines.splice(index, 1);
  return lines.join("\n").replace(/^\n+/, "");
}

async function fileExists(filePath) {
  try {
    const stats = await stat(filePath);
    return stats.isFile();
  } catch {
    return false;
  }
}

async function directoryExists(dirPath) {
  try {
    const stats = await stat(dirPath);
    return stats.isDirectory();
  } catch {
    return false;
  }
}

function ensureInsidePending(filePath) {
  const relative = path.relative(pendingDir, filePath);
  return Boolean(relative) && !relative.startsWith("..") && !path.isAbsolute(relative);
}

async function discoverCandidates() {
  if (!(await directoryExists(pendingDir))) return [];

  const entries = await readdir(pendingDir, { withFileTypes: true });
  const candidates = [];

  for (const entry of entries) {
    if (isIgnoredInboxEntry(entry.name)) continue;
    const entryPath = path.join(pendingDir, entry.name);

    if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) {
      candidates.push({
        label: `pending-posts/${entry.name}`,
        mdPath: entryPath,
        baseName: path.basename(entry.name, ".md"),
        category: "",
      });
      continue;
    }

    if (!entry.isDirectory()) continue;

    const indexPath = path.join(entryPath, "index.md");
    if (await fileExists(indexPath)) {
      candidates.push({
        label: `pending-posts/${entry.name}/index.md`,
        mdPath: indexPath,
        baseName: entry.name,
        category: entry.name,
      });
      continue;
    }

    const childEntries = await readdir(entryPath, { withFileTypes: true });
    const markdownFiles = childEntries
      .filter((child) => child.isFile() && child.name.toLowerCase().endsWith(".md"))
      .map((child) => child.name);

    if (markdownFiles.length === 1) {
      candidates.push({
        label: `pending-posts/${entry.name}/${markdownFiles[0]}`,
        mdPath: path.join(entryPath, markdownFiles[0]),
        baseName: path.basename(markdownFiles[0], ".md"),
        category: entry.name,
      });
    } else if (markdownFiles.length > 1) {
      for (const markdownFile of markdownFiles) {
        candidates.push({
          label: `pending-posts/${entry.name}/${markdownFile}`,
          mdPath: path.join(entryPath, markdownFile),
          baseName: path.basename(markdownFile, ".md"),
          category: entry.name,
        });
      }
    }
  }

  return candidates;
}

function isLikelyLocalFilesystemPath(value) {
  return path.isAbsolute(value) && /^\/(?:Users|Volumes|private|tmp|var)\//.test(value);
}

async function resolveAssetPath(target, markdownDir) {
  const withoutAnchor = target.split("#")[0];
  const withoutQuery = withoutAnchor.split("?")[0];
  const decodedTarget = decodePathPart(withoutQuery);

  if (isLikelyLocalFilesystemPath(decodedTarget)) {
    const sameNameInMarkdownDir = path.join(markdownDir, path.basename(decodedTarget));
    if (await fileExists(sameNameInMarkdownDir)) return sameNameInMarkdownDir;

    const sourcePath = path.resolve(decodedTarget);
    if (ensureInsidePending(sourcePath) && await fileExists(sourcePath)) {
      return sourcePath;
    }

    return "";
  }

  if (!isLocalUrl(decodedTarget)) return "";

  const sourcePath = path.resolve(markdownDir, decodedTarget);
  if (!ensureInsidePending(sourcePath)) {
    console.warn(`[warn] skipped image outside pending-posts: ${target}`);
    return "";
  }

  return await fileExists(sourcePath) ? sourcePath : "";
}

async function copyAsset(rawTarget, markdownDir, slug, copiedAssets, missingAssets) {
  const candidates = parseMarkdownTargets(rawTarget);
  if (!candidates.length) return null;

  let selected = null;
  let selectedSourcePath = "";

  for (const parsed of candidates) {
    const sourcePath = await resolveAssetPath(parsed.target, markdownDir);
    if (await fileExists(sourcePath)) {
      selected = parsed;
      selectedSourcePath = sourcePath;
      break;
    }
  }

  if (!selected) {
    console.warn(`[warn] missing image: ${rawTarget.trim()}`);
    missingAssets.push(rawTarget.trim());
    return null;
  }

  let relativeFromMarkdown = path.relative(markdownDir, selectedSourcePath);
  if (relativeFromMarkdown.startsWith("..")) {
    relativeFromMarkdown = path.basename(selectedSourcePath);
  }

  const safeRelative = relativeFromMarkdown
    .split(path.sep)
    .filter(Boolean)
    .map(safePathPart)
    .join(path.sep);

  const destPath = path.join(imageRoot, slug, safeRelative);
  const publicUrl = `/images/posts/${slug}/${toPosixPath(safeRelative)}`;

  if (!copiedAssets.has(selectedSourcePath)) {
    copiedAssets.set(selectedSourcePath, publicUrl);
    if (!dryRun) {
      await mkdir(path.dirname(destPath), { recursive: true });
      await copyFile(selectedSourcePath, destPath);
    }
  }

  return publicUrl + (selected.target.includes("#") ? `#${selected.target.split("#").slice(1).join("#")}` : "");
}

async function rewriteMarkdownImages(body, markdownDir, slug, copiedAssets, missingAssets) {
  const imagePattern = /!\[([^\]]*)\]\(([^)]+)\)/g;
  let result = "";
  let lastIndex = 0;

  for (const match of body.matchAll(imagePattern)) {
    const [whole, alt, rawTarget] = match;
    const replacementUrl = await copyAsset(rawTarget, markdownDir, slug, copiedAssets, missingAssets);
    result += body.slice(lastIndex, match.index);
    if (replacementUrl) {
      result += `![${alt}](${replacementUrl})`;
    } else {
      result += whole;
    }
    lastIndex = match.index + whole.length;
  }

  result += body.slice(lastIndex);
  return result;
}

async function findCover(markdownDir) {
  const entries = await readdir(markdownDir, { withFileTypes: true });
  const cover = entries.find((entry) => entry.isFile() && /^cover\./i.test(entry.name) && imageExtension.test(entry.name));
  return cover ? cover.name : "";
}

async function importCandidate(candidate) {
  const markdownDir = path.dirname(candidate.mdPath);
  const rawMarkdown = await readFile(candidate.mdPath, "utf8");
  let { frontMatter, body, hasFrontMatter } = parseFrontMatter(rawMarkdown);

  const initialTitle = getFrontMatterValue(frontMatter, "title") || inferTitle(body, candidate.baseName);
  const inferredDate = parseDatedName(candidate.baseName).date;
  const frontMatterSlug = getFrontMatterValue(frontMatter, "slug");
  const slug = slugify(frontMatterSlug || initialTitle);
  const destPost = path.join(postsDir, `${slug}.md`);

  if (existsSync(destPost) && !force) {
    console.log(`[skip] ${candidate.label}: source/_posts/${slug}.md already exists. Use --force to overwrite.`);
    return;
  }

  const copiedAssets = new Map();
  const missingAssets = [];
  if (!hasFrontMatter) {
    body = removeLeadingTitleLine(body, initialTitle);
  }
  body = await rewriteMarkdownImages(body, markdownDir, slug, copiedAssets, missingAssets);
  if (missingAssets.length) {
    console.error(`[skip] ${candidate.label}: missing ${missingAssets.length} image(s): ${missingAssets.join(", ")}`);
    return;
  }

  frontMatter = frontMatter.trim();
  if (!frontMatter) {
    frontMatter = [
      `title: ${escapeYamlScalar(initialTitle)}`,
      `date: ${inferredDate || formatDateOnly()}`,
      "tags: []",
      candidate.category ? `categories:\n  - ${escapeYamlScalar(candidate.category)}` : "categories: []",
      "description:",
      "cover:",
      "thumbnail:",
      "sticky:",
    ].join("\n");
  } else {
    if (!getFrontMatterValue(frontMatter, "title")) {
      frontMatter = upsertScalar(frontMatter, "title", initialTitle);
    }
    const date = getFrontMatterValue(frontMatter, "date") || inferredDate || formatDateOnly();
    if (!getFrontMatterValue(frontMatter, "date")) {
      frontMatter = upsertScalar(frontMatter, "date", date);
    }
    frontMatter = frontMatter.replace(/^updated:.*(?:\n|$)/m, "");
    frontMatter = appendBlockIfMissing(frontMatter, "tags", "tags: []");
    frontMatter = appendBlockIfMissing(
      frontMatter,
      "categories",
      candidate.category ? `categories:\n  - ${escapeYamlScalar(candidate.category)}` : "categories: []",
    );
    if (!hasFrontMatterKey(frontMatter, "description")) {
      frontMatter = upsertScalar(frontMatter, "description", "");
    }
    if (!hasFrontMatterKey(frontMatter, "cover")) {
      frontMatter = upsertScalar(frontMatter, "cover", "");
    }
    if (!hasFrontMatterKey(frontMatter, "thumbnail")) {
      frontMatter = upsertScalar(frontMatter, "thumbnail", "");
    }
    if (!hasFrontMatterKey(frontMatter, "sticky")) {
      frontMatter = upsertScalar(frontMatter, "sticky", "");
    }
  }

  const coverValue = getFrontMatterValue(frontMatter, "cover");
  if (coverValue && isLocalUrl(coverValue)) {
    const rewrittenCover = await copyAsset(coverValue, markdownDir, slug, copiedAssets, missingAssets);
    if (rewrittenCover) {
      frontMatter = upsertScalar(frontMatter, "cover", rewrittenCover);
    }
  } else if (!coverValue) {
    const coverFile = await findCover(markdownDir);
    if (coverFile) {
      const rewrittenCover = await copyAsset(coverFile, markdownDir, slug, copiedAssets, missingAssets);
      if (rewrittenCover) {
        frontMatter = upsertScalar(frontMatter, "cover", rewrittenCover);
      }
    }
  }

  const nextMarkdown = `---\n${frontMatter.trimEnd()}\n---\n\n${body.replace(/^\n+/, "")}`;

  if (!dryRun) {
    await mkdir(postsDir, { recursive: true });
    await writeFile(destPost, nextMarkdown, "utf8");
  }

  console.log(`${dryRun ? "[dry-run]" : "[imported]"} ${candidate.label} -> source/_posts/${slug}.md`);
  for (const publicUrl of copiedAssets.values()) {
    console.log(`  image -> ${publicUrl}`);
  }
}

async function main() {
  const candidates = await discoverCandidates();
  if (!candidates.length) {
    console.log("No pending posts found. Put Markdown files or article folders under pending-posts/.");
    return;
  }

  let failures = 0;
  for (const candidate of candidates) {
    try {
      await importCandidate(candidate);
    } catch (error) {
      failures += 1;
      console.error(`[error] ${error.message}`);
    }
  }

  if (failures > 0) {
    process.exitCode = 1;
  }
}

await main();
