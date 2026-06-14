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
  return heading ? heading[1].trim() : fallback;
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
        baseName: entry.name,
      });
    } else if (markdownFiles.length > 1) {
      console.warn(`[skip] pending-posts/${entry.name}: found multiple markdown files; use index.md to choose the article.`);
    }
  }

  return candidates;
}

async function copyAsset(rawTarget, markdownDir, slug, copiedAssets) {
  const candidates = parseMarkdownTargets(rawTarget);
  if (!candidates.length) return null;

  let selected = null;
  let selectedSourcePath = "";

  for (const parsed of candidates) {
    if (!isLocalUrl(parsed.target)) continue;

    const withoutAnchor = parsed.target.split("#")[0];
    const withoutQuery = withoutAnchor.split("?")[0];
    const decodedTarget = decodePathPart(withoutQuery);
    const sourcePath = path.resolve(markdownDir, decodedTarget);

    if (!ensureInsidePending(sourcePath)) {
      console.warn(`[warn] skipped image outside pending-posts: ${parsed.target}`);
      return null;
    }

    if (await fileExists(sourcePath)) {
      selected = parsed;
      selectedSourcePath = sourcePath;
      break;
    }
  }

  if (!selected) {
    console.warn(`[warn] missing image: ${rawTarget.trim()}`);
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

async function rewriteMarkdownImages(body, markdownDir, slug, copiedAssets) {
  const imagePattern = /!\[([^\]]*)\]\(([^)]+)\)/g;
  let result = "";
  let lastIndex = 0;

  for (const match of body.matchAll(imagePattern)) {
    const [whole, alt, rawTarget] = match;
    const replacementUrl = await copyAsset(rawTarget, markdownDir, slug, copiedAssets);
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
  let { frontMatter, body } = parseFrontMatter(rawMarkdown);

  const initialTitle = getFrontMatterValue(frontMatter, "title") || inferTitle(body, candidate.baseName);
  const frontMatterSlug = getFrontMatterValue(frontMatter, "slug");
  const slug = slugify(frontMatterSlug || candidate.baseName);
  const destPost = path.join(postsDir, `${slug}.md`);

  if (existsSync(destPost) && !force) {
    throw new Error(`${candidate.label}: source/_posts/${slug}.md already exists. Use --force to overwrite.`);
  }

  const copiedAssets = new Map();
  body = await rewriteMarkdownImages(body, markdownDir, slug, copiedAssets);

  frontMatter = frontMatter.trim();
  if (!frontMatter) {
    frontMatter = [
      `title: ${escapeYamlScalar(initialTitle)}`,
      `date: ${formatDate()}`,
      `updated: ${formatDate()}`,
      "tags:",
      "  -",
      "categories:",
      "  -",
      "description:",
      "cover:",
      "thumbnail:",
      "sticky:",
    ].join("\n");
  } else {
    if (!getFrontMatterValue(frontMatter, "title")) {
      frontMatter = upsertScalar(frontMatter, "title", initialTitle);
    }
    const date = getFrontMatterValue(frontMatter, "date") || formatDate();
    if (!getFrontMatterValue(frontMatter, "date")) {
      frontMatter = upsertScalar(frontMatter, "date", date);
    }
    if (!getFrontMatterValue(frontMatter, "updated")) {
      frontMatter = upsertScalar(frontMatter, "updated", date);
    }
    frontMatter = appendBlockIfMissing(frontMatter, "tags", "tags:\n  -");
    frontMatter = appendBlockIfMissing(frontMatter, "categories", "categories:\n  -");
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
    const rewrittenCover = await copyAsset(coverValue, markdownDir, slug, copiedAssets);
    if (rewrittenCover) {
      frontMatter = upsertScalar(frontMatter, "cover", rewrittenCover);
    }
  } else if (!coverValue) {
    const coverFile = await findCover(markdownDir);
    if (coverFile) {
      const rewrittenCover = await copyAsset(coverFile, markdownDir, slug, copiedAssets);
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
