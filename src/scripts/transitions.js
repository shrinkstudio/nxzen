// -----------------------------------------
// NXZEN — INIT REGISTRY
// GSAP + Lenis + Module Init/Destroy
// -----------------------------------------

import { initThemeToggle } from './theme-toggle.js';
import { initAccordions } from './accordion.js';
import { initTabs } from './tabs.js';
import { initSliders } from './slider.js';
import { initInlineVideos } from './inline-video.js';
import { initModalDelegation, initModals } from './modal.js';
import { initFontSizeDetect, initFooterYear, initSkipLink } from './utilities.js';
import { initNavScrollHide } from './nav.js';
import { initFormValidation } from './form-validate.js';
import { initContentRevealScroll } from './reveal.js';
import { initNumberOdometer } from './odometer.js';
import { initMediaSetup } from './media.js';
import { initReadTime } from './read-time.js';
import { initTOC } from './toc.js';
import { initPixelBlast } from './pixel-blast.js';
import { initHighlightText } from './highlight-text.js';
import { initMiniShowreel } from './mini-showreel.js';
import { initDirectionalHover } from './directional-hover.js';
import { initVimeoPlayer } from './vimeo-player.js';
import { initSocialShare } from './social-share.js';
import { initAcceleratingGlobe } from './accelerating-globe.js';
import { initCopyLink } from './copy-link.js';
import { initPdfEmbed } from './pdf-embed.js';

gsap.registerPlugin(CustomEase);

let lenis = null;

const hasLenis = typeof window.Lenis !== "undefined";
const hasScrollTrigger = typeof window.ScrollTrigger !== "undefined";

let staggerDefault = 0.05;
let durationDefault = 0.6;

CustomEase.create("osmo", "0.625, 0.05, 0, 1");
gsap.defaults({ ease: "osmo", duration: durationDefault });

const has = (s) => !!document.querySelector(s);


// -----------------------------------------
// INIT
// -----------------------------------------

function init() {
  initLenis();

  // Document-level delegation (bind once)
  initModalDelegation();
  initFontSizeDetect();
  initSkipLink();
  initCopyLink();

  // Page-scoped modules
  if (document.querySelector('.nav'))               initNavScrollHide(document);
  if (has('[data-theme-toggle]'))                   initThemeToggle(document);
  if (has('details'))                               initAccordions(document);
  if (has('[data-tabs-component]'))                 initTabs(document);
  if (has('[data-slider]'))                         initSliders(document);
  if (has('[data-video]'))                          initInlineVideos(document);
  if (has('dialog'))                                initModals(document);
  if (has('[data-form-validate]'))                  initFormValidation(document);
  if (has('[data-footer-year]'))                    initFooterYear(document);
  if (has('[data-reveal-group]'))                   initContentRevealScroll(document);
  if (has('[data-odometer-group]'))                 initNumberOdometer(document);
  if (has('[data-media-init]'))                     initMediaSetup(document);
  if (has('[data-read-time]'))                      initReadTime(document);
  if (has('[data-toc-source]'))                     initTOC(document);
  if (has('[data-pixel-blast]'))                    initPixelBlast(document);
  if (has('[data-highlight-text]'))                 initHighlightText(document);
  if (has('[data-mini-showreel-open]'))             initMiniShowreel(document);
  if (has('[data-directional-hover]'))              initDirectionalHover(document);
  if (has('[data-vimeo-player-init]'))              initVimeoPlayer(document);
  if (has('[data-social-share]'))                   initSocialShare(document);
  if (has('[data-accelerating-globe]'))             initAcceleratingGlobe(document);
  if (has('[data-pdf-embed]'))                      initPdfEmbed(document);

  // Theme
  applyTheme();
}

document.addEventListener('DOMContentLoaded', init);


// -----------------------------------------
// HELPERS
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

function applyTheme() {
  const container = document.querySelector('[data-page-theme]');
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
