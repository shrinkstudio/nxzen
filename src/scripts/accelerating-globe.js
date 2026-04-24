// -----------------------------------------
// ACCELERATING GLOBE
// [data-accelerating-globe] with 8+ [data-accelerating-globe-circle] children
// Loops a width animation, speeds up on scroll velocity
// -----------------------------------------

let cleanups = [];

export function initAcceleratingGlobe(scope) {
  scope = scope || document;
  if (typeof gsap === 'undefined') return;

  scope.querySelectorAll('[data-accelerating-globe]').forEach(function (globe) {
    var circles = globe.querySelectorAll('[data-accelerating-globe-circle]');
    if (circles.length < 8) return;

    var tl = gsap.timeline({
      repeat: -1,
      defaults: { duration: 1, ease: 'none' }
    });

    var widths = [
      ['50%', '37.5%'],
      ['37.5%', '25%'],
      ['25%', '12.5%'],
      ['calc(12.5% + 1px)', 'calc(0% + 1px)'],
      ['calc(0% + 1px)', 'calc(12.5% + 1px)'],
      ['12.5%', '25%'],
      ['25%', '37.5%'],
      ['37.5%', '50%']
    ];

    circles.forEach(function (el, i) {
      var fromW = widths[i][0];
      var toW = widths[i][1];
      tl.fromTo(el, { width: fromW }, { width: toW }, i === 0 ? 0 : '<');
    });

    var lastY = window.scrollY;
    var lastT = performance.now();
    var stopTimeout;

    function onScroll() {
      var now = performance.now();
      var dy = window.scrollY - lastY;
      var dt = now - lastT;
      lastY = window.scrollY;
      lastT = now;

      var velocity = dt > 0 ? (dy / dt) * 1000 : 0;
      var boost = Math.abs(velocity * 0.005);
      var targetScale = boost + 1;

      tl.timeScale(targetScale);

      clearTimeout(stopTimeout);
      stopTimeout = setTimeout(function () {
        gsap.to(tl, {
          timeScale: 1,
          duration: 0.6,
          ease: 'power2.out',
          overwrite: true
        });
      }, 100);
    }

    window.addEventListener('scroll', onScroll, { passive: true });

    cleanups.push(function () {
      window.removeEventListener('scroll', onScroll);
      clearTimeout(stopTimeout);
      tl.kill();
    });
  });
}

export function destroyAcceleratingGlobe() {
  cleanups.forEach(function (fn) { fn(); });
  cleanups = [];
}
