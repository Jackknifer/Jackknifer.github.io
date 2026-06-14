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

文章会生成在 `source/_posts` 目录。文章日期可以在 Front Matter 里的 `date` 字段手动填写，适合补发旧文。提交并推送到 `main` 后，GitHub Actions 会自动构建并发布到 GitHub Pages。

## 批量导入待上传文章

把待发布 Markdown 放到 `pending-posts`，图片和文章放在同一个文章文件夹里，然后运行：

```bash
npm run import:pending
```

脚本会把文章导入 `source/_posts`，把图片导入 `source/images/posts`，并自动改正文里的相对图片路径。
