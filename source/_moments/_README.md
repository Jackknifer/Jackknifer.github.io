# 动态发布说明

每条动态都是 `source/_moments/` 目录中的一个 Markdown 文件。运行下面的命令可以创建新文件：

```bash
npm run new:moment -- "动态的简短名称"
```

正文直接写在 Front Matter 下方。`type` 可使用 `text`、`photo`、`link` 或 `music`；不填写时会根据附件自动判断。

## 发布照片

先把图片放到 `source/images/moments/`，再在动态文件中加入：

```yaml
images:
  - src: /images/moments/第一张.jpg
    alt: 第一张照片的说明
  - src: /images/moments/第二张.jpg
    alt: 第二张照片的说明
```

最多显示九张照片。

## 分享链接

只添加一个网页地址即可：

```yaml
link: https://example.com
```

页面会显示真实域名并链接到原网页。如果希望补充标题、简介或封面，也可以使用完整格式：

```yaml
link:
  url: https://example.com
  title: 链接标题
  description: 一句话介绍
  image: /images/moments/链接封面.jpg
```

## 分享音乐

只添加音乐网页地址即可：

```yaml
music: https://music.163.com/song?id=123456
```

页面会准确显示为音乐链接和对应平台域名，不会猜测歌曲名或封面。若需要展示歌曲名、歌手和封面，可使用完整格式：

```yaml
music:
  title: 歌曲名
  artist: 歌手
  url: https://music.163.com/song?id=123456
  cover: /images/moments/音乐封面.jpg
```

本地音频放在 `source/media/` 后，也可以直接写：

```yaml
music: /media/歌曲.mp3
```

以 `.mp3`、`.m4a`、`.ogg`、`.wav`、`.flac` 或 `.aac` 结尾的地址会自动显示播放控件。
