"use strict";

const fs = require("node:fs");
const path = require("node:path");

const HOME_MARKER = '<div class="home-content-container';
const POST_MARKER = '<div class="post-page-container';

const ICONS = {
  back:
    '<path d="M19 20 9 12l10-8v16Z"></path><path d="M5 19V5"></path>',
  forward:
    '<path d="m5 4 10 8-10 8V4Z"></path><path d="M19 5v14"></path>',
  play: '<path d="m8 5 11 7-11 7V5Z"></path>',
  repeat:
    '<path d="m17 1 4 4-4 4"></path><path d="M3 11V9a4 4 0 0 1 4-4h14"></path><path d="m7 23-4-4 4-4"></path><path d="M21 13v2a4 4 0 0 1-4 4H3"></path>',
  volume:
    '<path d="M11 5 6 9H2v6h4l5 4V5Z"></path><path d="M15.5 8.5a5 5 0 0 1 0 7"></path><path d="M19 5a10 10 0 0 1 0 14"></path>',
  location:
    '<path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"></path><circle cx="12" cy="10" r="2.5"></circle>',
  refresh:
    '<path d="M20 7v5h-5"></path><path d="M4 17v-5h5"></path><path d="M6.1 8A7 7 0 0 1 19 12"></path><path d="M17.9 16A7 7 0 0 1 5 12"></path>',
};

const NAV_ICONS = {
  "fa-house":
    '<path d="m3 11 9-7 9 7"></path><path d="M5 10v10h14V10"></path><path d="M9 20v-6h6v6"></path>',
  "fa-pen-to-square":
    '<path d="M12 20H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7"></path><path d="m16 3 5 5-9 9-5 1 1-5 8-10Z"></path>',
  "fa-comment-dots":
    '<path d="M21 15a4 4 0 0 1-4 4H8l-5 3 1.5-5A8 8 0 1 1 21 15Z"></path><path d="M8 12h.01M12 12h.01M16 12h.01"></path>',
  "fa-archive":
    '<path d="M3 4h18v4H3z"></path><path d="M5 8v12h14V8"></path><path d="M9 12h6"></path>',
  "fa-tags":
    '<path d="M20 13 11 4H4v7l9 9 7-7Z"></path><circle cx="7.5" cy="7.5" r="1"></circle>',
  "fa-folder":
    '<path d="M3 6h7l2 2h9v11H3V6Z"></path>',
  "fa-user":
    '<circle cx="12" cy="8" r="4"></circle><path d="M4 21a8 8 0 0 1 16 0"></path>',
};

function svgIcon(paths, className = "blog-inline-icon") {
  return `<svg class="${className}" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
}

function socialSvg(fileName) {
  const filePath = path.join(hexo.source_dir, "images", "social", fileName);
  if (!fs.existsSync(filePath)) return "";
  return fs
    .readFileSync(filePath, "utf8")
    .replace(/<\?xml[^>]*>/gi, "")
    .replace(/<!doctype[^>]*>/gi, "")
    .replace("<svg", '<svg aria-hidden="true" focusable="false"');
}

function nativeAudio() {
  return `
    <audio class="blog-player-native-fallback" controls preload="none" src="/media/rainy-night.mp3">
      当前浏览器不支持音频播放。
    </audio>`;
}

function playerMarkup(kind) {
  return `
    <section class="blog-player-surface blog-music-card blog-widget" data-player-surface="${kind}" aria-label="音乐播放器">
      <div class="blog-music-card-heading">
        <div class="blog-player-cover" aria-hidden="true">
          <img src="/media/rainy-night-cover.jpg" alt="" loading="lazy" decoding="async">
          <span class="blog-player-cover-center"></span>
        </div>
        <div class="blog-music-card-copy">
          <span class="blog-widget-kicker">LOCAL MUSIC</span>
          <h2>雨夜</h2>
          <p>刘森</p>
        </div>
      </div>
      <p class="blog-player-lyric" data-player-lyric>点击播放，听一场雨夜</p>
      <div class="blog-player-timeline">
        <span data-player-current>00:00</span>
        <input data-player-seek type="range" min="0" max="100" value="0" aria-label="播放进度">
        <span data-player-duration>00:00</span>
      </div>
      <div class="blog-player-controls">
        <button class="blog-player-button blog-player-button-quiet" type="button" data-player-action="back" aria-label="后退 15 秒">${svgIcon(ICONS.back)}</button>
        <button class="blog-player-button blog-player-button-primary" type="button" data-player-action="toggle" aria-label="播放">${svgIcon(ICONS.play, "blog-inline-icon blog-player-toggle-icon")}</button>
        <button class="blog-player-button blog-player-button-quiet" type="button" data-player-action="forward" aria-label="快进 15 秒">${svgIcon(ICONS.forward)}</button>
        <button class="blog-player-button blog-player-button-quiet" type="button" data-player-action="mute" aria-label="静音" aria-pressed="false">${svgIcon(ICONS.volume, "blog-inline-icon blog-player-volume-icon")}</button>
      </div>
      ${nativeAudio()}
    </section>`;
}

function weatherMarkup() {
  const hours = [0, 1, 2, 3]
    .map(
      (index) => `
        <div class="blog-weather-hour" data-weather-hour="${index}">
          <span data-weather-hour-time>--时</span>
          <span class="blog-weather-symbol blog-weather-symbol-small" data-weather-hour-icon aria-hidden="true">☁</span>
          <strong><span data-weather-hour-temp>--</span>°</strong>
          <small><span data-weather-hour-rain>--</span>%</small>
        </div>`,
    )
    .join("");

  return `
    <section class="blog-weather-card blog-widget is-static-fallback" data-weather-widget aria-label="访客所在地天气" aria-live="polite">
      <div class="blog-weather-heading">
        <div class="blog-weather-location">
          ${svgIcon(ICONS.location)}
          <strong data-weather-city>访客所在地</strong>
        </div>
        <button type="button" class="blog-weather-mode" data-weather-action="retry" title="重新获取网络位置">
          <span data-weather-mode>网络天气</span>
          ${svgIcon(ICONS.refresh)}
        </button>
      </div>
      <div class="blog-weather-current">
        <div>
          <div class="blog-weather-temperature"><span data-weather-temperature>--</span><sup>°</sup></div>
          <p data-weather-text>天气服务准备中</p>
          <small>最高 <span data-weather-high>--</span>° · 最低 <span data-weather-low>--</span>°</small>
        </div>
        <div class="blog-weather-main-icon" aria-hidden="true">
          <span class="blog-weather-symbol" data-weather-icon>☁</span>
        </div>
      </div>
      <div class="blog-weather-hourly" data-weather-hourly>${hours}</div>
      <div class="blog-weather-details">
        <div><span aria-hidden="true">体感</span><strong><span data-weather-feels>--</span>°</strong></div>
        <div><span aria-hidden="true">湿度</span><strong><span data-weather-humidity>--</span>%</strong></div>
        <div><span aria-hidden="true">风速</span><strong><span data-weather-wind>--</span> km/h</strong></div>
      </div>
      <p class="blog-weather-status" data-weather-status>若长时间没有更新，可点击右上角重试。</p>
    </section>`;
}

function socialMarkup() {
  return `
    <nav class="blog-sidebar-socials" aria-label="外部账号">
      <a class="blog-social-link github" href="https://github.com/Jackknifer" target="_blank" rel="noopener noreferrer" aria-label="GitHub" title="GitHub">${socialSvg("github.svg")}</a>
      <a class="blog-social-link xiaohongshu" href="https://xhslink.com/m/6yTZyG00OB4" target="_blank" rel="noopener noreferrer" aria-label="小红书" title="小红书">${socialSvg("xiaohongshu.svg")}</a>
      <a class="blog-social-link netease" href="https://y.music.163.com/m/user?id=7896322526" target="_blank" rel="noopener noreferrer" aria-label="网易云音乐" title="网易云音乐">${socialSvg("netease-cloud-music.svg")}</a>
    </nav>`;
}

function appendInsideElement(html, openingMarker, fragment) {
  const start = html.indexOf(openingMarker);
  if (start < 0) return html;

  const tagPattern = /<\/?div\b[^>]*>/gi;
  tagPattern.lastIndex = start;
  let depth = 0;
  let match;

  while ((match = tagPattern.exec(html))) {
    if (match[0].startsWith("</")) {
      depth -= 1;
      if (depth === 0) {
        return `${html.slice(0, match.index)}${fragment}${html.slice(match.index)}`;
      }
    } else {
      depth += 1;
    }
  }

  return html;
}

function replaceNavigationIcons(html) {
  return html.replace(
    /<i class="([^"]*\bfa-regular\s+(fa-(?:house|pen-to-square|comment-dots|archive|tags|folder|user))\b[^"]*)"><\/i>/g,
    (_match, classes, iconClass) => {
      const remainingClasses = classes
        .split(/\s+/)
        .filter((className) => className !== "fa-regular" && className !== iconClass)
        .join(" ");
      return svgIcon(
        NAV_ICONS[iconClass],
        `blog-inline-icon${remainingClasses ? ` ${remainingClasses}` : ""}`,
      );
    },
  );
}

function normalizeCategoryCards(html) {
  if (!html.includes('class="category-list-content"')) return html;

  return html.replace(
    /(<a class="all-category-list-link" href="[^"]+">)([\s\S]*?)(<\/a>)(<span class="all-category-list-count">[\s\S]*?<\/span>)/g,
    '$1<span class="all-category-list-label">$2</span>$4$3',
  );
}

function normalizeArticleIndexes(html) {
  let output = html
    .replace('class="tag-post-list"', 'class="tag-post-list blog-index-list"')
    .replace(
      'class="category-post-list"',
      'class="category-post-list blog-index-list"',
    )
    .replace(
      'class="archive-container ',
      'class="archive-container blog-index-list ',
    );

  if (
    output.includes('class="archive-container blog-index-list ') &&
    !output.includes('class="archive-page-title"')
  ) {
    output = output.replace(
      /(<div class="archive-container blog-index-list [^"]*">)/,
      '$1\n<h1 class="page-title-header archive-page-title">归档</h1>',
    );
  }

  return output;
}

hexo.extend.filter.register("after_render:html", (html) => {
  let output = normalizeArticleIndexes(
    normalizeCategoryCards(replaceNavigationIcons(html)),
  );

  if (output.includes(HOME_MARKER)) {
    if (!output.includes('class="blog-sidebar-socials"')) {
      output = appendInsideElement(
        output,
        '<div class="sidebar-content">',
        socialMarkup(),
      );
    }
    if (!output.includes('class="blog-home-widgets"')) {
      output = appendInsideElement(
        output,
        '<div class="main-content-body',
        `<aside class="blog-home-widgets" aria-label="音乐与天气">${playerMarkup("home")}${weatherMarkup()}</aside>`,
      );
    }
  }

  if (
    output.includes(POST_MARKER) &&
    !output.includes('class="blog-post-player-section"')
  ) {
    output = appendInsideElement(
      output,
      '<div class="article-content-container',
      `<aside class="blog-post-player-section" aria-label="文章页音乐播放器">${playerMarkup("post")}</aside>`,
    );
  }

  return output;
});
