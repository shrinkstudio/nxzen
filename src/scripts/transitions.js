// -----------------------------------------
// NXZEN — PAGE TRANSITION BOILERPLATE
// Barba.js + GSAP + Lenis + Pixel Grid Transition
// -----------------------------------------

import { initThemeToggle } from './theme-toggle.js';
import { initAccordions, destroyAccordions } from './accordion.js';
import { initTabs, destroyTabs } from './tabs.js';
import { initSliders, destroySliders } from './slider.js';
import { initInlineVideos, destroyInlineVideos } from './inline-video.js';
import { initModalDelegation, initModals, destroyModals } from './modal.js';
import { initFontSizeDetect, initFooterYear, initSkipLink } from './utilities.js';
import { initNavScrollHide, destroyNavScrollHide } from './nav.js';
import { initFormValidation, destroyFormValidation } from './form-validate.js';

gsap.registerPlugin(CustomEase);

history.scrollRestoration = "manual";

let lenis = null;
let nextPage = document;
let onceFunctionsInitialized = false;

const hasLenis = typeof window.Lenis !== "undefined";
const hasScrollTrigger = typeof window.ScrollTrigger !== "undefined";

const rmMQ = window.matchMedia("(prefers-reduced-motion: reduce)");
let reducedMotion = rmMQ.matches;
rmMQ.addEventListener?.("change", e => (reducedMotion = e.matches));
rmMQ.addListener?.(e => (reducedMotion = e.matches));

const has = (s) => !!nextPage.querySelector(s);

let staggerDefault = 0.05;
let durationDefault = 0.6;

CustomEase.create("osmo", "0.625, 0.05, 0, 1");
gsap.defaults({ ease: "osmo", duration: durationDefault });


// -----------------------------------------
// FUNCTION REGISTRY
// -----------------------------------------

function initOnceFunctions() {
  initLenis();
  if (onceFunctionsInitialized) return;
  onceFunctionsInitialized = true;

  // Document-level delegation (bind once)
  initModalDelegation();
  initFontSizeDetect();
  initSkipLink();
}

function initBeforeEnterFunctions(next) {
  nextPage = next || document;

  // Destroy old instances before new page enters
  destroyNavScrollHide();
  destroyAccordions();
  destroyTabs();
  destroySliders();
  destroyInlineVideos();
  destroyModals();
  destroyFormValidation();
}

function initAfterEnterFunctions(next) {
  nextPage = next || document;

  // Nav is inside the barba container — scope to document so we find it after transition
  if (document.querySelector('.nav'))               initNavScrollHide(document);
  if (has('[data-theme-toggle]'))                   initThemeToggle(nextPage);
  if (has('details'))                               initAccordions(nextPage);
  if (has('[data-tabs-component]'))                 initTabs(nextPage);
  if (has('[data-slider]'))                         initSliders(nextPage);
  if (has('[data-video]'))                          initInlineVideos(nextPage);
  if (has('dialog'))                                initModals(nextPage);
  if (has('[data-form-validate]'))                  initFormValidation(nextPage);
  if (has('[data-footer-year]'))                    initFooterYear(nextPage);

  // Re-evaluate inline scripts inside the new container (Webflow embeds)
  reinitScripts(nextPage);

  // Webflow IX2 reinit — fixes native nav dropdowns
  if (window.Webflow && window.Webflow.ready) {
    window.Webflow.ready();
  }

  if (hasLenis) {
    lenis.resize();
  }

  if (hasScrollTrigger) {
    ScrollTrigger.refresh();
  }
}


// -----------------------------------------
// PAGE TRANSITIONS (Pixel Grid)
// -----------------------------------------

const pixelHorizontalAmount = 12;
const transitionDuration = 1;
const pixelFadeDuration = 0.2;
const pixelOverlap = 0.3;

function runPageOnceAnimation(next) {
  const tl = gsap.timeline();
  tl.call(() => {
    resetPage(next);
  }, null, 0);
  return tl;
}

function runPageLeaveAnimation(current, next) {
  const tl = gsap.timeline();

  if (reducedMotion) {
    tl.set(current, { autoAlpha: 0 });
    tl.call(() => current.remove(), null, 0);
    return tl;
  }

  // Run PixelGrid Helper
  const isPortrait = window.innerHeight > window.innerWidth;
  pixelGrid(isPortrait);

  const transitionWrap = document.querySelector("[data-transition-wrap]");
  const transitionPanel = transitionWrap.querySelector("[data-transition-panel]");
  const lines = Array.from(transitionPanel.querySelectorAll("[data-transition-col]"));
  const allPixels = transitionPanel.querySelectorAll("[data-transition-pixel]");

  const overlap = Math.max(0, Math.min(1, pixelOverlap));
  const clipFrom = isPortrait
    ? "polygon(0% 0%, 100% 0%, 100% 0%, 0% 0%)"
    : "polygon(0% 0%, 0% 0%, 0% 100%, 0% 100%)";
  const clipTo = isPortrait
    ? "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)"
    : "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)";

  const clipStart = Math.min(pixelFadeDuration, transitionDuration * 0.5);
  const clipDuration = Math.max(0.001, transitionDuration - 2 * clipStart);
  const stepDur = clipDuration / Math.max(1, pixelHorizontalAmount);
  const transitionEndDelay = transitionDuration / Math.max(1, pixelHorizontalAmount);

  gsap.set(allPixels, { opacity: 0, willChange: "opacity" });
  gsap.set(transitionPanel, { opacity: 1, willChange: "opacity" });
  gsap.set(next, {
    autoAlpha: 1,
    clipPath: clipFrom,
    webkitClipPath: clipFrom,
    willChange: "clip-path",
    force3D: true,
    maxHeight: "100dvh"
  });

  lines.forEach((line, i) => {
    const pixels = Array.from(line.querySelectorAll("[data-transition-pixel]"));
    if (!pixels.length) return;

    const revealTime = clipStart + i * stepDur;
    const fillStart = Math.max(0, revealTime - pixelFadeDuration);
    const fadeStart = Math.min(transitionDuration, revealTime + stepDur);
    const fadeEnd = Math.min(transitionDuration, fadeStart + pixelFadeDuration);
    const perPixelMin = pixelFadeDuration / pixels.length;
    const perPixelDur = perPixelMin * (1 - overlap) + pixelFadeDuration * overlap;
    const spread = Math.max(0, pixelFadeDuration - perPixelDur);

    // Animate Pixels In
    tl.to(pixels, {
      opacity: 1,
      duration: Math.max(0.001, perPixelDur),
      ease: "none",
      stagger: {
        amount: spread,
        from: "random"
      }
    }, fillStart);

    // Animate Pixels Out
    tl.to(pixels, {
      opacity: 0,
      duration: Math.max(0.001, perPixelDur),
      ease: "none",
      stagger: {
        amount: spread,
        from: "random"
      }
    }, fadeStart);
  });

  // Animate Clip Path
  tl.to(next, {
    clipPath: clipTo,
    webkitClipPath: clipTo,
    ease: `steps(${pixelHorizontalAmount}, start)`,
    duration: clipDuration
  }, clipStart);

  tl.set(next, {
    clearProps: "clipPath,webkitClipPath,willChange,force3D,maxHeight"
  }, clipStart + clipDuration);

  tl.call(() => {
    current.remove();
  }, null, transitionDuration + transitionEndDelay);

  tl.set(allPixels, { clearProps: "willChange" }, transitionDuration + transitionEndDelay);
  tl.set(transitionPanel, { clearProps: "willChange" }, transitionDuration + transitionEndDelay);

  return tl;
}

function runPageEnterAnimation(next) {
  const tl = gsap.timeline();
  const transitionEndDelay = transitionDuration / Math.max(1, pixelHorizontalAmount);

  if (reducedMotion) {
    tl.set(next, { autoAlpha: 1 });
    tl.add("pageReady");
    tl.call(resetPage, [next], "pageReady");
    return new Promise(resolve => tl.call(resolve, null, "pageReady"));
  }

  tl.add("pageReady", transitionDuration + transitionEndDelay);
  tl.call(resetPage, [next], "pageReady");

  return new Promise((resolve) => {
    tl.call(resolve, null, "pageReady");
  });
}


// -----------------------------------------
// HELPER: Pixel Grid
// -----------------------------------------

function pixelGrid(isPortrait) {
  const panel = document.querySelector("[data-transition-panel]");
  if (!panel) return;

  const rect = panel.getBoundingClientRect();
  panel.style.flexDirection = isPortrait ? "column" : "row";

  const lineSizePx = isPortrait
    ? rect.height / pixelHorizontalAmount
    : rect.width / pixelHorizontalAmount;
  const crossAmount = Math.ceil(
    (isPortrait ? rect.width : rect.height) / lineSizePx
  );

  let lines = panel.querySelectorAll("[data-transition-col]");
  const lineTemplate = lines[0];
  const pixelTemplate = lineTemplate.querySelector("[data-transition-pixel]");

  if (lines.length !== pixelHorizontalAmount) {
    const frag = document.createDocumentFragment();
    for (let i = 0; i < pixelHorizontalAmount; i++) {
      frag.appendChild(lineTemplate.cloneNode(false));
    }
    panel.replaceChildren(frag);
    lines = panel.querySelectorAll("[data-transition-col]");
  }

  lines.forEach((line) => {
    line.style.flexDirection = isPortrait ? "row" : "column";
    line.style.flex = "1 1 auto";
    line.style.justifyContent = "center";

    const diff = crossAmount - line.childElementCount;
    if (diff > 0) {
      const frag = document.createDocumentFragment();
      for (let i = 0; i < diff; i++) {
        frag.appendChild(pixelTemplate.cloneNode(true));
      }
      line.appendChild(frag);
    } else if (diff < 0) {
      for (let i = diff; i < 0; i++) {
        line.lastElementChild.remove();
      }
    }
  });
}


// -----------------------------------------
// BARBA HOOKS + INIT
// -----------------------------------------

barba.hooks.beforeEnter(data => {
  gsap.set(data.next.container, {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
  });

  if (lenis && typeof lenis.stop === "function") {
    lenis.stop();
  }

  initBeforeEnterFunctions(data.next.container);
  applyThemeFrom(data.next.container);
});

barba.hooks.afterLeave(() => {
  if (hasScrollTrigger) {
    ScrollTrigger.getAll().forEach(trigger => trigger.kill());
  }
});

barba.hooks.enter(data => {
  initBarbaNavUpdate(data);
});

barba.hooks.afterEnter(data => {
  initAfterEnterFunctions(data.next.container);

  if (hasLenis) {
    lenis.resize();
    lenis.start();
  }

  if (hasScrollTrigger) {
    ScrollTrigger.refresh();
  }
});

barba.init({
  debug: false,
  timeout: 7000,
  preventRunning: true,
  transitions: [
    {
      name: "default",
      sync: true,

      async once(data) {
        initOnceFunctions();
        return runPageOnceAnimation(data.next.container);
      },

      async leave(data) {
        return runPageLeaveAnimation(data.current.container, data.next.container);
      },

      async enter(data) {
        return runPageEnterAnimation(data.next.container);
      }
    }
  ],
});


// -----------------------------------------
// GENERIC + HELPERS
// -----------------------------------------

const themeConfig = {
  light: {
    nav: "dark",
    transition: "light"
  },
  dark: {
    nav: "light",
    transition: "dark"
  }
};

function applyThemeFrom(container) {
  const pageTheme = container?.dataset?.pageTheme || "light";
  const config = themeConfig[pageTheme] || themeConfig.light;

  document.body.dataset.pageTheme = pageTheme;
  const transitionEl = document.querySelector('[data-theme-transition]');
  if (transitionEl) {
    transitionEl.dataset.themeTransition = config.transition;
  }

  const nav = document.querySelector('[data-theme-nav]');
  if (nav) {
    nav.dataset.themeNav = config.nav;
  }
}

function initLenis() {
  if (lenis) return;
  if (!hasLenis) return;

  lenis = new Lenis({
    lerp: 0.165,
    wheelMultiplier: 1.25,
  });

  // Expose for nav scroll hide and other scripts
  window.__nxzenLenis = lenis;

  if (hasScrollTrigger) {
    lenis.on("scroll", ScrollTrigger.update);
  }

  gsap.ticker.add((time) => {
    lenis.raf(time * 1000);
  });

  gsap.ticker.lagSmoothing(0);
}

function resetPage(container) {
  window.scrollTo(0, 0);
  gsap.set(container, { clearProps: "position,top,left,right" });

  if (hasLenis) {
    lenis.resize();
    lenis.start();
  }
}

function reinitScripts(container) {
  container.querySelectorAll('script').forEach(oldScript => {
    const newScript = document.createElement('script');
    [...oldScript.attributes].forEach(attr => {
      newScript.setAttribute(attr.name, attr.value);
    });
    newScript.textContent = oldScript.textContent;
    oldScript.parentNode.replaceChild(newScript, oldScript);
  });
}

function initBarbaNavUpdate(data) {
  var tpl = document.createElement('template');
  tpl.innerHTML = data.next.html.trim();
  var nextNodes = tpl.content.querySelectorAll('[data-barba-update]');
  var currentNodes = document.querySelectorAll('nav [data-barba-update]');

  currentNodes.forEach(function (curr, index) {
    var next = nextNodes[index];
    if (!next) return;

    var newStatus = next.getAttribute('aria-current');
    if (newStatus !== null) {
      curr.setAttribute('aria-current', newStatus);
    } else {
      curr.removeAttribute('aria-current');
    }

    var newClassList = next.getAttribute('class') || '';
    curr.setAttribute('class', newClassList);
  });
}
