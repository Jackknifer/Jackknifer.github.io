"use strict";

const fs = require("node:fs");
const path = require("node:path");

const DEFAULT_SHARE_IMAGE = "/images/hero-sea-level.jpg";
const SHARE_DESCRIPTION = "弃我去者，昨日之日不可留。";

hexo.extend.filter.register("before_post_render", (data) => {
  if (data.layout !== "post") {
    return data;
  }

  data.og_description = SHARE_DESCRIPTION;

  if (!data.og_image) {
    data.og_image = cleanText(data.cover) || DEFAULT_SHARE_IMAGE;
  }

  return data;
});

hexo.extend.filter.register("after_render:html", (html) => {
  if (!html.includes('property="og:type" content="article"')) {
    return html;
  }

  const imageMatch = html.match(
    /<meta property="og:image" content="([^"]+)">/,
  );
  if (!imageMatch) {
    return html;
  }

  const imageUrl = imageMatch[1];
  const title = decodeHtmlAttribute(
    html.match(/<meta property="og:title" content="([^"]*)">/)?.[1] || "",
  );
  const imageInfo = getLocalImageInfo(imageUrl);
  const extraTags = [
    `<meta property="og:image:secure_url" content="${escapeAttribute(imageUrl)}">`,
    imageInfo.type
      ? `<meta property="og:image:type" content="${imageInfo.type}">`
      : "",
    imageInfo.width
      ? `<meta property="og:image:width" content="${imageInfo.width}">`
      : "",
    imageInfo.height
      ? `<meta property="og:image:height" content="${imageInfo.height}">`
      : "",
    `<meta property="og:image:alt" content="${escapeAttribute(title)}">`,
    `<meta name="twitter:image:alt" content="${escapeAttribute(title)}">`,
    `<meta itemprop="image" content="${escapeAttribute(imageUrl)}">`,
    `<link rel="image_src" href="${escapeAttribute(imageUrl)}">`,
  ].filter(Boolean).join("\n");

  return html.replace(imageMatch[0], `${imageMatch[0]}\n${extraTags}`);
});

function cleanText(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function escapeAttribute(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function decodeHtmlAttribute(value) {
  return String(value)
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&");
}

function getLocalImageInfo(imageUrl) {
  try {
    const url = new URL(imageUrl, hexo.config.url);
    const relativePath = decodeURIComponent(url.pathname).replace(/^\/+/, "");
    const imagePath = path.join(hexo.source_dir, relativePath);
    const buffer = fs.readFileSync(imagePath);
    const dimensions = readImageDimensions(buffer);

    return {
      ...dimensions,
      type: getMimeType(imagePath),
    };
  } catch {
    return {};
  }
}

function getMimeType(imagePath) {
  switch (path.extname(imagePath).toLowerCase()) {
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".png":
      return "image/png";
    case ".webp":
      return "image/webp";
    case ".gif":
      return "image/gif";
    default:
      return "";
  }
}

function readImageDimensions(buffer) {
  if (
    buffer.length >= 24
    && buffer.toString("ascii", 1, 4) === "PNG"
  ) {
    return {
      width: buffer.readUInt32BE(16),
      height: buffer.readUInt32BE(20),
    };
  }

  if (buffer.length >= 10 && buffer.toString("ascii", 0, 3) === "GIF") {
    return {
      width: buffer.readUInt16LE(6),
      height: buffer.readUInt16LE(8),
    };
  }

  if (buffer.length >= 4 && buffer[0] === 0xff && buffer[1] === 0xd8) {
    let offset = 2;

    while (offset + 9 < buffer.length) {
      if (buffer[offset] !== 0xff) {
        offset += 1;
        continue;
      }

      const marker = buffer[offset + 1];
      const segmentLength = buffer.readUInt16BE(offset + 2);
      const isStartOfFrame = (
        marker >= 0xc0
        && marker <= 0xc3
      ) || (
        marker >= 0xc5
        && marker <= 0xc7
      ) || (
        marker >= 0xc9
        && marker <= 0xcb
      ) || (
        marker >= 0xcd
        && marker <= 0xcf
      );

      if (isStartOfFrame) {
        return {
          height: buffer.readUInt16BE(offset + 5),
          width: buffer.readUInt16BE(offset + 7),
        };
      }

      if (segmentLength < 2) break;
      offset += 2 + segmentLength;
    }
  }

  return {};
}
