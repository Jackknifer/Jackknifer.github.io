import { build } from "esbuild";

await build({
  entryPoints: ["client/blog-experience.js"],
  outfile: "source/js/blog-experience.js",
  bundle: false,
  minify: true,
  legalComments: "none",
  target: ["chrome61", "edge16", "safari11"],
  charset: "utf8",
});
