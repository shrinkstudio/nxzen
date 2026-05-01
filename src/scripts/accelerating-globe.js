// -----------------------------------------
// ACCELERATING GLOBE
// [data-accelerating-globe] with 8+ [data-accelerating-globe-circle] children
// Loops a width animation at a constant speed
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

    cleanups.push(function () {
      tl.kill();
    });
  });
}

export function destroyAcceleratingGlobe() {
  cleanups.forEach(function (fn) { fn(); });
  cleanups = [];
}
