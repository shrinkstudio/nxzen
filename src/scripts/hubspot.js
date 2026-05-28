// -----------------------------------------
// HUBSPOT EMBED
// Attribute-driven HubSpot form embedding.
// Put data-hubspot="<form-id>" on any div.
//
// Portal + region default to nxzen's HubSpot instance. To override site-wide
// (e.g. if the portal ever changes), add meta tags in Site Settings → Head Code:
//   <meta name="hubspot-portal" content="148378852">
//   <meta name="hubspot-region" content="eu1">
//
// Cookiebot compatibility:
//   - Injected script is tagged data-cookieconsent="statistics, marketing"
//     so auto-blocking mode classifies it correctly.
//   - If consent is granted AFTER initial init, CookiebotOnAccept re-runs init
//     so any [data-hubspot] elements still un-rendered get picked up.
//
// GTM bridge:
//   - On form submission, pushes { event: 'hubspot_form_submit', formId, pageUrl }
//     to dataLayer so GA4 conversions can be wired through GTM.
// -----------------------------------------

const DEFAULT_PORTAL = "148378852"; // nxzen — overridable via <meta name="hubspot-portal">
const DEFAULT_REGION = "eu1";       // overridable via <meta name="hubspot-region">

let scriptLoaded = false;
let scriptLoading = null;
let loadedRegion = null;
let cookiebotListener = null;

function readMeta(name) {
  return document.querySelector(`meta[name="${name}"]`)?.content || null;
}

function pushToDataLayer(payload) {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(payload);
}

function loadHubspotScript(region) {
  if (scriptLoaded && loadedRegion === region) return Promise.resolve();
  if (scriptLoading && loadedRegion === region) return scriptLoading;

  loadedRegion = region;
  scriptLoading = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = `//js-${region}.hsforms.net/forms/embed/v2.js`;
    s.async = true;
    // Hint to Cookiebot's auto-blocker which categories this belongs to.
    s.setAttribute("data-cookieconsent", "statistics, marketing");
    s.onload = () => {
      scriptLoaded = true;
      resolve();
    };
    s.onerror = (err) => {
      scriptLoading = null;
      reject(err);
    };
    document.head.appendChild(s);
  });

  return scriptLoading;
}

function renderForm(el, { portalId, region }) {
  const formId = el.getAttribute("data-hubspot");
  if (!formId || el.dataset.hubspotInit) return;
  el.dataset.hubspotInit = "true";

  if (!el.id) el.id = `hubspot-form-${Math.random().toString(36).slice(2, 9)}`;

  window.hbspt?.forms?.create?.({
    region,
    portalId,
    formId,
    target: `#${el.id}`,
    onFormSubmit: () => {
      pushToDataLayer({
        event: "hubspot_form_submit",
        formId,
        pageUrl: window.location.href,
      });
    },
  });
}

export function initHubspot(scope) {
  scope = scope || document;
  const els = scope.querySelectorAll("[data-hubspot]");
  if (!els.length) return;

  const portalId = readMeta("hubspot-portal") || DEFAULT_PORTAL;
  const region = readMeta("hubspot-region") || DEFAULT_REGION;

  loadHubspotScript(region)
    .then(() => {
      els.forEach((el) => renderForm(el, { portalId, region }));
    })
    .catch((err) => {
      console.warn("[hubspot] Form embed script failed to load.", err);
    });

  // If Cookiebot blocked the initial load and consent comes in later,
  // re-run init so the script gets a second chance and any new
  // [data-hubspot] elements get picked up.
  if (!cookiebotListener && typeof window !== "undefined") {
    cookiebotListener = () => initHubspot(document);
    window.addEventListener("CookiebotOnAccept", cookiebotListener);
  }
}

export function destroyHubspot() {
  document
    .querySelectorAll("[data-hubspot][data-hubspot-init]")
    .forEach((el) => {
      el.innerHTML = "";
      delete el.dataset.hubspotInit;
    });
  if (cookiebotListener && typeof window !== "undefined") {
    window.removeEventListener("CookiebotOnAccept", cookiebotListener);
    cookiebotListener = null;
  }
}
