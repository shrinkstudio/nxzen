// -----------------------------------------
// NAV TRACKING — Paid-media interaction attributes (HYBRID)
// -----------------------------------------
// The nav tracking scheme is split across two homes:
//
//   • WEBFLOW (source of truth, editable by the paid/marketing team):
//     the plain nav elements carry the attributes as Designer custom
//     attributes — the 5 main menu items (Our Solutions, About Us,
//     Our Clients, Insights & News, Careers) and the 2 About-Us
//     sub-links (About Us, Our People). The service cards also carry
//     the 3 STATIC attrs (event / name / type) in Webflow.
//
//   • THIS MODULE (JS): the elements Webflow structurally cannot
//     attribute per-instance — they are component instances
//     ("Button - Animated Icon", "Text Button - Animated Icon",
//     "Nav Banner") which reject per-instance custom attributes — plus
//     the service-card VALUE, which is per-service and can't be
//     CMS-bound to an attribute via the Designer here. This module
//     stamps the final rendered DOM at nav init:
//       - Get in touch  → button
//       - All Solutions, Learn more → sub_menu_item
//       - Whitepaper banner → banner (also strips the legacy
//         data-track-category/label/event the component prop renders)
//       - Service cards → adds the per-service data-track-interaction-value
//
// Schema (matches the paid team's spec):
//   data-track-event="ui_interaction"
//   data-track-interaction-name="navigation_interaction"
//   data-track-interaction-type="menu_item | sub_menu_item | button | banner"
//   data-track-interaction-value="<lowercased label>"
// -----------------------------------------

const EVENT = 'ui_interaction';
const NAME = 'navigation_interaction';
const LEGACY_ATTRS = ['data-track-category', 'data-track-label', 'data-track-event'];

function toValue(text) {
  return (text || '')
    .replace(/​/g, '')     // zero-width space (Webflow rich-text artifact)
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

// Full stamp — replaces the legacy scheme and writes all four attrs.
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

  // --- CTA button: Get in touch ("Button - Animated Icon" instance) ---
  scope.querySelectorAll('.nav-cta-wrapper a[href]').forEach((el) => {
    stamp(el, 'button', toValue(el.textContent));
  });

  // --- Mega-menu text buttons: All Solutions, Learn more ("Text Button" instances) ---
  scope.querySelectorAll('.nav .btn-icon-link.cc-text').forEach((el) => {
    stamp(el, 'sub_menu_item', toValue(el.textContent));
  });

  // --- Whitepaper banner ("Nav Banner" instance, lives outside .nav) ---
  // Value is static per the paid team's spec; also strips the legacy
  // data-track-* that the component's Track props render.
  scope.querySelectorAll('.nav-banner-wrapper').forEach((wrapper) => {
    stamp(wrapper, 'banner', 'whitepaper');
    const link = wrapper.querySelector('a');
    if (link) stamp(link, 'banner', 'whitepaper');
  });

  // --- Service cards (mega-menu): per-service value only ---
  // Webflow already sets event/name/type statically on these links;
  // JS only fills the dynamic value from the card heading (keeps "&").
  scope.querySelectorAll('.nav a.u-link-cover[href^="/services/"]').forEach((el) => {
    const card = el.closest('.card') || el.parentElement;
    const heading = card && card.querySelector('.heading-text, h1, h2, h3, h4, h5, h6');
    const value = toValue(heading && heading.textContent)
      || ((el.getAttribute('href') || '').split('/').pop() || '').replace(/-/g, ' ');
    if (value) el.setAttribute('data-track-interaction-value', value);
  });
}
