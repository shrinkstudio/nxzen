// -----------------------------------------
// DIRECTIONAL LIST HOVER
// [data-directional-hover] with [data-directional-hover-item] + [data-directional-hover-tile]
// Attrs: data-type ("all" | "x" | "y")
// -----------------------------------------

let listeners = [];

export function initDirectionalHover(scope) {
  scope = scope || document;

  const directionMap = {
    top: 'translateY(-100%)',
    bottom: 'translateY(100%)',
    left: 'translateX(-100%)',
    right: 'translateX(100%)'
  };

  function getDirection(event, el, type) {
    const { left, top, width: w, height: h } = el.getBoundingClientRect();
    const x = event.clientX - left;
    const y = event.clientY - top;

    if (type === 'y') return y < h / 2 ? 'top' : 'bottom';
    if (type === 'x') return x < w / 2 ? 'left' : 'right';

    const distances = { top: y, right: w - x, bottom: h - y, left: x };
    return Object.entries(distances).reduce((a, b) => (a[1] < b[1] ? a : b))[0];
  }

  scope.querySelectorAll('[data-directional-hover]').forEach(container => {
    const type = container.getAttribute('data-type') || 'all';

    container.querySelectorAll('[data-directional-hover-item]').forEach(item => {
      const tile = item.querySelector('[data-directional-hover-tile]');
      if (!tile) return;

      function onEnter(e) {
        const dir = getDirection(e, item, type);
        tile.style.transition = 'none';
        tile.style.transform = directionMap[dir] || 'translate(0, 0)';
        void tile.offsetHeight;
        tile.style.transition = '';
        tile.style.transform = 'translate(0%, 0%)';
        item.setAttribute('data-status', `enter-${dir}`);
      }

      function onLeave(e) {
        const dir = getDirection(e, item, type);
        item.setAttribute('data-status', `leave-${dir}`);
        tile.style.transform = directionMap[dir] || 'translate(0, 0)';
      }

      item.addEventListener('mouseenter', onEnter);
      item.addEventListener('mouseleave', onLeave);

      listeners.push(
        { el: item, event: 'mouseenter', fn: onEnter },
        { el: item, event: 'mouseleave', fn: onLeave }
      );
    });
  });
}

export function destroyDirectionalHover() {
  listeners.forEach(({ el, event, fn }) => el.removeEventListener(event, fn));
  listeners = [];
}
