"use strict";

const fs = require("node:fs");
const path = require("node:path");

const IMAGE_TAG = /<img\b[^>]*\bsrc=(["'])(\/images\/[^"']+)\1[^>]*>/gi;
const HOME_MARKER = 'class="home-content-container';
const POST_MARKER = 'class="post-page-container';
const RESPONSIVE_WIDTH = 960;
const SOURCE_ROOT = fs.realpathSync(hexo.source_dir);
const IMAGE_ROOT = fs.realpathSync(path.join(SOURCE_ROOT, "images"));

function isInside(rootPath, candidatePath) {
  const relative = path.relative(rootPath, candidatePath);
  return (
    Boolean(relative) &&
    !relative.startsWith(`..${path.sep}`) &&
    relative !== ".." &&
    !path.isAbsolute(relative)
  );
}

function imageWidth(filePath) {
  const buffer = fs.readFileSync(filePath);

  if (
    buffer.length >= 24 &&
    buffer[0] === 0x89 &&
    buffer.toString("ascii", 1, 4) === "PNG"
  ) {
    return buffer.readUInt32BE(16);
  }

  if (buffer[0] !== 0xff || buffer[1] !== 0xd8) return null;

  let offset = 2;
  while (offset + 9 < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }

    const marker = buffer[offset + 1];
    const length = buffer.readUInt16BE(offset + 2);
    if (
      [
        0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb,
        0xcd, 0xce, 0xcf,
      ].includes(marker)
    ) {
      return buffer.readUInt16BE(offset + 7);
    }
    if (!Number.isFinite(length) || length < 2) break;
    offset += 2 + length;
  }

  return null;
}

function addAttribute(tag, name, value) {
  if (new RegExp(`\\s${name}=`, "i").test(tag)) return tag;
  return tag.replace(/\s*\/?>$/, (ending) =>
    ending.includes("/")
      ? ` ${name}="${value}" />`
      : ` ${name}="${value}">`,
  );
}

function sourcePath(url) {
  let decoded;
  try {
    decoded = decodeURIComponent(url);
  } catch {
    decoded = url;
  }
  const unresolvedPath = path.resolve(SOURCE_ROOT, decoded.replace(/^\/+/, ""));
  if (!isInside(IMAGE_ROOT, unresolvedPath)) return "";

  try {
    const resolvedPath = fs.realpathSync(unresolvedPath);
    return isInside(IMAGE_ROOT, resolvedPath) ? resolvedPath : "";
  } catch {
    return "";
  }
}

function enhanceImage(tag, url) {
  const originalPath = sourcePath(url);
  const responsiveUrl = url.replace(/^\/images\//, "/images/responsive/");
  const responsivePath = sourcePath(responsiveUrl);
  const isCritical =
    /alt=(["'])home-banner-background\1/i.test(tag) ||
    url.startsWith("/images/avatar.jpg") ||
    /\bh-60\b.*\bobject-cover\b/i.test(tag);

  let output = addAttribute(tag, "decoding", "async");
  output = addAttribute(output, "loading", isCritical ? "eager" : "lazy");
  if (isCritical) output = addAttribute(output, "fetchpriority", "high");
  if (url === "/images/avatar.jpg") {
    output = addAttribute(output, "alt", "Jackknifer");
    output = addAttribute(output, "width", "128");
    output = addAttribute(output, "height", "128");
  }

  if (!fs.existsSync(originalPath) || !fs.existsSync(responsivePath)) {
    return output;
  }

  const width = imageWidth(originalPath);
  if (!width || width <= RESPONSIVE_WIDTH) return output;
  // A responsive candidate only helps on slow or high-latency connections when
  // it is actually smaller than the original. Some historical derivatives
  // were encoded larger than their sources; advertising those in srcset made
  // mobile browsers download more bytes.
  if (
    fs.statSync(responsivePath).size >= fs.statSync(originalPath).size
  ) {
    return output;
  }

  output = addAttribute(
    output,
    "srcset",
    `${responsiveUrl} ${RESPONSIVE_WIDTH}w, ${url} ${width}w`,
  );
  output = addAttribute(
    output,
    "sizes",
    /alt=(["'])home-banner-background\1/i.test(tag)
      ? "100vw"
      : "(max-width: 768px) calc(100vw - 48px), 900px",
  );
  return output;
}

hexo.extend.filter.register("after_render:html", (html) => {
  let output = html.replace(IMAGE_TAG, (tag, _quote, url) =>
    enhanceImage(tag, url),
  );

  // Set the page identity in generated HTML so the mobile sidebar is visible
  // before any JavaScript downloads or executes.
  if (
    output.includes(HOME_MARKER) &&
    !/<html\b[^>]*data-blog-page=/.test(output)
  ) {
    output = output.replace("<html", '<html data-blog-page="home"');

    // The profile is part of the first meaningful mobile screen. Embedding this
    // small local image removes an extra github.io request, so a transient
    // asset failure cannot leave the author card blank.
    const avatarPath = sourcePath("/images/avatar.jpg");
    if (fs.existsSync(avatarPath)) {
      const avatarData = fs.readFileSync(avatarPath).toString("base64");
      output = output.replace(
        /src=(["'])\/images\/avatar\.jpg\1/g,
        `src="data:image/jpeg;base64,${avatarData}"`,
      );
    }
  } else if (
    output.includes(POST_MARKER) &&
    !/<html\b[^>]*data-blog-page=/.test(output)
  ) {
    output = output.replace("<html", '<html data-blog-page="post"');
  }

  return output;
});
