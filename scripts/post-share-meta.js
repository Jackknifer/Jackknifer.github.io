"use strict";

const MARKDOWN_IMAGE_PATTERN = /!\[[^\]]*]\(\s*(?:<([^>]+)>|([^\s)]+))(?:\s+["'][^"']*["'])?\s*\)/;

hexo.extend.filter.register("before_post_render", (data) => {
  if (data.layout !== "post" || data.og_image) {
    return data;
  }

  if (data.cover) {
    data.og_image = data.cover;
    return data;
  }

  const firstImage = String(data.content || "").match(MARKDOWN_IMAGE_PATTERN);
  const imagePath = firstImage?.[1] || firstImage?.[2];

  if (imagePath && !imagePath.startsWith("data:")) {
    data.og_image = imagePath;
  }

  return data;
});
