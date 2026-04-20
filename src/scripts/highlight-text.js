// -----------------------------------------
// HIGHLIGHT TEXT ON SCROLL (Scrub)
// [data-highlight-text]
// Attrs: data-highlight-scroll-start, data-highlight-scroll-end,
//        data-highlight-fade, data-highlight-stagger
// -----------------------------------------

let ctx = null;

export function initHighlightText(scope) {
  scope = scope || document;
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined' || typeof SplitText === 'undefined') return;

  ctx = gsap.context(() => {

    scope.querySelectorAll('[data-highlight-text]').forEach((heading) => {
      const scrollStart = heading.getAttribute('data-highlight-scroll-start') || 'top 90%';
      const scrollEnd = heading.getAttribute('data-highlight-scroll-end') || 'center 40%';
      const fadedValue = parseFloat(heading.getAttribute('data-highlight-fade')) || 0.2;
      const staggerValue = parseFloat(heading.getAttribute('data-highlight-stagger')) || 0.1;

      new SplitText(heading, {
        type: 'words, chars',
        autoSplit: true,
        onSplit(self) {
          const splitCtx = gsap.context(() => {
            gsap.timeline({
              scrollTrigger: {
                scrub: true,
                trigger: heading,
                start: scrollStart,
                end: scrollEnd,
              }
            }).from(self.chars, {
              autoAlpha: fadedValue,
              stagger: staggerValue,
              ease: 'linear',
            });
          });
          return splitCtx;
        }
      });
    });

  }, scope);
}

export function destroyHighlightText() {
  if (ctx) {
    ctx.revert();
    ctx = null;
  }
}
