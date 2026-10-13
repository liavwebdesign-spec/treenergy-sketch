// Treenergy · the pages beside the journey (thanks).
// The same chrome as the home page, without the journey: the living night, the header's power line (whole: the visitor
// has travelled it), the power-up menu, the accessibility panel. On the thank-you page the conversion is counted here.
// Kept apart from site.js on purpose: the home page's chrome is tied into its scroll (Lenis, the stations, the light page).
import { mountSky } from "./sky.js";

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const doc = document.documentElement;

/* ---------- the living night ---------- */
let sky = null;
try { sky = mountSky($("#sky")); } catch (e) { console.warn("sky", e); }

/* ---------- header: the line is whole here ---------- */
const hd = $("#hd"), main = $("#main");
hd.style.setProperty("--hp", "1");
$$(".hd-node", hd).forEach((a) => a.classList.add("is-past"));
const onScroll = () => hd.classList.toggle("is-scrolled", scrollY > 24);
addEventListener("scroll", onScroll, { passive: true }); onScroll();

/* ---------- the menu: a quiet room ---------- */
const mn = $("#mn"), mnBtn = $(".mn-btn", hd), mnClose = $(".mn-close", mn), mnIn = $(".mn-in", mn);
let mnOpen = false, mnLast = null;
$$(".mn-it", mn).forEach((li, i) => li.style.setProperty("--i", i));
mnIn.inert = true;

function setMenu(open) {
  if (open === mnOpen) return; mnOpen = open;
  if (open) {
    mnLast = document.activeElement;
  }
  mn.classList.toggle("open", open);
  mnIn.inert = !open;
  main.inert = open; hd.inert = open;
  mnBtn.setAttribute("aria-expanded", String(open));
  doc.classList.toggle("menu-open", open);
  doc.style.scrollbarGutter = open ? "stable" : "";
  doc.style.overflow = open ? "hidden" : "";
  if (open) setTimeout(() => { if (mnOpen) mnClose.focus({ preventScroll: true }); }, 200);
  else { const to = mnLast && mnLast !== document.body ? mnLast : mnBtn; to.focus({ preventScroll: true }); }
}
mnBtn.addEventListener("click", () => setMenu(true));
mnClose.addEventListener("click", () => setMenu(false));
$$("a", mn).forEach((a) => a.addEventListener("click", () => setMenu(false)));
addEventListener("keydown", (e) => {
  if (!mnOpen) return;
  if (e.key === "Escape") { setMenu(false); return; }
  if (e.key !== "Tab") return;
  const f = $$("a,button", mn).filter((x) => x.offsetParent !== null);
  const i = f.indexOf(document.activeElement);
  const n = e.shiftKey ? (i <= 0 ? f.length - 1 : i - 1) : (i === f.length - 1 ? 0 : i + 1);
  e.preventDefault(); f[n].focus();
});

/* ---------- accessibility: the same panel and the same saved choices ---------- */
const ax = $("#ax"), axBtn = $(".ax-btn"), axX = $(".ax-x", ax), axScrim = $(".ax-scrim"), AX_KEY = "tr-ax";
let axOpen = false, axSaved = {};
try { axSaved = JSON.parse(localStorage.getItem(AX_KEY) || "{}"); } catch (e) {}
function axPaint() {
  ["contrast", "links", "read", "still"].forEach((k) => { doc.classList.toggle("ax-" + k, !!axSaved[k]); $(`[data-ax="${k}"]`, ax).setAttribute("aria-pressed", String(!!axSaved[k])); });
  [1, 2].forEach((n) => doc.classList.toggle("ax-t" + n, axSaved.text === n));
  $$("[data-text]", ax).forEach((b) => b.setAttribute("aria-pressed", String(+b.dataset.text === (axSaved.text || 0))));
}
function axSave() { try { localStorage.setItem(AX_KEY, JSON.stringify(axSaved)); } catch (e) {} axPaint(); }
function setAx(open, focusTo) {
  if (open === axOpen) return; axOpen = open;
  ax.classList.toggle("open", open); doc.classList.toggle("ax-open", open);
  ax.inert = !open; main.inert = open; hd.inert = open;
  axBtn.setAttribute("aria-expanded", String(open));
  if (open) setTimeout(() => { if (axOpen) (focusTo || axX).focus({ preventScroll: true }); }, 80);
  else axBtn.focus({ preventScroll: true });
}
axBtn.addEventListener("click", () => setAx(!axOpen));
// the disc sits in the header beside the logo at every width (floating, it sat on the footer links)
const hdEnd = $(".hd-end", hd); hdEnd.insertBefore(axBtn, $(".hd-logo", hdEnd));
axX.addEventListener("click", () => setAx(false));
axScrim.addEventListener("pointerdown", () => setAx(false));
$$("[data-text]", ax).forEach((b) => b.addEventListener("click", () => { axSaved.text = +b.dataset.text; axSave(); }));
$$("[data-ax]", ax).forEach((b) => b.addEventListener("click", () => {
  const k = b.dataset.ax; axSaved[k] = !axSaved[k]; axSave();
  if (k !== "still") return;
  try { sessionStorage.setItem("tr-ax-back", JSON.stringify({ y: scrollY, k })); } catch (e) {}
  location.reload();
}));
$(".ax-reset", ax).addEventListener("click", () => {
  const was = !!axSaved.still; axSaved = {}; axSave();
  if (was) { try { sessionStorage.setItem("tr-ax-back", JSON.stringify({ y: scrollY, k: "still" })); } catch (e) {} location.reload(); }
});
addEventListener("keydown", (e) => {
  if (!axOpen) return;
  if (e.key === "Escape") { setAx(false); return; }
  if (e.key !== "Tab") return;
  const f = $$("button", ax), i = f.indexOf(document.activeElement);
  const n = e.shiftKey ? (i <= 0 ? f.length - 1 : i - 1) : (i === f.length - 1 ? 0 : i + 1);
  e.preventDefault(); f[n].focus();
});
axPaint();
addEventListener("load", () => {
  let back = null;
  try { back = JSON.parse(sessionStorage.getItem("tr-ax-back") || "null"); sessionStorage.removeItem("tr-ax-back"); } catch (e) {}
  if (back) { scrollTo(0, back.y); setAx(true, $(`[data-ax="${back.k}"]`, ax)); }
});

/* ---------- the footer ---------- */
const ft = $("#ft"), ftBig = $(".ft-big", ft), ftWord = $("span", ftBig);
function fitBig() {
  ftBig.style.fontSize = "";
  const w = ftWord.getBoundingClientRect().width, room = ftBig.clientWidth;
  if (w > 0 && room > 0) ftBig.style.fontSize = (parseFloat(getComputedStyle(ftBig).fontSize) * (room / w) * 0.985).toFixed(1) + "px";
}
(document.fonts ? document.fonts.ready : Promise.resolve()).then(fitBig);
let rzT = 0;
addEventListener("resize", () => { clearTimeout(rzT); rzT = setTimeout(fitBig, 120); });
$$("[data-year]").forEach((e) => (e.textContent = new Date().getFullYear()));
function onSeen(el, f, margin) {
  if (typeof IntersectionObserver !== "function") { f(); return; }
  const io = new IntersectionObserver((es) => { if (es.some((x) => x.isIntersecting)) { io.disconnect(); f(); } }, { rootMargin: margin });
  io.observe(el);
}
onSeen(ft, () => ft.classList.add("is-in"), "0px 0px -5% 0px");

/* ---------- thanks: the conversion, the name, the time ---------- */
const ty = $("[data-thanks]");
if (ty) {
  // counted once a visit: a reload or a way back to this page is not a second lead
  let fired = false;
  try { fired = sessionStorage.getItem("lead-fired") === "1"; } catch (e) {}
  if (!fired) {
    const from = new URLSearchParams(location.search).get("from") || "site";
    (window.dataLayer = window.dataLayer || []).push({ event: "generate_lead", lead_source: from });
    if (typeof window.fbq === "function") window.fbq("track", "Lead", { content_name: from });
    try { sessionStorage.setItem("lead-fired", "1"); } catch (e) {}
  }
  // the first name only, from this visit's own form, never from the address
  let name = "";
  try { name = (sessionStorage.getItem("lead-name") || "").trim().split(/\s+/)[0].slice(0, 24); } catch (e) {}
  const nm = $("[data-name]", ty), wrap = $("[data-name-wrap]", ty);
  if (name) nm.textContent = name; else wrap.remove();
  const p2 = (n) => String(n).padStart(2, "0"), d = new Date();
  $("[data-now]", ty).textContent = p2(d.getHours()) + ":" + p2(d.getMinutes());
  // the stations light in turn; the script hides them first, so without it they simply stand
  if (!window.__still && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
    ty.classList.add("ty-anim"); void ty.offsetHeight;
    requestAnimationFrame(() => ty.classList.add("is-in"));
  }
}
