(function () {
  if (window.__blogMusicPlayerInitialized) return;
  window.__blogMusicPlayerInitialized = true;

  const playlistUrl = "/music/playlist.json";
  const aplayerScriptUrl = "/js/libs/APlayer.min.js";

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[src="${src}"]`);
      if (existing) {
        existing.addEventListener("load", resolve, { once: true });
        existing.addEventListener("error", reject, { once: true });
        if (window.APlayer) resolve();
        return;
      }

      const script = document.createElement("script");
      script.src = src;
      script.async = true;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  function normalizeTrack(track) {
    if (!track || !track.name || !track.url) return null;

    return {
      name: track.name,
      artist: track.artist || "",
      url: track.url,
      cover: track.cover || "",
      lrc: track.lrc || "",
      theme: track.theme || "#A31F34",
    };
  }

  async function loadPlaylist() {
    try {
      const response = await fetch(playlistUrl, { cache: "no-store" });
      if (!response.ok) return [];

      const data = await response.json();
      const tracks = Array.isArray(data) ? data : data.tracks;
      if (!Array.isArray(tracks)) return [];

      return tracks.map(normalizeTrack).filter(Boolean);
    } catch (error) {
      console.warn("Music playlist is unavailable.", error);
      return [];
    }
  }

  function bindPlayerState(player) {
    const syncPlayingState = () => {
      const isPlaying = player.audio && !player.audio.paused && !player.audio.ended;
      player.container.classList.toggle("is-playing", isPlaying);
    };

    player.on("play", syncPlayingState);
    player.on("playing", syncPlayingState);
    player.on("pause", syncPlayingState);
    player.on("ended", syncPlayingState);
    player.on("error", syncPlayingState);
    syncPlayingState();
  }

  async function initMusicPlayer() {
    const tracks = await loadPlaylist();
    if (!tracks.length || document.getElementById("blog-music-player")) return;

    const container = document.createElement("div");
    container.id = "blog-music-player";
    document.body.appendChild(container);

    if (!window.APlayer) {
      await loadScript(aplayerScriptUrl);
    }

    if (!window.APlayer) return;

    const player = new APlayer({
      container,
      fixed: true,
      mini: true,
      autoplay: false,
      loop: "all",
      order: "list",
      preload: "metadata",
      volume: 0.3,
      mutex: true,
      lrcType: 3,
      audio: tracks,
    });
    bindPlayerState(player);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initMusicPlayer, { once: true });
  } else {
    initMusicPlayer();
  }
})();
