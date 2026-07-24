const fs = require("node:fs");
const path = require("node:path");
const frontMatter = require("hexo-front-matter");

const MOMENT_TYPES = {
  text: { label: "文字", icon: "fa-regular fa-message" },
  photo: { label: "照片", icon: "fa-regular fa-images" },
  link: { label: "分享", icon: "fa-regular fa-link" },
  music: { label: "音乐", icon: "fa-regular fa-music" },
};

const netEaseMetadataCache = new Map();
let staticNetEaseMetadata;

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function normalizeTags(value) {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (value == null || value === "") return [];
  return [String(value)];
}

function normalizeObject(value) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
}

function safeUrl(value) {
  const url = String(value || "").trim();
  if (!url) return "";
  if (
    url.startsWith("/") ||
    url.startsWith("./") ||
    url.startsWith("../") ||
    url.startsWith("#")
  ) {
    return url;
  }

  try {
    const parsed = new URL(url);
    return ["http:", "https:"].includes(parsed.protocol) ? url : "";
  } catch {
    return "";
  }
}

function linkAttributes(url) {
  return /^https?:\/\//i.test(url)
    ? ' target="_blank" rel="noopener noreferrer"'
    : "";
}

function displayHost(url) {
  if (!/^https?:\/\//i.test(url)) return "本站内容";
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "分享链接";
  }
}

function normalizeImages(value) {
  const values = Array.isArray(value) ? value : value ? [value] : [];
  return values
    .map((item, index) => {
      if (typeof item === "string") {
        const src = safeUrl(item);
        return src ? { src, alt: `动态照片 ${index + 1}` } : null;
      }

      const image = normalizeObject(item);
      const src = safeUrl(image.src || image.url);
      if (!src) return null;
      return {
        src,
        alt: String(image.alt || `动态照片 ${index + 1}`),
      };
    })
    .filter(Boolean)
    .slice(0, 9);
}

function normalizeShare(value) {
  if (!value) return null;
  const share =
    typeof value === "string" ? { url: value } : normalizeObject(value);
  const url = safeUrl(share.url);
  if (!url) return null;
  return {
    url,
    title: String(share.title || displayHost(url)),
    description: String(share.description || ""),
    image: safeUrl(share.image),
  };
}

function isAudioSource(url) {
  return /\.(?:mp3|m4a|ogg|wav|flac|aac)(?:$|[?#])/i.test(url);
}

function netEaseSongId(value) {
  try {
    const parsed = new URL(String(value || ""));
    const hostname = parsed.hostname.toLowerCase();
    if (!["music.163.com", "y.music.163.com"].includes(hostname)) return "";
    const songId = parsed.searchParams.get("id") || "";
    return /^\d+$/.test(songId) ? songId : "";
  } catch {
    return "";
  }
}

function httpsUrl(value) {
  const url = safeUrl(value);
  return url.startsWith("http://") ? `https://${url.slice(7)}` : url;
}

function loadStaticNetEaseMetadata() {
  if (staticNetEaseMetadata) return staticNetEaseMetadata;

  staticNetEaseMetadata = new Map();
  const metadataPath = path.join(
    hexo.source_dir,
    "_data",
    "netease-songs.json",
  );
  if (!fs.existsSync(metadataPath)) return staticNetEaseMetadata;

  try {
    const entries = JSON.parse(fs.readFileSync(metadataPath, "utf8"));
    Object.entries(entries).forEach(([songId, song]) => {
      if (!/^\d+$/.test(songId) || !song || typeof song !== "object") return;
      staticNetEaseMetadata.set(songId, {
        title: String(song.title || ""),
        artist: String(song.artist || ""),
        cover: httpsUrl(song.cover),
      });
    });
  } catch (error) {
    hexo.log.warn(`[moments] 本地网易云歌曲资料读取失败：${error.message}`);
  }

  return staticNetEaseMetadata;
}

function normalizeMusic(value) {
  if (!value) return null;
  const isShorthand = typeof value === "string";
  const music = isShorthand ? { url: value } : normalizeObject(value);
  const explicitAudio = safeUrl(music.audio || music.src);
  const explicitUrl = safeUrl(music.url);
  const neteaseId = netEaseSongId(explicitUrl);
  const audio =
    explicitAudio || (isAudioSource(explicitUrl) ? explicitUrl : "");
  const url = neteaseId
    ? `https://music.163.com/song?id=${neteaseId}`
    : explicitUrl || audio;
  if (!audio && !url) return null;
  return {
    title: String(
      music.title ||
        (neteaseId
          ? "网易云音乐"
          : audio && isShorthand
            ? "音频分享"
            : "音乐链接"),
    ),
    artist: String(
      music.artist ||
        (neteaseId ? "点击查看歌曲" : isShorthand ? displayHost(url) : ""),
    ),
    cover: httpsUrl(music.cover),
    audio,
    url,
    neteaseId,
    provider: neteaseId ? "网易云音乐" : audio ? "音频分享" : "分享音乐",
    hasExplicitTitle: Boolean(music.title),
    hasExplicitArtist: Boolean(music.artist),
    hasExplicitCover: Boolean(music.cover),
  };
}

async function fetchNetEaseMetadata(songId) {
  const staticMetadata = loadStaticNetEaseMetadata().get(songId);
  if (staticMetadata) return staticMetadata;

  if (netEaseMetadataCache.has(songId)) {
    return netEaseMetadataCache.get(songId);
  }

  const metadataRequest = (async () => {
    try {
      const endpoint = `https://music.163.com/api/song/detail/?id=${songId}&ids=%5B${songId}%5D`;
      const response = await fetch(endpoint, {
        headers: {
          Accept: "application/json",
          "User-Agent":
            "Mozilla/5.0 (compatible; JackkniferBlog/1.0; +https://jackknifer.github.io/)",
        },
        signal: AbortSignal.timeout(4500),
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const payload = await response.json();
      const song = Array.isArray(payload?.songs) ? payload.songs[0] : null;
      if (!song || String(song.id) !== songId) {
        throw new Error("歌曲元数据为空");
      }

      const artists = Array.isArray(song.artists)
        ? song.artists.map((artist) => artist?.name).filter(Boolean)
        : [];
      return {
        title: String(song.name || ""),
        artist: artists.join(" / "),
        cover: httpsUrl(song.album?.picUrl),
      };
    } catch (error) {
      hexo.log.warn(
        `[moments] 网易云歌曲 ${songId} 元数据读取失败，已使用链接回退：${error.message}`,
      );
      return null;
    }
  })();

  netEaseMetadataCache.set(songId, metadataRequest);
  return metadataRequest;
}

async function enrichMusic(music) {
  if (!music?.neteaseId) return music;

  const metadata =
    music.hasExplicitTitle &&
    music.hasExplicitArtist &&
    music.hasExplicitCover
      ? null
      : await fetchNetEaseMetadata(music.neteaseId);

  return {
    ...music,
    title:
      music.hasExplicitTitle || !metadata?.title
        ? music.title
        : metadata.title,
    artist:
      music.hasExplicitArtist || !metadata?.artist
        ? music.artist
        : metadata.artist,
    cover:
      music.hasExplicitCover || !metadata?.cover
        ? music.cover
        : metadata.cover,
    audio:
      music.audio ||
      `https://music.163.com/song/media/outer/url?id=${music.neteaseId}.mp3`,
  };
}

function dateParts(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const year = String(value.getFullYear());
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    const hour = String(value.getHours()).padStart(2, "0");
    const minute = String(value.getMinutes()).padStart(2, "0");
    return {
      date: `${year}-${month}-${day}`,
      time: `${hour}:${minute}`,
      month: `${year}-${month}`,
      timestamp: value.getTime(),
    };
  }

  const rawValue = String(value || "");
  const directMatch = rawValue.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2})(?::(\d{2}))?)?/,
  );
  if (directMatch) {
    const [, year, month, day, hour = "00", minute = "00", second = "00"] =
      directMatch;
    return {
      date: `${year}-${month}-${day}`,
      time: `${hour}:${minute}`,
      month: `${year}-${month}`,
      timestamp: Date.parse(
        `${year}-${month}-${day}T${hour}:${minute}:${second}+08:00`,
      ),
    };
  }

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) return null;

  const year = String(parsedDate.getFullYear());
  const month = String(parsedDate.getMonth() + 1).padStart(2, "0");
  const day = String(parsedDate.getDate()).padStart(2, "0");
  const hour = String(parsedDate.getHours()).padStart(2, "0");
  const minute = String(parsedDate.getMinutes()).padStart(2, "0");
  return {
    date: `${year}-${month}-${day}`,
    time: `${hour}:${minute}`,
    month: `${year}-${month}`,
    timestamp: parsedDate.getTime(),
  };
}

function monthLabel(month) {
  const [year, number] = month.split("-");
  return `${year.slice(-2)}年${Number(number)}月`;
}

function renderGallery(images) {
  if (!images.length) return "";
  return `
    <div class="moment-gallery" data-image-count="${images.length}">
      ${images
        .map(
          (image) => `
            <figure class="moment-photo">
              <img src="${escapeHtml(image.src)}" alt="${escapeHtml(image.alt)}" loading="lazy" decoding="async">
            </figure>
          `,
        )
        .join("")}
    </div>
  `;
}

function renderShareCard(share) {
  if (!share) return "";
  return `
    <a class="moment-share-card" href="${escapeHtml(share.url)}"${linkAttributes(share.url)}>
      ${
        share.image
          ? `<span class="moment-share-cover" aria-hidden="true" style="background-image:url('${escapeHtml(share.image)}')"></span>`
          : '<span class="moment-attachment-icon" aria-hidden="true"><i class="fa-regular fa-link"></i></span>'
      }
      <span class="moment-attachment-copy">
        <small>${escapeHtml(displayHost(share.url))}</small>
        <strong>${escapeHtml(share.title)}</strong>
        ${share.description ? `<span>${escapeHtml(share.description)}</span>` : ""}
      </span>
      <i class="fa-regular fa-arrow-up-right-from-square moment-attachment-open" aria-hidden="true"></i>
    </a>
  `;
}

function renderMusicCard(music) {
  if (!music) return "";
  return `
    <div class="moment-music-card" data-moment-music data-provider="${escapeHtml(music.provider)}">
      <div class="moment-music-main">
        <span class="moment-music-cover"${music.cover ? ` style="background-image:url('${escapeHtml(music.cover)}')"` : ""}>
          ${
            music.cover
              ? ""
              : '<span class="moment-attachment-icon" aria-hidden="true"><i class="fa-regular fa-music"></i></span>'
          }
          ${
            music.audio
              ? `<button class="moment-music-toggle" type="button" data-moment-music-toggle aria-label="播放 ${escapeHtml(music.title)}" aria-pressed="false"><i class="fa-solid fa-play" aria-hidden="true"></i></button>`
              : ""
          }
        </span>
        <span class="moment-attachment-copy">
          <strong>${escapeHtml(music.title)}</strong>
          ${music.artist ? `<span>${escapeHtml(music.artist)}</span>` : ""}
        </span>
        ${
          music.url
            ? `<a class="moment-music-open" href="${escapeHtml(music.url)}"${linkAttributes(music.url)} aria-label="打开音乐 ${escapeHtml(music.title)}"><i class="fa-regular fa-arrow-up-right-from-square" aria-hidden="true"></i></a>`
            : ""
        }
      </div>
      ${
        music.audio
          ? `<audio class="moment-audio" data-moment-audio preload="none" src="${escapeHtml(music.audio)}">当前浏览器不支持音频播放。</audio>`
          : ""
      }
    </div>
  `;
}

async function renderMomentsPage() {
  const momentsDirectory = path.join(hexo.source_dir, "_moments");
  const defaultAvatar =
    safeUrl(hexo.theme?.config?.defaults?.avatar) ||
    "https://avatars.githubusercontent.com/u/130291261?v=4";
  const files = fs.existsSync(momentsDirectory)
    ? fs
        .readdirSync(momentsDirectory, { withFileTypes: true })
        .filter(
          (entry) =>
            entry.isFile() &&
            entry.name.endsWith(".md") &&
            !entry.name.startsWith("_"),
        )
        .map((entry) => entry.name)
    : [];

  const moments = (
    await Promise.all(
      files.map(async (fileName) => {
        const filePath = path.join(momentsDirectory, fileName);
        const parsed = frontMatter.parse(fs.readFileSync(filePath, "utf8"));
        const normalizedDate = dateParts(parsed.date);
        if (!normalizedDate) {
          hexo.log.warn(`[moments] Skip ${fileName}: missing or invalid date.`);
          return null;
        }

        const images = normalizeImages(parsed.images);
        const share = normalizeShare(parsed.link);
        const music = normalizeMusic(parsed.music);
        const inferredType = music
          ? "music"
          : images.length
            ? "photo"
            : share
              ? "link"
              : "text";
        const type = MOMENT_TYPES[parsed.type] ? parsed.type : inferredType;

        return {
          fileName,
          ...normalizedDate,
          type,
          tags: normalizeTags(parsed.tags),
          author: String(parsed.author || hexo.config.author || "Jackknifer"),
          avatar: safeUrl(parsed.avatar) || defaultAvatar,
          location: String(parsed.location || ""),
          images,
          share,
          music: await enrichMusic(music),
          html: hexo.render.renderSync({
            text: parsed._content || "",
            engine: "markdown",
          }),
        };
      }),
    )
  )
    .filter(Boolean)
    .sort(
      (left, right) =>
        right.timestamp - left.timestamp ||
        right.fileName.localeCompare(left.fileName, "zh-CN"),
    );

  const months = [...new Set(moments.map((moment) => moment.month))];
  const filters = [
    '<button class="moments-filter is-active" type="button" data-moments-filter="all" aria-pressed="true">全部</button>',
    ...months.map(
      (month) =>
        `<button class="moments-filter" type="button" data-moments-filter="${escapeHtml(month)}" aria-pressed="false">${escapeHtml(monthLabel(month))}</button>`,
    ),
  ].join("");

  const renderMomentCard = (moment) => {
    const location = moment.location
      ? `<span class="moment-location"><i class="fa-regular fa-location-dot" aria-hidden="true"></i>${escapeHtml(moment.location)}</span>`
      : "";

    return `
      <article class="moment-card" data-moment-card data-moment-month="${escapeHtml(moment.month)}" data-moment-type="${escapeHtml(moment.type)}">
        <span class="moment-avatar" aria-hidden="true">
          <img src="${escapeHtml(moment.avatar)}" alt="" width="46" height="46" decoding="async" referrerpolicy="no-referrer">
        </span>
        <div class="moment-content">
          <header class="moment-header">
            <strong class="moment-author">${escapeHtml(moment.author)}</strong>
            <div class="moment-meta">
              <time class="moment-date" datetime="${escapeHtml(moment.date)}">${escapeHtml(moment.date)}</time>
              ${location}
            </div>
          </header>
          <div class="moment-body">${moment.html}</div>
          ${renderGallery(moment.images)}
          ${renderShareCard(moment.share)}
          ${renderMusicCard(moment.music)}
        </div>
      </article>
    `;
  };

  const days = [];
  moments.forEach((moment) => {
    const currentDay = days.at(-1);
    if (!currentDay || currentDay.date !== moment.date) {
      days.push({ date: moment.date, moments: [moment] });
    } else {
      currentDay.moments.push(moment);
    }
  });

  const dayGroups = days
    .map(
      (day) => `
        <section class="moment-day" data-moment-day aria-label="${escapeHtml(day.date)}">
          <div class="moment-day-list">
            ${day.moments.map(renderMomentCard).join("")}
          </div>
        </section>
      `,
    )
    .join("");

  return `
    <section class="moments-page" data-moments-page>
      <p class="moments-lead">像空间动态一样，记录文字、照片、链接和正在听的音乐。</p>
      <div class="moments-toolbar">
        <label class="moments-search">
          <i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i>
          <input type="search" data-moments-search aria-label="搜索动态" placeholder="搜索动态内容…" autocomplete="off">
        </label>
        <div class="moments-filters" aria-label="按月份筛选">${filters}</div>
      </div>
      <p class="moments-summary">当前显示 <span data-moments-count>${moments.length}</span> 条动态</p>
      <div class="moments-feed">${dayGroups}</div>
      <div class="moments-empty" data-moments-empty hidden>没有找到相关动态，换一个关键词或月份试试。</div>
    </section>
  `;
}

hexo.extend.tag.register("moments", renderMomentsPage, { async: true });
