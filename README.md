# Jackknifer.github.io

Jackknifer 的 GitHub Pages 个人博客，基于 Hexo 和 Theme Redefine。

详细使用说明见 [BLOG_GUIDE.md](./BLOG_GUIDE.md)。

## 本地预览

```bash
npm install
npm run server
```

## 写新文章

```bash
npm run new:post -- "文章标题"
```

文章会生成在 `source/_posts` 目录。这个目录就是已发布文章的正式管理区，会同步到 GitHub；以后要修改已发布文章，直接改这里的 Markdown 再提交即可。文章日期可以在 Front Matter 里的 `date` 字段手动填写，适合补发旧文。提交并推送到 `main` 后，GitHub Actions 会自动构建并发布到 GitHub Pages。

## 批量导入待上传文章

把待发布 Markdown 放到 `pending-posts`，图片和文章放在同一个文章文件夹里。`pending-posts` 只作为本地收件箱，实际文章默认不会同步到 GitHub。导入前先检查：

```bash
npm run import:pending:dry
```

确认没问题后正式导入：

```bash
npm run import:pending
```

脚本会把文章导入 `source/_posts`，把图片导入 `source/images/posts`，并自动改正文里的相对图片路径。以后如果在 `pending-posts` 里修改同一篇文章并想覆盖正式文章，可以运行 `npm run import:pending:force`。
