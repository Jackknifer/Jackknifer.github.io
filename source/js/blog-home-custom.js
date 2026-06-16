(function () {
  const MUSIC_SRC = "/music/liu-sen-yu-ye.mp3";
  const GITHUB_URL = "https://github.com/Jackknifer";
  const XHS_URL = "https://xhslink.com/m/6yTZyG00OB4";

  const state = window.__blogHomeMusicState || {
    audio: null,
    autoplayTried: false,
    audioListenersBound: false,
    unlockBound: false,
    userPaused: false,
  };
  window.__blogHomeMusicState = state;

  function ensureAudio() {
    if (!state.audio) {
      state.audio = new Audio(MUSIC_SRC);
      state.audio.loop = true;
      state.audio.preload = "auto";
      state.audio.volume = 0.42;
    }
    return state.audio;
  }

  function setupSidebarSocials() {
    const sidebar = document.querySelector(".home-sidebar-container .sidebar-content");
    if (!sidebar || sidebar.querySelector(".blog-profile-socials")) return;

    const socials = document.createElement("div");
    socials.className = "blog-profile-socials";
    socials.innerHTML = `
      <a href="${GITHUB_URL}" target="_blank" rel="noopener" aria-label="GitHub" title="GitHub">
        <i class="fa-brands fa-github"></i>
      </a>
      <a href="${XHS_URL}" target="_blank" rel="noopener" aria-label="小红书" title="小红书" class="blog-xhs-link">
        <span class="blog-xhs-mark">小</span>
      </a>
    `;

    const statistics = sidebar.querySelector(".statistics");
    if (statistics) {
      statistics.insertAdjacentElement("afterend", socials);
    } else {
      sidebar.appendChild(socials);
    }
  }

  function setupBannerControls(homeBanner) {
    const controlBar = homeBanner.querySelector(".content > .absolute");
    if (!controlBar) return;

    controlBar.classList.add("blog-home-control-bar");

    const socialContacts = controlBar.querySelector(".social-contacts");
    if (socialContacts) socialContacts.classList.add("blog-banner-socials-hidden");

    const scrollButton = controlBar.querySelector('[onclick="scrollToMain()"]');
    if (scrollButton) {
      scrollButton.classList.add("blog-scroll-down-button");
      scrollButton.setAttribute("aria-label", "向下滚动");
      scrollButton.setAttribute("title", "向下滚动");
    }
  }

  function setPlayerState(player, audio) {
    const isPlaying = !audio.paused && !audio.ended;
    player.classList.toggle("is-playing", isPlaying);
    player.classList.toggle("is-paused", !isPlaying);
    const icon = player.querySelector(".blog-play-icon i");
    if (icon) {
      icon.className = isPlaying ? "fa-solid fa-pause" : "fa-solid fa-play";
    }
  }

  function tryAutoplay(audio, player) {
    if (state.autoplayTried || state.userPaused) return;
    state.autoplayTried = true;

    audio.play()
      .then(() => setPlayerState(player, audio))
      .catch(() => {
        setPlayerState(player, audio);
        bindAutoplayUnlock(audio);
      });
  }

  function bindAutoplayUnlock(audio) {
    if (state.unlockBound) return;
    state.unlockBound = true;

    const retry = () => {
      if (!state.userPaused && audio.paused) {
        audio.play().catch(() => {});
      }
      document.removeEventListener("pointerdown", retry);
      document.removeEventListener("keydown", retry);
    };

    document.addEventListener("pointerdown", retry, { once: true });
    document.addEventListener("keydown", retry, { once: true });
  }

  function bindAudioListeners(audio) {
    if (state.audioListenersBound) return;
    state.audioListenersBound = true;

    ["play", "pause", "ended", "canplay"].forEach((eventName) => {
      audio.addEventListener(eventName, () => {
        const activePlayer = document.getElementById("blog-music-player");
        if (activePlayer) setPlayerState(activePlayer, audio);
      });
    });
  }

  function setupMusicPlayer(homeBanner) {
    const audio = ensureAudio();
    let player = document.getElementById("blog-music-player");

    if (player && !homeBanner.contains(player)) {
      player.remove();
      player = null;
    }

    if (!player) {
      player = document.createElement("div");
      player.id = "blog-music-player";
      player.className = "blog-music-player is-paused";
      player.innerHTML = `
        <button class="blog-music-button" type="button" aria-label="播放或暂停背景音乐" title="雨夜 · 刘森">
          <span class="blog-album-art" aria-hidden="true"><span>雨</span></span>
          <span class="blog-track-meta">
            <span class="blog-track-title">雨夜</span>
            <span class="blog-track-dot">·</span>
            <span class="blog-track-artist">刘森</span>
          </span>
          <span class="blog-play-icon" aria-hidden="true"><i class="fa-solid fa-play"></i></span>
        </button>
      `;
      homeBanner.appendChild(player);

      const button = player.querySelector(".blog-music-button");
      button.addEventListener("click", function () {
        if (audio.paused) {
          state.userPaused = false;
          audio.play().catch(() => {});
        } else {
          state.userPaused = true;
          audio.pause();
        }
        setPlayerState(player, audio);
      });
    }

    bindAudioListeners(audio);
    setPlayerState(player, audio);
    tryAutoplay(audio, player);
  }

  function initHomeEnhancements() {
    const homeBanner = document.querySelector(".home-banner-container");
    if (!homeBanner) return;

    setupSidebarSocials();
    setupBannerControls(homeBanner);
    setupMusicPlayer(homeBanner);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initHomeEnhancements, { once: true });
  } else {
    initHomeEnhancements();
  }

  document.addEventListener("swup:contentReplaced", initHomeEnhancements);
  document.addEventListener("pjax:complete", initHomeEnhancements);
})();
