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
