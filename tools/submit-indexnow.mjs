#!/usr/bin/env node
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const endpoint = process.env.INDEXNOW_ENDPOINT || "https://api.indexnow.org/indexnow";
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run") || process.env.INDEXNOW_DRY_RUN === "1";
const sitemapArg = args.find((arg) => arg !== "--dry-run");
const sitemapPath = path.resolve(root, sitemapArg || "public/sitemap.xml");
const sourceDir = path.join(root, "source");

function decodeXml(value) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&apos;/g, "'");
}

async function discoverIndexNowKey() {
  if (process.env.INDEXNOW_KEY) {
    return process.env.INDEXNOW_KEY.trim();
  }

  const entries = await readdir(sourceDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    if (!/^[A-Za-z0-9-]{8,128}\.txt$/.test(entry.name)) continue;

    const key = path.basename(entry.name, ".txt");
    const content = (await readFile(path.join(sourceDir, entry.name), "utf8")).trim();
    if (content === key) return key;
  }

  throw new Error("No IndexNow key file found in source/.");
}

function parseSitemapUrls(xml) {
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)]
    .map((match) => decodeXml(match[1]).trim())
    .filter(Boolean);
}

async function submitIndexNow() {
  const xml = await readFile(sitemapPath, "utf8");
  const urls = parseSitemapUrls(xml);
  if (!urls.length) {
    throw new Error(`No URLs found in ${path.relative(root, sitemapPath)}.`);
  }

  const firstUrl = new URL(urls[0]);
  const host = firstUrl.host;
  const key = await discoverIndexNowKey();
  const keyLocation = process.env.INDEXNOW_KEY_LOCATION || `${firstUrl.protocol}//${host}/${key}.txt`;

  const urlList = urls
    .filter((url) => new URL(url).host === host)
    .slice(0, 10000);

  if (dryRun) {
    console.log(`Prepared ${urlList.length} URL(s) for IndexNow at ${endpoint}.`);
    console.log(`Key location: ${keyLocation}`);
    return;
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      host,
      key,
      keyLocation,
      urlList,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`IndexNow request failed: ${response.status} ${response.statusText} ${body}`.trim());
  }

  console.log(`Submitted ${urlList.length} URL(s) to IndexNow for ${host}.`);
}

submitIndexNow().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
