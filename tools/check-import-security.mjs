import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";

const repoRoot = process.cwd();
const importerSource = path.join(repoRoot, "tools", "import-pending-posts.mjs");
const mediaFilterSource = path.join(repoRoot, "scripts", "media-resilience.js");
const fixtureImage = path.join(repoRoot, "source", "images", "avatar.jpg");
const sandboxes = [];

function createSandbox(label) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), `jackknifer-${label}-`));
  sandboxes.push(root);
  fs.mkdirSync(path.join(root, "tools"), { recursive: true });
  fs.mkdirSync(path.join(root, "pending-posts"), { recursive: true });
  fs.mkdirSync(path.join(root, "source", "_posts"), { recursive: true });
  fs.mkdirSync(path.join(root, "source", "images", "posts"), {
    recursive: true,
  });
  fs.copyFileSync(importerSource, path.join(root, "tools", "import-pending-posts.mjs"));
  return root;
}

function runImporter(root) {
  return spawnSync(process.execPath, ["tools/import-pending-posts.mjs"], {
    cwd: root,
    encoding: "utf8",
  });
}

function filesBelow(root) {
  if (!fs.existsSync(root)) return [];
  return fs.readdirSync(root, { recursive: true }).map(String);
}

function checkSymlinkedIndexIsRejected() {
  const root = createSandbox("index-symlink");
  const articleDir = path.join(root, "pending-posts", "linked");
  const outsideFile = path.join(root, "outside.md");
  fs.mkdirSync(articleDir, { recursive: true });
  fs.writeFileSync(outsideFile, "PRIVATE_IMPORT_MARKER\n", "utf8");
  fs.symlinkSync(outsideFile, path.join(articleDir, "index.md"));

  const result = runImporter(root);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(filesBelow(path.join(root, "source", "_posts")).length, 0);
  assert.doesNotMatch(result.stdout + result.stderr, /PRIVATE_IMPORT_MARKER/);
}

function checkDotSlugCannotOverwriteSiblingImage() {
  const root = createSandbox("dot-slug");
  const articleDir = path.join(root, "pending-posts", "dot-slug");
  const siblingImage = path.join(root, "source", "images", "avatar.jpg");
  fs.mkdirSync(articleDir, { recursive: true });
  fs.writeFileSync(siblingImage, "ORIGINAL_AVATAR", "utf8");
  fs.writeFileSync(path.join(articleDir, "avatar.jpg"), "REPLACEMENT", "utf8");
  fs.writeFileSync(
    path.join(articleDir, "index.md"),
    "---\ntitle: Dot slug\nslug: ..\n---\n\n![avatar](avatar.jpg)\n",
    "utf8",
  );

  const result = runImporter(root);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(fs.readFileSync(siblingImage, "utf8"), "ORIGINAL_AVATAR");
  assert.ok(
    filesBelow(path.join(root, "source", "images", "posts"))
      .some((entry) => entry === "avatar.jpg" || entry.endsWith("/avatar.jpg")),
  );
  assert.doesNotMatch(result.stdout, /\/images\/posts\/\.\.\//);
}

function checkDestinationSymlinkCannotEscape() {
  const root = createSandbox("destination-symlink");
  const articleDir = path.join(root, "pending-posts", "safe-post");
  const outsideDir = path.join(root, "outside-assets");
  fs.mkdirSync(articleDir, { recursive: true });
  fs.mkdirSync(outsideDir, { recursive: true });
  fs.symlinkSync(
    outsideDir,
    path.join(root, "source", "images", "posts", "safe-post"),
  );
  fs.writeFileSync(path.join(articleDir, "probe.jpg"), "IMAGE", "utf8");
  fs.writeFileSync(
    path.join(articleDir, "index.md"),
    "---\ntitle: Safe post\nslug: safe-post\n---\n\n![probe](probe.jpg)\n",
    "utf8",
  );

  const result = runImporter(root);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /blocked unsafe image destination/);
  assert.equal(filesBelow(outsideDir).length, 0);
}

function checkMediaFilterContainsDecodedPaths() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "jackknifer-media-filter-"));
  sandboxes.push(root);
  const sourceDir = path.join(root, "source");
  const imageDir = path.join(sourceDir, "images");
  const outsideImage = path.join(root, "outside.png");
  const localImage = path.join(imageDir, "local.jpg");
  fs.mkdirSync(imageDir, { recursive: true });
  fs.copyFileSync(fixtureImage, outsideImage);
  fs.copyFileSync(fixtureImage, localImage);

  let filter;
  globalThis.hexo = {
    source_dir: sourceDir,
    extend: {
      filter: {
        register(_name, callback) {
          filter = callback;
        },
      },
    },
  };

  const originalReadFileSync = fs.readFileSync;
  let outsideRead = false;
  fs.readFileSync = function checkedRead(filePath, ...args) {
    if (typeof filePath === "string" && path.resolve(filePath) === outsideImage) {
      outsideRead = true;
    }
    return originalReadFileSync.call(this, filePath, ...args);
  };

  try {
    const require = createRequire(import.meta.url);
    delete require.cache[require.resolve(mediaFilterSource)];
    require(mediaFilterSource);
    assert.equal(typeof filter, "function");

    const absoluteParts = outsideImage
      .split(path.sep)
      .filter(Boolean)
      .map(encodeURIComponent);
    const traversal = [
      ...Array.from({ length: 64 }, () => "%2e%2e"),
      ...absoluteParts,
    ].join("/");
    const unsafeTag = `<img src="/images/${traversal}" alt="probe">`;
    const unsafeOutput = filter(unsafeTag);
    assert.equal(outsideRead, false);
    assert.match(unsafeOutput, new RegExp(`src="/images/${traversal}"`));
    assert.doesNotMatch(unsafeOutput, /\bsrcset=/);

    const safeOutput = filter('<img src="/images/local.jpg" alt="local">');
    assert.match(safeOutput, /loading="lazy"/);
    assert.match(safeOutput, /decoding="async"/);
  } finally {
    fs.readFileSync = originalReadFileSync;
    delete globalThis.hexo;
  }
}

try {
  checkSymlinkedIndexIsRejected();
  console.log("PASS symlinked pending index is rejected");
  checkDotSlugCannotOverwriteSiblingImage();
  console.log("PASS dot slug stays inside the per-post image root");
  checkDestinationSymlinkCannotEscape();
  console.log("PASS destination symlink cannot escape the image root");
  checkMediaFilterContainsDecodedPaths();
  console.log("PASS decoded image paths stay inside the canonical image root");
} finally {
  for (const sandbox of sandboxes) {
    fs.rmSync(sandbox, { recursive: true, force: true });
  }
}
