// -----------------------------------------
// VIMEO PLAYER
// [data-vimeo-player-init]
// Requires Vimeo Player SDK on CDN
// Attrs: data-vimeo-video-id, data-vimeo-update-size ("true"|"cover"),
//        data-vimeo-autoplay ("true"|"false"), data-vimeo-paused-by-user
// Controls: [data-vimeo-control="play|pause|mute|fullscreen|timeline"]
// -----------------------------------------

let cleanups = [];

export function initVimeoPlayer(scope) {
  scope = scope || document;
  if (typeof Vimeo === 'undefined') return;

  const vimeoPlayers = scope.querySelectorAll('[data-vimeo-player-init]');
  if (!vimeoPlayers.length) return;

  vimeoPlayers.forEach(function (vimeoElement, index) {
    var listeners = [];

    function addListener(el, type, handler) {
      el.addEventListener(type, handler);
      listeners.push({ el: el, type: type, handler: handler });
    }

    // Add Vimeo URL ID to the iframe [src]
    var vimeoVideoID = vimeoElement.getAttribute('data-vimeo-video-id');
    if (!vimeoVideoID) return;

    var vimeoVideoURL = 'https://player.vimeo.com/video/' + vimeoVideoID + '?api=1&background=1&autoplay=0&loop=0&muted=1';
    var iframe = vimeoElement.querySelector('iframe');
    if (!iframe) return;
    iframe.setAttribute('src', vimeoVideoURL);

    // Assign an ID to each element
    var videoIndexID = 'vimeo-player-advanced-index-' + index;
    vimeoElement.setAttribute('id', videoIndexID);

    var player = new Vimeo.Player(videoIndexID);

    // Update Aspect Ratio if [data-vimeo-update-size="true"]
    if (vimeoElement.getAttribute('data-vimeo-update-size') === 'true') {
      player.getVideoWidth().then(function (width) {
        player.getVideoHeight().then(function (height) {
          var beforeEl = vimeoElement.querySelector('.vimeo-player__before');
          if (beforeEl) {
            beforeEl.style.paddingTop = (height / width) * 100 + '%';
          }
        });
      });
    }

    // Update sizing if [data-vimeo-update-size="cover"]
    var videoAspectRatio;

    if (vimeoElement.getAttribute('data-vimeo-update-size') === 'cover') {
      player.getVideoWidth().then(function (width) {
        player.getVideoHeight().then(function (height) {
          videoAspectRatio = height / width;
          var beforeEl = vimeoElement.querySelector('.vimeo-player__before');
          if (beforeEl) {
            beforeEl.style.paddingTop = '0%';
          }
          adjustVideoSizing();
        });
      });
    }

    function adjustVideoSizing() {
      var containerRatio = vimeoElement.offsetHeight / vimeoElement.offsetWidth;
      var iframeWrapper = vimeoElement.querySelector('.vimeo-player__iframe');
      if (iframeWrapper && videoAspectRatio) {
        if (containerRatio > videoAspectRatio) {
          var widthFactor = containerRatio / videoAspectRatio;
          iframeWrapper.style.width = widthFactor * 100 + '%';
          iframeWrapper.style.height = '100%';
        } else {
          var heightFactor = videoAspectRatio / containerRatio;
          iframeWrapper.style.height = heightFactor * 100 + '%';
          iframeWrapper.style.width = '100%';
        }
      }
    }

    if (vimeoElement.getAttribute('data-vimeo-update-size') === 'cover') {
      addListener(window, 'resize', adjustVideoSizing);
    }

    // Loaded & play
    player.on('play', function () {
      vimeoElement.setAttribute('data-vimeo-loaded', 'true');
      vimeoElement.setAttribute('data-vimeo-playing', 'true');
    });

    // Scroll-based visibility check (declared here so pause btn can remove it)
    function checkVisibility() {
      var rect = vimeoElement.getBoundingClientRect();
      var inView = rect.top < window.innerHeight && rect.bottom > 0;
      inView ? vimeoPlayerPlay() : vimeoPlayerPause();
    }

    // Autoplay
    if (vimeoElement.getAttribute('data-vimeo-autoplay') === 'false') {
      player.setVolume(1);
      player.pause();
    } else {
      player.setVolume(0);
      vimeoElement.setAttribute('data-vimeo-muted', 'true');

      if (vimeoElement.getAttribute('data-vimeo-paused-by-user') === 'false') {
        checkVisibility();
        addListener(window, 'scroll', checkVisibility);
      }
    }

    function vimeoPlayerPlay() {
      vimeoElement.setAttribute('data-vimeo-activated', 'true');
      vimeoElement.setAttribute('data-vimeo-playing', 'true');
      player.play();
    }

    function vimeoPlayerPause() {
      player.pause();
    }

    // Paused
    player.on('pause', function () {
      vimeoElement.setAttribute('data-vimeo-playing', 'false');
    });

    // Click: Play
    var playBtn = vimeoElement.querySelector('[data-vimeo-control="play"]');
    if (playBtn) {
      addListener(playBtn, 'click', function () {
        player.setVolume(0);
        vimeoPlayerPlay();
        if (vimeoElement.getAttribute('data-vimeo-muted') === 'true') {
          player.setVolume(0);
        } else {
          player.setVolume(1);
        }
      });
    }

    // Click: Pause
    var pauseBtn = vimeoElement.querySelector('[data-vimeo-control="pause"]');
    if (pauseBtn) {
      addListener(pauseBtn, 'click', function () {
        vimeoPlayerPause();
        if (vimeoElement.getAttribute('data-vimeo-autoplay') === 'true') {
          vimeoElement.setAttribute('data-vimeo-paused-by-user', 'true');
          window.removeEventListener('scroll', checkVisibility);
        }
      });
    }

    // Click: Mute
    var muteBtn = vimeoElement.querySelector('[data-vimeo-control="mute"]');
    if (muteBtn) {
      addListener(muteBtn, 'click', function () {
        if (vimeoElement.getAttribute('data-vimeo-muted') === 'false') {
          player.setVolume(0);
          vimeoElement.setAttribute('data-vimeo-muted', 'true');
        } else {
          player.setVolume(1);
          vimeoElement.setAttribute('data-vimeo-muted', 'false');
        }
      });
    }

    // Fullscreen
    var fullscreenSupported = !!(
      document.fullscreenEnabled ||
      document.webkitFullscreenEnabled ||
      document.mozFullScreenEnabled ||
      document.msFullscreenEnabled
    );

    var fullscreenBtn = vimeoElement.querySelector('[data-vimeo-control="fullscreen"]');

    if (!fullscreenSupported && fullscreenBtn) {
      fullscreenBtn.style.display = 'none';
    }

    if (fullscreenBtn) {
      addListener(fullscreenBtn, 'click', function () {
        var fullscreenElement = document.getElementById(videoIndexID);
        if (!fullscreenElement) return;

        var isFullscreen =
          document.fullscreenElement ||
          document.webkitFullscreenElement ||
          document.mozFullScreenElement ||
          document.msFullscreenElement;

        if (isFullscreen) {
          vimeoElement.setAttribute('data-vimeo-fullscreen', 'false');
          (document.exitFullscreen ||
            document.webkitExitFullscreen ||
            document.mozCancelFullScreen ||
            document.msExitFullscreen).call(document);
        } else {
          vimeoElement.setAttribute('data-vimeo-fullscreen', 'true');
          (fullscreenElement.requestFullscreen ||
            fullscreenElement.webkitRequestFullscreen ||
            fullscreenElement.mozRequestFullScreen ||
            fullscreenElement.msRequestFullscreen).call(fullscreenElement);
        }
      });
    }

    function handleFullscreenChange() {
      var isFullscreen =
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement;
      vimeoElement.setAttribute('data-vimeo-fullscreen', isFullscreen ? 'true' : 'false');
    }

    ['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange', 'msfullscreenchange'].forEach(function (event) {
      addListener(document, event, handleFullscreenChange);
    });

    // Convert seconds to mm:ss
    function secondsTimeSpanToHMS(s) {
      var h = Math.floor(s / 3600);
      s -= h * 3600;
      var m = Math.floor(s / 60);
      s -= m * 60;
      return m + ':' + (s < 10 ? '0' + s : s);
    }

    // Duration
    var vimeoDuration = vimeoElement.querySelector('[data-vimeo-duration]');
    player.getDuration().then(function (duration) {
      if (vimeoDuration) {
        vimeoDuration.textContent = secondsTimeSpanToHMS(duration);
      }
      var timelineAndProgress = vimeoElement.querySelectorAll('[data-vimeo-control="timeline"], progress');
      timelineAndProgress.forEach(function (el) {
        el.setAttribute('max', duration);
      });
    });

    // Timeline
    var timelineElem = vimeoElement.querySelector('[data-vimeo-control="timeline"]');
    var progressElem = vimeoElement.querySelector('progress');

    function updateTimelineValue() {
      player.getDuration().then(function () {
        var timeVal = timelineElem.value;
        player.setCurrentTime(timeVal);
        if (progressElem) {
          progressElem.value = timeVal;
        }
      });
    }

    if (timelineElem) {
      addListener(timelineElem, 'input', updateTimelineValue);
      addListener(timelineElem, 'change', updateTimelineValue);
    }

    // Progress Time & Timeline (timeupdate)
    player.on('timeupdate', function (data) {
      if (timelineElem) {
        timelineElem.value = data.seconds;
      }
      if (progressElem) {
        progressElem.value = data.seconds;
      }
      if (vimeoDuration) {
        vimeoDuration.textContent = secondsTimeSpanToHMS(Math.trunc(data.seconds));
      }
    });

    // Hide controls after hover
    var vimeoHoverTimer;
    addListener(vimeoElement, 'mousemove', function () {
      if (vimeoElement.getAttribute('data-vimeo-hover') === 'false') {
        vimeoElement.setAttribute('data-vimeo-hover', 'true');
      }
      clearTimeout(vimeoHoverTimer);
      vimeoHoverTimer = setTimeout(function () {
        vimeoElement.setAttribute('data-vimeo-hover', 'false');
      }, 3000);
    });

    // Video Ended
    player.on('ended', function () {
      if (vimeoElement.getAttribute('data-vimeo-autoplay') === 'false') {
        vimeoElement.setAttribute('data-vimeo-activated', 'false');
        vimeoElement.setAttribute('data-vimeo-playing', 'false');
        player.unload();
      } else {
        player.play();
      }
    });

    // Cleanup function
    cleanups.push(function () {
      listeners.forEach(function (l) { l.el.removeEventListener(l.type, l.handler); });
      clearTimeout(vimeoHoverTimer);
      player.destroy();
    });
  });
}

export function destroyVimeoPlayer() {
  cleanups.forEach(function (fn) { fn(); });
  cleanups = [];
}
