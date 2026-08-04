// -----------------------------------------
// NAV TRACKING — Paid-media interaction attributes (MEGA NAV)
// -----------------------------------------
// Stamps the paid-media data-track-* interaction schema onto the
// mega-nav at page load. The nav is custom-coded markup (mega-nav__*
// classes + data-* hooks), so a single JS decorator covers everything
// — main menus, sub-menu panel links, CTAs and the whitepaper banner —
// stamping the final rendered DOM. (Supersedes the earlier hybrid: the
// old .nav component this project used before the mega-nav migration is
// gone, so all tracking now lives here.)
//
// Schema (paid team's spec):
//   data-track-event="ui_interaction"
//   data-track-interaction-name="navigation_interaction"
//   data-track-interaction-type="menu_item | sub_menu_item | button | banner"
//   data-track-interaction-value="<lowercased label>"
//
// Markup hooks (mega-nav):
//   [data-menu-wrap]                       — nav root
//   .mega-nav__bar-link (:not(.is--back))  — top-level menu items (toggles + plain links)
//   .mega-nav__bar-link-label              — label span inside a bar link
//   .mega-nav__panel-link                  — dropdown/sub-menu links
//   .mega-nav__panel-link-text             — label span inside a panel link
//   .btn-icon-link.cc-text                 — in-panel buttons (Learn more, See all solutions)
//   .btn-icon-link:not(.cc-text)           — primary CTA (Get in touch)
//   a.u-link-cover                         — overlay cover links
//   .nav-banner-wrapper                    — whitepaper banner (sits outside the nav)
// -----------------------------------------

const EVENT = 'ui_interaction';
const NAME = 'navigation_interaction';
const LEGACY_ATTRS = ['data-track-category', 'data-track-label', 'data-track-event'];

function toValue(text) {
  return (text || '')
    .replace(/​/g, '')      // zero-width space (Webflow rich-text artifact)
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

// Prefer the explicit label element; fall back to the first child block
// (e.g. the Smart Utility link renders <div>title</div><div>desc</div>),
// then to the element's own text.
function labelOf(el) {
  const span = el.querySelector('.mega-nav__bar-link-label, .mega-nav__panel-link-text');
  if (span && span.textContent.trim()) return toValue(span.textContent);
  const div = el.querySelector('div');
  if (div && div.textContent.trim()) return toValue(div.textContent);
  return toValue(el.textContent);
}

function slugValue(el) {
  return ((el.getAttribute('href') || '').split('?')[0].replace(/\/$/, '').split('/').pop() || '')
    .replace(/-/g, ' ');
}

// Replace the legacy scheme and write the four attrs.
function stamp(el, type, value) {
  if (!el || !value) return;
  LEGACY_ATTRS.forEach((a) => el.removeAttribute(a));
  el.setAttribute('data-track-event', EVENT);
  el.setAttribute('data-track-interaction-name', NAME);
  el.setAttribute('data-track-interaction-type', type);
  el.setAttribute('data-track-interaction-value', value);
}

export function initNavTrack(scope) {
  scope = scope || document;
  const nav = scope.querySelector('[data-menu-wrap]');

  if (nav) {
    // Main menu items — dropdown toggles + top-level links (exclude the mobile Back button).
    nav.querySelectorAll('.mega-nav__bar-link:not(.is--back)').forEach((el) => {
      stamp(el, 'menu_item', labelOf(el));
    });

    // Sub-menu items — dropdown panel links.
    nav.querySelectorAll('.mega-nav__panel-link').forEach((el) => {
      stamp(el, 'sub_menu_item', labelOf(el));
    });

    // In-panel text buttons — Learn more, See all solutions.
    nav.querySelectorAll('.btn-icon-link.cc-text').forEach((el) => {
      stamp(el, 'sub_menu_item', toValue(el.textContent));
    });

    // Overlay cover links (empty text) — value from the destination slug.
    nav.querySelectorAll('a.u-link-cover').forEach((el) => {
      stamp(el, 'sub_menu_item', toValue(el.textContent) || slugValue(el));
    });

    // Primary CTA — Get in touch (also strips the legacy empty data-track-* it ships with).
    nav.querySelectorAll('.btn-icon-link:not(.cc-text)').forEach((el) => {
      stamp(el, 'button', toValue(el.textContent));
    });
  }

  // Whitepaper banner — component instance that sits above/outside the nav.
  // Value is static per the paid team's spec; also strips the legacy scheme.
  scope.querySelectorAll('.nav-banner-wrapper').forEach((wrapper) => {
    stamp(wrapper, 'banner', 'whitepaper');
    const link = wrapper.querySelector('a');
    if (link) stamp(link, 'banner', 'whitepaper');
  });
}
