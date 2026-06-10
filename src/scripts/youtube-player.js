// -----------------------------------------
// YOUTUBE PLAYER
// [data-youtube-player-init]
// Port of vimeo-player.js — same markup / attribute conventions.
// Loads the YouTube IFrame API itself (no CDN script needed).
//
// Attrs: data-youtube-video-id, data-youtube-update-size ("true"|"cover"),
//        data-youtube-autoplay ("true"|"false"), data-youtube-paused-by-user,
//        data-youtube-aspect ("16:9" default — YT API can't report real dims),
//        data-youtube-track ("false" to opt out of GTM tracking)
// Controls: [data-youtube-control="play|pause|mute|fullscreen|timeline"]
//
// Tracking: pushes GA4-shaped video events to window.dataLayer (GTM):
//   video_start | video_progress | video_complete | video_pause
//   params: video_provider, video_title, video_url, video_duration,
//           video_percent, video_current_time
// -----------------------------------------

let cleanups = [];
let apiPromise = null;

// Inject + await the IFrame API once, shared across all players on the page.
function loadYouTubeAPI() {
  if (window.YT && window.YT.Player) return Promise.resolve();
  if (apiPromise) return apiPromise;

  apiPromise = new Promise(function (resolve) {
    var prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = function () {
      if (typeof prev === 'function') prev();
      resolve();
    };
    if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
      var s = document.createElement('script');
      s.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(s);
    }
  });
  return apiPromise;
}

export function initYouTubePlayer(scope) {
  scope = scope || document;
  var els = scope.querySelectorAll('[data-youtube-player-init]');
  if (!els.length) return;

  loadYouTubeAPI().then(function () {
    els.forEach(setupPlayer);
  });
}

function setupPlayer(youtubeElement, index) {
  var listeners = [];
  var pollTimer = null;

  function addListener(el, type, handler) {
    el.addEventListener(type, handler);
    listeners.push({ el: el, type: type, handler: handler });
  }

  // Build the iframe [src] from the video ID — enablejsapi=1 is baked in here
  // so editors only ever supply the ID, never a full embed URL.
  var youtubeVideoID = youtubeElement.getAttribute('data-youtube-video-id');
  if (!youtubeVideoID) return;

  var iframe = youtubeElement.querySelector('iframe');
  if (!iframe) return;

  var youtubeVideoURL =
    'https://www.youtube.com/embed/' + youtubeVideoID +
    '?enablejsapi=1&playsinline=1&controls=0&rel=0&modestbranding=1&mute=1' +
    '&origin=' + encodeURIComponent(window.location.origin);
  iframe.setAttribute('src', youtubeVideoURL);
  iframe.setAttribute('allow', 'autoplay; encrypted-media; fullscreen; picture-in-picture');

  // Assign IDs (mirrors Vimeo — fullscreen + player lookup use them)
  var videoIndexID = 'youtube-player-advanced-index-' + index;
  youtubeElement.setAttribute('id', videoIndexID);
  var iframeID = videoIndexID + '-iframe';
  iframe.setAttribute('id', iframeID);

  // ----- cover sizing -----
  // YT IFrame API exposes no intrinsic dimensions, so assume 16:9 unless told.
  var aspectAttr = youtubeElement.getAttribute('data-youtube-aspect') || '16:9';
  var aspectParts = aspectAttr.split(':');
  var videoAspectRatio = (parseFloat(aspectParts[1]) || 9) / (parseFloat(aspectParts[0]) || 16);

  var updateSize = youtubeElement.getAttribute('data-youtube-update-size');

  if (updateSize === 'true') {
    var beforeEl = youtubeElement.querySelector('.youtube-player__before, .vimeo-player__before');
    if (beforeEl) beforeEl.style.paddingTop = videoAspectRatio * 100 + '%';
  }

  function adjustVideoSizing() {
    var containerRatio = youtubeElement.offsetHeight / youtubeElement.offsetWidth;
    var iframeWrapper = youtubeElement.querySelector('.youtube-player__iframe, .vimeo-player__iframe');
    if (iframeWrapper && videoAspectRatio) {
      if (containerRatio > videoAspectRatio) {
        iframeWrapper.style.width = (containerRatio / videoAspectRatio) * 100 + '%';
        iframeWrapper.style.height = '100%';
      } else {
        iframeWrapper.style.height = (videoAspectRatio / containerRatio) * 100 + '%';
        iframeWrapper.style.width = '100%';
      }
    }
  }

  if (updateSize === 'cover') {
    var beforeCover = youtubeElement.querySelector('.youtube-player__before, .vimeo-player__before');
    if (beforeCover) beforeCover.style.paddingTop = '0%';
    adjustVideoSizing();
    addListener(window, 'resize', adjustVideoSizing);
  }

  // ----- build the player -----
  var player = new YT.Player(iframeID, {
    events: {
      onReady: onReady,
      onStateChange: onStateChange
    }
  });

  // ----- tracking (GTM dataLayer) -----
  var trackingOn = youtubeElement.getAttribute('data-youtube-track') !== 'false';
  var milestonesHit = {};

  function pushDataLayer(event, percent) {
    if (!trackingOn) return;
    window.dataLayer = window.dataLayer || [];
    var data = {};
    var duration = 0;
    try {
      data = (player.getVideoData && player.getVideoData()) || {};
      duration = (player.getDuration && player.getDuration()) || 0;
    } catch (e) {}
    window.dataLayer.push({
      event: event,
      video_provider: 'youtube',
      video_title: data.title || '',
      video_id: data.video_id || youtubeVideoID,
      video_url: (player.getVideoUrl && player.getVideoUrl()) || '',
      video_duration: Math.round(duration),
      video_current_time: Math.round((player.getCurrentTime && player.getCurrentTime()) || 0),
      video_percent: percent != null ? percent : undefined
    });
  }

  // ----- helpers -----
  function secondsTimeSpanToHMS(s) {
    s = Math.trunc(s);
    var h = Math.floor(s / 3600); s -= h * 3600;
    var m = Math.floor(s / 60); s -= m * 60;
    return m + ':' + (s < 10 ? '0' + s : s);
  }

  var youtubeDuration = youtubeElement.querySelector('[data-youtube-duration]');
  var timelineElem = youtubeElement.querySelector('[data-youtube-control="timeline"]');
  var progressElem = youtubeElement.querySelector('progress');

  function setMaxFromDuration() {
    var duration = (player.getDuration && player.getDuration()) || 0;
    if (youtubeDuration) youtubeDuration.textContent = secondsTimeSpanToHMS(duration);
    youtubeElement.querySelectorAll('[data-youtube-control="timeline"], progress')
      .forEach(function (el) { el.setAttribute('max', duration); });
  }

  // Poll for timeline + progress + tracking milestones (no timeupdate event in YT)
  function startPolling() {
    if (pollTimer) return;
    pollTimer = setInterval(function () {
      var t = (player.getCurrentTime && player.getCurrentTime()) || 0;
      var d = (player.getDuration && player.getDuration()) || 0;
      if (timelineElem) timelineElem.value = t;
      if (progressElem) progressElem.value = t;
      if (youtubeDuration) youtubeDuration.textContent = secondsTimeSpanToHMS(t);

      if (trackingOn && d > 0) {
        var pct = (t / d) * 100;
        [25, 50, 75].forEach(function (mark) {
          if (pct >= mark && !milestonesHit[mark]) {
            milestonesHit[mark] = true;
            pushDataLayer('video_progress', mark);
          }
        });
      }
    }, 250);
  }
  function stopPolling() { clearInterval(pollTimer); pollTimer = null; }

  // ----- ready -----
  function onReady() {
    setMaxFromDuration();

    if (youtubeElement.getAttribute('data-youtube-autoplay') === 'false') {
      player.unMute();
      player.pauseVideo();
    } else {
      player.mute();
      youtubeElement.setAttribute('data-youtube-muted', 'true');
      if (youtubeElement.getAttribute('data-youtube-paused-by-user') === 'false') {
        checkVisibility();
        addListener(window, 'scroll', checkVisibility);
      }
    }
  }

  // ----- state -> attributes + tracking -----
  function onStateChange(e) {
    if (e.data === YT.PlayerState.PLAYING) {
      youtubeElement.setAttribute('data-youtube-loaded', 'true');
      youtubeElement.setAttribute('data-youtube-playing', 'true');
      if (trackingOn && !milestonesHit.started) {
        milestonesHit.started = true;
        pushDataLayer('video_start', 0);
      }
      startPolling();
    } else if (e.data === YT.PlayerState.PAUSED) {
      youtubeElement.setAttribute('data-youtube-playing', 'false');
      stopPolling();
      pushDataLayer('video_pause');
    } else if (e.data === YT.PlayerState.ENDED) {
      stopPolling();
      pushDataLayer('video_complete', 100);
      milestonesHit = {}; // allow re-tracking on replay
      if (youtubeElement.getAttribute('data-youtube-autoplay') === 'false') {
        youtubeElement.setAttribute('data-youtube-activated', 'false');
        youtubeElement.setAttribute('data-youtube-playing', 'false');
      } else {
        player.playVideo();
      }
    }
  }

  // ----- scroll visibility autoplay -----
  function checkVisibility() {
    var rect = youtubeElement.getBoundingClientRect();
    var inView = rect.top < window.innerHeight && rect.bottom > 0;
    inView ? youtubePlayerPlay() : youtubePlayerPause();
  }
  function youtubePlayerPlay() {
    youtubeElement.setAttribute('data-youtube-activated', 'true');
    youtubeElement.setAttribute('data-youtube-playing', 'true');
    player.playVideo();
  }
  function youtubePlayerPause() { player.pauseVideo(); }

  // ----- controls -----
  var playBtn = youtubeElement.querySelector('[data-youtube-control="play"]');
  if (playBtn) addListener(playBtn, 'click', function () {
    youtubePlayerPlay();
    youtubeElement.getAttribute('data-youtube-muted') === 'true' ? player.mute() : player.unMute();
  });

  var pauseBtn = youtubeElement.querySelector('[data-youtube-control="pause"]');
  if (pauseBtn) addListener(pauseBtn, 'click', function () {
    youtubePlayerPause();
    if (youtubeElement.getAttribute('data-youtube-autoplay') === 'true') {
      youtubeElement.setAttribute('data-youtube-paused-by-user', 'true');
      window.removeEventListener('scroll', checkVisibility);
    }
  });

  var muteBtn = youtubeElement.querySelector('[data-youtube-control="mute"]');
  if (muteBtn) addListener(muteBtn, 'click', function () {
    if (youtubeElement.getAttribute('data-youtube-muted') === 'false') {
      player.mute();
      youtubeElement.setAttribute('data-youtube-muted', 'true');
    } else {
      player.unMute();
      youtubeElement.setAttribute('data-youtube-muted', 'false');
    }
  });

  // Fullscreen (identical to Vimeo — request on the wrapper element)
  var fullscreenSupported = !!(
    document.fullscreenEnabled || document.webkitFullscreenEnabled ||
    document.mozFullScreenEnabled || document.msFullscreenEnabled
  );
  var fullscreenBtn = youtubeElement.querySelector('[data-youtube-control="fullscreen"]');
  if (!fullscreenSupported && fullscreenBtn) fullscreenBtn.style.display = 'none';

  if (fullscreenBtn) addListener(fullscreenBtn, 'click', function () {
    var el = document.getElementById(videoIndexID);
    if (!el) return;
    var isFs = document.fullscreenElement || document.webkitFullscreenElement ||
      document.mozFullScreenElement || document.msFullscreenElement;
    if (isFs) {
      youtubeElement.setAttribute('data-youtube-fullscreen', 'false');
      (document.exitFullscreen || document.webkitExitFullscreen ||
        document.mozCancelFullScreen || document.msExitFullscreen).call(document);
    } else {
      youtubeElement.setAttribute('data-youtube-fullscreen', 'true');
      (el.requestFullscreen || el.webkitRequestFullscreen ||
        el.mozRequestFullScreen || el.msRequestFullscreen).call(el);
    }
  });

  function handleFullscreenChange() {
    var isFs = document.fullscreenElement || document.webkitFullscreenElement ||
      document.mozFullScreenElement || document.msFullscreenElement;
    youtubeElement.setAttribute('data-youtube-fullscreen', isFs ? 'true' : 'false');
  }
  ['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange', 'msfullscreenchange']
    .forEach(function (ev) { addListener(document, ev, handleFullscreenChange); });

  // Timeline scrub
  function seekFromTimeline() {
    if (!timelineElem) return;
    player.seekTo(parseFloat(timelineElem.value), true);
    if (progressElem) progressElem.value = timelineElem.value;
  }
  if (timelineElem) {
    addListener(timelineElem, 'input', seekFromTimeline);
    addListener(timelineElem, 'change', seekFromTimeline);
  }

  // Hide controls after hover (mirrors Vimeo)
  var hoverTimer;
  addListener(youtubeElement, 'mousemove', function () {
    if (youtubeElement.getAttribute('data-youtube-hover') === 'false') {
      youtubeElement.setAttribute('data-youtube-hover', 'true');
    }
    clearTimeout(hoverTimer);
    hoverTimer = setTimeout(function () {
      youtubeElement.setAttribute('data-youtube-hover', 'false');
    }, 3000);
  });

  // Cleanup
  cleanups.push(function () {
    listeners.forEach(function (l) { l.el.removeEventListener(l.type, l.handler); });
    clearTimeout(hoverTimer);
    stopPolling();
    if (player && player.destroy) player.destroy();
  });
}

export function destroyYouTubePlayer() {
  cleanups.forEach(function (fn) { fn(); });
  cleanups = [];
}
