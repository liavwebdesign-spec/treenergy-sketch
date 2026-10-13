// Treenergy · home page behaviour.
// The living night (sky.js), the header's power line, the power-up menu, the opening entrance, Lenis + GSAP,
// the journey (globe + trail), the intro statement, and the domains: the trail runs on and powers each picture.
import { Ribbon } from "./ribbon.js";
import { mountSky } from "./sky.js";

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduce = !!window.__still || matchMedia("(prefers-reduced-motion: reduce)").matches;  // __still: the visitor stopped motion in the accessibility panel
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const smooth = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const gsap = window.gsap, ST = window.ScrollTrigger, Split = window.SplitText;
const hasGsap = !!(gsap && ST);
if (hasGsap) gsap.registerPlugin(ST, ...(Split ? [Split] : []));
const doc = document.documentElement;

/* ---------- the living night ---------- */
let sky = null;
try { sky = mountSky($("#sky")); } catch (e) { console.warn("sky", e); }

/* ---------- header: the power line ---------- */
// The wire's nodes are the stations of this page. The fill reaches node i exactly when the page reaches station i,
// so the line is a map of the journey, not just a progress bar.
const hd = $("#hd"), hdNodes = $$(".hd-node", hd), hdCta = $(".hd-cta", hd);
let stations = [], here = -1;
function measureStations() {
  const maxProbe = doc.scrollHeight - innerHeight * 0.5, n = hdNodes.length;
  stations = hdNodes.map((a, i) => {
    const t = $(a.getAttribute("href"));
    const y = t ? t.getBoundingClientRect().top + scrollY : maxProbe;
    return Math.min(y, maxProbe - (n - i) * 2);
  });
}
function headerTick() {
  const y = scrollY, n = hdNodes.length, probe = y + innerHeight * 0.5;
  hd.classList.toggle("is-scrolled", y > 24);
  if (!stations.length) return;
  const xs = [innerHeight * 0.5, ...stations, doc.scrollHeight - innerHeight * 0.5];
  const fs = [0, ...hdNodes.map((_, i) => (i + 0.5) / n), 1];
  let f = probe >= xs[xs.length - 1] ? 1 : 0;
  for (let i = 0; i < xs.length - 1 && !f; i++) if (probe < xs[i + 1]) { f = fs[i] + (fs[i + 1] - fs[i]) * clamp01((probe - xs[i]) / ((xs[i + 1] - xs[i]) || 1)); break; }
  hd.style.setProperty("--hp", f.toFixed(4));
  let h = -1;
  hdNodes.forEach((a, i) => { const past = probe >= stations[i]; a.classList.toggle("is-past", past); if (past) h = i; });
  if (h !== here) {
    here = h;
    hdNodes.forEach((a, i) => { a.classList.toggle("is-here", i === h); if (i === h) a.setAttribute("aria-current", "location"); else a.removeAttribute("aria-current"); });
  }
  hdCta.classList.toggle("is-lit", f > 0.985);
}

/* ---------- the menu: a night room with the page's places on a ball ---------- */
// The night fades over the page; the ball comes in turning and settles on the place the visitor is at, its name beside
// it. The list stays beside the ball (and is the whole menu where the ball can't be drawn or motion is stopped); the
// item for where the visitor is keeps its number lit, and pointing at an item turns the ball to it.
const mn = $("#mn"), mnBtn = $(".mn-btn", hd), mnClose = $(".mn-close", mn), mnIn = $(".mn-in", mn);
const mnLinks = $$(".mn-list a", mn);
let mnOpen = false, mnLast = null;
const mnBall = $(".mn-ball", mn), mnNow = $(".mn-now", mn), mnGo = $(".mn-go", mn);
const mnItems = mnLinks.map((a) => ({ n: $(".mn-n", a).textContent.trim(), t: $(".mn-t", a).textContent.trim(), href: a.getAttribute("href") }));
const ballOk = !reduce && "WebGL2RenderingContext" in window;
let ball = null, ballLoad = null;
if (ballOk) mn.classList.add("has-ball");
function showNow(k) {
  const it = mnItems[k];
  $(".mn-now-n", mnNow).textContent = it.n; $(".mn-now-t", mnNow).textContent = it.t;
  mnGo.setAttribute("href", it.href);
  mnNow.classList.remove("swap"); void mnNow.offsetWidth; mnNow.classList.add("swap");
}
function openBall(k) {
  ballLoad ||= import("./menu-ball.js")
    .then(({ mountBall }) => mountBall(mnBall, { items: mnItems, onActive: showNow, onMove: (m) => mnNow.classList.toggle("is-moving", m), onPick: () => mnGo.click() }))
    .catch(() => { mn.classList.remove("has-ball"); return null; });
  ballLoad.then((b) => { ball = b; if (b && mnOpen) b.open(k); });
}
mnLinks.forEach((a, k) => {
  a.addEventListener("pointerenter", () => ball && ball.turnTo(k));
  a.addEventListener("focus", () => ball && ball.turnTo(k));
});
$$(".mn-it", mn).forEach((li, i) => li.style.setProperty("--i", i));
mnIn.inert = true;

const markHere = (a) => mnLinks.forEach((l) => l.classList.toggle("is-on", l === a));
// the item for where the visitor is on the page
const restLink = () => (here >= 0 ? mnLinks.find((l) => l.getAttribute("href") === hdNodes[here].getAttribute("href")) : null) || null;

function setMenu(open) {
  if (open === mnOpen) return; mnOpen = open;
  if (open) {
    mnLast = document.activeElement;
    const a = restLink();
    markHere(a);
    if (ballOk) openBall(Math.max(0, mnLinks.indexOf(a)));
  } else if (ball) ball.close();
  mn.classList.toggle("open", open);
  mnIn.inert = !open;
  $("#main").inert = open; hd.inert = open;
  mnBtn.setAttribute("aria-expanded", String(open));
  doc.classList.toggle("menu-open", open);
  // scroll lock on the real scroller, with the scrollbar's space kept (no jump)
  doc.style.scrollbarGutter = open ? "stable" : "";
  doc.style.overflow = open ? "hidden" : "";
  if (lenis) open ? lenis.stop() : lenis.start();
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
  const f = $$("a,button", mn).filter((x) => x.offsetParent !== null && x.tabIndex >= 0);
  const i = f.indexOf(document.activeElement);
  const n = e.shiftKey ? (i <= 0 ? f.length - 1 : i - 1) : (i === f.length - 1 ? 0 : i + 1);
  e.preventDefault(); f[n].focus();
});

/* ---------- in-page links take the keyboard with them ---------- */
// the scroll is smooth (Lenis), so the focus is moved by hand to where the link lands
// Every in-page link glides there (this Lenis has no anchor option, so without this the page jumped): the time grows with
// the distance and the move eases in and out, so a hop of one section and a trip down the whole page both read as one move.
const glideEase = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
document.addEventListener("click", (e) => {
  const a = e.target.closest('a[href^="#"]'); if (!a) return;
  const id = a.getAttribute("href"), t = id.length > 1 ? $(id) : null; if (!t) return;
  if (lenis) {
    e.preventDefault();
    const tr = t.getBoundingClientRect();
    // a place shorter than the screen (a domain scene) lands centred, so its number and title are not under the header
    const y = id === "#top" || id === "#main" ? 0 : tr.top + scrollY - (tr.height < innerHeight ? (innerHeight - tr.height) / 2 : 0);
    const d = Math.abs(y - scrollY);
    lenis.scrollTo(y, { duration: Math.min(1.6, 0.7 + d / 8000), easing: glideEase, force: true });
    try { history.replaceState(null, "", id); } catch (err) {}
  }
  if (!t.matches("a[href],button,input,select,textarea,[tabindex]")) t.setAttribute("tabindex", "-1");
  setTimeout(() => t.focus({ preventScroll: true }), 0);
});

/* ---------- accessibility: display choices, kept for the next visit ---------- */
// The head script already put the saved choices on before the first paint. "Stop motion" reloads the page in place,
// so every script starts still (the reload keeps the scroll and reopens the panel on the same switch).
const ax = $("#ax"), axBtn = $(".ax-btn"), axX = $(".ax-x", ax), axScrim = $(".ax-scrim"), AX_KEY = "tr-ax";
let axOpen = false, axSaved = {};
try { axSaved = JSON.parse(localStorage.getItem(AX_KEY) || "{}"); } catch (e) {}
function axPaint() {
  ["contrast", "links", "read", "still"].forEach((k) => { doc.classList.toggle("ax-" + k, !!axSaved[k]); $(`[data-ax="${k}"]`, ax).setAttribute("aria-pressed", String(!!axSaved[k])); });
  [1, 2].forEach((n) => doc.classList.toggle("ax-t" + n, axSaved.text === n));
  $$("[data-text]", ax).forEach((b) => b.setAttribute("aria-pressed", String(+b.dataset.text === (axSaved.text || 0))));
}
function axSave(relay) {
  try { localStorage.setItem(AX_KEY, JSON.stringify(axSaved)); } catch (e) {}
  axPaint();
  if (relay) requestAnimationFrame(() => { if (hasGsap) ST.refresh(); else relayout(); });
}
function setAx(open, focusTo) {
  if (open === axOpen) return; axOpen = open;
  ax.classList.toggle("open", open); doc.classList.toggle("ax-open", open);
  ax.inert = !open; $("#main").inert = open; hd.inert = open;
  axBtn.setAttribute("aria-expanded", String(open));
  if (open) setTimeout(() => { if (axOpen) (focusTo || axX).focus({ preventScroll: true }); }, 80);
  else axBtn.focus({ preventScroll: true });
}
axBtn.addEventListener("click", () => setAx(!axOpen));
// the disc lives in the header, beside the logo, at every width: floating in the corner it sat on the hero's way-on
// chips (1280 to 1440) and on the calculator's text (1024)
$(".hd-end").insertBefore(axBtn, $(".hd-logo", $(".hd-end")));
axX.addEventListener("click", () => setAx(false));
axScrim.addEventListener("pointerdown", () => setAx(false));
$$("[data-text]", ax).forEach((b) => b.addEventListener("click", () => { axSaved.text = +b.dataset.text; axSave(true); }));
$$("[data-ax]", ax).forEach((b) => b.addEventListener("click", () => {
  const k = b.dataset.ax; axSaved[k] = !axSaved[k];
  if (k !== "still") { axSave(k === "read"); return; }
  axSave(false);
  try { sessionStorage.setItem("tr-ax-back", JSON.stringify({ y: scrollY, k })); } catch (e) {}
  location.reload();
}));
$(".ax-reset", ax).addEventListener("click", () => {
  const was = !!axSaved.still; axSaved = {}; axSave(true);
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

/* ---------- reveal: the opening ---------- */
function inView(el, f, at = 0.9) {
  let ro;
  function chk() { const r = el.getBoundingClientRect(); if (r.top < innerHeight * at && r.bottom > 0) { off(); f(); } }
  function off() { removeEventListener("scroll", chk); removeEventListener("resize", chk); if (ro) ro.disconnect(); }
  addEventListener("scroll", chk, { passive: true }); addEventListener("resize", chk);
  if (window.ResizeObserver) { ro = new ResizeObserver(chk); ro.observe(document.body); }
  requestAnimationFrame(chk); setTimeout(chk, 300);
}
function enter(root, at) {
  const els = root.querySelectorAll(".rv");
  els.forEach((el, i) => { if (!el.style.getPropertyValue("--i")) el.style.setProperty("--i", i); });
  if (els.length && getComputedStyle(els[0]).opacity === "1" && root.classList.contains("hero")) root.classList.add("is-in");
  root.classList.add("rv-on");
  inView(root, () => root.classList.add("is-in"), at);
}
enter($(".hero"));
$$(".rv-wait").forEach((g) => enter(g, 0.82));

/* ---------- Lenis + GSAP ---------- */
let lenis = null;
if (hasGsap && !reduce && window.Lenis) {
  lenis = new window.Lenis({ autoRaf: false, lerp: 0.12, anchors: { offset: -72 } });
  window.__lenis = lenis;
  // the scroll's speed makes the night flow
  lenis.on("scroll", (e) => { ST.update(); if (sky) sky.scroll(e.scroll, e.velocity * 60); });
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  doc.classList.add("gsap-live");
} else if (sky) {
  let ly = scrollY, lt = performance.now();
  addEventListener("scroll", () => { const t = performance.now(); sky.scroll(scrollY, ((scrollY - ly) / Math.max(1, t - lt)) * 1000); ly = scrollY; lt = t; }, { passive: true });
}

/* ---------- the journey: globe + trail + the opening leaving ---------- */
const journey = $(".journey"), stage = $("#globe"), heroEl = $(".hero");
const dom = $("#domains"), shots = $$(".shot", dom), nums = $$(".sc-n", dom);
// every drawing is there twice: a pale copy that waits in the night, and a coloured copy that a scan uncovers from the
// top down. The scan rides the trail's head line, so the drawing is coloured exactly as far as the energy has come
// (a clip in the drawing's own units, and the scan line at its edge, across the drawing's ground)
const NS = "http://www.w3.org/2000/svg";
const wipes = shots.map((f, i) => {
  const svg = $("svg.emb", f), art = $(".ic-art", f);
  const base = art.cloneNode(true); base.setAttribute("class", "ic-base"); art.parentNode.insertBefore(base, art);
  art.setAttribute("class", "ic-lit");
  const defs = document.createElementNS(NS, "defs"), cp = document.createElementNS(NS, "clipPath"), rect = document.createElementNS(NS, "rect");
  cp.id = "wipe-" + i; rect.setAttribute("x", "-24"); rect.setAttribute("y", "-24"); rect.setAttribute("width", "528"); rect.setAttribute("height", "0");
  cp.appendChild(rect); defs.appendChild(cp); svg.insertBefore(defs, svg.firstChild);
  art.setAttribute("clip-path", `url(#${cp.id})`);
  const scan = document.createElementNS(NS, "path"); scan.setAttribute("class", "scan"); svg.appendChild(scan);
  // the drawing's own extent (the ground line spans it): the scan runs from its top to its foot
  const gr = $(".gr", base), bb = (() => { try { return base.getBBox(); } catch (e) { return null; } })();
  const g = gr && gr.getAttribute("d").match(/M([\d.]+) ([\d.]+)H([\d.]+)/);
  return { f, rect, scan, vy: -1, top: bb && bb.height ? bb.y - 4 : 40, foot: g ? +g[2] + 14 : 320, x0: g ? +g[1] : 24, x1: g ? +g[3] : 456 };
});
// vy: the head's height in the drawing's units. pw (0..1, the CSS reads it): the scan done at 0.77, then the battery's
// modules charge and the numeral fills to the top
function setScan(i, vy) {
  const w = wipes[i]; vy = Math.max(-24, Math.min(384, vy)); if (Math.abs(w.vy - vy) < 0.05) return; w.vy = vy;
  const pw = clamp01((vy - w.top) / ((w.foot - w.top) * 1.3));
  w.rect.setAttribute("height", (vy + 24).toFixed(1));
  w.scan.setAttribute("d", `M${w.x0} ${vy.toFixed(1)}H${w.x1}`);
  w.f.classList.toggle("is-scan", vy > w.top && vy < w.foot);
  w.f.classList.toggle("is-lit", pw >= 0.98);
  w.f.style.setProperty("--pw", pw.toFixed(4));
  nums[i].style.setProperty("--pw", pw.toFixed(4));
}

// a smooth way down through given points (y only grows): Catmull-Rom tangents, or the tangent a point brings with it
// (tx, ty: a direction), as cubic segments. A handle never reaches more than half way down its segment, so y never
// turns back; a point with line: true runs straight on to the next one. Every bend is round: no corner anywhere
function spline(pts) {
  const n = pts.length, segs = [];
  const T = pts.map((p, i) => {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
    if (p.tx !== undefined) { const d = Math.hypot(b.x - a.x, b.y - a.y) * (i === 0 || i === n - 1 ? 1 : 0.5), l = Math.hypot(p.tx, p.ty) || 1; return [p.tx / l * d, p.ty / l * d]; }
    // next to a straight run the bend leaves (or joins) it along the run
    const run = p.line ? [p, b] : i > 0 && pts[i - 1].line ? [pts[i - 1], p] : null;
    if (run) { const ux = run[1].x - run[0].x, uy = run[1].y - run[0].y, l = Math.hypot(ux, uy) || 1, d = Math.hypot(b.x - a.x, b.y - a.y) * 0.5; return [ux / l * d, uy / l * d]; }
    const k = i === 0 || i === n - 1 ? 1 : 0.5;
    return [(b.x - a.x) * k, (b.y - a.y) * k];
  });
  for (let i = 0; i < n - 1; i++) {
    const p = pts[i], q = pts[i + 1], dy = q.y - p.y;
    if (p.line) { segs.push(["L", p.x, p.y, q.x, q.y]); continue; }
    const fit = (t) => { let hx = t[0] / 3, hy = Math.max(0, t[1] / 3); const lim = dy * 0.5; if (hy > lim) { const k = lim / hy; hx *= k; hy = lim; } return [hx, hy]; };
    const h1 = fit(T[i]), h2 = fit(T[i + 1]);
    segs.push(["C", p.x, p.y, p.x + h1[0], p.y + h1[1], q.x - h2[0], q.y - h2[1], q.x, q.y]);
  }
  return segs;
}

let globe = null, jp = 0;
const wide = () => innerWidth >= 1024;

// the braid's half width and its fibres, shared by every stretch so the globe trail runs on into the domains one
const trailAmp = () => (innerWidth < 768 ? 14 : 28);
const BAND = innerWidth < 768 ? { strands: 16, loose: 4 } : { strands: 26, loose: 6 };

// x where the globe trail lands on the domains: wide screens, in the open night beside the first sign, so the
// energy comes down from Israel in one wide swing and sweeps across into the sign (never a straight drop onto it);
// phones, a rail on the start side, half way through the gutter and the rail pad
function railX() {
  const W = doc.clientWidth;
  if (wide()) {
    // round 4: between the first drawing and the middle of the screen, so the way from Israel into it is one soft swing
    const r = shots[0].getBoundingClientRect(), c = r.left + r.width / 2;
    return c + (W / 2 - c) * 0.2;
  }
  const g = parseFloat(getComputedStyle(dom).paddingRight), rp = parseFloat(getComputedStyle(doc).getPropertyValue("--rail-pad")) || 28;
  return W - (g + rp) / 2;
}

// phones: the energy does not drop straight from the intro into the domains either. Under the intro's last line it
// leaves the rail and sweeps across the gap to a lane on the end side, clear of the domains' heading, and runs on
// down that lane into the first picture. The one S crosses the seam: the globe draws its upper part down to the
// domains' top edge, the domains ribbon the rest (y is 0 at the seam). null on wide screens, or with no room for a lane
let seam = null;
// the hand-over between the globe's trail and the domains' one: on the head's line (HEAD of the screen) at the moment
// the journey ends, i.e. that far above the domains' top edge, and the heading the trail has there
const HEAD = 0.72;
const join = { y: 0, dx: 0, dy: 1 };
const jointY = () => innerHeight * HEAD - stage.getBoundingClientRect().height;
const textLeft = (el) => { const g = document.createRange(); g.selectNodeContents(el); return g.getBoundingClientRect().left; };
function splitC(P, t) {
  const at = (i, j) => [P[i] + (P[j] - P[i]) * t, P[i + 1] + (P[j + 1] - P[i + 1]) * t];
  const a = at(0, 2), b = at(2, 4), c = at(4, 6);
  const d = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t], e = [b[0] + (c[0] - b[0]) * t, b[1] + (c[1] - b[1]) * t];
  const m = [d[0] + (e[0] - d[0]) * t, d[1] + (e[1] - d[1]) * t];
  return [["C", P[0], P[1], ...a, ...d, ...m], ["C", ...m, ...e, ...c, P[6], P[7]]];
}
function measureSeam() {
  seam = null;
  if (wide()) return;
  const r = dom.getBoundingClientRect(), s0 = shots[0].getBoundingClientRect(), amp = trailAmp();
  const words = [$(".kick", dom), $("h2", dom), $(".dom-lead", dom), ...$$(".sc-n, h3", $(".scene", dom))].filter((e) => e.getBoundingClientRect().top < s0.top);
  const xL = Math.min(r.width * 0.22, Math.min(...words.map(textLeft)) - r.left - amp * 2.6);
  // the S starts a little under the intro's last line as it stands when the journey ends, and lands on the lane
  // where the domains' heading begins
  const a = Math.min(innerHeight * 0.3, $(".intro").getBoundingClientRect().bottom - $(".intro-in").getBoundingClientRect().bottom - 24);
  const b = parseFloat(getComputedStyle(dom).paddingTop);
  if (xL < 20 + amp * 1.8 || a < 60) return;
  const x0 = railX(), k = (a + b) * 0.5, P = [x0, -a, x0, -a + k, xL, b - k, xL, b];
  // it only goes down, so halve towards the joint
  const yAt = (t) => { const u = 1 - t; return u * u * u * P[1] + 3 * u * u * t * P[3] + 3 * u * t * t * P[5] + t * t * t * P[7]; };
  let lo = 0, hi = 1;
  const J = jointY();
  if (J <= -a) { seam = { xL, above: null, below: [["L", x0, J, x0, -a], ["C", ...P]], key: P.map((v) => v.toFixed(0)).join(",") + "|" + J.toFixed(0) }; return; }
  lo = 0; hi = 1;
  for (let i = 0; i < 32; i++) { const m = (lo + hi) / 2; if (yAt(m) < J) lo = m; else hi = m; }
  const [above, below] = splitC(P, (lo + hi) / 2);
  seam = { xL, above, below: [below], key: P.map((v) => v.toFixed(0)).join(",") + "|" + J.toFixed(0) };
}

// the opening: both lines flush to the start edge; on wide screens the two ways on stand in the room the shorter
// second line leaves, centred on it. Where that room is too small they stay under the line (the CSS default)
const heroSide = $(".hero-side", heroEl), heroL2 = $(".h-line.l2", heroEl);
function layoutHero() {
  heroEl.classList.remove("is-beside");
  if (!wide()) return;
  const sd = heroSide.getBoundingClientRect();
  // out of the flow first: the lines settle lower once the ways on no longer stand under them
  heroEl.classList.add("is-beside");
  const h = heroEl.getBoundingClientRect(), l = heroL2.getBoundingClientRect();
  const g = document.createRange(); g.selectNodeContents(heroL2.firstElementChild); const t = g.getBoundingClientRect();
  const gap = Math.max(40, l.height * 0.4), pad = parseFloat(getComputedStyle(heroEl).paddingLeft);
  const rtlDoc = getComputedStyle(heroEl).direction === "rtl";
  const room = rtlDoc ? t.left - h.left - pad : h.right - pad - t.right;
  if (room < sd.width + gap) { heroEl.classList.remove("is-beside"); return; }
  const x = rtlDoc ? h.right - t.left + gap : t.right - h.left + gap;
  // the middle of the letters (the line box runs deeper below them than above)
  const cy = l.top - h.top + l.height * 0.5;
  heroEl.style.setProperty("--side-x", x.toFixed(1) + "px");
  heroEl.style.setProperty("--side-t", (cy - sd.height / 2).toFixed(1) + "px");
}

function setJourney(p) {
  jp = p;
  if (globe) globe.setProgress(p);
  if (!reduce) {
    heroEl.style.setProperty("--hero-o", (1 - smooth(0.03, 0.3, p)).toFixed(3));
    heroEl.style.setProperty("--hero-y", (-p * 120).toFixed(1) + "px");
    // the shade under the opening goes with it; by the stage's last screen its foot is plain night
    stage.style.setProperty("--scrim", (1 - smooth(0.05, 0.4, p)).toFixed(3));
  }
}
if (hasGsap) {
  ST.create({ trigger: journey, start: "top top", end: "bottom bottom", onUpdate: (s) => setJourney(s.progress), onRefresh: (s) => setJourney(s.progress) });
} else {
  let top = 0, span = 1;
  const measure = () => { const r = journey.getBoundingClientRect(); top = r.top + scrollY; span = Math.max(1, r.height - innerHeight); };
  measure(); addEventListener("resize", measure);
  addEventListener("scroll", () => setJourney(clamp01((scrollY - top) / span)), { passive: true });
}

function webglOK() {
  try { const c = document.createElement("canvas"); return !!(c.getContext("webgl2") || c.getContext("webgl")); } catch (e) { return false; }
}
if (webglOK()) {
  // phones: the labels stop above the opening words (wide screens keep the words beside the globe)
  const floor = () => { if (wide()) return Infinity; const top = [...heroEl.children].find((e) => e.getClientRects().length); return top.getBoundingClientRect().top - stage.getBoundingClientRect().top; };
  // the intro's words in the stage's frame: the trail waits rather than run over them
  // (phones: the whole intro, its link too, since there the S passes under it)
  const say = $(".intro-say"), introIn = $(".intro-in");
  const words = () => { const r = (wide() ? say : introIn).getBoundingClientRect(), s = stage.getBoundingClientRect(); return { left: r.left - s.left, right: r.right - s.left, top: r.top - s.top, bottom: r.bottom - s.top }; };
  // where the intro comes to rest in the stage: when the journey ends, the intro's foot is the stage's foot
  const intro = $(".intro");
  const rest = () => { const i = intro.getBoundingClientRect(), r = introIn.getBoundingClientRect(), s = stage.getBoundingClientRect(); return { left: r.left - s.left, right: r.right - s.left, top: s.height - (i.bottom - r.top), bottom: s.height - (i.bottom - r.bottom) }; };
  import("./globe.js").then(({ mountGlobe }) => mountGlobe(stage, { railX, wide, amp: trailAmp, band: BAND, floor, words, rest, seam: () => seam, joint: () => join.y, joinDir: () => [join.dx, join.dy] })).then((g) => {
    globe = g; if (g) g.setProgress(jp);
  }).catch((e) => console.warn("globe", e));
}

/* ---------- the intro: one statement, lit word by word by the scroll ---------- */
function initIntro() {
  if (reduce || !hasGsap || !Split) return;
  const say = $(".intro-say");
  const split = new Split(say, { type: "words", wordsClass: "w" });
  const words = split.words, n = words.length;
  const paint = (p) => {
    const k = p * (n + 6) - 3;
    words.forEach((w, i) => w.style.setProperty("--wo", (0.16 + 0.84 * clamp01(k - i)).toFixed(3)));
  };
  ST.create({ trigger: say, start: "top 82%", end: "bottom 42%", onUpdate: (s) => paint(s.progress), onRefresh: (s) => paint(s.progress) });
}

/* ---------- domains: the trail draws each domain's sign as it passes through it ---------- */
// The ribbon starts on the domains' top edge, where the globe trail ends (the stage leaves with the intro), with the
// same lines, so the energy runs on from Israel without a seam. Its head rides the 72% line of the screen and goes
// down through the middle of every sign, drawing it; after the last one it bends away and leaves by the side of the
// screen (the reasons below take it back in from the other side), so the trail never stops in the middle of the page.
const domSvg = $(".dom-trail", dom), domMore = $(".dom-more", dom);
const domRibbon = new Ribbon(domSvg, { ...BAND, amp: trailAmp, wave: 520, taperStart: 0, taperEnd: 0, sparks: 4, seed: 3 });
let boxes = [];

function layoutDom() {
  measureSeam();
  const r = dom.getBoundingClientRect(), W = r.width, H = r.height, x0 = railX(), J = jointY();
  domSvg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  boxes = shots.map((s) => { const b = $("svg", s).getBoundingClientRect(); return { top: b.top - r.top, h: b.height, cx: b.left - r.left + b.width / 2, w: b.width }; });
  const last = boxes.length - 1, amp = trailAmp();
  // the energy goes into each machine (behind its planes) a little above its middle, and comes out the other side
  const cy = (b) => b.top + b.h * 0.56;
  // and away at the end: a long bend out by the start of the line (the left), before the "coming soon" line
  const yEnd = Math.min(H - 8, domMore.getBoundingClientRect().top - r.top - 20), xEnd = -Math.max(120, amp * 6);
  let pts;
  if (wide()) {
    // from the hand-over, one soft swing into the first drawing, then a wide S from drawing to drawing
    const v = [boxes[0].cx - x0, cy(boxes[0]) - J], l = Math.hypot(v[0] * 0.6, v[1]) || 1;
    join.y = J; join.dx = v[0] * 0.6 / l; join.dy = v[1] / l;
    pts = [{ x: x0, y: J, tx: join.dx, ty: join.dy }, ...boxes.map((b) => ({ x: b.cx, y: cy(b) }))];
  } else {
    // the rest of the S from the intro (down its lane), then into each drawing from the rail and back out to it
    const pad = Math.max(28, amp * 1.6);
    join.y = J; join.dx = 0; join.dy = 1;
    pts = [];
    let segs0 = [];
    if (seam) { segs0 = seam.below; const c = seam.below[seam.below.length - 1]; pts.push({ x: c[7], y: c[8], tx: 0, ty: 1 }); }
    else pts.push({ x: x0, y: J, tx: 0, ty: 1, line: true });
    boxes.forEach((b, i) => {
      if (i > 0 || !seam) pts.push({ x: x0, y: b.top - pad, line: false });
      pts.push({ x: b.cx, y: cy(b) });
      pts.push({ x: x0, y: b.top + b.h + pad, line: true });
    });
    // after the last machine the energy stays on the rail past its words, and only then bends away
    const foot = shots[last].closest(".scene").getBoundingClientRect().bottom - r.top;
    if (foot > pts[pts.length - 1].y + 24) pts.push({ x: x0, y: foot, line: true });
    pts.segs0 = segs0;
  }
  // (on narrow screens the rail runs by the edge, so it drifts off over that edge instead of cutting across the words)
  if (yEnd > pts[pts.length - 1].y + 40) {
    if (wide()) pts.push({ x: xEnd, y: yEnd, tx: -1, ty: 0.22 });
    else { const s = x0 > W / 2 ? 1 : -1; pts.push({ x: s > 0 ? W - xEnd : xEnd, y: yEnd, tx: s, ty: 0.6 }); }
  }
  const segs = (pts.segs0 || []).concat(spline(pts));
  domRibbon.o.pinches = [];
  domRibbon.setPath(segs);
  // the lines gather where the energy goes into a machine
  domRibbon.o.pinches = boxes.map((b) => domRibbon.fracAtY(b.top + b.h * 0.3));
  domRibbon.setPath(segs);
}
function domTick() {
  const r = dom.getBoundingClientRect();
  if (r.top > innerHeight * 1.4 || r.bottom < -innerHeight * 0.2) return;
  if (reduce) return;
  // the head rides the HEAD line of the screen; it took over from the globe's trail on that line
  const headY = innerHeight * HEAD - r.top;
  domRibbon.draw(domRibbon.fracAtY(headY));
  boxes.forEach((b, i) => setScan(i, (headY - b.top) / b.h * 360));
}
if (reduce) {
  // the trail is simply there and every drawing is coloured in
  shots.forEach((s, i) => setScan(i, 384));
}

/* ---------- why: the readout rolls in, the battery charges ---------- */
// every digit is a strip of 0-9 twice over; the scroll turns it one full lap and on to its own digit, like a meter
const figs = $(".figs");
const odos = $$("[data-odo]").map((el) => {
  const txt = el.textContent.trim(), strip = "<span>" + "01234567890123456789".split("").map((d) => "<span>" + d + "</span>").join("") + "</span>";
  el.innerHTML = '<span class="sr">' + txt + "</span>" + [...txt].map((ch) => '<span class="od" aria-hidden="true"><i>' + ch + "</i>" + strip + "</span>").join("");
  return { cols: $$(".od > span", el), ds: [...txt].map(Number) };
});
function rollTo(q) {
  const e = 1 - Math.pow(1 - q, 3);
  odos.forEach((o) => o.cols.forEach((c, i) => c.style.setProperty("--d", ((o.ds[i] + 10) * e).toFixed(3))));
  figs.style.setProperty("--q", e.toFixed(3));
}
// The trail charges the battery. It comes back in from the right of the screen, level into the terminal; inside
// the casing it runs out of sight and the charge front is its head, cell after cell; it leaves by the far end wall and
// goes off the screen on the other side, where the process takes it back in. Wide screens: the battery lies across and
// the scroll carries the head through it. Below 1280 the battery stands up: the trail swings in from the side above
// it, drops into the terminal on top and comes out at the bottom.
const battery = $(".cells"), cells = $$(".cell", battery);
const across = () => innerWidth >= 1280;
const whySec = $("#why"), whySvg = $(".why-trail", whySec);
const whyRibbon = new Ribbon(whySvg, { ...BAND, amp: trailAmp, wave: 480, taperStart: 0, taperEnd: 0, sparks: 4, seed: 9 });
let whyIn = 0, whyOut = 1, cellBox = [], rtl = true;
function charge(i, c) {
  const el = cells[i], v = c.toFixed(3);
  if (el._c === v) return; el._c = v;
  el.style.setProperty("--c", v);
  el.classList.toggle("is-full", c > 0.985);
}
function layoutWhy() {
  const r = whySec.getBoundingClientRect(), W = r.width, b = battery.getBoundingClientRect();
  whySvg.setAttribute("viewBox", `0 0 ${W} ${r.height}`);
  rtl = getComputedStyle(battery).direction === "rtl";
  const nub = parseFloat(getComputedStyle(battery).getPropertyValue("--nub")) || 12, off = Math.max(120, trailAmp() * 6);
  const T = b.top - r.top, B = b.bottom - r.top;
  cellBox = cells.map((el) => { const q = el.getBoundingClientRect(); return { l: q.left - r.left, r: q.right - r.left, t: q.top - r.top, b: q.bottom - r.top }; });
  const segs = [];
  if (across()) {
    // built for a terminal on the right, mirrored when it is on the left
    const L = rtl ? b.left - r.left : W - (b.right - r.left), Rt = rtl ? b.right - r.left : W - (b.left - r.left);
    const y = (T + B) / 2, xIn = Rt + nub, rise = Math.min(220, (B - T) * 0.6), m = (x) => (rtl ? x : W - x);
    const k1 = (W + off - xIn) * 0.5, k2 = (L + off) * 0.5;
    segs.push(["C", m(W + off), y - rise, m(W + off - k1), y - rise, m(xIn + k1), y, m(xIn), y]);
    segs.push(["L", m(xIn), y, m(L), y]);
    segs.push(["C", m(L), y, m(L - k2), y, m(-off + k2), y + rise, m(-off), y + rise]);
  } else {
    const cx = (b.left + b.right) / 2 - r.left, top = T - nub, fg = $(".figs", whySec).getBoundingClientRect().bottom - r.top;
    const rise = Math.max(90, Math.min(240, top - fg - 8)), sx = rtl ? W + off : -off, ex = rtl ? -off : W + off;
    segs.push(["C", sx, top - rise, (sx + cx) / 2, top - rise, cx, top - rise * 0.5, cx, top]);
    segs.push(["L", cx, top, cx, B]);
    segs.push(["C", cx, B, cx, B + rise * 0.5, (ex + cx) / 2, B + rise, ex, B + rise]);
  }
  whyRibbon.setPath(segs);
  whyIn = whyRibbon.marks[1] / whyRibbon.L; whyOut = whyRibbon.marks[2] / whyRibbon.L;
  // inside the casing (from the terminal's face to the far wall) the energy is out of sight
  whyRibbon.setGaps([[whyIn, whyOut]]);
}
function whyTick() {
  if (reduce) return;
  const ih = innerHeight, fr = figs.getBoundingClientRect();
  if (fr.top < ih * 1.1 && fr.bottom > -ih * 0.2) rollTo(clamp01((ih * 0.95 - fr.top) / (ih * 0.5)));
  const br = battery.getBoundingClientRect(), r = whySec.getBoundingClientRect();
  if (br.top > ih * 1.4 || br.bottom < -ih * 0.4) return;
  let f;
  if (across()) {
    // in while the battery comes up into view, through it while it crosses the middle, out as it rises past it
    const t = clamp01((ih * 0.98 - (br.top + br.height / 2)) / (ih * 0.62));
    f = t < 0.2 ? whyIn * t / 0.2 : t < 0.8 ? whyIn + (whyOut - whyIn) * (t - 0.2) / 0.6 : whyOut + (1 - whyOut) * (t - 0.8) / 0.2;
  } else f = whyRibbon.fracAtY(ih * HEAD - r.top);
  whyRibbon.draw(f);
  const h = whyRibbon.head(), down = !across();
  cellBox.forEach((q, i) => charge(i, f <= whyIn ? 0 : f >= whyOut ? 1 :
    clamp01(down ? (h.y - q.t) / (q.b - q.t) : rtl ? (q.r - h.x) / (q.r - q.l) : (h.x - q.l) / (q.r - q.l))));
  battery.classList.toggle("is-live", f >= whyIn - 0.002);
}
if (reduce) { rollTo(1); cells.forEach((_, i) => charge(i, 1)); battery.classList.add("is-live"); }

/* ---------- the process: an alternating current through five steps ---------- */
// The trail left the battery off the left of the screen, so it comes back in from there. Wide screens: across the band
// over the steps to the right, a turn out past the screen's edge and back, then the current crests under every step
// above it and dips over every step below it (horizontal tangents at the nodes, so it reads as one wave), and off the
// left again. Phones: it swings in from the left over the first step onto the start rail, runs down it like the
// domains, and bends away off the left below the last one. A step lights when the current reaches its node.
const proc = $("#process"), procRun = $(".proc-run", proc), procSvg = $(".proc-trail", proc);
const steps = $$(".step", proc), stepNodes = steps.map((s) => $(".step-node", s));
const procRibbon = new Ribbon(procSvg, { ...BAND, amp: trailAmp, wave: 420, taperStart: 0, taperEnd: 0, sparks: 4, seed: 5 });
let stepF = [], procTop = 0, procY0 = 0;
function layoutProc() {
  const r = procRun.getBoundingClientRect(), W = r.width, H = r.height;
  procSvg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  const pts = stepNodes.map((n) => { const b = n.getBoundingClientRect(); return { x: b.left - r.left + b.width / 2, y: b.top - r.top + b.height / 2 }; });
  // built for a right-to-left page (in from the left, the turn on the right) and mirrored for a left-to-right one
  const segs = [], off = Math.max(120, trailAmp() * 6), sw = doc.clientWidth, rl = getComputedStyle(proc).direction === "rtl";
  const P = pts.map((p) => ({ x: rl ? p.x : W - p.x, y: p.y })), inX = -r.left - off;
  if (wide()) {
    // the band runs over the heading, not under it: in from the left above the words, across, and the turn on the
    // right (out past the screen's edge, so it never cuts the heading) brings it down to the steps
    const hr = $(".proc-head", proc).getBoundingClientRect(), mid = (P[0].y + P[1].y) / 2;
    procTop = hr.top - r.top - Math.max(64, trailAmp() * 3);
    const R = (mid - procTop) / 2, cx = sw - r.left - R * 0.3, k = R * 0.5523;
    let x = cx, y = mid;
    const y0 = procTop - 72, xa = W * 0.55;
    segs.push(["C", inX, y0, xa * 0.55, y0, xa * 0.55, procTop, xa, procTop]);
    segs.push(["L", xa, procTop, cx, procTop]);
    segs.push(["C", cx, procTop, cx + k, procTop, cx + R, procTop + R - k, cx + R, procTop + R]);
    segs.push(["C", cx + R, procTop + R, cx + R, procTop + R + k, cx + k, mid, cx, mid]);
    const to = (nx, ny) => { const q = (x - nx) * 0.5; segs.push(["C", x, y, x - q, y, nx + q, ny, nx, ny]); x = nx; y = ny; };
    P.forEach((p) => to(p.x, p.y));
    to(inX, mid);
  } else {
    // in over the heading (not through it) onto the rail, which runs down beside the heading to the first step
    const x0 = P[0].x, yl = Math.max(P[P.length - 1].y + 40, H - 24), d = 200;
    const yS = $(".proc-head", proc).getBoundingClientRect().top - r.top - 72;
    procTop = yS;
    segs.push(["C", inX, yS, (inX + x0) / 2, yS, x0, yS + 60, x0, yS + 130]);
    segs.push(["L", x0, yS + 130, x0, yl]);
    segs.push(["C", x0, yl, x0, yl + d * 0.5, (inX + x0) / 2, yl + d, inX, yl + d]);
  }
  if (!rl) segs.forEach((g) => { for (let i = 1; i < g.length; i += 2) g[i] = W - g[i]; });
  procRibbon.setPath(segs);
  stepF = pts.map((p) => procRibbon.nearest(p.x, p.y));
  procY0 = pts[0].y;
}
function procTick() {
  if (reduce) return;
  const r = procRun.getBoundingClientRect(), ih = innerHeight;
  if (r.top > ih * 1.4 || r.bottom < -ih * 0.4) return;
  let f;
  if (wide()) {
    // across the top while the heading comes up the screen (in at the bottom edge, at the first step as that step
    // reaches a quarter of the way up), then through the steps over the next half screen
    const f0 = stepF[0], yB = r.top + procY0, lo = ih * 0.72;
    f = yB > lo ? f0 * clamp01((ih * 0.95 - (r.top + procTop)) / (ih * 0.23 + procY0 - procTop))
      : f0 + (1 - f0) * clamp01((lo - yB) / (ih * 0.5));
  } else f = procRibbon.fracAtY(ih * HEAD - r.top);
  procRibbon.draw(f);
  steps.forEach((s, i) => s.classList.toggle("on", f >= stepF[i] - 0.004));
}

/* ---------- the calculator: drag the power line ---------- */
// ASSUMPTIONS FOR THE CLIENT TO CONFIRM: square metres of space per kilowatt by kind of site, a yearly yield of
// 1,650 kWh per kilowatt (Israel), and a value of 0.38 to 0.48 shekel per kWh.
const calcSec = $("#calc"), calcForm = $("#calc-form"), area = $("#calc-area");
const lineEl = $(".line", calcSec), lineSvg = $(".line-trail", calcSec);
const lineRibbon = new Ribbon(lineSvg, { strands: Math.round(BAND.strands * 0.8), loose: BAND.loose - 1, amp: () => Math.round(trailAmp() * 0.9), wave: 440, taperStart: 0, taperEnd: 0, sparks: 3, seed: 7 });
const M2_PER_KW = { roof: 6.5, parking: 7, land: 12, water: 10, greenhouse: 9 };
const YIELD = 1650, PRICE = [0.38, 0.48], A_MIN = 45, A_MAX = 100000, THUMB = 44;
const outLo = $("[data-calc-lo]"), outHi = $("[data-calc-hi]"), outKw = $("[data-calc-kw]"), outKwh = $("[data-calc-kwh]"), outArea = $("[data-calc-area]");
const nf = new Intl.NumberFormat("he-IL");
const areaOf = (v) => { const a = A_MIN * Math.pow(A_MAX / A_MIN, v / 1000); return a < 1000 ? Math.round(a / 5) * 5 : a < 10000 ? Math.round(a / 50) * 50 : Math.round(a / 500) * 500; };
const areaText = (a) => (a < 10000 ? nf.format(a) + ' מ"ר' : nf.format(Math.round(a / 100) / 10) + " דונם");
const money = (n) => (n >= 1e6 ? (Math.round(n / 1e5) / 10).toLocaleString("he-IL") + " מיליון" : nf.format(n < 1e5 ? Math.round(n / 100) * 100 : Math.round(n / 1000) * 1000));
const shown = { lo: 0, hi: 0 };
let calc = {};
function calcState() { return calc; }
function computeCalc(first) {
  const where = ($("input[name=where]:checked", calcForm) || {}).value || "roof", a = areaOf(+area.value);
  const kw = a / M2_PER_KW[where], kwh = kw * YIELD;
  calc = { where, area: a, kw: Math.round(kw * 10) / 10, kwh: Math.round(kwh), lo: kwh * PRICE[0], hi: kwh * PRICE[1] };
  outArea.textContent = areaText(a);
  area.setAttribute("aria-valuetext", areaText(a).replace('מ"ר', "מטר רבוע"));
  outKw.textContent = nf.format(kw < 10 ? Math.round(kw * 10) / 10 : Math.round(kw));
  outKwh.textContent = nf.format(kwh < 1e5 ? Math.round(kwh / 100) * 100 : Math.round(kwh / 1000) * 1000);
  const paint = () => { outLo.textContent = money(shown.lo); outHi.textContent = money(shown.hi); };
  if (reduce || first || !hasGsap) { shown.lo = calc.lo; shown.hi = calc.hi; paint(); }
  else gsap.to(shown, { lo: calc.lo, hi: calc.hi, duration: 0.6, ease: "power3.out", overwrite: true, onUpdate: paint });
  paintLine();
}
// the knob sits where the range's own thumb is, so a tap anywhere on the line lands on the value under the finger
function paintLine() {
  const W = lineEl.clientWidth, p = +area.value / 1000, x = W - THUMB / 2 - p * (W - THUMB);
  lineEl.style.setProperty("--kx", x.toFixed(1) + "px");
  lineRibbon.draw((W - x) / W);
}
function layoutLine() {
  const W = lineEl.clientWidth, H = lineEl.clientHeight;
  lineSvg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  lineRibbon.setPath([["L", W, H / 2, 0, H / 2]]);
  paintLine();
}
area.addEventListener("input", () => computeCalc());
calcForm.addEventListener("change", () => computeCalc());

/* ---------- leads: both forms, to Monday ---------- */
// The Monday board's API details are still to come from the client. Until they do, a lead is kept in the page only
// (window.__leads) and the visitor sees the thank-you state; sendLead is the one place to wire the real call.
function sendLead(data) {
  window.__leads = (window.__leads || []).concat(data);
  return new Promise((ok) => setTimeout(ok, 450));
}
const phoneOK = (v) => /^0(5\d{8}|7\d{8}|[2-489]\d{7})$/.test(v.replace(/[^\d]/g, ""));
$$("form[data-lead]").forEach((f) => {
  const msg = $(".lead-msg", f), btn = $("button", f);
  f.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = f.elements.name, phone = f.elements.phone, bad = [];
    [name, phone].forEach((el) => el.removeAttribute("aria-invalid"));
    if (name.value.trim().length < 2) bad.push([name, "נא למלא שם"]);
    if (!phoneOK(phone.value)) bad.push([phone, "נא לבדוק את מספר הטלפון"]);
    msg.classList.toggle("is-err", bad.length > 0);
    if (bad.length) {
      bad.forEach(([el]) => el.setAttribute("aria-invalid", "true"));
      msg.textContent = bad.map((b) => b[1]).join(" · ");
      bad[0][0].focus();
      return;
    }
    const data = { source: f.dataset.lead, name: name.value.trim(), phone: phone.value.trim(), at: new Date().toISOString() };
    if (f.dataset.lead === "calc") data.calc = calcState();
    else data.topics = $$('input[name="topic"]:checked', f).map((i) => i.value);
    btn.disabled = true; msg.textContent = "שולחים...";
    sendLead(data).then(
      // the lead lands on the thank-you page (where the conversion is counted once the site is live)
      () => { f.classList.add("is-sent"); msg.textContent = "קיבלנו, תודה."; try { sessionStorage.setItem("lead-name", name.value.trim().split(/\s+/)[0]); sessionStorage.removeItem("lead-fired"); } catch (e) {}
        location.href = "thanks.html?from=" + f.dataset.lead; },
      () => { btn.disabled = false; msg.classList.add("is-err"); msg.textContent = "השליחה לא עברה. אפשר לנסות שוב, או לחייג 6223*."; }
    );
  });
});

/* ---------- projects: each one opens out as it reaches the top, the next slides over it ---------- */
// --x: 0 while the project is a screen below, 1 once it stands at the top (inset to full width, the picture settles);
// --d: how far the next one has come up over it (it sinks back into the night)
const works = $$(".work");
let workTop = 0;
function layoutWorks() { workTop = works.length ? parseFloat(getComputedStyle(works[0]).top) || 0 : 0; }
function worksTick() {
  if (reduce || !works.length) return;
  const ih = innerHeight, span = Math.max(1, ih - workTop);
  const xs = works.map((w) => {
    const t = w.getBoundingClientRect().top;
    return t > ih * 1.2 ? -1 : clamp01((ih - t) / span);
  });
  works.forEach((w, i) => {
    if (xs[i] < 0) return;
    const x = xs[i].toFixed(3), d = (i + 1 < works.length ? Math.max(0, xs[i + 1]) : 0).toFixed(3);
    if (w._x !== x) { w._x = x; w.style.setProperty("--x", x); }
    if (w._d !== d) { w._d = d; w.style.setProperty("--d", d); }
    // wholly under the next one: out of sight, so out of the page too
    const gone = d === "1.000";
    if (w._g !== gone) { w._g = gone; w.style.visibility = gone ? "hidden" : ""; }
  });
}
if (reduce) works.forEach((w) => w.style.setProperty("--x", 1));

/* ---------- what clients say: three columns run past each other through the window ---------- */
// while the section crosses the screen every column travels the whole of its overflow, each at its own speed and the
// middle one the other way, so the voices slide past one another and never stop at an edge
const says = $(".says"), sayWall = $(".say-wall", says), sayCols = $$(".say-col", says);
function saysTick() {
  if (reduce) return;
  const r = sayWall.getBoundingClientRect(), ih = innerHeight;
  if (r.bottom < -ih * 0.2 || r.top > ih * 1.2) return;
  const p = clamp01((ih - r.top) / (ih + r.height)), H = r.height;
  sayCols.forEach((col) => {
    const sp = +col.dataset.speed, run = Math.max(0, col.scrollHeight - H), q = clamp01(0.5 + (p - 0.5) * Math.abs(sp) * 1.2);
    col.style.setProperty("--sy", (-(sp > 0 ? q : 1 - q) * run).toFixed(1) + "px");
  });
}

/* ---------- knowledge: the strip of articles the scroll carries past ---------- */
// The section holds the screen while the scroll carries the strip sideways, one pixel of strip for every KN_K pixels
// of scroll (its height is set here so the hold ends with the last article). A focus runs from the first article's
// middle to the last one's; the article under it comes up a size and out of the night, and the counter and the line
// follow it. Nothing moves unless the visitor scrolls. Without motion the strip is left to scroll sideways by hand.
const kn = $("#knowledge"), knView = $(".kn-view", kn), knTrack = $(".kn-track", kn), knArts = $$(".art", knTrack), knCount = $(".kn-count b", kn);
const KN_K = 1.15;
let knOn = false, knRun = 0, knRtl = true, knC = [], knStep = 1, knI = -1;
function layoutKn() {
  knOn = !reduce;
  kn.classList.toggle("is-run", knOn);
  if (!knOn) { kn.style.height = ""; return; }
  knTrack.style.setProperty("--kx", "0px");
  knRtl = getComputedStyle(kn).direction === "rtl";
  knRun = Math.max(0, knTrack.scrollWidth - knView.clientWidth);
  knC = knArts.map((a) => a.offsetLeft + a.offsetWidth / 2);
  knStep = knArts.length > 1 ? Math.abs(knC[1] - knC[0]) : 1;
  const h = Math.round(innerHeight + knRun * KN_K + (parseFloat(getComputedStyle(kn).paddingBottom) || 0)) + "px";
  // a new height moves everything under it, so the scroll triggers below are measured again (once: the next pass
  // finds the same height)
  if (kn.style.height !== h) { kn.style.height = h; if (hasGsap) requestAnimationFrame(() => ST.refresh()); }
  knI = -1;
}
function knTick() {
  if (!knOn) return;
  const r = kn.getBoundingClientRect(), ih = innerHeight;
  if (r.top > ih || r.bottom < 0) return;
  const p = knRun ? clamp01(-r.top / (knRun * KN_K)) : 0, x = p * knRun;
  knTrack.style.setProperty("--kx", (knRtl ? x : -x).toFixed(1) + "px");
  kn.style.setProperty("--kp", p.toFixed(4));
  const n = knC.length - 1, f = knC[0] + (knC[n] - knC[0]) * p;
  let best = 0;
  knArts.forEach((a, i) => {
    const k = clamp01(1 - Math.abs(knC[i] - f) / knStep), e = k * k * (3 - 2 * k);
    if (Math.abs(knC[i] - f) < Math.abs(knC[best] - f)) best = i;
    a.style.setProperty("--ks", (0.9 + e * 0.1).toFixed(4));
    a.style.setProperty("--kl", e.toFixed(3));
  });
  if (best !== knI) { knI = best; knCount.textContent = String(best + 1).padStart(2, "0"); }
}

/* ---------- the close: the last stretch of the trail ends in the button ---------- */
const closeSec = $("#contact"), closeSvg = $(".close-trail", closeSec), plug = $(".plug", closeSec);
const closeRibbon = new Ribbon(closeSvg, { ...BAND, amp: trailAmp, wave: 520, taperStart: 0, taperEnd: 50, sparks: 4, seed: 11 });
function layoutClose() {
  const r = closeSec.getBoundingClientRect(), W = r.width, H = r.height, b = plug.getBoundingClientRect();
  closeSvg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  const px = b.left - r.left + b.width / 2, py = b.top - r.top + b.height / 2, off = Math.max(120, trailAmp() * 6);
  // the last time it comes back in from the side of the screen nearest the socket and swings into it; on a wide screen
  // it arrives level (the socket stands in the open night beside the words), on a phone it comes down into it
  const near = px < W / 2, sx = near ? -r.left - off : doc.clientWidth - r.left + off, d = near ? 1 : -1;
  const segs = [];
  if (wide()) segs.push(["C", sx, py - 280, sx + d * (Math.abs(px - sx) * 0.55), py - 280, px - d * 220, py, px, py]);
  else { const y1 = Math.max(40, b.top - r.top - 150); segs.push(["C", sx, y1, (sx + px) / 2, y1, px, y1 + (py - y1) * 0.4, px, py]); }
  closeRibbon.setPath(segs);
}
function closeTick() {
  if (reduce) return;
  const r = closeSec.getBoundingClientRect(), ih = innerHeight;
  if (r.top > ih * 1.2 || r.bottom < -ih * 0.2) return;
  const f = closeRibbon.fracAtY(ih * 0.7 - r.top);
  closeRibbon.draw(f);
  plug.classList.toggle("is-lit", f > 0.985);
}

/* ---------- the footer and the phone bar ---------- */
const ft = $("#ft"), ftBig = $(".ft-big", ft), ftWord = $("span", ftBig);
// the closing word fills the width exactly, whatever the font's real width turns out to be
function fitBig() {
  ftBig.style.fontSize = "";
  const w = ftWord.getBoundingClientRect().width, room = ftBig.clientWidth;
  if (w > 0 && room > 0) ftBig.style.fontSize = (parseFloat(getComputedStyle(ftBig).fontSize) * (room / w) * 0.985).toFixed(1) + "px";
}
$$("[data-year]").forEach((e) => (e.textContent = new Date().getFullYear()));
inView(ft, () => ft.classList.add("is-in"), 0.95);
// the footer is built by the scroll: --fp runs from 0 as it comes up the screen to 1 at the end of the page
function ftTick() {
  if (reduce) return;
  const r = ft.getBoundingClientRect(), ih = innerHeight;
  if (r.top > ih) { if (ft._p !== "0") { ft._p = "0"; ft.style.setProperty("--fp", 0); } return; }
  const p = clamp01((ih - r.top) / Math.max(1, Math.min(r.height, ih * 0.9))).toFixed(3);
  if (ft._p !== p) { ft._p = p; ft.style.setProperty("--fp", p); }
}
// the headings drift against the page while they cross the screen: data-drift is how far, top edge to bottom edge
const drifts = $$("[data-drift]").map((el) => ({ el, k: +el.dataset.drift || 0, dy: 0 }));
function driftTick() {
  if (reduce) return;
  const ih = innerHeight;
  for (const d of drifts) {
    const r = d.el.getBoundingClientRect(), top = r.top - d.dy;
    if (top > ih + 200 || top + r.height < -200) continue;
    const dy = Math.round(((top + r.height / 2) / ih - 0.5) * d.k * 2) / 2;
    if (dy !== d.dy) { d.dy = dy; d.el.style.setProperty("--dy", dy + "px"); }
  }
}
// the bar comes in once the opening's own button has left the screen, and steps aside where the same action is on
// screen (the calculator, the close), over the footer, and while a field has focus (the keyboard is up)
const mbar = $("[data-mbar]"), ctaOrigin = $("[data-cta-origin]"), ctaEnds = $$("[data-cta-end]");
let typing = false;
function mbarTick() {
  if (wide()) { if (mbar.classList.contains("is-on")) { mbar.classList.remove("is-on"); mbar.inert = true; } return; }
  const ih = innerHeight, past = ctaOrigin.getBoundingClientRect().bottom < 8;
  const atEnd = ctaEnds.some((el) => { const r = el.getBoundingClientRect(); return r.top < ih * 0.7 && r.bottom > ih * 0.1; }) || ft.getBoundingClientRect().top < ih;
  const on = past && !atEnd && !typing && !mnOpen;
  if (on !== mbar.classList.contains("is-on")) { mbar.classList.toggle("is-on", on); mbar.inert = !on; }
}
addEventListener("focusin", (e) => { if (e.target.matches("input:not([type=radio]):not([type=checkbox]):not([type=range]),textarea,select")) { typing = true; mbarTick(); } });
addEventListener("focusout", (e) => { if (e.target.matches("input,textarea,select")) { typing = false; setTimeout(mbarTick, 160); } });

/* ---------- one frame loop for everything the scroll drives ---------- */
let ticking = false;
function tick() { ticking = false; headerTick(); domTick(); whyTick(); procTick(); worksTick(); saysTick(); knTick(); closeTick(); ftTick(); driftTick(); mbarTick(); }
addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(tick); } }, { passive: true });

function relayout() {
  layoutHero();
  layoutKn();
  measureStations();
  layoutDom();
  layoutWhy();
  layoutProc();
  layoutLine();
  layoutClose();
  layoutWorks();
  fitBig();
  if (reduce) { domRibbon.draw(1); whyRibbon.draw(1); procRibbon.draw(1); closeRibbon.draw(1); steps.forEach((s) => s.classList.add("on")); plug.classList.add("is-lit"); }
  if (globe) globe.resize();
  tick();
  if (lenis) requestAnimationFrame(() => lenis.resize());
}
let rz = 0;
addEventListener("resize", () => { clearTimeout(rz); rz = setTimeout(relayout, 120); });
if (hasGsap) ST.addEventListener("refresh", relayout);
computeCalc(true);
relayout();

// the split and the measures need the real fonts; wait for them (at most 1.5s)
Promise.race([document.fonts ? document.fonts.ready : Promise.resolve(), new Promise((r) => setTimeout(r, 1500))]).then(() => {
  initIntro();
  if (hasGsap) ST.refresh(); else relayout();
});
addEventListener("load", () => {
  if (hasGsap) ST.refresh(); else relayout();
  // back from a "stop motion" reload: the same place on the page, the panel open on the same switch
  let back = null;
  try { back = JSON.parse(sessionStorage.getItem("tr-ax-back") || "null"); sessionStorage.removeItem("tr-ax-back"); } catch (e) {}
  if (back) { if (lenis) lenis.scrollTo(back.y, { immediate: true, force: true }); else scrollTo(0, back.y); setAx(true, $(`[data-ax="${back.k}"]`, ax)); }
});
