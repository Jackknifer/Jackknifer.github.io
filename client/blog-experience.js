(function () {
  if (!Element.prototype.matches) {
    Element.prototype.matches =
      Element.prototype.msMatchesSelector ||
      Element.prototype.webkitMatchesSelector;
  }
  if (!Element.prototype.closest) {
    Element.prototype.closest = function (selector) {
      let element = this;
      while (element && element.nodeType === 1) {
        if (element.matches(selector)) return element;
        element = element.parentElement;
      }
      return null;
    };
  }
  if (window.NodeList && !NodeList.prototype.forEach) {
    NodeList.prototype.forEach = Array.prototype.forEach;
  }
  if (!Array.prototype.includes) {
    Array.prototype.includes = function (value) {
      return this.indexOf(value) !== -1;
    };
  }
  if (!String.prototype.padStart) {
    String.prototype.padStart = function (length, fill) {
      let output = String(this);
      const padding = fill === undefined ? " " : String(fill);
      while (output.length < length) output = padding + output;
      return output.slice(-length);
    };
  }
  if (!window.requestAnimationFrame) {
    window.requestAnimationFrame = function (callback) {
      return window.setTimeout(callback, 16);
    };
    window.cancelAnimationFrame = window.clearTimeout;
  }

  const EXPERIENCE_KEY = "__jackkniferBlogExperience";
  const MUSIC = {
    title: "雨夜",
    artist: "刘森",
    audio: "/media/rainy-night.mp3",
    lyrics: "/media/rainy-night.lrc",
    cover: "/media/rainy-night-cover.jpg",
  };
  const DEFAULT_VOLUME = 0.35;
  const PLAYER_ICONS = {
    play: '<path d="m8 5 11 7-11 7V5Z"></path>',
    pause: '<path d="M9 5v14M15 5v14"></path>',
    volumeHigh:
      '<path d="M11 5 6 9H2v6h4l5 4V5Z"></path><path d="M15.5 8.5a5 5 0 0 1 0 7"></path><path d="M19 5a10 10 0 0 1 0 14"></path>',
    volumeLow:
      '<path d="M11 5 6 9H2v6h4l5 4V5Z"></path><path d="M15.5 8.5a5 5 0 0 1 0 7"></path>',
    volumeMuted:
      '<path d="M11 5 6 9H2v6h4l5 4V5Z"></path><path d="m16 9 5 5M21 9l-5 5"></path>',
  };

  if (window[EXPERIENCE_KEY]) {
    window[EXPERIENCE_KEY].syncPage();
    document.documentElement.classList.add("blog-experience-ready");
    return;
  }

  const state = {
    audio: null,
    root: null,
    sideToolsObserver: null,
    widgetAvoidanceObserver: null,
    momentRevealObserver: null,
    lyricLayoutFrame: null,
    lyrics: [],
    currentLyric: "点击播放，听一场雨夜",
    weather: {
      status: "idle",
      mode: "",
      message: "",
      data: null,
    },
  };
  const legacyFallback = {
    active: false,
    searchEntries: null,
    searchRequest: null,
    images: [],
    imageIndex: -1,
  };

  function escapeAttribute(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function formatTime(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) return "00:00";
    const minutes = Math.floor(seconds / 60);
    const remainder = Math.floor(seconds % 60);
    return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
  }

  function parseLyrics(rawLyrics) {
    if (!rawLyrics || rawLyrics.length > 30000) return [];

    const parsed = [];
    rawLyrics.split(/\r?\n/).forEach((line) => {
      const timestamps = [];
      const timestampPattern = /\[(\d{2,3}):(\d{2})(?:[.:](\d{1,3}))?\]/g;
      let timestampMatch;
      while ((timestampMatch = timestampPattern.exec(line))) {
        timestamps.push(timestampMatch);
      }
      if (!timestamps.length) return;

      const text = line
        .replace(/\[\d{2,3}:\d{2}(?:[.:]\d{1,3})?\]/g, "")
        .replace(/[\u0000-\u001F\u007F-\u009F\u200B-\u200D\uFEFF]/g, "")
        .trim();
      if (!text) return;

      timestamps.forEach((timestamp) => {
        const minute = Number.parseInt(timestamp[1], 10);
        const second = Number.parseInt(timestamp[2], 10);
        const fraction = timestamp[3] || "0";
        const divisor = 10 ** fraction.length;
        parsed.push({
          time: minute * 60 + second + Number.parseInt(fraction, 10) / divisor,
          text,
        });
      });
    });

    return parsed.sort((left, right) => left.time - right.time);
  }

  function inlineIcon(paths, className = "blog-inline-icon") {
    return `<svg class="${className}" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
  }

  function playerSurfaceMarkup(kind) {
    if (kind === "floating") {
      return `
        <aside class="blog-player-surface blog-floating-player" data-player-surface="floating" aria-label="正在播放">
          <div class="blog-player-cover blog-player-cover-compact" aria-hidden="true">
            <img src="${MUSIC.cover}" alt="">
            <span class="blog-player-cover-center"></span>
          </div>
          <div class="blog-floating-player-copy">
            <strong>${MUSIC.title}</strong>
            <div class="blog-floating-player-lyric" data-player-lyric-viewport>
              <span data-player-lyric data-player-lyric-track>${state.currentLyric}</span>
            </div>
            <div class="blog-floating-player-progress">
              <span data-player-current>00:00</span>
              <input data-player-seek type="range" min="0" max="100" value="0" aria-label="播放进度">
              <span data-player-duration>00:00</span>
            </div>
          </div>
          <button class="blog-player-button blog-player-button-quiet blog-player-button-compact" type="button" data-player-action="back" aria-label="后退 15 秒" title="后退 15 秒">
            ${inlineIcon('<path d="M19 20 9 12l10-8v16Z"></path><path d="M5 19V5"></path>')}
          </button>
          <button class="blog-player-button blog-player-button-primary blog-player-button-compact" type="button" data-player-action="toggle" aria-label="播放">
            ${inlineIcon(PLAYER_ICONS.play, "blog-inline-icon blog-player-toggle-icon")}
          </button>
          <button class="blog-player-button blog-player-button-quiet blog-player-button-compact" type="button" data-player-action="forward" aria-label="快进 15 秒" title="快进 15 秒">
            ${inlineIcon('<path d="m5 4 10 8-10 8V4Z"></path><path d="M19 5v14"></path>')}
          </button>
        </aside>
      `;
    }

    return `
      <section class="blog-player-surface blog-music-card blog-widget" data-player-surface="${kind}" aria-label="音乐播放器">
        <div class="blog-music-card-heading">
          <div class="blog-player-cover" aria-hidden="true">
            <img src="${MUSIC.cover}" alt="">
            <span class="blog-player-cover-center"></span>
          </div>
          <div class="blog-music-card-copy">
            <span class="blog-widget-kicker">LOCAL MUSIC</span>
            <h2>${MUSIC.title}</h2>
            <p>${MUSIC.artist}</p>
          </div>
        </div>
        <p class="blog-player-lyric" data-player-lyric>${state.currentLyric}</p>
        <div class="blog-player-timeline">
          <span data-player-current>00:00</span>
          <input data-player-seek type="range" min="0" max="100" value="0" aria-label="播放进度">
          <span data-player-duration>00:00</span>
        </div>
        <div class="blog-player-controls">
          <button class="blog-player-button blog-player-button-quiet" type="button" data-player-action="back" aria-label="后退 15 秒" title="后退 15 秒">
            ${inlineIcon('<path d="M19 20 9 12l10-8v16Z"></path><path d="M5 19V5"></path>')}
          </button>
          <button class="blog-player-button blog-player-button-primary" type="button" data-player-action="toggle" aria-label="播放">
            ${inlineIcon(PLAYER_ICONS.play, "blog-inline-icon blog-player-toggle-icon")}
          </button>
          <button class="blog-player-button blog-player-button-quiet" type="button" data-player-action="forward" aria-label="快进 15 秒" title="快进 15 秒">
            ${inlineIcon('<path d="m5 4 10 8-10 8V4Z"></path><path d="M19 5v14"></path>')}
          </button>
          <button class="blog-player-button blog-player-button-quiet" type="button" data-player-action="mute" aria-label="静音" title="静音">
            ${inlineIcon(PLAYER_ICONS.volumeHigh, "blog-inline-icon blog-player-volume-icon")}
          </button>
        </div>
      </section>
    `;
  }

  function weatherWidgetMarkup() {
    return `
      <section class="blog-weather-card blog-widget" data-weather-widget aria-label="访客所在地天气" aria-live="polite">
        <div class="blog-weather-heading">
          <div class="blog-weather-location">
            <span class="blog-weather-symbol blog-weather-symbol-small" aria-hidden="true">⌖</span>
            <strong data-weather-city>天气未启用</strong>
          </div>
          <button type="button" class="blog-weather-mode" data-weather-action="load" title="获取天气（将使用网络大致位置）">
            <span data-weather-mode>获取天气</span>
            <span class="blog-weather-symbol blog-weather-symbol-small" aria-hidden="true">↻</span>
          </button>
        </div>
        <div class="blog-weather-current">
          <div>
            <div class="blog-weather-temperature"><span data-weather-temperature>--</span><sup>°</sup></div>
            <p data-weather-text>点击右上角获取当地天气</p>
            <small>最高 <span data-weather-high>--</span>° · 最低 <span data-weather-low>--</span>°</small>
          </div>
          <div class="blog-weather-main-icon" aria-hidden="true">
            <span class="blog-weather-symbol" data-weather-icon>☁</span>
          </div>
        </div>
        <div class="blog-weather-hourly" data-weather-hourly>
          ${[0, 1, 2, 3]
            .map(
              (index) => `
                <div class="blog-weather-hour" data-weather-hour="${index}">
                  <span data-weather-hour-time>--时</span>
                  <span class="blog-weather-symbol blog-weather-symbol-small" data-weather-hour-icon aria-hidden="true">☁</span>
                  <strong><span data-weather-hour-temp>--</span>°</strong>
                  <small><span data-weather-hour-rain>--</span>%</small>
                </div>
              `,
            )
            .join("")}
        </div>
        <div class="blog-weather-details">
          <div>
            <span>体感</span>
            <strong><span data-weather-feels>--</span>°</strong>
          </div>
          <div>
            <span>湿度</span>
            <strong><span data-weather-humidity>--</span>%</strong>
          </div>
          <div>
            <span>风速</span>
            <strong><span data-weather-wind>--</span> km/h</strong>
          </div>
        </div>
        <p class="blog-weather-status" data-weather-status>
          点击后会通过第三方服务使用网络大致位置，不调用设备定位
        </p>
      </section>
    `;
  }

  function createGlobalPlayer() {
    const root = document.createElement("div");
    root.id = "blog-global-player";
    root.innerHTML = `
      <audio preload="none" playsinline>
        <source src="${escapeAttribute(MUSIC.audio)}" type="audio/mpeg">
      </audio>
      ${playerSurfaceMarkup("floating")}
    `;
    document.body.appendChild(root);

    state.root = root;
    state.audio = root.querySelector("audio");
    state.audio.loop = true;
    state.audio.volume = DEFAULT_VOLUME;

    state.audio.addEventListener("loadedmetadata", renderPlayer);
    state.audio.addEventListener("durationchange", renderPlayer);
    state.audio.addEventListener("timeupdate", () => {
      updateCurrentLyric();
      renderPlayer();
    });
    state.audio.addEventListener("play", renderPlayer);
    state.audio.addEventListener("pause", renderPlayer);
    state.audio.addEventListener("ended", renderPlayer);
    state.audio.addEventListener("error", () => {
      state.currentLyric = "播放加载失败，请点击重试";
      renderPlayer();
    });

    fetch(MUSIC.lyrics)
      .then((response) => {
        if (!response.ok) throw new Error("lyrics unavailable");
        return response.text();
      })
      .then((lyrics) => {
        state.lyrics = parseLyrics(lyrics);
        updateCurrentLyric();
        renderPlayer();
      })
      .catch(() => {
        state.currentLyric = "♪ 雨夜 · 刘森 ♪";
        renderPlayer();
      });
  }

  function updateCurrentLyric() {
    if (!state.audio || !state.lyrics.length) return;
    const currentTime = state.audio.currentTime;
    let activeLyric = state.lyrics[0]?.text || state.currentLyric;

    for (const lyric of state.lyrics) {
      if (currentTime < lyric.time) break;
      activeLyric = lyric.text;
    }

    state.currentLyric = activeLyric;
  }

  function syncFloatingLyricLayout() {
    document.querySelectorAll("[data-player-lyric-viewport]").forEach((viewport) => {
      const track = viewport.querySelector("[data-player-lyric-track]");
      if (!track || viewport.clientWidth === 0) return;

      const layoutKey = `${track.textContent}\u0000${viewport.clientWidth}`;
      if (viewport.dataset.lyricLayout === layoutKey) return;
      viewport.dataset.lyricLayout = layoutKey;

      viewport.classList.remove("is-scrolling");
      track.style.removeProperty("--lyric-scroll-distance");
      track.style.removeProperty("--lyric-scroll-duration");

      const overflow = Math.ceil(track.scrollWidth - viewport.clientWidth);
      const isOverflowing = overflow > 2;
      if (isOverflowing) {
        viewport.title = track.textContent;
        track.style.setProperty("--lyric-scroll-distance", `-${overflow}px`);
        track.style.setProperty(
          "--lyric-scroll-duration",
          `${Math.max(7, Math.min(14, overflow / 12 + 6))}s`,
        );
        viewport.classList.add("is-scrolling");
      } else {
        viewport.removeAttribute("title");
      }
    });
  }

  function queueFloatingLyricLayout() {
    window.cancelAnimationFrame(state.lyricLayoutFrame);
    state.lyricLayoutFrame = window.requestAnimationFrame(
      syncFloatingLyricLayout,
    );
  }

  function renderPlayer() {
    if (!state.audio) return;

    const duration = Number.isFinite(state.audio.duration) ? state.audio.duration : 0;
    const currentTime = state.audio.currentTime || 0;
    const progress = duration ? Math.min(100, (currentTime / duration) * 100) : 0;
    const isPlaying = !state.audio.paused;

    document.querySelectorAll("[data-player-surface]").forEach((surface) => {
      surface.classList.toggle("is-playing", isPlaying);
    });

    document.querySelectorAll("[data-player-current]").forEach((element) => {
      element.textContent = formatTime(currentTime);
    });
    document.querySelectorAll("[data-player-duration]").forEach((element) => {
      element.textContent = formatTime(duration);
    });
    document.querySelectorAll("[data-player-lyric]").forEach((element) => {
      if (element.textContent !== state.currentLyric) {
        element.textContent = state.currentLyric;
      }
    });
    queueFloatingLyricLayout();
    document.querySelectorAll("[data-player-seek]").forEach((element) => {
      element.value = String(progress);
      element.style.setProperty("--player-progress", `${progress}%`);
    });
    document.querySelectorAll(".blog-player-toggle-icon").forEach((element) => {
      element.innerHTML = isPlaying ? PLAYER_ICONS.pause : PLAYER_ICONS.play;
    });
    document.querySelectorAll('[data-player-action="toggle"]').forEach((button) => {
      button.setAttribute("aria-label", isPlaying ? "暂停" : "播放");
    });
    document.querySelectorAll(".blog-player-volume-icon").forEach((element) => {
      element.innerHTML = state.audio.muted
        ? PLAYER_ICONS.volumeMuted
        : state.audio.volume < 0.5
          ? PLAYER_ICONS.volumeLow
          : PLAYER_ICONS.volumeHigh;
    });
  }

  function handlePlayerAction(action) {
    if (!state.audio) return;

    if (action === "toggle") {
      if (state.audio.paused) {
        if (state.audio.error || state.audio.networkState === 3) {
          state.audio.load();
        }
        state.audio.play().catch(() => {
          state.currentLyric = "播放失败，请检查网络后重试";
          renderPlayer();
        });
      } else {
        state.audio.pause();
      }
    }

    if (action === "back") {
      state.audio.currentTime = Math.max(0, state.audio.currentTime - 15);
    }

    if (action === "forward") {
      const duration = Number.isFinite(state.audio.duration)
        ? state.audio.duration
        : state.audio.currentTime + 15;
      state.audio.currentTime = Math.min(duration, state.audio.currentTime + 15);
    }

    if (action === "mute") {
      state.audio.muted = !state.audio.muted;
    }

    renderPlayer();
  }

  function weatherDescription(code) {
    if (code === 0) return "晴";
    if ([1, 2].includes(code)) return "少云";
    if (code === 3) return "阴";
    if ([45, 48].includes(code)) return "雾";
    if (code >= 51 && code <= 57) return "毛毛雨";
    if (code >= 61 && code <= 67) return "雨";
    if (code >= 71 && code <= 77) return "雪";
    if (code >= 80 && code <= 82) return "阵雨";
    if (code >= 85 && code <= 86) return "阵雪";
    if (code >= 95) return "雷雨";
    return "多云";
  }

  function weatherIcon(code, isDay = 1) {
    if (code === 0) return isDay ? "☀" : "☾";
    if ([1, 2].includes(code)) return isDay ? "⛅" : "☁";
    if (code === 3) return "☁";
    if ([45, 48].includes(code)) return "≋";
    if (code >= 51 && code <= 67) return "☂";
    if (code >= 71 && code <= 77) return "❄";
    if (code >= 80 && code <= 82) return "☔";
    if (code >= 85 && code <= 86) return "❄";
    if (code >= 95) return "⚡";
    return "☁";
  }

  function setWeatherIcon(element, symbol, extraClass = "") {
    if (!element) return;
    element.className = `blog-weather-symbol${extraClass ? ` ${extraClass}` : ""}`;
    element.textContent = symbol;
  }

  async function fetchJson(url, timeout = 6000) {
    const controller =
      typeof window.AbortController === "function"
        ? new window.AbortController()
        : null;
    let timer;
    try {
      const options = {
        headers: { Accept: "application/json" },
      };
      if (controller) options.signal = controller.signal;
      const request = fetch(url, options);
      const timeoutRequest = new Promise((_resolve, reject) => {
        timer = window.setTimeout(() => {
          if (controller) controller.abort();
          reject(new Error("request timed out"));
        }, timeout);
      });
      const response = await Promise.race([request, timeoutRequest]);
      if (!response.ok) throw new Error(`request failed: ${response.status}`);
      return await response.json();
    } finally {
      window.clearTimeout(timer);
    }
  }

  function queryString(values) {
    return Object.keys(values)
      .filter((key) => values[key] !== undefined && values[key] !== null)
      .map(
        (key) =>
          `${encodeURIComponent(key)}=${encodeURIComponent(String(values[key]))}`,
      )
      .join("&");
  }

  async function reverseGeocode(latitude, longitude) {
    const params = { localityLanguage: "zh" };
    if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
      params.latitude = latitude;
      params.longitude = longitude;
    }
    return fetchJson(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?${queryString(params)}`,
    );
  }

  async function fetchWeather(latitude, longitude) {
    const params = {
      latitude: String(latitude),
      longitude: String(longitude),
      current:
        "temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,is_day,wind_speed_10m",
      hourly: "temperature_2m,weather_code,precipitation_probability",
      daily: "temperature_2m_max,temperature_2m_min",
      forecast_hours: "6",
      forecast_days: "1",
      timezone: "auto",
    };
    return fetchJson(
      `https://api.open-meteo.com/v1/forecast?${queryString(params)}`,
    );
  }

  function locationName(location) {
    return (
      location.city ||
      location.locality ||
      location.principalSubdivision ||
      location.countryName ||
      "访客所在地"
    );
  }

  async function loadWeatherForCoordinates(latitude, longitude, mode) {
    const settled = (promise) =>
      Promise.resolve(promise).then(
        (value) => ({ status: "fulfilled", value }),
        (reason) => ({ status: "rejected", reason }),
      );
    const weatherResults = await Promise.all([
      settled(fetchWeather(latitude, longitude)),
      settled(reverseGeocode(latitude, longitude)),
    ]);
    const weatherResult = weatherResults[0];
    const locationResult = weatherResults[1];

    if (weatherResult.status !== "fulfilled") {
      throw weatherResult.reason;
    }

    state.weather = {
      status: "ready",
      mode,
      message: "",
      data: {
        city:
          locationResult.status === "fulfilled"
            ? locationName(locationResult.value)
            : "访客所在地",
        forecast: weatherResult.value,
      },
    };
    renderWeather();
  }

  async function loadApproximateWeather() {
    const location = await reverseGeocode();
    const latitude = Number(location.latitude);
    const longitude = Number(location.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      throw new Error("approximate location unavailable");
    }
    await loadWeatherForCoordinates(latitude, longitude, "网络位置");
  }

  function requestWeather() {
    if (state.weather.status === "loading") {
      renderWeather();
      return;
    }

    state.weather = {
      status: "loading",
      mode: "网络定位",
      message: "正在根据网络信息获取大致位置",
      data: null,
    };
    renderWeather();

    loadApproximateWeather().catch(() => {
      state.weather = {
        status: "error",
        mode: "获取失败",
        message: "暂时无法通过网络信息获取当地天气，点击右上角重试。",
        data: null,
      };
      renderWeather();
    });
  }

  function renderWeather() {
    const widget = document.querySelector("[data-weather-widget]");
    if (!widget) return;

    const weatherState = state.weather;
    const status = widget.querySelector("[data-weather-status]");
    const city = widget.querySelector("[data-weather-city]");
    const mode = widget.querySelector("[data-weather-mode]");

    widget.classList.remove("is-static-fallback");
    widget.classList.toggle("is-loading", weatherState.status === "loading");
    widget.classList.toggle("has-error", weatherState.status === "error");

    if (weatherState.status !== "ready" || !weatherState.data) {
      const isIdle = weatherState.status === "idle";
      city.textContent = isIdle
        ? "天气未启用"
        : weatherState.status === "error"
          ? "天气不可用"
          : "正在获取网络位置";
      mode.textContent = isIdle ? "获取天气" : weatherState.mode || "网络定位";
      widget.querySelector("[data-weather-text]").textContent =
        isIdle
          ? "点击右上角获取当地天气"
          : weatherState.message || "正在同步当地天气";
      setWeatherIcon(
        widget.querySelector("[data-weather-icon]"),
        weatherState.status === "error" ? "↻" : "☁",
        weatherState.status === "loading" ? "is-pulsing" : "",
      );
      status.textContent = isIdle
        ? "点击后会通过第三方服务使用网络大致位置，不调用设备定位"
        : weatherState.status === "error"
          ? "点击右上角重新获取网络位置与天气"
          : "正在通过第三方服务获取网络大致位置";
      return;
    }

    const forecast = weatherState.data.forecast;
    const current = forecast.current || {};
    const daily = forecast.daily || {};
    const hourly = forecast.hourly || {};

    city.textContent = weatherState.data.city;
    mode.textContent = weatherState.mode;
    widget.querySelector("[data-weather-temperature]").textContent = Math.round(
      current.temperature_2m,
    );
    widget.querySelector("[data-weather-text]").textContent = weatherDescription(
      current.weather_code,
    );
    widget.querySelector("[data-weather-high]").textContent = Math.round(
      daily.temperature_2m_max?.[0],
    );
    widget.querySelector("[data-weather-low]").textContent = Math.round(
      daily.temperature_2m_min?.[0],
    );
    widget.querySelector("[data-weather-feels]").textContent = Math.round(
      current.apparent_temperature,
    );
    widget.querySelector("[data-weather-humidity]").textContent = Math.round(
      current.relative_humidity_2m,
    );
    widget.querySelector("[data-weather-wind]").textContent = Math.round(
      current.wind_speed_10m,
    );
    setWeatherIcon(
      widget.querySelector("[data-weather-icon]"),
      weatherIcon(current.weather_code, current.is_day),
    );

    widget.querySelectorAll("[data-weather-hour]").forEach((hourElement, index) => {
      const isoTime = hourly.time?.[index];
      const hour = isoTime ? new Date(isoTime).getHours() : null;
      hourElement.querySelector("[data-weather-hour-time]").textContent =
        index === 0 ? "现在" : Number.isFinite(hour) ? `${hour}时` : "--时";
      hourElement.querySelector("[data-weather-hour-temp]").textContent = Math.round(
        hourly.temperature_2m?.[index],
      );
      hourElement.querySelector("[data-weather-hour-rain]").textContent = Math.round(
        hourly.precipitation_probability?.[index] || 0,
      );
      setWeatherIcon(
        hourElement.querySelector("[data-weather-hour-icon]"),
        weatherIcon(hourly.weather_code?.[index], current.is_day),
      );
    });

    status.textContent = "当前使用网络大致位置，不调用设备定位";
  }

  function renderSocialLinks() {
    const container = document.querySelector(".home-sidebar-container");
    const sidebar = document.querySelector(".home-sidebar-container .sidebar-content");
    if (
      !container ||
      !sidebar ||
      container.querySelector(".blog-sidebar-socials")
    ) {
      return;
    }

    const socials = document.createElement("nav");
    socials.className = "blog-sidebar-socials";
    socials.setAttribute("aria-label", "外部账号");
    socials.innerHTML = `
      <a class="blog-social-link github" href="https://github.com/Jackknifer" target="_blank" rel="noopener noreferrer" aria-label="GitHub" title="GitHub">
        <img src="/images/social/github.svg" alt="" loading="lazy" decoding="async">
      </a>
      <a class="blog-social-link xiaohongshu" href="https://xhslink.com/m/6yTZyG00OB4" target="_blank" rel="noopener noreferrer" aria-label="小红书" title="小红书">
        <img src="/images/social/xiaohongshu.svg" alt="" loading="lazy" decoding="async">
      </a>
      <a class="blog-social-link netease" href="https://y.music.163.com/m/user?id=7896322526" target="_blank" rel="noopener noreferrer" aria-label="网易云音乐" title="网易云音乐">
        <img src="/images/social/netease-cloud-music.svg" alt="" loading="lazy" decoding="async">
      </a>
    `;

    const statistics = sidebar.querySelector(".statistics");
    if (statistics) {
      statistics.insertAdjacentElement("afterend", socials);
    } else {
      sidebar.appendChild(socials);
    }
  }

  function scrollToMainFallback() {
    if (typeof window.scrollToMain === "function") {
      window.scrollToMain();
      return;
    }

    const target = document.querySelector(
      ".home-content-container, main, .main-content-container",
    );
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function enhanceHomeBannerScrollCue() {
    const cue = document.querySelector(
      '.home-banner-container .content > div.absolute > div[onclick="scrollToMain()"]',
    );
    if (!cue) return;

    cue.classList.add("home-banner-scroll-cue");
    cue.setAttribute("role", "button");
    cue.setAttribute("tabindex", "0");
    cue.setAttribute("aria-label", "继续阅读");
    cue.setAttribute("title", "继续阅读");

    if (cue.dataset.keyboardReady === "true") return;
    cue.dataset.keyboardReady = "true";
    cue.addEventListener("keydown", (event) => {
      if (!["Enter", " "].includes(event.key)) return;
      event.preventDefault();
      scrollToMainFallback();
    });
  }

  function mountHomeWidgets() {
    const layout = document.querySelector(".main-content-body");
    if (!layout) return;

    let widgets = layout.querySelector(".blog-home-widgets");
    if (!widgets) {
      widgets = document.createElement("aside");
      widgets.className = "blog-home-widgets";
      widgets.setAttribute("aria-label", "音乐与天气");
      widgets.innerHTML = `${playerSurfaceMarkup("home")}${weatherWidgetMarkup()}`;
      layout.appendChild(widgets);
    }

    renderPlayer();
    renderWeather();
    if (state.weather.status === "idle") requestWeather();
  }

  function mountPostPlayer() {
    const article = document.querySelector(
      ".post-page-container .article-content-container",
    );
    if (!article || article.querySelector(".blog-post-player-section")) return;

    const playerSection = document.createElement("aside");
    playerSection.className = "blog-post-player-section";
    playerSection.setAttribute("aria-label", "文章页音乐播放器");
    playerSection.innerHTML = playerSurfaceMarkup("post");

    const articleNavigation = article.querySelector(".article-nav");
    const comments = article.querySelector(".comment-container");
    if (articleNavigation) {
      articleNavigation.insertAdjacentElement("afterend", playerSection);
    } else if (comments) {
      comments.insertAdjacentElement("beforebegin", playerSection);
    } else {
      article.appendChild(playerSection);
    }

    renderPlayer();
  }

  // Make the right rail mirror the left one exactly: the music card matches the
  // author/intro card, the weather card matches the navigation/links card. We
  // read the left heights at runtime (rather than hard-coding pixels) so the
  // two rails stay symmetric even as fonts, content or the viewport change.
  function syncRailHeights() {
    if (window.matchMedia("(max-width: 1279px)").matches) {
      // Stacked layout on tablet/mobile: no left/right pairing is visible.
      document
        .querySelectorAll(".blog-music-card, .blog-weather-card")
        .forEach((card) => {
          card.style.height = "";
          card.style.minHeight = "";
        });
      return;
    }

    const leftInfo = document.querySelector(
      ".home-sidebar-container .sidebar-content",
    );
    const leftLinks = document.querySelector(
      ".home-sidebar-container .sidebar-links",
    );
    const music = document.querySelector(".blog-music-card");
    const weather = document.querySelector(".blog-weather-card");
    if (!leftInfo || !leftLinks || !music || !weather) return;

    // Clear any previous override before measuring so stale values do not
    // affect the paired card dimensions.
    music.style.height = "";
    weather.style.height = "";

    // Preserve the browser's sub-pixel measurements. Rounding here can leave
    // the paired card a fraction of a pixel taller on high-DPI screens.
    const infoHeight = leftInfo.getBoundingClientRect().height;
    const linksHeight = leftLinks.getBoundingClientRect().height;

    if (infoHeight > 0) music.style.height = `${infoHeight}px`;
    if (linksHeight > 0) weather.style.height = `${linksHeight}px`;
  }

  function initializeMomentsPage() {
    const page = document.querySelector("[data-moments-page]");
    if (!page || page.dataset.momentsReady === "true") return;
    page.dataset.momentsReady = "true";

    const input = page.querySelector("[data-moments-search]");
    const filters = [...page.querySelectorAll("[data-moments-filter]")];
    const cards = [...page.querySelectorAll("[data-moment-card]")];
    const days = [...page.querySelectorAll("[data-moment-day]")];
    const resultCount = page.querySelector("[data-moments-count]");
    const emptyState = page.querySelector("[data-moments-empty]");
    let activeMonth = "all";

    state.momentRevealObserver?.disconnect();
    state.momentRevealObserver = null;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (!reduceMotion && "IntersectionObserver" in window) {
      state.momentRevealObserver = new IntersectionObserver(
        (entries, observer) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          });
        },
        { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
      );

      cards.forEach((card) => {
        card.classList.add("is-reveal-pending");
        state.momentRevealObserver.observe(card);
      });
    } else {
      cards.forEach((card) => card.classList.add("is-visible"));
    }

    const momentAudios = [...page.querySelectorAll("[data-moment-audio]")];

    const syncMomentAudio = (audio) => {
      const musicCard = audio.closest("[data-moment-music]");
      const toggle = musicCard?.querySelector("[data-moment-music-toggle]");
      const icon = toggle?.querySelector("i");
      if (!musicCard || !toggle || !icon) return;

      const isPlaying = !audio.paused && !audio.ended;
      musicCard.classList.toggle("is-playing", isPlaying);
      toggle.setAttribute("aria-pressed", String(isPlaying));
      toggle.setAttribute(
        "aria-label",
        musicCard.classList.contains("is-error")
          ? "暂时无法播放，请打开音乐页面"
          : `${isPlaying ? "暂停" : "播放"} ${musicCard.querySelector("strong")?.textContent || "音乐"}`,
      );
      icon.className = isPlaying ? "fa-solid fa-pause" : "fa-solid fa-play";
    };

    momentAudios.forEach((audio) => {
      const musicCard = audio.closest("[data-moment-music]");
      const toggle = musicCard?.querySelector("[data-moment-music-toggle]");
      audio.volume = DEFAULT_VOLUME;

      audio.addEventListener("play", () => {
        momentAudios.forEach((candidate) => {
          if (candidate !== audio && !candidate.paused) candidate.pause();
        });
        if (state.audio && !state.audio.paused) state.audio.pause();
        musicCard?.classList.remove("is-error");
        syncMomentAudio(audio);
      });
      audio.addEventListener("pause", () => syncMomentAudio(audio));
      audio.addEventListener("ended", () => syncMomentAudio(audio));
      audio.addEventListener("error", () => {
        musicCard?.classList.add("is-error");
        if (toggle) toggle.setAttribute("aria-label", "暂时无法播放，请打开音乐页面");
        syncMomentAudio(audio);
      });

      toggle?.addEventListener("click", () => {
        musicCard?.classList.remove("is-error");
        if (audio.paused) {
          if (audio.error || audio.networkState === 3) audio.load();
          audio.play().catch(() => {
            musicCard?.classList.add("is-error");
            syncMomentAudio(audio);
          });
        } else {
          audio.pause();
        }
      });

      syncMomentAudio(audio);
    });

    const applyFilter = () => {
      const query = input.value.trim().toLocaleLowerCase("zh-CN");
      let visibleCount = 0;

      cards.forEach((card) => {
        const matchesMonth =
          activeMonth === "all" || card.dataset.momentMonth === activeMonth;
        const matchesQuery =
          !query || card.textContent.toLocaleLowerCase("zh-CN").includes(query);
        const isVisible = matchesMonth && matchesQuery;
        card.hidden = !isVisible;
        if (!isVisible) card.querySelector("[data-moment-audio]")?.pause();
        if (isVisible) visibleCount += 1;
      });

      days.forEach((day) => {
        day.hidden = ![...day.querySelectorAll("[data-moment-card]")].some(
          (card) => !card.hidden,
        );
      });

      resultCount.textContent = String(visibleCount);
      emptyState.hidden = visibleCount !== 0;
    };

    input.addEventListener("input", applyFilter);
    filters.forEach((filter) => {
      filter.addEventListener("click", () => {
        activeMonth = filter.dataset.momentsFilter;
        filters.forEach((candidate) => {
          const isActive = candidate === filter;
          candidate.classList.toggle("is-active", isActive);
          candidate.setAttribute("aria-pressed", String(isActive));
        });
        applyFilter();
      });
    });

    applyFilter();
  }

  function decorateContentSection() {
    const route = window.location.pathname.replace(/\/+$/, "") || "/";
    const sections = [
      ["/now", "now"],
      ["/moments", "moments"],
      ["/archives", "archive"],
      ["/tags", "tags"],
      ["/categories", "categories"],
      ["/about", "about"],
    ];
    const matchedSection = sections.find((entry) => {
      const sectionPath = entry[0];
      return route === sectionPath || route.startsWith(`${sectionPath}/`);
    });
    const section = matchedSection ? matchedSection[1] : null;

    if (section) {
      document.documentElement.dataset.blogSection = section;
    } else {
      delete document.documentElement.dataset.blogSection;
    }

    if (section !== "archive") return;
    const archive = document.querySelector(".archive-container");
    if (!archive || archive.querySelector(".archive-page-title")) return;

    const title = document.createElement("h1");
    title.className = "page-title-header archive-page-title";
    title.textContent = "归档";
    archive.insertBefore(title, archive.firstChild);
  }

  function classifyPage() {
    if (document.querySelector(".home-content-container")) return "home";
    if (document.querySelector("[data-moments-page]")) return "moments";
    if (document.querySelector(".post-page-container")) return "post";
    return "page";
  }

  function syncFloatingPlayerVisibility() {
    const floatingPlayer = document.querySelector(
      '[data-player-surface="floating"]',
    );
    const sideTools = document.querySelector(".right-side-tools-container");
    if (!floatingPlayer) return;

    floatingPlayer.classList.toggle(
      "hide",
      Boolean(sideTools?.classList.contains("hide")),
    );
    syncPlayerPresentation(classifyPage());
  }

  function observeSideToolsVisibility() {
    state.sideToolsObserver?.disconnect();
    state.sideToolsObserver = null;

    const sideTools = document.querySelector(".right-side-tools-container");
    syncFloatingPlayerVisibility();
    if (!sideTools || typeof window.MutationObserver !== "function") return;

    state.sideToolsObserver = new MutationObserver(
      syncFloatingPlayerVisibility,
    );
    state.sideToolsObserver.observe(sideTools, {
      attributes: true,
      attributeFilter: ["class"],
    });
  }

  function observeDesktopWidgetAvoidance() {
    state.widgetAvoidanceObserver?.disconnect();
    state.widgetAvoidanceObserver = null;

    const sideTools = document.querySelector(".right-side-tools-container");
    sideTools?.classList.remove("blog-widget-avoidance");
    if (
      !sideTools ||
      !window.matchMedia("(min-width: 769px)").matches ||
      typeof window.IntersectionObserver !== "function"
    ) {
      return;
    }

    const widgets = [
      ...document.querySelectorAll(
        ".blog-home-widgets .blog-music-card, .blog-home-widgets .blog-weather-card",
      ),
    ];
    if (!widgets.length) return;

    const visibleWidgets = new Set();
    state.widgetAvoidanceObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            visibleWidgets.add(entry.target);
          } else {
            visibleWidgets.delete(entry.target);
          }
        });
        sideTools.classList.toggle(
          "blog-widget-avoidance",
          visibleWidgets.size > 0,
        );
      },
      { threshold: 0 },
    );
    widgets.forEach((widget) => state.widgetAvoidanceObserver.observe(widget));
  }

  function setSurfaceUsable(surface, isUsable) {
    if ("inert" in surface) {
      surface.inert = !isUsable;
    } else {
      const focusable = surface.querySelectorAll(
        'a[href], button, input, select, textarea, [tabindex]',
      );
      focusable.forEach((element) => {
        if (!isUsable) {
          if (!element.hasAttribute("data-blog-previous-tabindex")) {
            element.setAttribute(
              "data-blog-previous-tabindex",
              element.hasAttribute("tabindex")
                ? element.getAttribute("tabindex")
                : "",
            );
          }
          element.setAttribute("tabindex", "-1");
          return;
        }

        if (!element.hasAttribute("data-blog-previous-tabindex")) return;
        const previous = element.getAttribute("data-blog-previous-tabindex");
        element.removeAttribute("data-blog-previous-tabindex");
        if (previous === "") {
          element.removeAttribute("tabindex");
        } else {
          element.setAttribute("tabindex", previous);
        }
      });
    }
    surface.setAttribute("aria-hidden", String(!isUsable));
  }

  function syncPlayerPresentation(pageType) {
    const isDesktopPost =
      pageType === "post" && window.matchMedia("(min-width: 769px)").matches;
    const isMobilePost =
      pageType === "post" && window.matchMedia("(max-width: 768px)").matches;
    const floatingPlayer = document.querySelector(
      '[data-player-surface="floating"]',
    );
    const postPlayer = document.querySelector(
      '.blog-post-player-section [data-player-surface="post"]',
    );

    if (floatingPlayer) {
      const isHiddenWithSideTools = floatingPlayer.classList.contains("hide");
      const isFloatingPlayerUsable =
        isDesktopPost && !isHiddenWithSideTools;
      setSurfaceUsable(floatingPlayer, isFloatingPlayerUsable);
    }

    if (postPlayer) {
      setSurfaceUsable(postPlayer, isMobilePost);
    }
  }

  function syncPage() {
    decorateContentSection();
    const pageType = classifyPage();
    document.documentElement.dataset.blogPage = pageType;

    if (pageType === "home") {
      mountHomeWidgets();
      renderSocialLinks();
      enhanceHomeBannerScrollCue();
      // Sync after the left card's async pieces (avatar, socials) settle so we
      // measure its final height. A rAF pass plus a short fallback covers both
      // synchronous layout and late image/font reflow.
      requestAnimationFrame(syncRailHeights);
      window.setTimeout(syncRailHeights, 400);
    }

    if (pageType === "post") {
      mountPostPlayer();
    }

    if (pageType === "moments") {
      initializeMomentsPage();
    } else {
      state.momentRevealObserver?.disconnect();
      state.momentRevealObserver = null;
    }

    observeSideToolsVisibility();
    observeDesktopWidgetAvoidance();
    syncPlayerPresentation(pageType);
    renderPlayer();
  }

  function supportsThemeModuleSyntax() {
    try {
      const syntaxProbe = [
        "return ({ value: 1 })",
        String.fromCharCode(63, 46),
        "value ",
        String.fromCharCode(63, 63),
        " 0;",
      ].join("");
      return new Function(syntaxProbe)() === 1;
    } catch {
      return false;
    }
  }

  function activateLegacyThemeFallback(reason) {
    if (legacyFallback.active) return;
    legacyFallback.active = true;
    document.documentElement.classList.add("blog-legacy-theme-fallback");
    document.documentElement.setAttribute(
      "data-blog-legacy-fallback-reason",
      reason,
    );
  }

  function deactivateLegacyThemeFallback() {
    legacyFallback.active = false;
    document.documentElement.classList.remove("blog-legacy-theme-fallback");
    document.documentElement.removeAttribute(
      "data-blog-legacy-fallback-reason",
    );
    document.body.classList.remove("navbar-drawer-show");
  }

  function isThemeMainScript(element) {
    if (!element || element.tagName !== "SCRIPT") return false;
    return /\/js\/build\/main\.js(?:[?#]|$)/.test(
      element.getAttribute("src") || "",
    );
  }

  function monitorThemeModule() {
    if (!supportsThemeModuleSyntax()) {
      activateLegacyThemeFallback("legacy-syntax");
    }

    document.addEventListener(
      "load",
      (event) => {
        if (isThemeMainScript(event.target)) {
          deactivateLegacyThemeFallback();
        }
      },
      true,
    );
    document.addEventListener(
      "error",
      (event) => {
        if (isThemeMainScript(event.target)) {
          activateLegacyThemeFallback("theme-module-error");
        }
      },
      true,
    );

    window.setTimeout(() => {
      const themeModeReady =
        document.body.classList.contains("light-mode") ||
        document.body.classList.contains("dark-mode");
      if (!themeModeReady) {
        activateLegacyThemeFallback("theme-module-timeout");
      }
    }, 5000);
  }

  function setLegacySearchOpen(isOpen) {
    const overlay = document.querySelector(".search-pop-overlay");
    if (!overlay) return;
    overlay.classList.toggle("active", isOpen);
    document.body.style.overflow = isOpen ? "hidden" : "";
    if (!isOpen) return;

    const input = overlay.querySelector(".search-input");
    window.setTimeout(() => input && input.focus(), 0);
    loadLegacySearch().then(() => {
      renderLegacySearch(input ? input.value : "");
    });
  }

  function normalizeLegacySearchUrl(value) {
    try {
      const parsed = new URL(value, window.location.href);
      if (parsed.origin !== window.location.origin) return "/";
      return `${parsed.pathname}${parsed.search}${parsed.hash}`;
    } catch {
      return "/";
    }
  }

  function loadLegacySearch() {
    if (legacyFallback.searchEntries) {
      return Promise.resolve(legacyFallback.searchEntries);
    }
    if (legacyFallback.searchRequest) return legacyFallback.searchRequest;

    legacyFallback.searchRequest = fetch("/search.json", {
      headers: { Accept: "application/json" },
    })
      .then((response) => {
        if (!response.ok) throw new Error("search index unavailable");
        return response.json();
      })
      .then((entries) => {
        if (!Array.isArray(entries)) throw new Error("invalid search index");
        legacyFallback.searchEntries = entries
          .slice(0, 2000)
          .map((entry) => ({
            title: String((entry && entry.title) || "")
              .trim()
              .slice(0, 300),
            content: String((entry && entry.content) || "")
              .slice(0, 200000)
              .replace(/\s+/g, " ")
              .trim(),
            url: normalizeLegacySearchUrl(
              String((entry && entry.url) || "").trim(),
            ),
          }))
          .filter((entry) => entry.title);
        return legacyFallback.searchEntries;
      })
      .catch(() => {
        legacyFallback.searchEntries = [];
        return legacyFallback.searchEntries;
      });
    return legacyFallback.searchRequest;
  }

  function appendLegacySearchStatus(container, message) {
    const status = document.createElement("div");
    status.id = "no-result";
    status.className = "blog-legacy-search-status";
    status.textContent = message;
    container.appendChild(status);
  }

  function renderLegacySearch(rawQuery) {
    const result = document.getElementById("search-result");
    if (!result) return;
    while (result.firstChild) result.removeChild(result.firstChild);

    const query = String(rawQuery || "").trim().toLocaleLowerCase("zh-CN");
    if (!legacyFallback.searchEntries) {
      appendLegacySearchStatus(result, "正在加载本地搜索索引…");
      return;
    }
    if (!query) {
      appendLegacySearchStatus(result, "输入关键词即可搜索本站文章");
      return;
    }

    const matches = legacyFallback.searchEntries
      .filter(
        (entry) =>
          entry.title.toLocaleLowerCase("zh-CN").includes(query) ||
          entry.content.toLocaleLowerCase("zh-CN").includes(query),
      )
      .slice(0, 20);
    if (!matches.length) {
      appendLegacySearchStatus(result, "没有找到匹配内容");
      return;
    }

    const list = document.createElement("ul");
    list.className = "search-result-list";
    matches.forEach((entry) => {
      const item = document.createElement("li");
      const title = document.createElement("a");
      title.className = "search-result-title";
      title.href = entry.url;
      title.textContent = entry.title;
      item.appendChild(title);

      if (entry.content) {
        const summaryLink = document.createElement("a");
        summaryLink.href = entry.url;
        const summary = document.createElement("p");
        summary.className = "search-result";
        const lowerContent = entry.content.toLocaleLowerCase("zh-CN");
        const matchIndex = lowerContent.indexOf(query);
        const start = Math.max(0, matchIndex === -1 ? 0 : matchIndex - 32);
        summary.textContent = `${entry.content.slice(start, start + 120)}…`;
        summaryLink.appendChild(summary);
        item.appendChild(summaryLink);
      }
      list.appendChild(item);
    });
    result.appendChild(list);
  }

  function setLegacyThemeMode(useDarkMode) {
    const html = document.documentElement;
    if (useDarkMode) {
      html.classList.remove("light");
      html.classList.add("dark");
      document.body.classList.remove("light-mode");
      document.body.classList.add("dark-mode");
    } else {
      html.classList.remove("dark");
      html.classList.add("light");
      document.body.classList.remove("dark-mode");
      document.body.classList.add("light-mode");
    }
    try {
      window.localStorage.setItem(
        "redefine-color-scheme",
        useDarkMode ? "dark" : "light",
      );
    } catch {
      // Storage may be disabled; the in-page mode still works.
    }
  }

  function legacyViewerImages() {
    return Array.prototype.slice.call(
      document.querySelectorAll(
        ".markdown-body img, .masonry-item img, #shuoshuo-content img, .moment-photo img",
      ),
    );
  }

  function updateLegacyViewer(index) {
    const viewer = document.querySelector(".image-viewer-container");
    if (!viewer || !legacyFallback.images.length) return;
    legacyFallback.imageIndex = Math.max(
      0,
      Math.min(index, legacyFallback.images.length - 1),
    );
    const source = legacyFallback.images[legacyFallback.imageIndex];
    const target = viewer.querySelector(".image-viewer-frame img");
    if (!source || !target) return;
    target.src = source.currentSrc || source.src;
    target.alt = source.alt || "";
    target.style.transform = "";

    const previous = viewer.querySelector(".image-viewer-prev");
    const next = viewer.querySelector(".image-viewer-next");
    if (previous) {
      previous.classList.toggle(
        "is-disabled",
        legacyFallback.imageIndex === 0,
      );
    }
    if (next) {
      next.classList.toggle(
        "is-disabled",
        legacyFallback.imageIndex === legacyFallback.images.length - 1,
      );
    }
  }

  function openLegacyViewer(source) {
    const viewer = document.querySelector(".image-viewer-container");
    if (!viewer) return;
    legacyFallback.images = legacyViewerImages();
    const index = legacyFallback.images.indexOf(source);
    viewer.classList.add("active");
    document.body.style.overflow = "hidden";
    updateLegacyViewer(index === -1 ? 0 : index);
  }

  function closeLegacyViewer() {
    const viewer = document.querySelector(".image-viewer-container");
    if (!viewer) return;
    viewer.classList.remove("active");
    document.body.style.overflow = "";
    legacyFallback.imageIndex = -1;
  }

  function handleLegacyClick(event) {
    if (!legacyFallback.active) return;
    const target = event.target;

    if (target.closest(".navbar-bar")) {
      document.body.classList.toggle("navbar-drawer-show");
      return;
    }
    if (
      target.closest(".window-mask") ||
      target.closest(".drawer-navbar-item a")
    ) {
      document.body.classList.remove("navbar-drawer-show");
    }

    if (target.closest(".search-popup-trigger")) {
      event.preventDefault();
      setLegacySearchOpen(true);
      return;
    }
    const overlay = target.closest(".search-pop-overlay");
    if (
      target.closest(".popup-btn-close") ||
      (overlay && target === overlay)
    ) {
      setLegacySearchOpen(false);
      return;
    }
    if (target.closest(".search-input-field-pre")) {
      const input = document.querySelector(".search-input");
      if (input) {
        input.value = "";
        input.focus();
        renderLegacySearch("");
      }
      return;
    }

    if (target.closest(".toggle-tools-list")) {
      const tools = document.querySelector(".hidden-tools-list");
      if (tools) tools.classList.toggle("show");
      return;
    }
    if (target.closest(".tool-dark-light-toggle")) {
      setLegacyThemeMode(
        !document.documentElement.classList.contains("dark"),
      );
      return;
    }
    if (target.closest(".tool-scroll-to-top")) {
      window.scrollTo(0, 0);
      return;
    }
    if (target.closest(".tool-scroll-to-bottom")) {
      window.scrollTo(0, document.documentElement.scrollHeight);
      return;
    }

    const viewer = target.closest(".image-viewer-container");
    if (target.closest(".image-viewer-close")) {
      closeLegacyViewer();
      return;
    }
    if (target.closest(".image-viewer-prev")) {
      updateLegacyViewer(legacyFallback.imageIndex - 1);
      return;
    }
    if (target.closest(".image-viewer-next")) {
      updateLegacyViewer(legacyFallback.imageIndex + 1);
      return;
    }
    if (
      viewer &&
      (target === viewer || target.closest(".image-viewer-frame") === target)
    ) {
      closeLegacyViewer();
      return;
    }

    const sourceImage = target.closest(
      ".markdown-body img, .masonry-item img, #shuoshuo-content img, .moment-photo img",
    );
    if (sourceImage && !sourceImage.closest(".image-viewer-container")) {
      event.preventDefault();
      openLegacyViewer(sourceImage);
    }
  }

  function handleLegacyKeydown(event) {
    if (!legacyFallback.active) return;
    if (event.key === "Escape") {
      setLegacySearchOpen(false);
      closeLegacyViewer();
      document.body.classList.remove("navbar-drawer-show");
      return;
    }

    const viewer = document.querySelector(".image-viewer-container.active");
    if (!viewer) return;
    if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      updateLegacyViewer(legacyFallback.imageIndex - 1);
    }
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      updateLegacyViewer(legacyFallback.imageIndex + 1);
    }
  }

  document.addEventListener("click", (event) => {
    const playerButton = event.target.closest("[data-player-action]");
    if (playerButton) {
      handlePlayerAction(playerButton.dataset.playerAction);
      return;
    }

    const weatherButton = event.target.closest('[data-weather-action="load"]');
    if (weatherButton) {
      requestWeather();
    }
  });

  document.addEventListener("click", handleLegacyClick);
  document.addEventListener("input", (event) => {
    if (
      legacyFallback.active &&
      event.target.matches(".search-input")
    ) {
      renderLegacySearch(event.target.value);
    }
  });
  document.addEventListener("keydown", handleLegacyKeydown);

  document.addEventListener("input", (event) => {
    const seek = event.target.closest("[data-player-seek]");
    if (!seek || !state.audio || !Number.isFinite(state.audio.duration)) return;
    state.audio.currentTime = (Number(seek.value) / 100) * state.audio.duration;
    renderPlayer();
  });

  document.addEventListener("redefine:page:refresh", syncPage);
  document.addEventListener("swup:contentReplaced", syncPage);
  document.addEventListener("pjax:complete", syncPage);
  window.addEventListener("popstate", () => window.setTimeout(syncPage, 0));

  let railResizeTimer = null;
  window.addEventListener("resize", () => {
    window.clearTimeout(railResizeTimer);
    railResizeTimer = window.setTimeout(() => {
      syncRailHeights();
      observeDesktopWidgetAvoidance();
      syncPlayerPresentation(classifyPage());
      queueFloatingLyricLayout();
    }, 150);
  });

  monitorThemeModule();
  createGlobalPlayer();
  syncPage();
  document.documentElement.classList.add("blog-experience-ready");

  window[EXPERIENCE_KEY] = {
    syncPage,
  };
})();
