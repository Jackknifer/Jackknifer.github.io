# 待上传文章收件箱

这里放准备导入博客的原始文章。实际文章默认被 `.gitignore` 忽略，不会被误提交到公开仓库。

推荐每篇文章一个文件夹：

```text
pending-posts/
  my-old-post/
    index.md
    cover.jpg
    images/
      photo-1.jpg
      chart.png
```

也支持单个 Markdown 文件：

```text
pending-posts/
  my-old-post.md
  my-old-post.assets/
    photo-1.jpg
```

## Markdown 写法

文章顶部建议写 Front Matter：

```yaml
---
title: 文章标题
date: 2020-05-03 21:30:00
updated: 2026-06-15 10:00:00
tags:
  - 标签一
categories:
  - 分类名
description: 一句话摘要。
cover: ./cover.jpg
---
```

正文图片使用相对路径：

```markdown
![图片说明](./images/photo-1.jpg)
```

导入后脚本会自动把图片复制到：

```text
source/images/posts/<文章文件夹名>/
```

并把 Markdown 图片路径改成：

```markdown
![图片说明](/images/posts/<文章文件夹名>/images/photo-1.jpg)
```

## 导入命令

先预览导入结果：

```bash
npm run import:pending:dry
```

确认后正式导入：

```bash
npm run import:pending
```

导入后再运行：

```bash
npm run build
```

最后提交并推送：

```bash
git add source/_posts source/images/posts
git commit -m "Add post: 文章标题"
git push origin main
```

## 注意

- 文件夹名会作为文章文件名和 URL 的一部分，建议用简短英文、拼音或日期前缀，例如 `2020-trip-note`。
- 旧文章日期直接改 `date`，不要依赖导入当天时间。
- 图片文件名建议不要有空格；如果有空格，脚本会转换成短横线。
- 不要把隐私资料、密钥、身份证照片等放进这里；导入后的正式文章会发布到公开网站。
