// Treenergy · home page behaviour.
// The living night (sky.js), the header's power line, the power-up menu, the opening entrance, Lenis + GSAP,
// the journey (globe + trail), the intro statement, and the domains: the trail runs on and powers each picture.
// The scene page (scene.html, 19.10) opens on the tour instead (scene.js): there is no journey and no domains section
// of this script's, and everything below that needs them stands aside.
import { Ribbon } from "./ribbon.js";
import { mountSky } from "./sky.js";

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduce = !!window.__still || matchMedia("(prefers-reduced-motion: reduce)").matches;  // __still: the visitor stopped motion in the accessibility panel
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const smooth = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
// GSAP's core is Lenis's clock and SplitText cuts the intro into words; the scroll-linked pieces are this script's own
// (scrub() below; round 7 dropped ScrollTrigger for speed)
const gsap = window.gsap, Split = window.SplitText;
const hasGsap = !!gsap;
if (hasGsap && Split) gsap.registerPlugin(Split);
const doc = document.documentElement;
// the scene page: the tour takes the place of the globe, the opening and the domains (scene.js runs them)
const scenePage = !!$(".lb");

/* ---------- the living night ---------- */
let sky = null;
try { sky = mountSky($("#sky")); } catch (e) { console.warn("sky", e); }

/* ---------- header: the power line ---------- */
// The wire's nodes are the stations of this page. The fill reaches node i exactly when the page reaches station i,
// so the line is a map of the journey, not just a progress bar.
const hd = $("#hd"), hdNodes = $$(".hd-node", hd), hdCta = $(".hd-cta", hd), hdFill = $(".hd-fill", hd);
// A place on the page with no node of its own (the scene page's fourth stop, scene.js) is a gap: from there on to the
// next node, no node is lit, so the one before it doesn't seem to be where the visitor is.
let stations = [], gaps = [], here = -1, docH = 0;
function measureStations() {
  docH = doc.scrollHeight;
  const maxProbe = docH - innerHeight * 0.5, n = hdNodes.length;
  stations = hdNodes.map((a, i) => {
    const t = $(a.getAttribute("href"));
    const y = t ? t.getBoundingClientRect().top + scrollY : maxProbe;
    return Math.min(y, maxProbe - (n - i) * 2);
  });
  gaps = $$("[data-hd-gap]").map((e) => e.getBoundingClientRect().top + scrollY);
}
// y: the page's scroll, read by the frame before anything was written. It only writes: the fill takes its own --hp, so a
// frame restyles the one line and not the whole header (round 6)
function headerTick(y = scrollY) {
  const n = hdNodes.length, probe = y + innerHeight * 0.5;
  hd.classList.toggle("is-scrolled", y > 24);
  if (!stations.length) return;
  const xs = [innerHeight * 0.5, ...stations, (docH || doc.scrollHeight) - innerHeight * 0.5];
  const fs = [0, ...hdNodes.map((_, i) => (i + 0.5) / n), 1];
  let f = probe >= xs[xs.length - 1] ? 1 : 0;
  for (let i = 0; i < xs.length - 1 && !f; i++) if (probe < xs[i + 1]) { f = fs[i] + (fs[i + 1] - fs[i]) * clamp01((probe - xs[i]) / ((xs[i + 1] - xs[i]) || 1)); break; }
  const hp = f.toFixed(4), fillEl = hdFill || hd;
  if (fillEl._hp !== hp) { fillEl._hp = hp; fillEl.style.setProperty("--hp", hp); }
  let h = -1;
  hdNodes.forEach((a, i) => { const past = probe >= stations[i]; a.classList.toggle("is-past", past); if (past) h = i; });
  if (h >= 0 && gaps.some((g) => g > stations[h] && probe >= g && (h === n - 1 || g < stations[h + 1]))) h = -1;
  if (h !== here) {
    here = h;
    hdNodes.forEach((a, i) => { a.classList.toggle("is-here", i === h); if (i === h) a.setAttribute("aria-current", "location"); else a.removeAttribute("aria-current"); });
  }
  hdCta.classList.toggle("is-lit", f > 0.985);
}

/* ---------- the menu: the list, and an Earth of white points beside it ---------- */
// Round 5 (Idan and Liav 18.10: the list on the right, the Earth on the left as on the home page, simpler on phones).
// Round 6 (the client 25.10): the realistic Earth was heavy here; the menu's Earth is now the sketch's first one, white
// points (menu-dots.js, no library), with no places marked on it and no trail. It turns slowly; pointing at (or
// focusing) an item gives it a soft push. Where WebGL can't run, the list is the whole menu.
const mn = $("#mn"), mnBtn = $(".mn-btn", hd), mnClose = $(".mn-close", mn), mnIn = $(".mn-in", mn);
const mnLinks = $$(".mn-list a", mn);
let mnOpen = false, mnLast = null;
const mnBall = $(".mn-ball", mn);
const ballOk = "WebGLRenderingContext" in window;
let ball = null, ballLoad = null;
if (ballOk) mn.classList.add("has-ball");
function openBall() {
  ballLoad ||= import("./menu-dots.js")
    .then(({ mountDots }) => mountDots(mnBall))
    .catch(() => null)
    .then((b) => { if (!b) mn.classList.remove("has-ball"); return b; });
  ballLoad.then((b) => { ball = b; if (!b) return; if (mnOpen) { b.hold(false); b.replay(); } else b.hold(true); });
}
mnLinks.forEach((a) => {
  a.addEventListener("pointerenter", () => ball && ball.nudge());
  a.addEventListener("focus", () => ball && ball.nudge());
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
    // the Earth is for desktops (round 6: phones and tablets get the list and the call)
    if (ballOk && wide()) openBall();
  } else if (ball) ball.hold(true);
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
  // (a place in the scene page's tour takes the visitor there itself)
  if (e.defaultPrevented) return;
  const a = e.target.closest('a[href^="#"]'); if (!a) return;
  const id = a.getAttribute("href"), t = id.length > 1 ? $(id) : null; if (!t) return;
  e.preventDefault();
  // a domain link asks about that domain: the form opens with it already ticked
  if (a.dataset.topic) { const box = $(`input[name="topic"][value="${a.dataset.topic}"]`); if (box) box.checked = true; }
  const tr = t.getBoundingClientRect(), hh = hd.getBoundingClientRect().height;
  // a place shorter than the screen (a domain scene, the form) lands centred; a taller one lands under the header, not behind it
  const y = id === "#top" || id === "#main" ? 0 : tr.top + scrollY - (tr.height < innerHeight - hh ? (innerHeight - tr.height) / 2 : hh);
  // with motion it glides; stopped (reduced motion, or the visitor's own choice) it is there at once, at the same place
  if (lenis) lenis.scrollTo(y, { duration: Math.min(1.6, 0.7 + Math.abs(y - scrollY) / 8000), easing: glideEase, force: true });
  else scrollTo({ top: y, behavior: "instant" });
  try { history.replaceState(null, "", id); } catch (err) {}
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
  if (relay) requestAnimationFrame(relayout);
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
  // an observer where there is one: it answers after the frame is drawn, so nothing reads the page on the scroll
  // (round 7, for speed: the scroll handler below measured every waiting group on every scroll)
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { io.disconnect(); f(); } }, { rootMargin: `0px 0px ${(-(1 - at) * 100).toFixed(1)}% 0px` });
    io.observe(el);
    return;
  }
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
if (!scenePage) enter($(".hero"));
$$(".rv-wait").forEach((g) => enter(g, 0.82));

/* ---------- Lenis + GSAP ---------- */
let lenis = null;
if (hasGsap && !reduce && window.Lenis) {
  // the scene page's tour follows a desktop wheel more softly (Liav 19.10: "להאט קצת את קצב הגלילה בדסקטופ")
  lenis = new window.Lenis({ autoRaf: false, lerp: scenePage && innerWidth >= 1024 ? 0.085 : 0.12, anchors: { offset: -72 } });
  window.__lenis = lenis;
  // the scroll's speed makes the night flow
  lenis.on("scroll", (e) => { if (sky) sky.scroll(e.scroll, e.velocity * 60); });
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  doc.classList.add("gsap-live");
} else if (sky) {
  let ly = scrollY, lt = performance.now();
  addEventListener("scroll", () => { const t = performance.now(); sky.scroll(scrollY, ((scrollY - ly) / Math.max(1, t - lt)) * 1000); ly = scrollY; lt = t; }, { passive: true });
}

/* ---------- the journey: globe + trail + the opening leaving ---------- */
const journey = $(".journey"), stage = $("#globe"), heroEl = $(".hero");
const dom = $("#domains"), domOn = !scenePage, shots = domOn ? $$(".shot", dom) : [];
// every machine is there twice: dimmed in the night, and lit, uncovered from the top down by the trail's head line, so
// it is lit exactly as far as the energy has come. A ring of three fibres wraps it, drawn as the head passes: the back
// halves (behind the machine) first, then the front ones over it
const NS = "http://www.w3.org/2000/svg";
const RINGS = [[1, 1, -7, 0, 1.6, 0.95], [0.95, 0.78, -4.5, 0.035, 1, 0.5], [1.06, 1.22, -9.5, -0.03, 0.8, 0.32]];
const wipes = shots.map((f) => ({ f, o: $(".obj", f), pw: -1 }));
function ringPaths(w) {
  const o = w.o, W = o.offsetWidth, H = o.offsetHeight;
  if (!W || (w.W === W && w.H === H)) return;
  w.W = W; w.H = H;
  const rx0 = W * 0.5 + Math.max(22, W * 0.07), ry0 = Math.max(16, Math.min(rx0 * 0.2, H * 0.16));
  const pt = (cx, cy, rx, ry, c, sn, t) => [cx + rx * Math.cos(t) * c - ry * Math.sin(t) * sn, cy + rx * Math.cos(t) * sn + ry * Math.sin(t) * c];
  [["orb-back", Math.PI], ["orb-front", 0]].forEach(([cls, t0]) => {
    const svg = $("." + cls, o);
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.innerHTML = "";
    RINGS.forEach(([kx, ky, rot, dy, sw, op], i) => {
      const rx = rx0 * kx, ry = ry0 * ky, a = (rot * Math.PI) / 180, c = Math.cos(a), sn = Math.sin(a), cx = W / 2, cy = H * (0.56 + dy);
      const p0 = pt(cx, cy, rx, ry, c, sn, t0), p1 = pt(cx, cy, rx, ry, c, sn, t0 + Math.PI);
      const d = `M${p0[0].toFixed(1)} ${p0[1].toFixed(1)}A${rx.toFixed(1)} ${ry.toFixed(1)} ${rot} 0 1 ${p1[0].toFixed(1)} ${p1[1].toFixed(1)}`;
      for (const sp of i ? [0] : [0, 1]) {
        const p = document.createElementNS(NS, "path");
        p.setAttribute("d", d); p.setAttribute("pathLength", "1");
        if (sp) p.setAttribute("class", "sp"); else p.setAttribute("style", `--w:${sw};--o:${op}`);
        svg.appendChild(p);
      }
    });
  });
}
// pw (0..1): how far down the machine the head has come; the ring follows from a fifth of the way
function setScan(i, pw) {
  const w = wipes[i]; pw = clamp01(pw); if (Math.abs(w.pw - pw) < 0.0005) return; w.pw = pw;
  const r = clamp01((pw - 0.18) / 0.62);
  w.f.style.setProperty("--pw", pw.toFixed(4));
  w.f.style.setProperty("--rb", clamp01(r * 2).toFixed(4));
  w.f.style.setProperty("--rf", clamp01(r * 2 - 1).toFixed(4));
  w.f.classList.toggle("is-scan", pw > 0.004 && pw < 0.98);
  w.f.classList.toggle("is-lit", pw >= 0.98);
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
  const words = [$("h2", dom), $(".dom-lead", dom), ...$$("h3", $(".scene", dom))].filter((e) => e.getBoundingClientRect().top < s0.top);
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

/* ---------- scroll-linked spans ---------- */
// A span runs 0..1 between two scroll positions taken from its element (like a scroll trigger's start and end). They
// are measured in relayout() and written in tick()'s write phase, so the page is never read after something on it was
// written in the same frame (round 7: ScrollTrigger did that on every scroll, and it was the frame's biggest cost)
const spans = [];
function scrub(el, start, end, set) { spans.push({ el, start, end, set, a: 0, b: 1, p: -1 }); }
function measureSpans() {
  const ih = innerHeight, y = scrollY;
  for (const s of spans) {
    const r = s.el.getBoundingClientRect(), t = r.top + y, b = r.bottom + y;
    s.a = s.start(t, b, ih); s.b = Math.max(s.a + 1, s.end(t, b, ih)); s.p = -1;
  }
}
function spansTick(y) {
  for (const s of spans) { const p = clamp01((y - s.a) / (s.b - s.a)); if (p !== s.p) { s.p = p; s.set(p); } }
}
// Where a section sits on the page, measured once and then read off the scroll, so the frame's section ticks don't
// measure the page between each other's writes (round 7, for speed). Measured afresh after every relayout() and
// whenever the page changes size (a picture or a font coming in). The scroll is the one tick() read first: reading it
// again after a write would lay the page out once more
const spots = new Map();
let frameY = 0;
function rectOf(el) {
  let s = spots.get(el);
  if (!s) { const r = el.getBoundingClientRect(); s = { t: r.top + frameY, h: r.height }; spots.set(el, s); }
  return { top: s.t - frameY, bottom: s.t - frameY + s.h, height: s.h };
}
if (window.ResizeObserver) new ResizeObserver(() => spots.clear()).observe(document.body);

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
  // from its top at 82% of the screen to its foot at 42%
  scrub(say, (t, b, ih) => t - 0.82 * ih, (t, b, ih) => b - 0.42 * ih, paint);
}

/* ---------- domains: the trail draws each domain's sign as it passes through it ---------- */
// The ribbon starts on the domains' top edge, where the globe trail ends (the stage leaves with the intro), with the
// same lines, so the energy runs on from Israel without a seam. Its head rides the 72% line of the screen and goes
// down through the middle of every sign, drawing it; after the last one it bends away and leaves by the side of the
// screen (the reasons below take it back in from the other side), so the trail never stops in the middle of the page.
const domSvg = $(".dom-trail", dom), domMore = $(".dom-more", dom);
// (the scene page's domains, shown only where the tour can't run, are scene.js's)
const domRibbon = domOn ? new Ribbon(domSvg, { ...BAND, amp: trailAmp, wave: 520, taperStart: 0, taperEnd: 0, sparks: 4, seed: 3 }) : null;
let boxes = [], domFoot = 0;
const KEY_TY = 0.15;

function layoutDom() {
  if (!domOn) return;
  measureSeam();
  const r = dom.getBoundingClientRect(), W = r.width, H = r.height, x0 = railX(), J = jointY();
  domSvg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  wipes.forEach(ringPaths);
  boxes = wipes.map((w) => { const b = w.o.getBoundingClientRect(); return { top: b.top - r.top, h: b.height, cx: b.left - r.left + b.width / 2, w: b.width }; });
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
    // and on down the rail past the "coming soon" lines and the reasons' heading and figures (below 1024 they all keep
    // the rail clear), to bend away over the edge just where the reasons' trail swings in from it above the battery's
    // terminal (layoutWhy): the one goes out as the other comes in on the head's line, so there is a trail on the screen
    // all the way (as the scene page's trail out of the tour)
    const cl = $(".cells"), fgs = $(".figs");
    if (cl && fgs) {
      const nub = parseFloat(getComputedStyle(cl).getPropertyValue("--nub")) || 12, t = cl.getBoundingClientRect().top - r.top - nub;
      const yOut = t - Math.max(90, Math.min(240, t - (fgs.getBoundingClientRect().bottom - r.top) - 8));
      const s = x0 > W / 2 ? 1 : -1, bend = Math.max(120, (s > 0 ? W - xEnd - x0 : x0 - xEnd) * 0.9);
      if (yOut - bend > pts[pts.length - 1].y + 40) {
        pts.push({ x: x0, y: yOut - bend });
        pts.push({ x: s > 0 ? W - xEnd : xEnd, y: yOut, tx: s, ty: 0.6 });
      }
    }
  }
  // wide screens: down through the room between the "coming soon" lines and away by the side just above the first of
  // the reasons that reaches over there, so it is still going out while the reasons' trail comes in from the other side
  // and there is a trail on the screen all the way (where there is no such room it leaves above the lines, as before)
  if (wide()) { const out = wideOut(r, W, amp, pts[pts.length - 1], xEnd); if (out) pts.push(...out); }
  // (on narrow screens the rail runs by the edge, so it drifts off over that edge instead of cutting across the words)
  if (yEnd > pts[pts.length - 1].y + 40) {
    if (wide()) pts.push({ x: xEnd, y: yEnd, tx: -1, ty: 0.22 });
    else { const s = x0 > W / 2 ? 1 : -1; pts.push({ x: s > 0 ? W - xEnd : xEnd, y: yEnd, tx: s, ty: 0.6 }); }
  }
  domFoot = pts[pts.length - 1].y;
  // wide screens: out of each machine the energy heads for the next one at once, not straight down, so it clears the key
  // under the drawing (straight down it ran through "יחידת קירור" at 1024-1440)
  if (wide()) for (let i = 1; i < pts.length - 1; i++) { const p = pts[i], q = pts[i + 1]; if (!p.keep) { p.tx = q.x - p.x; p.ty = (q.y - p.y) * KEY_TY; } }
  const segs = (pts.segs0 || []).concat(spline(pts));
  domRibbon.o.pinches = [];
  domRibbon.setPath(segs);
  // the lines gather where the energy goes into a machine
  domRibbon.o.pinches = boxes.map((b) => domRibbon.fracAtY(b.top + b.h * 0.3));
  domRibbon.setPath(segs);
}
const lineBoxes = (el) => { const g = document.createRange(); g.selectNodeContents(el); return [...g.getClientRects()].filter((b) => b.width && b.height); };
function wideOut(r, W, amp, from, xEnd) {
  const clr = 16 + amp * 1.6;
  const rows = $$("p", domMore).flatMap(lineBoxes).map((b) => [b.left - r.left, b.right - r.left, b.top - r.top, b.bottom - r.top]);
  if (!rows.length) return null;
  const top = Math.min(...rows.map((b) => b[2])), bot = Math.max(...rows.map((b) => b[3]));
  if (top < from.y + 60) return null;
  // the room between the lines, clear of their letters (not the margins by the screen's edges); it only goes straight
  // down through it, so a band's width and a little either side is room enough
  const gaps = [], side = amp + 16;
  let x = -Infinity;
  for (const [a, b] of rows.map((b) => [b[0] - side, b[1] + side]).sort((p, q) => p[0] - q[0])) { if (a > x && x > 0) gaps.push([x, a]); x = Math.max(x, b); }
  if (!gaps.length) return null;
  const g = gaps.sort((p, q) => Math.abs(p[0] + p[1] - 2 * from.x) - Math.abs(q[0] + q[1] - 2 * from.x))[0], xM = (g[0] + g[1]) / 2;
  // the first of the reasons' words that reaches into the way out
  let block = Infinity;
  for (const el of $("#why").children) {
    if (el instanceof SVGElement) continue;
    for (const b of lineBoxes(el)) if (b.left - r.left < xM + clr && b.top - r.top > bot) block = Math.min(block, b.top - r.top);
  }
  const yOut = block - clr - amp;
  if (!Number.isFinite(block) || yOut < bot + 160) return null;
  return [{ x: xM, y: (top + bot) / 2, tx: 0, ty: 1, keep: true }, { x: xEnd, y: yOut, tx: -1, ty: 0.22 }];
}
function domTick() {
  if (!domOn) return;
  const r = rectOf(dom);
  // (on phones the way out runs on past the section, to where the reasons' trail comes in)
  if (r.top > innerHeight * 1.4 || r.top + Math.max(r.height, domFoot) < -innerHeight * 0.2) return;
  if (reduce) return;
  // the head rides the HEAD line of the screen; it took over from the globe's trail on that line
  const headY = innerHeight * HEAD - r.top;
  domRibbon.draw(domRibbon.fracAtY(headY));
  boxes.forEach((b, i) => setScan(i, (headY - b.top) / (b.h * 0.92)));
}
if (reduce) {
  // the trail is simply there and every drawing is coloured in
  shots.forEach((s, i) => setScan(i, 1));
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
let whyIn = 0, whyOut = 1, cellBox = [], rtl = true, whyEy = 0, whyRise = 0, whyVis = 0;
function charge(i, c) {
  const el = cells[i], v = c.toFixed(3);
  if (el._c === v) return; el._c = v;
  el.style.setProperty("--c", v);
  el.classList.toggle("is-full", c > 0.985);
  // the charge front has reached the cell's sign (scene.html): it strikes up
  el.classList.toggle("is-on", c > 0.18);
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
    whyEy = y - rise; whyRise = rise;
  } else {
    const cx = (b.left + b.right) / 2 - r.left, top = T - nub, fg = $(".figs", whySec).getBoundingClientRect().bottom - r.top;
    const rise = Math.max(90, Math.min(240, top - fg - 8)), sx = rtl ? W + off : -off, ex = rtl ? -off : W + off;
    segs.push(["C", sx, top - rise, (sx + cx) / 2, top - rise, cx, top - rise * 0.5, cx, top]);
    segs.push(["L", cx, top, cx, B]);
    segs.push(["C", cx, B, cx, B + rise * 0.5, (ex + cx) / 2, B + rise, ex, B + rise]);
  }
  whyRibbon.setPath(segs);
  whyIn = whyRibbon.marks[1] / whyRibbon.L; whyOut = whyRibbon.marks[2] / whyRibbon.L;
  // how far along the way in it comes over the screen's edge
  const p0 = whyRibbon.pts.find((p) => (rtl ? p.x < W - 2 : p.x > 2));
  whyVis = p0 ? Math.min(whyIn, p0.s / whyRibbon.L) : 0;
  // inside the casing (from the terminal's face to the far wall) the energy is out of sight
  whyRibbon.setGaps([[whyIn, whyOut]]);
}
function whyTick() {
  if (reduce) return;
  // all three read before the numbers roll (a read after a write lays the page out again)
  const ih = innerHeight, fr = figs.getBoundingClientRect(), br = battery.getBoundingClientRect(), r = whySec.getBoundingClientRect();
  if (fr.top < ih * 1.1 && fr.bottom > -ih * 0.2) rollTo(clamp01((ih * 0.95 - fr.top) / (ih * 0.5)));
  if (br.top > ih * 1.4 || br.bottom < -ih * 0.4) return;
  let f;
  if (across()) {
    // in while the battery comes up into view, through it while it crosses the middle, out as it rises past it
    const t = clamp01((ih * 0.98 - (br.top + br.height / 2)) / (ih * 0.62));
    // the way in starts as soon as its level comes up over the foot of the screen, while the domains' trail is still
    // going out by the other side, and shows at the edge at once; it reaches the terminal when it always did
    const u = clamp01((ih - (r.top + whyEy)) / (ih * 0.144 + whyRise));
    f = t < 0.2 ? (u > 0 ? whyVis + (whyIn - whyVis) * u : 0) : t < 0.8 ? whyIn + (whyOut - whyIn) * (t - 0.2) / 0.6 : whyOut + (1 - whyOut) * (t - 0.8) / 0.2;
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
let stepF = [], procTop = 0, procY0 = 0, procOut = 0;
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
    // the turn comes back at mid a little past the first step, so the current reaches it from the start side in a soft
    // curve (at every width the round turn alone came back short of it, and the trail had to double back: a hook)
    const cb = Math.max(cx, P[0].x + Math.max(72, (mid - P[0].y) * 2)), kb = (cx + R - cb) * 0.5523;
    let x = cb, y = mid;
    const y0 = procTop - 72, xa = W * 0.55;
    segs.push(["C", inX, y0, xa * 0.55, y0, xa * 0.55, procTop, xa, procTop]);
    segs.push(["L", xa, procTop, cx, procTop]);
    segs.push(["C", cx, procTop, cx + k, procTop, cx + R, procTop + R - k, cx + R, procTop + R]);
    segs.push(["C", cx + R, procTop + R, cx + R, procTop + R + k, cb + kb, mid, cb, mid]);
    const to = (nx, ny) => { const q = (x - nx) * 0.5; segs.push(["C", x, y, x - q, y, nx + q, ny, nx, ny]); x = nx; y = ny; };
    P.forEach((p) => to(p.x, p.y));
    to(inX, mid);
  } else {
    // in above the label and onto the rail with a round corner that is already upright before the label starts, down
    // beside the words, and a round corner off the start side in the gap under the last step, clear of the next
    // heading: the projects' thread comes back in by that side just under it (layoutFlow), so there is one trail.
    // Phones: the steps take turns on the two rails, and in each gap the current swings across to the next one,
    // upright as it leaves one rail and as it reaches the other.
    const x0 = P[0].x, R = 52, k = R * 0.5523, sb = steps.map((s) => { const b = s.getBoundingClientRect(); return { t: b.top - r.top, b: b.bottom - r.top }; });
    const last = sb[sb.length - 1].b, yS = $(".kick", proc).getBoundingClientRect().top - r.top - R - 36;
    const nh = proc.nextElementSibling && $("h2", proc.nextElementSibling);
    const yE = nh ? (last + nh.getBoundingClientRect().top - r.top) / 2 : last + R + 40, yl = Math.max(last + 8, yE - R);
    procTop = yS;
    segs.push(["L", inX, yS, x0 - R, yS]);
    segs.push(["C", x0 - R, yS, x0 - R + k, yS, x0, yS + R - k, x0, yS + R]);
    let x = x0;
    if (innerWidth < 768) P.forEach((p, i) => {
      if (!i) return;
      const yA = sb[i - 1].b + 10, yB = sb[i].t - 10, d = (yB - yA) * 0.6;
      segs.push(["L", x, i > 1 ? sb[i - 1].t - 10 : yS + R, x, yA]);
      segs.push(["C", x, yA, x, yA + d, p.x, yB - d, p.x, yB]);
      x = p.x;
    });
    segs.push(["L", x, innerWidth < 768 && P.length > 1 ? sb[sb.length - 1].t - 10 : yS + R, x, yl]);
    const xo = sw - r.left + off;
    segs.push(["C", x, yl, x, yl + k, x + R - k, yl + R, x + R, yl + R]);
    segs.push(["L", x + R, yl + R, xo, yl + R]);
    procOut = yl + R;
  }
  if (!rl) segs.forEach((g) => { for (let i = 1; i < g.length; i += 2) g[i] = W - g[i]; });
  procRibbon.setPath(segs);
  stepF = pts.map((p) => procRibbon.nearest(p.x, p.y));
  procY0 = pts[0].y;
}
function procTick() {
  if (reduce) return;
  const r = rectOf(procRun), ih = innerHeight;
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

/* ---------- leads: the contact form, to Monday ---------- */
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
    data.topics = $$('input[name="topic"]:checked', f).map((i) => i.value);
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
  const r = rectOf(sayWall), ih = innerHeight;
  if (r.bottom < -ih * 0.2 || r.top > ih * 1.2) return;
  const p = clamp01((ih - r.top) / (ih + r.height)), H = r.height;
  sayCols.forEach((col) => {
    const sp = +col.dataset.speed, run = Math.max(0, (col._sh ??= col.scrollHeight) - H), q = clamp01(0.5 + (p - 0.5) * Math.abs(sp) * 1.2);
    col.style.setProperty("--sy", (-(sp > 0 ? q : 1 - q) * run).toFixed(1) + "px");
  });
}

/* ---------- a faint thread of the trail through the projects and the voices ---------- */
// (Liav 25.10: the trail should go with the whole page, "גם אם בצורה מאוד עדינה וקלילה".) After the process the light
// comes back thinner and dimmer: in from the start side's edge above the projects' heading, round onto a rail down the
// start side (wide screens, half way through the gutter; phones and tablets, the start rail every section keeps), past
// the heading, behind the pictures (they stand over it) and beside the voices, and round out by the same edge under
// the last of them. It never crosses a word: the rail is clear of every line, and the turns lie outside it.
// (Liav 25.10, on the thread: "שירגיש קצת יותר חי ודינמי ופחות ישר ומרובע".) It swims: the whole thread swings from side
// to side in slow waves that run towards its head, as far as the room between the words and the screen's edge allows
// (less its own width), and its turns are long bends rather than elbows.
const gutW = () => parseFloat(getComputedStyle(says).paddingRight) || 40;
const thinAmp = () => (wide() ? Math.min(9, gutW() * 0.16) : innerWidth < 768 ? 6 : 8);
const railSway = () => {
  const room = (wide() ? gutW() : gutW() + (parseFloat(getComputedStyle(doc).getPropertyValue("--rail-pad")) || 28)) / 2;
  return Math.max(0, Math.min(wide() ? 13 : innerWidth < 768 ? 9 : 12, room - thinAmp() * 1.55 - 4));
};
const THIN = { strands: 16, amp: thinAmp, taperStart: 0, taperEnd: 0, sparks: 2, dim: 0.55 };
const worksSec = $("#projects"), flowSvg = $(".flow-trail", worksSec);
const flowRibbon = new Ribbon(flowSvg, { ...THIN, wave: 460, seed: 7, sway: railSway, swayWave: 560 });
flowRibbon.headK = 0.55;
let flowEnd = 0;
// x of the start side's rail in a frame of width W, built for a right-to-left page (mirrored for a left-to-right one)
function startRail(W, el) {
  const g = parseFloat(getComputedStyle(el).paddingRight) || 0, rp = parseFloat(getComputedStyle(doc).getPropertyValue("--rail-pad")) || 28;
  return W - (wide() ? g : g + rp) / 2;
}
function layoutFlow() {
  const r = worksSec.getBoundingClientRect(), W = r.width;
  flowSvg.setAttribute("viewBox", `0 0 ${W} ${r.height}`);
  const x = startRail(W, worksSec), sx = doc.clientWidth - r.left + Math.max(120, trailAmp() * 6), rl = getComputedStyle(worksSec).direction === "rtl";
  const head = $(".works-head", worksSec).getBoundingClientRect().top - r.top, wall = sayWall.getBoundingClientRect().bottom - r.top;
  // a long soft swing in (sloping down from the edge, upright on the rail just above the heading), and the same swing out
  // below 1024 the process goes out by this same side just above: the thread starts only under where it left, so the
  // two are never on the screen at once (Liav 26.10: "שיהיה רק שובל אחד לאורך כל הגלילה")
  const po = wide() ? -Infinity : procRun.getBoundingClientRect().top + procOut - r.top + 12;
  // (it goes out a little under the voices, so its last stretch is still on the screen when the articles' thread comes in)
  const y0 = Math.max(head - 280, po), y1 = Math.max(head - 10, y0 + 60), y2 = wall + 40, y3 = wall + 240, k = (sx - x) * 0.55;
  const segs = [["C", sx, y0, x + k, y0 + 30, x, y0 + (y1 - y0) * 0.4, x, y1], ["L", x, y1, x, y2], ["C", x, y2, x, y2 + (y3 - y2) * 0.6, x + k, y3 - 20, sx, y3]];
  if (!rl) segs.forEach((g) => { for (let i = 1; i < g.length; i += 2) g[i] = W - g[i]; });
  flowRibbon.setPath(segs, null, [0.8, 1, 0.8]);
  flowEnd = y3;
}
function flowTick() {
  if (reduce) return;
  const r = rectOf(flowSvg), ih = innerHeight;
  if (r.top > ih * 1.4 || r.top + flowEnd < -ih * 0.4) return;
  flowRibbon.draw(flowRibbon.fracAtY(ih * HEAD - r.top));
}

/* ---------- knowledge: the strip of articles the scroll carries past ---------- */
// The section holds the screen while the scroll carries the strip sideways, one pixel of strip for every KN_K pixels
// of scroll (its height is set here so the hold ends with the last article). A focus runs from the first article's
// middle to the last one's; the article under it comes up a size and out of the night, and the counter and the line
// follow it. Nothing moves unless the visitor scrolls. Without motion the strip is left to scroll sideways by hand.
const kn = $("#knowledge"), knView = $(".kn-view", kn), knTrack = $(".kn-track", kn), knArts = $$(".art", knTrack), knCount = $(".kn-count b", kn);
// The strip's pictures are lazy, so they don't compete with the opening; but the strip slides them in from the side,
// where the browser's own lazy loading would ask too late. They are asked for once the page has loaded, or as soon as
// the strip comes within two screens, whichever is first (round 7)
const knLate = $$("img[data-early]", knTrack);
const knIO = knLate.length && "IntersectionObserver" in window ? new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) knFetch(); }, { rootMargin: "200% 0px" }) : null;
function knFetch() { knLate.forEach((im) => { im.loading = "eager"; }); knLate.length = 0; if (knIO) knIO.disconnect(); }
if (knIO) knIO.observe(kn); else knFetch();
addEventListener("load", () => (window.requestIdleCallback || setTimeout)(knFetch, { timeout: 1500 }));
const KN_K = 0.92;  // scroll per pixel of strip: under 1 so the pinned stretches stay under 30% of the page (round 5, without the calculator the page got shorter)
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
  // a new height moves everything under it, so the page is measured again (once: the next pass
  // finds the same height)
  if (kn.style.height !== h) { kn.style.height = h; requestAnimationFrame(relayout); }
  knI = -1;
}
function knTick() {
  if (!knOn) return;
  const r = rectOf(kn), ih = innerHeight;
  if (r.top > ih || r.bottom < 0) return;
  const p = knRun ? clamp01(-r.top / (knRun * KN_K)) : 0, x = p * knRun;
  knTrack.style.setProperty("--kx", (knRtl ? x : -x).toFixed(1) + "px");
  kn.style.setProperty("--kp", p.toFixed(4));
  const n = knC.length - 1, f = knC[0] + (knC[n] - knC[0]) * p;
  let best = 0;
  knArts.forEach((a, i) => {
    const k = clamp01(1 - Math.abs(knC[i] - f) / knStep), e = k * k * (3 - 2 * k);
    if (Math.abs(knC[i] - f) < Math.abs(knC[best] - f)) best = i;
    a.style.setProperty("--ks", (0.95 + e * 0.05).toFixed(4));
    a.style.setProperty("--kl", e.toFixed(3));
  });
  if (best !== knI) { knI = best; knCount.textContent = String(best + 1).padStart(2, "0"); }
}

// the articles' thread: while the section holds the screen, the trail is the line under the strip. It comes in from
// the start side's edge in the open band between the strip and the counter (or under the counter, where that band is
// wider), drops onto the line just past the counter, runs along it as the strip goes by (its head where the dot was),
// and leaves by the far edge as the section lets go. Without motion there is no hold and no line, and no thread.
const knPin = $(".kn-pin", kn), knSvg = $(".kn-trail", kn), knLineEl = $(".kn-line", kn), knCountEl = $(".kn-count", kn);
const knRibbon = new Ribbon(knSvg, { ...THIN, wave: 420, seed: 9, dim: 0.5 });
knRibbon.headK = 0.5;
let knFa = 0, knFb = 1, knFe = 0, knSA = 0;
function layoutKnTrail() {
  kn.classList.toggle("has-trail", knOn);
  if (!knOn) { knRibbon.draw(0); return; }
  const r = knPin.getBoundingClientRect(), W = r.width, H = r.height, rl = knRtl;
  knSvg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  const L = knLineEl.getBoundingClientRect(), c = knCountEl.getBoundingClientRect(), off = Math.max(120, trailAmp() * 6);
  // the bar rises into place when the section comes in: measured where it will stand, not where it is on the way
  const tf = getComputedStyle(knLineEl.parentNode).transform, ty = tf && tf !== "none" ? new DOMMatrix(tf).m42 : 0;
  // (built for a right-to-left page: the counter and the line's start on the right; mirrored for a left-to-right one)
  const X = (x) => (rl ? x - r.left : W - (x - r.left));
  const yL = L.top - ty - r.top + L.height / 2, xS = X(rl ? L.right : L.left), xE = X(rl ? L.left : L.right), xC = X(rl ? c.left : c.right) - 12;
  // the cards are measured at full size (they grow a little in focus); the band under them, or the one under the counter
  const cardB = Math.max(...knArts.map((a) => { const b = a.getBoundingClientRect(); return b.bottom + b.height * 0.03; })) - r.top;
  const cT = c.top - ty - r.top, cB = c.bottom - ty - r.top;
  // (under 1024 the call bar's top: 12 under it, 62 tall, on the inset the hold keeps for it at the foot, less 2 to spare)
  const mbarT = innerWidth < 1024 ? H - (parseFloat(getComputedStyle(knPin).paddingBottom) || 88) + 12 : H, above = cT - cardB, below = mbarT - cB;
  const yA = above >= below ? cardB + above / 2 : cB + below / 2;
  // it swims as the projects' thread does: on the line as far as the open band over it and the room under it allow, on
  // the way in only as far as its own band allows (the counter and the cards on either side of it)
  const hair = thinAmp() * 1.55, cap = innerWidth < 768 ? 7 : 10;
  const swLine = Math.max(0, Math.min(cap, yL - cardB - hair - 8, (wide() ? Infinity : mbarT - yL) - hair - 4));
  const swIn = Math.max(0, Math.min(swLine, (above >= below ? above : below) / 2 - hair - 4));
  knRibbon.o.sway = swLine;
  // in along the band, down onto the line in one long bend, along it, and out past its far end in a bend that falls away
  // towards the close below (on phones and tablets, only as far as the call bar leaves room)
  const D = Math.min(170, Math.max(80, (xS - xE) * 0.16)), xLand = Math.min(xS, xC) - D;
  const drop = wide() ? 110 : Math.max(0, Math.min(110, mbarT - yL - hair - swLine - 6)), xOut = Math.min(xE, D) * 0.5;
  const segs = [["L", W + off, yA, xC, yA], ["C", xC, yA, xC - D * 0.55, yA, xLand + D * 0.45, yL, xLand, yL], ["L", xLand, yL, xE, yL],
    ["C", xE, yL, xE - xOut - off * 0.3, yL, -off * 0.5, yL + drop * 0.35, -off, yL + drop]];
  if (!rl) segs.forEach((g) => { for (let i = 1; i < g.length; i += 2) g[i] = W - g[i]; });
  const kIn = swLine ? swIn / swLine : 0;
  knRibbon.setPath(segs, null, [kIn, kIn, 1, 1]);
  knFa = knRibbon.nearest(rl ? xLand : W - xLand, yL);
  knFb = knRibbon.nearest(rl ? xE : W - xE, yL);
  // it comes in as soon as its band is up on the screen (over the call bar under 1024), while the voices' thread is still
  // leaving above: the head starts just past the edge, so no scroll is spent on the stretch out of sight
  knFe = knRibbon.nearest(rl ? W + 60 : -60, yA);
  knSA = -Math.max(0, mbarT - hair - 6 - yA);
}
function knTrailTick() {
  if (!knOn) return;
  const r = rectOf(kn), ih = innerHeight, run = knRun * KN_K, s = -r.top;
  if (r.top > ih || r.bottom < -ih * 0.4) return;
  // in as its band comes up, along the line through the hold, out as it lets go
  const s0 = knSA, s1 = Math.max(s0 + 60, run * 0.15);
  const f = s < s0 ? 0 : s < s1 ? knFe + (knFa - knFe) * clamp01((s - s0) / (s1 - s0)) : s < run ? knFa + (knFb - knFa) * clamp01((s - s1) / Math.max(1, run - s1))
    : knFb + (1 - knFb) * clamp01((s - run) / (ih * 0.3));
  knRibbon.draw(f);
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
  // (it comes in under the words, in the gap above the socket: never across the last line of the paragraph, which
  // drifts a little lower by the time the head gets there; the words are measured without their drift)
  else {
    const say = $(".close-say", closeSec), sayB = say.getBoundingClientRect().bottom - r.top - (parseFloat(say.style.getPropertyValue("--dy")) || 0);
    const y1 = Math.min(py - 60, Math.max(40, sayB + 36, b.top - r.top - 150)); segs.push(["C", sx, y1, (sx + px) / 2, y1, px, y1 + (py - y1) * 0.4, px, py]); }
  closeRibbon.setPath(segs);
}
function closeTick() {
  if (reduce) return;
  const r = rectOf(closeSec), ih = innerHeight;
  if (r.top > ih * 1.2 || r.bottom < -ih * 0.2) return;
  const f = closeRibbon.fracAtY(ih * 0.7 - r.top);
  closeRibbon.draw(f);
  if (plug.classList.contains("is-lit") !== f > 0.985) { plug.classList.toggle("is-lit", f > 0.985); arcRun(); }
}

/* ---------- the footer and the phone bar ---------- */
const ft = $("#ft");
$$("[data-year]").forEach((e) => (e.textContent = new Date().getFullYear()));
inView(ft, () => ft.classList.add("is-in"), 0.95);
// the footer is built by the scroll: --fp runs from 0 as it comes up the screen to 1 at the end of the page
function ftTick() {
  if (reduce) return;
  const r = rectOf(ft), ih = innerHeight;
  if (r.top > ih) { if (ft._p !== "0") { ft._p = "0"; ft.style.setProperty("--fp", 0); } return; }
  const p = clamp01((ih - r.top) / Math.max(1, Math.min(r.height, ih * 0.9))).toFixed(3);
  if (ft._p !== p) { ft._p = p; ft.style.setProperty("--fp", p); }
}
// the headings drift against the page while they cross the screen: data-drift is how far, top edge to bottom edge
const drifts = $$("[data-drift]").map((el) => ({ el, k: +el.dataset.drift || 0, dy: 0, to: 0 }));
// read all of them, then move them: the frame reads the page once (round 6)
function driftRead() {
  if (reduce) return;
  const ih = innerHeight;
  for (const d of drifts) {
    d.to = d.dy;
    if (!near(d.el)) continue;
    const r = d.el.getBoundingClientRect(), top = r.top - d.dy;
    if (top > ih + 200 || top + r.height < -200) continue;
    d.to = Math.round(((top + r.height / 2) / ih - 0.5) * d.k * 2) / 2;
  }
}
function driftWrite() {
  for (const d of drifts) if (d.to !== d.dy) { d.dy = d.to; d.el.style.setProperty("--dy", d.dy + "px"); }
}
// the bar comes in once the opening's own button has left the screen, and steps aside where the same action is on
// screen (the close), over the footer, and while a field has focus (the keyboard is up)
const mbar = $("[data-mbar]"), ctaOrigin = $("[data-cta-origin]"), ctaEnds = $$("[data-cta-end]");
let typing = false;
// what the page says about the bar (null on a wide screen), then the bar itself
function mbarRead() {
  if (wide()) return null;
  const ih = innerHeight, past = ctaOrigin.getBoundingClientRect().bottom < 8;
  const atEnd = ctaEnds.some((el) => { const r = el.getBoundingClientRect(); return r.top < ih * 0.7 && r.bottom > ih * 0.1; }) || ft.getBoundingClientRect().top < ih;
  return past && !atEnd;
}
function mbarSet(seen) {
  if (seen === null) { if (mbar.classList.contains("is-on")) { mbar.classList.remove("is-on"); mbar.inert = true; doc.classList.remove("mbar-on"); } return; }
  const on = seen && !typing && !mnOpen;
  if (on !== mbar.classList.contains("is-on")) { mbar.classList.toggle("is-on", on); mbar.inert = !on; doc.classList.toggle("mbar-on", on); }
}
function mbarTick() { mbarSet(mbarRead()); }
addEventListener("focusin", (e) => { if (e.target.matches("input:not([type=radio]):not([type=checkbox]):not([type=range]),textarea,select")) { typing = true; mbarTick(); } });
addEventListener("focusout", (e) => { if (e.target.matches("input,textarea,select")) { typing = false; setTimeout(mbarTick, 160); } });

/* ---------- one frame loop for everything the scroll drives ---------- */
// Round 6 (smooth on every phone): a section more than two screens from the screen is neither read nor written, so a
// frame no longer lays the whole page out once for each section on the way. Each tick already did nothing that far
// out; until the browser first answers, every section counts as near
const nearMap = new Map();
const nearIO = "IntersectionObserver" in window ? new IntersectionObserver((es) => es.forEach((e) => nearMap.set(e.target, e.isIntersecting)), { rootMargin: "200% 0px" }) : null;
const near = (...els) => !nearIO || els.some((el) => el && nearMap.get(el) !== false);
if (nearIO) [dom, whySec, procRun, worksSec, sayWall, kn, closeSec, ft, ...drifts.map((d) => d.el)].forEach((el) => el && nearIO.observe(el));

/* ---------- endless loops rest out of sight (round 7, for speed) ---------- */
// The star round the plug, the horizon's sweep and glow, the neon's hum and the floating machines loop for ever, and
// they cost a repaint every frame even off screen. While their section is out of sight it is marked .is-far and they
// hold still (site.css); on screen nothing changes. The arc's moving noise round the plug (an SVG filter run by SMIL,
// the costliest of them) is paused too while the section is away or the plug is dark (after its fade-out)
const fx = $(".fx-defs"), canPause = !!(fx && fx.pauseAnimations);
let arcFar = true, arcT = 0;
function arcRun() {
  if (!canPause) return;
  clearTimeout(arcT);
  if (arcFar) fx.pauseAnimations();
  else if (plug.classList.contains("is-lit")) fx.unpauseAnimations();
  else arcT = setTimeout(() => fx.pauseAnimations(), 1000);
}
const farIO = "IntersectionObserver" in window ? new IntersectionObserver((es) => es.forEach((e) => {
  e.target.classList.toggle("is-far", !e.isIntersecting);
  if (e.target === closeSec) { arcFar = !e.isIntersecting; arcRun(); }
}), { rootMargin: "25% 0px" }) : null;
if (farIO) [domOn ? dom : null, whySec, procRun, closeSec, ft].forEach((el) => el && farIO.observe(el));
else arcFar = false;
arcRun();
// The page is read first (the scroll, the drifting headings, the phone bar's marks), then each section reads and
// writes its own, and the header and the headings are written last. With Lenis the frame runs from its scroll, right
// after it has moved the page and before the scene's own frame writes anything (scene.js), so those reads find the
// page already laid out
let ticking = false;
function tick() {
  ticking = false;
  const y = frameY = scrollY, bar = mbarRead();
  driftRead();
  if (near(dom)) domTick();
  if (near(whySec)) whyTick();
  if (near(procRun)) procTick();
  if (near(worksSec)) worksTick();
  if (near(sayWall)) saysTick();
  if (near(worksSec, sayWall)) flowTick();
  if (near(kn)) { knTick(); knTrailTick(); }
  if (near(closeSec)) closeTick();
  if (near(ft)) ftTick();
  spansTick(y);
  driftWrite(); mbarSet(bar); headerTick(y);
}
if (lenis) lenis.on("scroll", tick);
else addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(tick); } }, { passive: true });

function relayout() {
  spots.clear(); sayCols.forEach((c) => { c._sh = undefined; });
  layoutKn();
  measureStations();
  layoutDom();
  layoutWhy();
  layoutProc();
  layoutClose();
  layoutWorks();
  layoutFlow();
  layoutKnTrail();
  measureSpans();
  if (reduce) { if (domRibbon) domRibbon.draw(1); whyRibbon.draw(1); procRibbon.draw(1); flowRibbon.draw(1); closeRibbon.draw(1); steps.forEach((s) => s.classList.add("on")); plug.classList.add("is-lit"); }
  tick();
  if (lenis) requestAnimationFrame(() => lenis.resize());
}
// On a phone the address bar comes and goes as the visitor scrolls, and the screen grows or shrinks by its height each
// time: the page isn't laid out again for that (the frame reads the screen's height as it is), only when the width
// changes or the screen changes by more than a bar (the keyboard, a turn of the phone). Laying it all out again mid
// scroll stalled a few frames every time the scroll changed direction (round 8, for speed)
const coarse = matchMedia("(pointer:coarse)").matches;
let rz = 0, rzW = innerWidth, rzH = innerHeight;
addEventListener("resize", () => {
  if (coarse && innerWidth === rzW && Math.abs(innerHeight - rzH) < 160) return;
  rzW = innerWidth; rzH = innerHeight;
  clearTimeout(rz); rz = setTimeout(relayout, 120);
});
relayout();

// the split and the measures need the real fonts; wait for them (at most 1.5s)
Promise.race([document.fonts ? document.fonts.ready : Promise.resolve(), new Promise((r) => setTimeout(r, 1500))]).then(() => {
  initIntro();
  relayout();
});
addEventListener("load", () => {
  relayout();
  // back from a "stop motion" reload: the same place on the page, the panel open on the same switch
  let back = null;
  try { back = JSON.parse(sessionStorage.getItem("tr-ax-back") || "null"); sessionStorage.removeItem("tr-ax-back"); } catch (e) {}
  if (back) { if (lenis) lenis.scrollTo(back.y, { immediate: true, force: true }); else scrollTo(0, back.y); setAx(true, $(`[data-ax="${back.k}"]`, ax)); }
});
