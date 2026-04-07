// -----------------------------------------
// MEDIA SETUP — autoplay / hover / click video player
// [data-media-init] wraps a [data-media-video-src] <video>
// Modes: data-media-mode="autoplay|hover|click"
// -----------------------------------------

let cleanupFns = [];

export function initMediaSetup(scope) {
  scope = scope || document;
  const mediaElements = scope.querySelectorAll("[data-media-init]");
  if (!mediaElements.length) return;

  const pauseDelay = 200;
  const viewportOffset = 0.1;
  const isHoverDevice = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const rootMarginValue = viewportOffset * 100;

  mediaElements.forEach(mediaEl => {
    const video = mediaEl.querySelector("[data-media-video-src]");
    if (!video) return;

    const mode = mediaEl.dataset.mediaMode || "autoplay";
    const touchMode = mediaEl.dataset.mediaTouchMode;
    const resetAttr = mediaEl.dataset.mediaReset;
    const pausedStatusAttr = mediaEl.dataset.mediaOnPause;
    const toggleElements = [...mediaEl.querySelectorAll("[data-media-toggle]")];

    const activeMode = !isHoverDevice ? (touchMode || (mode === "hover" ? "autoplay" : mode)) : mode;
    const shouldResetOnPause = resetAttr === "true" ? true : resetAttr === "false" ? false : activeMode === "hover";
    const pausedStatus = pausedStatusAttr === "paused" ? "paused" : "not-active";

    const clickTargets = toggleElements.length ? toggleElements : [mediaEl];
    const shouldUseClickToggle = activeMode === "click" || (activeMode === "autoplay" && toggleElements.length);

    let isInView = false;
    let isHovering = false;
    let hasLoaded = false;
    let userPaused = false;
    let userActivated = false;
    let isActivated = false;
    let shouldBePlaying = false;
    let pauseTimer = null;

    const setStatus = status => {
      mediaEl.dataset.mediaStatus = status;
    };

    const clearPauseTimer = () => {
      clearTimeout(pauseTimer);
    };

    const addCleanup = fn => {
      cleanupFns.push(fn);
    };

    const on = (target, event, handler) => {
      target.addEventListener(event, handler);
      addCleanup(() => target.removeEventListener(event, handler));
    };

    const playAttempt = () => {
      video.play().then(() => {
        if (shouldBePlaying) setStatus("playing");
      }).catch(() => {});
    };

    const loadVideo = () => {
      if (hasLoaded) return;

      const src = video.dataset.mediaVideoSrc;
      if (!src) return;

      video.muted = true;
      video.playsInline = true;
      video.setAttribute("muted", "");
      video.setAttribute("playsinline", "");
      video.setAttribute("webkit-playsinline", "");
      video.src = src;
      video.load();
      hasLoaded = true;
    };

    const shouldResume = () => {
      if (!isInView || document.hidden) return false;
      if (activeMode === "autoplay") return !userPaused;
      if (activeMode === "click") return userActivated && !userPaused;
      return isHovering;
    };

    const playVideo = () => {
      if (!isInView || document.hidden) return;

      shouldBePlaying = true;
      clearPauseTimer();
      loadVideo();
      setStatus(video.readyState < 3 ? "loading" : "playing");
      playAttempt();
    };

    const pauseVideo = (delay = 0, reset = false) => {
      shouldBePlaying = false;
      clearPauseTimer();

      pauseTimer = setTimeout(() => {
        video.pause();
        if (reset) video.currentTime = 0;
      }, delay);
    };

    const handleHoverIn = () => {
      if (!isInView || document.hidden) return;

      isHovering = true;
      clearPauseTimer();

      if (!video.paused) {
        shouldBePlaying = true;
        setStatus("playing");
        return;
      }

      playVideo();
    };

    const handleHoverOut = () => {
      if (!isInView) return;

      isHovering = false;
      setStatus(pausedStatus);
      pauseVideo(pauseDelay, shouldResetOnPause);
    };

    const handleClick = () => {
      if (!isInView || document.hidden) return;

      clearPauseTimer();

      if (video.paused) {
        userActivated = true;
        userPaused = false;
        playVideo();
      } else {
        userActivated = true;
        userPaused = true;
        setStatus(pausedStatus);
        pauseVideo(pauseDelay, shouldResetOnPause);
      }
    };

    const handleViewport = entries => {
      entries.forEach(entry => {
        if (entry.target !== mediaEl) return;

        if (!isActivated && entry.isIntersecting) {
          isActivated = true;

          if (shouldUseClickToggle) {
            clickTargets.forEach(toggleEl => on(toggleEl, "click", handleClick));
          }

          if (activeMode === "hover") {
            on(mediaEl, "mouseenter", handleHoverIn);
            on(mediaEl, "mouseleave", handleHoverOut);
          }
        }

        isInView = entry.isIntersecting;

        if (isInView) {
          if (shouldResume()) playVideo();
        } else {
          isHovering = false;

          if (!video.paused || shouldBePlaying) {
            setStatus("paused");
            pauseVideo(0, false);
          }
        }
      });
    };

    const handlePageVisibilityChange = () => {
      if (document.hidden) {
        if (!video.paused || shouldBePlaying) {
          setStatus("paused");
          pauseVideo(0, false);
        }
        return;
      }
      if (shouldResume()) playVideo();
    };

    mediaEl.dataset.mediaStatus = "not-active";

    const observer = new IntersectionObserver(handleViewport, {
      rootMargin: `${rootMarginValue}% 0px ${rootMarginValue}% 0px`,
      threshold: 0
    });

    observer.observe(mediaEl);

    on(video, "playing", () => { if (shouldBePlaying) setStatus("playing"); });
    on(video, "waiting", () => { if (shouldBePlaying) setStatus("loading"); });
    on(video, "canplay", () => { if (shouldBePlaying && isInView && !document.hidden) playAttempt(); });
    on(video, "loadeddata", () => { if (shouldBePlaying && isInView && !document.hidden) playAttempt(); });
    on(video, "ended", () => { if (!shouldBePlaying || !isInView || document.hidden) return; video.currentTime = 0; playAttempt(); });

    on(document, "visibilitychange", handlePageVisibilityChange);

    addCleanup(() => observer.disconnect());
    addCleanup(() => {
      clearPauseTimer();
      shouldBePlaying = false;
      video.pause();
    });
  });
}

export function destroyMediaSetup() {
  cleanupFns.forEach(fn => fn());
  cleanupFns = [];
}
