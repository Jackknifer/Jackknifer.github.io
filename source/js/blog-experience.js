(function () {
  const EXPERIENCE_KEY = "__jackkniferBlogExperience";
  const MUSIC = {
    title: "雨夜",
    artist: "刘森",
    audio: "/media/rainy-night.mp3",
    lyrics: "/media/rainy-night.lrc",
    cover: "/media/rainy-night-cover.png",
  };

  if (window[EXPERIENCE_KEY]) {
    window[EXPERIENCE_KEY].syncPage();
    return;
  }

  const state = {
    audio: null,
    root: null,
    lyrics: [],
    currentLyric: "点击播放，听一场雨夜",
    weather: {
      status: "idle",
      mode: "",
      message: "",
      data: null,
    },
  };

  function escapeAttribute(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll('"', "&quot;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
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
      const timestamps = [
        ...line.matchAll(/\[(\d{2,3}):(\d{2})(?:[.:](\d{1,3}))?\]/g),
      ];
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

  function playerSurfaceMarkup(kind) {
    const isFloating = kind === "floating";
    const surfaceClass = isFloating
      ? "blog-player-surface blog-floating-player"
      : "blog-player-surface blog-music-card blog-widget";

    if (isFloating) {
      return `
        <aside class="${surfaceClass}" data-player-surface="floating" aria-label="正在播放">
          <div class="blog-player-cover blog-player-cover-compact" aria-hidden="true">
            <img src="${MUSIC.cover}" alt="">
            <span class="blog-player-cover-center"></span>
          </div>
          <div class="blog-floating-player-copy">
            <strong>${MUSIC.title}</strong>
            <span data-player-lyric>${state.currentLyric}</span>
            <div class="blog-floating-player-progress">
              <span data-player-current>00:00</span>
              <input data-player-seek type="range" min="0" max="100" value="0" aria-label="播放进度">
              <span data-player-duration>00:00</span>
            </div>
          </div>
          <button class="blog-player-button blog-player-button-primary blog-player-button-compact" type="button" data-player-action="toggle" aria-label="播放">
            <i class="fa-solid fa-play" data-player-toggle-icon aria-hidden="true"></i>
          </button>
          <button class="blog-player-button blog-player-button-quiet" type="button" data-player-action="forward" aria-label="快进 15 秒" title="快进 15 秒">
            <i class="fa-solid fa-forward-step" aria-hidden="true"></i>
          </button>
        </aside>
      `;
    }

    return `
      <section class="${surfaceClass}" data-player-surface="home" aria-label="音乐播放器">
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
          <button class="blog-player-button blog-player-button-quiet is-active" type="button" data-player-action="loop" data-player-loop aria-label="切换单曲循环" aria-pressed="true" title="单曲循环">
            <i class="fa-solid fa-repeat" aria-hidden="true"></i>
          </button>
          <button class="blog-player-button blog-player-button-quiet" type="button" data-player-action="back" aria-label="后退 15 秒" title="后退 15 秒">
            <i class="fa-solid fa-backward-step" aria-hidden="true"></i>
          </button>
          <button class="blog-player-button blog-player-button-primary" type="button" data-player-action="toggle" aria-label="播放">
            <i class="fa-solid fa-play" data-player-toggle-icon aria-hidden="true"></i>
          </button>
          <button class="blog-player-button blog-player-button-quiet" type="button" data-player-action="forward" aria-label="快进 15 秒" title="快进 15 秒">
            <i class="fa-solid fa-forward-step" aria-hidden="true"></i>
          </button>
          <button class="blog-player-button blog-player-button-quiet" type="button" data-player-action="mute" aria-label="静音" title="静音">
            <i class="fa-solid fa-volume-high" data-player-volume-icon aria-hidden="true"></i>
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
            <i class="fa-solid fa-location-dot" aria-hidden="true"></i>
            <strong data-weather-city>正在获取位置</strong>
          </div>
          <button type="button" class="blog-weather-mode" data-weather-action="retry" title="重新定位">
            <span data-weather-mode>定位中</span>
            <i class="fa-solid fa-location-crosshairs" aria-hidden="true"></i>
          </button>
        </div>
        <div class="blog-weather-current">
          <div>
            <div class="blog-weather-temperature"><span data-weather-temperature>--</span><sup>°</sup></div>
            <p data-weather-text>正在同步当地天气</p>
            <small>最高 <span data-weather-high>--</span>° · 最低 <span data-weather-low>--</span>°</small>
          </div>
          <div class="blog-weather-main-icon" aria-hidden="true">
            <i class="fa-solid fa-spinner fa-spin" data-weather-icon></i>
          </div>
        </div>
        <div class="blog-weather-hourly" data-weather-hourly>
          ${[0, 1, 2, 3]
            .map(
              (index) => `
                <div class="blog-weather-hour" data-weather-hour="${index}">
                  <span data-weather-hour-time>--时</span>
                  <i class="fa-solid fa-cloud" data-weather-hour-icon aria-hidden="true"></i>
                  <strong><span data-weather-hour-temp>--</span>°</strong>
                  <small><span data-weather-hour-rain>--</span>%</small>
                </div>
              `,
            )
            .join("")}
        </div>
        <div class="blog-weather-details">
          <div>
            <i class="fa-solid fa-temperature-half" aria-hidden="true"></i>
            <span>体感</span>
            <strong><span data-weather-feels>--</span>°</strong>
          </div>
          <div>
            <i class="fa-solid fa-droplet" aria-hidden="true"></i>
            <span>湿度</span>
            <strong><span data-weather-humidity>--</span>%</strong>
          </div>
          <div>
            <i class="fa-solid fa-wind" aria-hidden="true"></i>
            <span>风速</span>
            <strong><span data-weather-wind>--</span> km/h</strong>
          </div>
        </div>
        <p class="blog-weather-status" data-weather-status>
          <i class="fa-solid fa-shield-halved" aria-hidden="true"></i>
          坐标仅用于本次天气查询，不在本站保存
        </p>
      </section>
    `;
  }

  function createGlobalPlayer() {
    const root = document.createElement("div");
    root.id = "blog-global-player";
    root.innerHTML = `
      <audio preload="metadata" src="${escapeAttribute(MUSIC.audio)}"></audio>
      ${playerSurfaceMarkup("floating")}
    `;
    document.body.appendChild(root);

    state.root = root;
    state.audio = root.querySelector("audio");
    state.audio.loop = true;

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
      state.currentLyric = "音乐文件暂时无法播放";
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
      element.textContent = state.currentLyric;
    });
    document.querySelectorAll("[data-player-seek]").forEach((element) => {
      element.value = String(progress);
      element.style.setProperty("--player-progress", `${progress}%`);
    });
    document.querySelectorAll("[data-player-toggle-icon]").forEach((element) => {
      element.className = `fa-solid ${isPlaying ? "fa-pause" : "fa-play"}`;
    });
    document.querySelectorAll('[data-player-action="toggle"]').forEach((button) => {
      button.setAttribute("aria-label", isPlaying ? "暂停" : "播放");
    });
    document.querySelectorAll("[data-player-loop]").forEach((button) => {
      button.classList.toggle("is-active", state.audio.loop);
      button.setAttribute("aria-pressed", String(state.audio.loop));
    });
    document.querySelectorAll("[data-player-volume-icon]").forEach((element) => {
      element.className = `fa-solid ${state.audio.muted ? "fa-volume-xmark" : "fa-volume-high"}`;
    });
  }

  function handlePlayerAction(action) {
    if (!state.audio) return;

    if (action === "toggle") {
      if (state.audio.paused) {
        state.audio.play().catch(() => {
          state.currentLyric = "请再次点击播放";
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

    if (action === "loop") {
      state.audio.loop = !state.audio.loop;
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
    if (code === 0) return isDay ? "fa-sun" : "fa-moon";
    if ([1, 2].includes(code)) return isDay ? "fa-cloud-sun" : "fa-cloud-moon";
    if (code === 3) return "fa-cloud";
    if ([45, 48].includes(code)) return "fa-smog";
    if (code >= 51 && code <= 67) return "fa-cloud-rain";
    if (code >= 71 && code <= 77) return "fa-snowflake";
    if (code >= 80 && code <= 82) return "fa-cloud-showers-heavy";
    if (code >= 85 && code <= 86) return "fa-snowflake";
    if (code >= 95) return "fa-cloud-bolt";
    return "fa-cloud";
  }

  function setWeatherIcon(element, iconName, extraClass = "") {
    if (!element) return;
    element.className = `fa-solid ${iconName}${extraClass ? ` ${extraClass}` : ""}`;
  }

  async function fetchJson(url, timeout = 12000) {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), timeout);
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: { Accept: "application/json" },
      });
      if (!response.ok) throw new Error(`request failed: ${response.status}`);
      return await response.json();
    } finally {
      window.clearTimeout(timer);
    }
  }

  async function reverseGeocode(latitude, longitude) {
    const params = new URLSearchParams({ localityLanguage: "zh" });
    if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
      params.set("latitude", String(latitude));
      params.set("longitude", String(longitude));
    }
    return fetchJson(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?${params.toString()}`,
    );
  }

  async function fetchWeather(latitude, longitude) {
    const params = new URLSearchParams({
      latitude: String(latitude),
      longitude: String(longitude),
      current:
        "temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,is_day,wind_speed_10m",
      hourly: "temperature_2m,weather_code,precipitation_probability",
      daily: "temperature_2m_max,temperature_2m_min",
      forecast_hours: "6",
      forecast_days: "1",
      timezone: "auto",
    });
    return fetchJson(`https://api.open-meteo.com/v1/forecast?${params.toString()}`);
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
    const [weatherResult, locationResult] = await Promise.allSettled([
      fetchWeather(latitude, longitude),
      reverseGeocode(latitude, longitude),
    ]);

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
    await loadWeatherForCoordinates(latitude, longitude, "大致位置");
  }

  function requestWeather(force = false) {
    if (!force && ["loading", "ready"].includes(state.weather.status)) {
      renderWeather();
      return;
    }

    state.weather = {
      status: "loading",
      mode: "定位中",
      message: "正在请求访客位置",
      data: null,
    };
    renderWeather();

    const fallback = () => {
      loadApproximateWeather().catch(() => {
        state.weather = {
          status: "error",
          mode: "定位失败",
          message: "暂时无法获取你所在位置的天气，点击右上角重试。",
          data: null,
        };
        renderWeather();
      });
    };

    if (!navigator.geolocation) {
      fallback();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        loadWeatherForCoordinates(
          position.coords.latitude,
          position.coords.longitude,
          "精确定位",
        ).catch(fallback);
      },
      fallback,
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 30 * 60 * 1000,
      },
    );
  }

  function renderWeather() {
    const widget = document.querySelector("[data-weather-widget]");
    if (!widget) return;

    const weatherState = state.weather;
    const status = widget.querySelector("[data-weather-status]");
    const city = widget.querySelector("[data-weather-city]");
    const mode = widget.querySelector("[data-weather-mode]");

    widget.classList.toggle("is-loading", weatherState.status === "loading");
    widget.classList.toggle("has-error", weatherState.status === "error");

    if (weatherState.status !== "ready" || !weatherState.data) {
      city.textContent = weatherState.status === "error" ? "天气不可用" : "正在获取位置";
      mode.textContent = weatherState.mode || "定位中";
      widget.querySelector("[data-weather-text]").textContent =
        weatherState.message || "正在同步当地天气";
      setWeatherIcon(
        widget.querySelector("[data-weather-icon]"),
        weatherState.status === "error" ? "fa-location-crosshairs" : "fa-spinner",
        weatherState.status === "loading" ? "fa-spin" : "",
      );
      status.innerHTML =
        weatherState.status === "error"
          ? '<i class="fa-solid fa-circle-exclamation" aria-hidden="true"></i> 点击右上角重新请求定位与天气'
          : '<i class="fa-solid fa-shield-halved" aria-hidden="true"></i> 坐标仅用于本次天气查询，不在本站保存';
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

    status.innerHTML =
      weatherState.mode === "精确定位"
        ? '<i class="fa-solid fa-shield-halved" aria-hidden="true"></i> 已获授权；坐标仅用于本次查询，不在本站保存'
        : '<i class="fa-solid fa-circle-info" aria-hidden="true"></i> 未获精确定位授权，当前使用网络大致位置';
  }

  function renderSocialLinks() {
    const sidebar = document.querySelector(".home-sidebar-container .sidebar-content");
    if (!sidebar || sidebar.querySelector(".blog-sidebar-socials")) return;

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
    requestWeather();
  }

  function initializeMomentsPage() {
    const page = document.querySelector("[data-moments-page]");
    if (!page || page.dataset.momentsReady === "true") return;
    page.dataset.momentsReady = "true";

    const input = page.querySelector("[data-moments-search]");
    const filters = [...page.querySelectorAll("[data-moments-filter]")];
    const cards = [...page.querySelectorAll("[data-moment-card]")];
    const resultCount = page.querySelector("[data-moments-count]");
    const emptyState = page.querySelector("[data-moments-empty]");
    let activeMonth = "all";

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
        if (isVisible) visibleCount += 1;
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

  function classifyPage() {
    if (document.querySelector(".home-content-container")) return "home";
    if (document.querySelector("[data-moments-page]")) return "moments";
    if (document.querySelector(".post-page-container")) return "post";
    return "page";
  }

  function syncPage() {
    const pageType = classifyPage();
    document.documentElement.dataset.blogPage = pageType;
    const floatingPlayer = document.querySelector(
      '[data-player-surface="floating"]',
    );
    const hideFloatingPlayer = pageType === "home";

    if (floatingPlayer) {
      floatingPlayer.inert = hideFloatingPlayer;
      floatingPlayer.setAttribute(
        "aria-hidden",
        String(hideFloatingPlayer),
      );
    }

    if (pageType === "home") {
      mountHomeWidgets();
      renderSocialLinks();
      enhanceHomeBannerScrollCue();
    }

    if (pageType === "moments") {
      initializeMomentsPage();
    }

    renderPlayer();
  }

  document.addEventListener("click", (event) => {
    const playerButton = event.target.closest("[data-player-action]");
    if (playerButton) {
      handlePlayerAction(playerButton.dataset.playerAction);
      return;
    }

    const weatherButton = event.target.closest('[data-weather-action="retry"]');
    if (weatherButton) {
      requestWeather(true);
    }
  });

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

  createGlobalPlayer();
  syncPage();

  window[EXPERIENCE_KEY] = {
    syncPage,
  };
})();
