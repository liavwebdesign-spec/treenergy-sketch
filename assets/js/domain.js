// Treenergy · a domain page (solar.html first; storage and charging are built on it).
// page.js puts the chrome on (the night, the header, the menu, the accessibility panel, the footer); this script is the
// journey of the page itself. The trail is born on the station the home page's tour landed on (the hero picture is
// that place, close), comes down past the words, runs along the busbar between the two rows of panel cells and lights
// each one, passes the places, takes the process down its steps as on the home page, goes on as a faint thread beside
// what sets us apart and the questions, and ends in the socket by the form.
import { Ribbon } from "./ribbon.js";

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduce = !!window.__still || matchMedia("(prefers-reduced-motion: reduce)").matches;
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const smooth = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const gsap = window.gsap, doc = document.documentElement, hd = $("#hd");
const sky = window.__sky || null;
const wide = () => innerWidth >= 1024;
const trailAmp = () => (innerWidth < 768 ? 14 : 28);
const BAND = innerWidth < 768 ? { strands: 16, loose: 4 } : { strands: 26, loose: 6 };
const HEAD = 0.72;
const px = (el, p) => parseFloat(getComputedStyle(el)[p]) || 0;

/* ---------- in-page links glide (as on the home page) ---------- */
let lenis = null;
const glideEase = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
document.addEventListener("click", (e) => {
  if (e.defaultPrevented) return;
  const a = e.target.closest('a[href^="#"]'); if (!a) return;
  const id = a.getAttribute("href"), t = id.length > 1 ? $(id) : null; if (!t) return;
  e.preventDefault();
  if (a.dataset.topic) { const box = $(`input[name="topic"][value="${a.dataset.topic}"]`); if (box) box.checked = true; }
  const tr = t.getBoundingClientRect(), hh = hd.getBoundingClientRect().height;
  const y = id === "#top" || id === "#main" ? 0 : tr.top + scrollY - (tr.height < innerHeight - hh ? (innerHeight - tr.height) / 2 : hh);
  if (lenis) lenis.scrollTo(y, { duration: Math.min(1.6, 0.7 + Math.abs(y - scrollY) / 8000), easing: glideEase, force: true });
  else scrollTo({ top: y, behavior: "instant" });
  try { history.replaceState(null, "", id); } catch (err) {}
  if (!t.matches("a[href],button,input,select,textarea,[tabindex]")) t.setAttribute("tabindex", "-1");
  setTimeout(() => t.focus({ preventScroll: true }), 0);
});

/* ---------- reveal ---------- */
function inView(el, f, at = 0.9) {
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { io.disconnect(); f(); } }, { rootMargin: `0px 0px ${(-(1 - at) * 100).toFixed(1)}% 0px` });
    io.observe(el); return;
  }
  f();
}
function enter(root, at) {
  root.querySelectorAll(".rv").forEach((el, i) => { if (!el.style.getPropertyValue("--i")) el.style.setProperty("--i", i); });
  root.classList.add("rv-on");
  inView(root, () => root.classList.add("is-in"), at);
}
$$(".rv-wait").forEach((g) => enter(g, 0.82));

/* ---------- Lenis + GSAP ---------- */
if (gsap && !reduce && window.Lenis) {
  lenis = new window.Lenis({ autoRaf: false, lerp: 0.12 });
  window.__lenis = lenis;
  lenis.on("scroll", (e) => { if (sky) sky.scroll(e.scroll); });
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  doc.classList.add("gsap-live");
} else if (sky) addEventListener("scroll", () => sky.scroll(scrollY), { passive: true });

/* ---------- where things sit on the page, measured once (as on the home page) ---------- */
const spots = new Map();
let frameY = 0;
function rectOf(el) {
  let s = spots.get(el);
  if (!s) { const r = el.getBoundingClientRect(); s = { t: r.top + frameY, h: r.height }; spots.set(el, s); }
  return { top: s.t - frameY, bottom: s.t - frameY + s.h, height: s.h };
}
if (window.ResizeObserver) new ResizeObserver(() => spots.clear()).observe(document.body);

/* ---------- the green wave over the opening ---------- */
// The picture's own green lines (roof edge, the run to the containers, the waves through the field) are lit by a WebGL
// layer: a map holds, per pixel, how much it is a line (R) and how far along the network it is from the roof corner (G),
// and slow pulses run along that distance, like the energy on the home tour's grid. Off when motion is reduced, without
// WebGL, off screen, in a hidden tab, or once the opening has scrolled away.
const glow = (() => {
  const cv = $(".sh-glow"), none = { layout() {}, past() {} };
  if (!cv) return none;
  const gl = !reduce && cv.getContext("webgl", { premultipliedAlpha: true, alpha: true, antialias: false, powerPreference: "low-power" });
  if (!gl) { cv.remove(); return none; }
  const sh_ = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
  const pr = gl.createProgram();
  gl.attachShader(pr, sh_(gl.VERTEX_SHADER, "attribute vec2 p;varying vec2 v;void main(){v=vec2(p.x*.5+.5,.5-p.y*.5);gl_Position=vec4(p,0.,1.);}"));
  gl.attachShader(pr, sh_(gl.FRAGMENT_SHADER, [
    "precision mediump float;varying vec2 v;uniform sampler2D m;uniform vec4 c;uniform vec2 px;uniform float t;",
    "void main(){vec2 u=(v-c.xy)/c.zw;",
    "if(u.x<0.||u.y<0.||u.x>1.||u.y>1.){gl_FragColor=vec4(0.);return;}",
    "vec4 s=texture2D(m,u);float k=s.r,d=s.g;",
    "float halo=(texture2D(m,u+vec2(px.x,0.)).r+texture2D(m,u-vec2(px.x,0.)).r+texture2D(m,u+vec2(0.,px.y)).r+texture2D(m,u-vec2(0.,px.y)).r)*.25;",
    "float f=fract(d*2.-t*.075);",
    "float head=smoothstep(.80,.985,f)*(1.-smoothstep(.985,1.,f));",
    "float breath=.22+.08*sin(t*.7+d*9.);",
    "float g=k*(breath+head*1.25)+halo*head*.55;",
    "vec3 col=mix(vec3(.19,.97,.48),vec3(.85,1.,.9),clamp(head*k*.7,0.,1.))*g;",
    "gl_FragColor=vec4(col,max(col.g,max(col.r,col.b)));}"
  ].join("")));
  gl.linkProgram(pr);
  if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) { cv.remove(); return none; }
  gl.useProgram(pr);
  const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const aP = gl.getAttribLocation(pr, "p"); gl.enableVertexAttribArray(aP); gl.vertexAttribPointer(aP, 2, gl.FLOAT, false, 0, 0);
  const uC = gl.getUniformLocation(pr, "c"), uPx = gl.getUniformLocation(pr, "px"), uT = gl.getUniformLocation(pr, "t");
  gl.uniform1i(gl.getUniformLocation(pr, "m"), 0);
  // each domain page names its own maps on the opening (data-glow-w / data-glow-t); solar's are the default
  const dg = ($(".sh") || {}).dataset || {};
  const MAPS = { wide: { src: dg.glowW || "assets/img/solar/hero-w-glow.png", w: 2400, h: 1340 }, tall: { src: dg.glowT || "assets/img/solar/hero-t-glow.png", w: 1080, h: 1935 } };
  let map = null, want = null, tex = null, ready = false, seen = true, past = false, raf = 0, last = 0, W = 1, H = 1;
  const t0 = performance.now();
  function load(m) {
    want = m; ready = false;
    const im = new Image();
    im.onload = () => {
      if (want !== m) return;
      tex = tex || gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, im);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      map = m; gl.uniform2f(uPx, 3 / (m.w / 2), 3 / (m.h / 2)); cover();
      ready = true; cv.classList.add("is-on"); go();
    };
    im.src = m.src;
  }
  function cover() {
    if (!map) return;
    const s = Math.max(W / map.w, H / map.h), dw = map.w * s, dh = map.h * s;
    gl.uniform4f(uC, (W - dw) / 2 / W, (H - dh) / 2 / H, dw / W, dh / H);
  }
  function frame(now) {
    raf = 0;
    if (!ready || !seen || past || document.hidden) return;
    raf = requestAnimationFrame(frame);
    if (now - last < 32) return; last = now;
    gl.uniform1f(uT, (now - t0) / 1000);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
  function go() { if (!raf && ready && seen && !past && !document.hidden) raf = requestAnimationFrame(frame); }
  if (window.IntersectionObserver) new IntersectionObserver(es => { seen = es[es.length - 1].isIntersecting; go(); }).observe(cv);
  document.addEventListener("visibilitychange", go);
  return {
    layout(w, h, isWide) {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      W = w; H = h; cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
      gl.viewport(0, 0, cv.width, cv.height);
      const m = isWide ? MAPS.wide : MAPS.tall;
      if (m !== want) load(m); else cover();
      last = 0; go();
    },
    past(p) { if (p === past) return; past = p; go(); }
  };
})();

/* ---------- the opening: the roof, the storage and the field ---------- */
// The picture shows a big roof, the storage containers and an agrivoltaic field, with the green energy line running
// through them. The trail is born at the roof's corner (the point below, in the picture's own pixels, for each of its two
// shapes), and the first scroll leans the picture in towards it and thins it into the night.
const flow = $(".dp-flow"), sh = $(".sh", flow), shPic = $(".sh-pic", sh), shImg = $(".sh-pic img", sh), shSay = $(".sh-say", sh);
const shGlow = $(".sh-glow", sh);
// (the same points the glow map's pulses start from, so the wave and the trail leave the roof's corner together)
// (a page whose picture is another place gives its own points: data-birth="wide x,wide y,tall x,tall y")
const bp = (sh.dataset.birth || "462,926,78,992").split(",").map(Number);
const BIRTH = { wide: { w: 2400, h: 1340, x: bp[0], y: bp[1] }, tall: { w: 1080, h: 1935, x: bp[2], y: bp[3] } };
let birth = { x: 0, y: 0 }, shH = 1, shP = -1;
function layoutHero() {
  const r = sh.getBoundingClientRect(), W = r.width, H = r.height, src = shImg.currentSrc || "";
  const k = src ? (src.includes("hero-w") ? BIRTH.wide : BIRTH.tall) : (W / H >= 0.9 ? BIRTH.wide : BIRTH.tall);
  const s = Math.max(W / k.w, H / k.h);
  birth = { x: (W - k.w * s) / 2 + k.x * s, y: (H - k.h * s) / 2 + k.y * s };
  shImg.style.transformOrigin = `${birth.x.toFixed(1)}px ${birth.y.toFixed(1)}px`;
  if (shGlow) shGlow.style.transformOrigin = shImg.style.transformOrigin;
  shH = H; shP = -1;
  glow.layout(W, H, k === BIRTH.wide);
}
function heroTick(y) {
  if (reduce) return;
  const p = Math.round(clamp01(y / shH) * 1000) / 1000;
  if (p === shP) return; shP = p;
  shImg.style.transform = `scale(${(1 + 0.08 * p).toFixed(4)})`;
  if (shGlow) shGlow.style.transform = shImg.style.transform;
  // the picture thins into the page's night rather than being covered by a darker one, so nothing edges the opening
  shPic.style.opacity = (1 - p * 0.75).toFixed(3);
  glow.past(p > 0.92);
}

/* ---------- the trail through the opening, the cells and the places ---------- */
// Wide screens: from the station down the open side of the picture, across the gap under the words to the start side's
// lane, down it beside the heading, round into the busbar between the two rows of cells, along it (each cell lights as
// the head passes its column), round down the far lane beside the places and off that side, where the process takes it
// back in. The busbar is level, so the scroll is given a stretch of its own there (a fifth of the screen): the head
// keeps moving while the page climbs. Below 1024: down the start rail beside the words and the one column of cells,
// and round out by the start side under the places.
const sw = $(".sw", flow), swH = $("h2", sw), pcs = $$(".pc", sw), spl = $(".spl", flow), plItems = $$(".pl li", spl);
const flowSvg = $(".dp-trail", flow);
const flowRibbon = new Ribbon(flowSvg, { ...BAND, amp: trailAmp, wave: 500, taperStart: 70, taperEnd: 0, sparks: 4, seed: 4 });
let vY = null, cellF = [], flowEnd = 0;
function layoutMain() {
  const r = flow.getBoundingClientRect(), W = r.width, H = r.height, ih = innerHeight;
  flowSvg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  const rel = (el) => { const b = el.getBoundingClientRect(); return { t: b.top - r.top, b: b.bottom - r.top, l: b.left - r.left, r: b.right - r.left, w: b.width, h: b.height }; };
  const say = rel(shSay), head = rel(swH), off = Math.max(120, trailAmp() * 6), sw0 = doc.clientWidth;
  const last = rel($(".btn", spl)), segs = [];
  const B = { x: birth.x, y: birth.y };
  vY = null;
  if (wide()) {
    const pr = px(sw, "paddingRight"), pl = px(sw, "paddingLeft"), xR = W - pr / 2, xL = pl / 2, R = Math.min(64, pl / 2 + 20), k = 0.5523;
    const c = pcs.map(rel), cols = Math.max(1, c.filter((q) => Math.abs(q.t - c[0].t) < 4).length);
    const row1 = c.slice(0, cols), row2 = c.slice(cols);
    const yc = row2.length ? (Math.max(...row1.map((q) => q.b)) + Math.min(...row2.map((q) => q.t))) / 2 : Math.max(...row1.map((q) => q.b)) + 36;
    // off the station towards the open side of the picture (never under the words), upright by the time it is level with them
    const x0 = Math.min(B.x, say.l - 72), yv = B.y + 150;
    // the sweep is level with the lane well above the heading, so its slant never crosses the heading's corner
    const hT = head.t - (parseFloat(swH.style.getPropertyValue("--dy")) || 0);
    const y1 = say.b + 18, y2 = Math.max(y1 + 120, hT - 110);
    if (Math.abs(x0 - B.x) > 2) segs.push(["C", B.x, B.y, B.x, B.y + (yv - B.y) * 0.55, x0, yv - (yv - B.y) * 0.45, x0, yv]);
    else segs.push(["L", B.x, B.y, B.x, yv]);
    // (only when the words end below the turn: a zero-length piece has no direction and the ribbon draws a dark notch there)
    if (y1 > yv + 1) segs.push(["L", x0, yv, x0, y1]);
    const ya = Math.max(yv, y1), hS = y2 - ya;
    segs.push(["C", x0, ya, x0, ya + hS * 0.62, xR, y2 - hS * 0.62, xR, y2]);
    segs.push(["L", xR, y2, xR, yc - R]);
    segs.push(["C", xR, yc - R, xR, yc - R + R * k, xR - R + R * k, yc, xR - R, yc]);
    segs.push(["L", xR - R, yc, xL + R, yc]);
    segs.push(["C", xL + R, yc, xL + R - R * k, yc, xL, yc + R - R * k, xL, yc + R]);
    const yE = Math.max(yc + R + 40, last.b + 24), RO = 140;
    segs.push(["L", xL, yc + R, xL, yE]);
    segs.push(["C", xL, yE, xL, yE + RO * 0.6, xL - (xL + r.left + off) * 0.45, yE + RO, -r.left - off, yE + RO]);
    flowEnd = yE + RO;
    flowRibbon.setPath(segs);
    // the busbar's own stretch of scroll
    const pts = flowRibbon.pts, L = flowRibbon.L, sA = flowRibbon.marks[4], sB = flowRibbon.marks[6], S = ih * 0.2;
    vY = new Float32Array(pts.length);
    for (let i = 0; i < pts.length; i++) vY[i] = pts[i].y + S * clamp01((pts[i].s - sA) / ((sB - sA) || 1));
    cellF = c.map((q) => flowRibbon.nearest(q.l + q.w / 2, yc));
    void L;
  } else {
    const x = W - (px(sw, "paddingRight") + (parseFloat(getComputedStyle(doc).getPropertyValue("--rail-pad")) || 28)) / 2;
    // a station hidden behind the words (tablets): the line is born on the rail itself, above the crumb, not across it
    // (also a station on the far side at the words' height: the way across to the rail would cross them)
    if (B.x < say.r + 24 && B.y > say.t - 60) { B.x = x; B.y = Math.min(B.y, say.t - 30); }
    const ys = Math.max(B.y + 40, Math.min(Math.max(B.y + 60, B.y + Math.abs(x - B.x) * 0.9), say.t - 20));
    // when the station sits above the words, cross to the rail at its height and only then turn down, clear of the crumb
    if (Math.abs(x - B.x) > 2 && B.y + 30 < say.t) segs.push(["C", B.x, B.y, B.x + (x - B.x) * 0.75, B.y, x, B.y + Math.min(40, (ys - B.y) * 0.5), x, ys]);
    else if (Math.abs(x - B.x) > 2) segs.push(["C", B.x, B.y, B.x, B.y + (ys - B.y) * 0.5, x, ys - (ys - B.y) * 0.5, x, ys]);
    else segs.push(["L", B.x, B.y, x, ys]);
    const yE = last.b + 30, R = 52, k = R * 0.5523, xo = sw0 - r.left + off;
    segs.push(["L", x, ys, x, yE]);
    segs.push(["C", x, yE, x, yE + k, x + R - k, yE + R, x + R, yE + R]);
    segs.push(["L", x + R, yE + R, xo, yE + R]);
    flowEnd = yE + R;
    flowRibbon.setPath(segs);
    cellF = pcs.map((q) => { const b = rel(q); return flowRibbon.fracAtY(b.t + Math.min(36, b.h * 0.3)); });
  }
}
// the fraction drawn when the head is at h (in the frame): on the busbar, by the stretched heights
function fracAt(h) {
  if (!vY) return flowRibbon.fracAtY(h);
  const pts = flowRibbon.pts, n = vY.length;
  if (h <= vY[0]) return 0;
  if (h >= vY[n - 1]) return 1;
  let lo = 0, hi = n - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (vY[m] < h) lo = m; else hi = m; }
  const t = (h - vY[lo]) / ((vY[hi] - vY[lo]) || 1);
  return (pts[lo].s + (pts[hi].s - pts[lo].s) * t) / flowRibbon.L;
}
// the stretch is scroll the page didn't have: the section is that much taller, and the frame takes it back from the
// heads of everything below while the head is on the busbar (--bus pushes nothing; the stretch is simply time)
function mainTick() {
  if (reduce) return;
  const r = rectOf(flow), ih = innerHeight;
  if (r.top > ih * 1.4 || r.top + flowEnd < -ih * 0.4) return;
  const f = fracAt(ih * HEAD - r.top);
  flowRibbon.draw(f);
  for (let i = 0; i < pcs.length; i++) { const on = f >= cellF[i] - 0.003; if (pcs[i]._on !== on) { pcs[i]._on = on; pcs[i].classList.toggle("on", on); } }
}

/* ---------- the places: the scroll walks a reading line down the columns, and the place under it opens ---------- */
const plList = $(".pl", spl);
let plTop = 0, plH = 1, plOn = 0;
function layoutPlaces() { const b = plList.getBoundingClientRect(); plTop = b.top + scrollY; plH = Math.max(1, b.height); }
function placesTick() {
  if (reduce) return;
  const ih = innerHeight, p = clamp01((frameY + ih * 0.85 - plTop) / (plH + ih * 0.5));
  const k = Math.min(plItems.length - 1, Math.floor(p * plItems.length));
  if (k === plOn) return;
  plItems[plOn].classList.remove("is-on"); plItems[k].classList.add("is-on"); plOn = k;
}

/* ---------- the process (the home page's, as it is there) ---------- */
const proc = $("#process"), procRun = $(".proc-run", proc), procSvg = $(".proc-trail", proc);
const steps = $$(".step", proc), stepNodes = steps.map((s) => $(".step-node", s));
const procRibbon = new Ribbon(procSvg, { ...BAND, amp: trailAmp, wave: 420, taperStart: 0, taperEnd: 0, sparks: 4, seed: 5 });
let stepF = [], procTop = 0, procY0 = 0, procOut = 0;
function layoutProc() {
  const r = procRun.getBoundingClientRect(), W = r.width, H = r.height;
  procSvg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  const pts = stepNodes.map((n) => { const b = n.getBoundingClientRect(); return { x: b.left - r.left + b.width / 2, y: b.top - r.top + b.height / 2 }; });
  const segs = [], off = Math.max(120, trailAmp() * 6), sw = doc.clientWidth, rl = getComputedStyle(proc).direction === "rtl";
  const P = pts.map((p) => ({ x: rl ? p.x : W - p.x, y: p.y })), inX = -r.left - off;
  if (wide()) {
    const hr = $(".proc-head", proc).getBoundingClientRect(), mid = (P[0].y + P[1].y) / 2;
    procTop = hr.top - r.top - Math.max(64, trailAmp() * 3);
    const R = (mid - procTop) / 2, cx = sw - r.left - R * 0.3, k = R * 0.5523;
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
    const x0 = P[0].x, R = 52, k = R * 0.5523, sb = steps.map((s) => { const b = s.getBoundingClientRect(); return { t: b.top - r.top, b: b.bottom - r.top }; });
    const last = sb[sb.length - 1].b, yS = ($(".kick", proc) || $(".proc-head", proc)).getBoundingClientRect().top - r.top - R - 36;
    const nh = $("#uq-h");
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
    const f0 = stepF[0], yB = r.top + procY0, lo = ih * 0.72;
    f = yB > lo ? f0 * clamp01((ih * 0.95 - (r.top + procTop)) / (ih * 0.23 + procY0 - procTop))
      : f0 + (1 - f0) * clamp01((lo - yB) / (ih * 0.5));
  } else f = procRibbon.fracAtY(ih * HEAD - r.top);
  procRibbon.draw(f);
  steps.forEach((s, i) => s.classList.toggle("on", f >= stepF[i] - 0.004));
}

/* ---------- the faint thread beside what sets us apart and the questions ---------- */
// The home page's thread beside the projects and the voices: in from the start side's edge above the heading, down the
// rail, and round out by the same edge under the last question. Below 1024 it starts only under where the process
// went out by that side, so there is one trail on the screen at a time.
// (any sections: solar has what sets us apart and the questions after the process; storage has the benefits before it,
// whose items light as the thread passes them)
const tail = $(".dp-tail"), tailSecs = $$(":scope > section", tail), tailSvg = $(".tail-trail", tail);
const bnItems = $$(".bn-it", tail);
const tailFirst = !!(tail.compareDocumentPosition(procRun) & Node.DOCUMENT_POSITION_FOLLOWING);
const gutW = () => px(tailSecs[0], "paddingRight") || 40;
const thinAmp = () => (wide() ? Math.min(9, gutW() * 0.16) : innerWidth < 768 ? 6 : 8);
const railSway = () => {
  const room = (wide() ? gutW() : gutW() + (parseFloat(getComputedStyle(doc).getPropertyValue("--rail-pad")) || 28)) / 2;
  return Math.max(0, Math.min(wide() ? 13 : innerWidth < 768 ? 9 : 12, room - thinAmp() * 1.55 - 4));
};
const tailRibbon = new Ribbon(tailSvg, { strands: 16, amp: thinAmp, taperStart: 0, taperEnd: 0, sparks: 2, dim: 0.55, wave: 460, seed: 7, sway: railSway, swayWave: 560 });
tailRibbon.headK = 0.55;
let tailEnd = 0, bnF = [];
function layoutTail() {
  const r = tail.getBoundingClientRect(), W = r.width;
  tailSvg.setAttribute("viewBox", `0 0 ${W} ${r.height}`);
  const rp = parseFloat(getComputedStyle(doc).getPropertyValue("--rail-pad")) || 28;
  const x = W - (wide() ? gutW() : gutW() + rp) / 2, sx = doc.clientWidth - r.left + Math.max(120, trailAmp() * 6);
  const lastSec = tailSecs[tailSecs.length - 1], lastList = $(".faq-list,.bn-list,.uq-list", lastSec) || lastSec;
  const head = $("h2", tail).getBoundingClientRect().top - r.top, end = lastList.getBoundingClientRect().bottom - r.top;
  // below 1024 the thread starts only under where the trail before it went out by the same side
  const po = wide() ? -Infinity : tailFirst ? flow.getBoundingClientRect().top + flowEnd - r.top + 12 : procRun.getBoundingClientRect().top + procOut - r.top + 12;
  const y0 = Math.max(head - 280, po), y1 = Math.max(head - 10, y0 + 60), y2 = end + 40, y3 = end + 240, k = (sx - x) * 0.55;
  tailRibbon.setPath([["C", sx, y0, x + k, y0 + 30, x, y0 + (y1 - y0) * 0.4, x, y1], ["L", x, y1, x, y2], ["C", x, y2, x, y2 + (y3 - y2) * 0.6, x + k, y3 - 20, sx, y3]], null, [0.8, 1, 0.8]);
  tailEnd = y3;
  bnF = bnItems.map((it) => { const ic = $(".bn-ic", it) || it, b = ic.getBoundingClientRect(); return tailRibbon.fracAtY(b.top - r.top + b.height / 2); });
}
function tailTick() {
  if (reduce) return;
  const r = rectOf(tailSvg), ih = innerHeight;
  if (r.top > ih * 1.4 || r.top + tailEnd < -ih * 0.4) return;
  const f = tailRibbon.fracAtY(ih * HEAD - r.top);
  tailRibbon.draw(f);
  for (let i = 0; i < bnItems.length; i++) { const on = f >= bnF[i] - 0.003; if (bnItems[i]._on !== on) { bnItems[i]._on = on; bnItems[i].classList.toggle("on", on); } }
}
// a question (or a cell) opened or closed moves everything under it
$$("details", tail).concat($$("details", sw)).forEach((d) => d.addEventListener("toggle", () => { clearTimeout(rz); rz = setTimeout(relayout, 30); }));

/* ---------- leads: the form (to Monday once the client's details come) ---------- */
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
      () => { f.classList.add("is-sent"); msg.textContent = "קיבלנו, תודה."; try { sessionStorage.setItem("lead-name", name.value.trim().split(/\s+/)[0]); sessionStorage.removeItem("lead-fired"); } catch (e) {}
        location.href = "thanks.html?from=" + f.dataset.lead; },
      () => { btn.disabled = false; msg.classList.add("is-err"); msg.textContent = "השליחה לא עברה. אפשר לנסות שוב, או לחייג 6223*."; }
    );
  });
});

/* ---------- the close: the trail comes in for the last time and lights the socket ---------- */
const closeWrap = $(".close-wrap"), closeBg = $(".close-bg"), closeSec = $("#contact"), closeSvg = $(".close-trail", closeSec), plug = $(".plug", closeSec);
const closeRibbon = new Ribbon(closeSvg, { ...BAND, amp: trailAmp, wave: 520, taperStart: 0, taperEnd: 50, sparks: 4, seed: 11 });
function layoutClose() {
  const r = closeSec.getBoundingClientRect(), W = r.width, H = r.height, b = plug.getBoundingClientRect();
  closeSvg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  const qx = b.left - r.left + b.width / 2, qy = b.top - r.top + b.height / 2, off = Math.max(120, trailAmp() * 6);
  const nearL = qx < W / 2, sx = nearL ? -r.left - off : doc.clientWidth - r.left + off, d = nearL ? 1 : -1;
  const segs = [];
  if (wide()) segs.push(["C", sx, qy - 280, sx + d * (Math.abs(qx - sx) * 0.55), qy - 280, qx - d * 220, qy, qx, qy]);
  else {
    const say = $(".close-say", closeSec), sayB = say.getBoundingClientRect().bottom - r.top - (parseFloat(say.style.getPropertyValue("--dy")) || 0);
    const y1 = Math.min(qy - 60, Math.max(40, sayB + 36, b.top - r.top - 150)); segs.push(["C", sx, y1, (sx + qx) / 2, y1, qx, y1 + (qy - y1) * 0.4, qx, qy]);
  }
  closeRibbon.setPath(segs);
  const wr = closeBg.getBoundingClientRect(); // the backdrop reaches above its section, so the socket is measured from the backdrop itself
  closeBg.style.setProperty("--qx", Math.round(b.left - wr.left + b.width / 2) + "px");
  closeBg.style.setProperty("--qy", Math.round(b.top - wr.top + b.height / 2) + "px");
}
function closeTick() {
  if (reduce) return;
  const r = rectOf(closeSec), ih = innerHeight;
  if (r.top > ih * 1.2 || r.bottom < -ih * 0.2) return;
  const f = closeRibbon.fracAtY(ih * 0.7 - r.top);
  closeRibbon.draw(f);
  if (plug.classList.contains("is-lit") !== f > 0.985) { plug.classList.toggle("is-lit", f > 0.985); arcRun(); }
}

/* ---------- the footer, the drifting headings, the phone bar ---------- */
const ft = $("#ft");
function ftTick() {
  if (reduce) return;
  const r = rectOf(ft), ih = innerHeight;
  if (r.top > ih) { if (ft._p !== "0") { ft._p = "0"; ft.style.setProperty("--fp", 0); } return; }
  const p = clamp01((ih - r.top) / Math.max(1, Math.min(r.height, ih * 0.9))).toFixed(3);
  if (ft._p !== p) { ft._p = p; ft.style.setProperty("--fp", p); }
}
const drifts = $$("[data-drift]").map((el) => ({ el, k: +el.dataset.drift || 0, dy: 0, to: 0 }));
function driftRead() {
  if (reduce) return;
  const ih = innerHeight;
  for (const d of drifts) {
    d.to = d.dy;
    const r = d.el.getBoundingClientRect(), top = r.top - d.dy;
    if (top > ih + 200 || top + r.height < -200) continue;
    d.to = Math.round(((top + r.height / 2) / ih - 0.5) * d.k * 2) / 2;
  }
}
function driftWrite() { for (const d of drifts) if (d.to !== d.dy) { d.dy = d.to; d.el.style.setProperty("--dy", d.dy + "px"); } }
const mbar = $("[data-mbar]"), ctaOrigin = $("[data-cta-origin]"), ctaEnds = $$("[data-cta-end]");
let typing = false;
function mbarRead() {
  if (wide()) return null;
  const ih = innerHeight, past = ctaOrigin.getBoundingClientRect().bottom < 8;
  const atEnd = ctaEnds.some((el) => { const r = el.getBoundingClientRect(); return r.top < ih * 0.7 && r.bottom > ih * 0.1; }) || ft.getBoundingClientRect().top < ih;
  return past && !atEnd;
}
function mbarSet(seen) {
  if (!mbar) return;
  if (seen === null) { if (mbar.classList.contains("is-on")) { mbar.classList.remove("is-on"); mbar.inert = true; doc.classList.remove("mbar-on"); } return; }
  const on = seen && !typing && !doc.classList.contains("menu-open");
  if (on !== mbar.classList.contains("is-on")) { mbar.classList.toggle("is-on", on); mbar.inert = !on; doc.classList.toggle("mbar-on", on); }
}
const mbarTick = () => mbarSet(mbarRead());
addEventListener("focusin", (e) => { if (e.target.matches("input:not([type=radio]):not([type=checkbox]):not([type=range]),textarea,select")) { typing = true; mbarTick(); } });
addEventListener("focusout", (e) => { if (e.target.matches("input,textarea,select")) { typing = false; setTimeout(mbarTick, 160); } });

/* ---------- endless loops rest out of sight (as on the home page) ---------- */
// Apple's engine: no noise filter, the same crackle drawn once and only turned (as on the home page, arc-rings.js)
const apple = /Apple/.test(navigator.vendor);
if (apple) { document.documentElement.classList.add("is-apple"); $(".fx-defs")?.remove(); }
const fx = $(".fx-defs"), canPause = !!(fx && fx.pauseAnimations);
let arcFar = true, arcT = 0, rings = false;
function arcRun() {
  if (apple && !arcFar && !rings) { rings = true; import("./arc-rings.js").then((m) => m.mountArcRings($(".plug-arc", closeSec))); }
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
if (farIO) [sw, procRun, tail, closeSec, ft].forEach((el) => farIO.observe(el));
else arcFar = false;
arcRun();

/* ---------- one frame for everything the scroll drives: read first, then write ---------- */
let ticking = false;
function tick() {
  ticking = false;
  const y = frameY = scrollY, bar = mbarRead();
  driftRead();
  heroTick(y);
  mainTick();
  placesTick();
  procTick();
  tailTick();
  closeTick();
  ftTick();
  driftWrite(); mbarSet(bar);
}
if (lenis) lenis.on("scroll", tick);
else addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(tick); } }, { passive: true });

function relayout() {
  spots.clear();
  frameY = scrollY;
  layoutHero();
  layoutMain();
  layoutPlaces();
  layoutProc();
  layoutTail();
  layoutClose();
  if (reduce) {
    flowRibbon.draw(1); procRibbon.draw(1); tailRibbon.draw(1); closeRibbon.draw(1);
    pcs.forEach((c) => c.classList.add("on")); steps.forEach((s) => s.classList.add("on")); bnItems.forEach((b) => b.classList.add("on")); plug.classList.add("is-lit");
  }
  tick();
  if (lenis) requestAnimationFrame(() => lenis.resize());
}
window.__dp = { flowRibbon, procRibbon, tailRibbon, closeRibbon };  // for the checks (where each trail is drawn)
const coarse = matchMedia("(pointer:coarse)").matches;
let rz = 0, rzW = innerWidth, rzH = innerHeight;
addEventListener("resize", () => {
  if (coarse && innerWidth === rzW && Math.abs(innerHeight - rzH) < 160) return;
  rzW = innerWidth; rzH = innerHeight;
  clearTimeout(rz); rz = setTimeout(relayout, 120);
});
relayout();
// the hero picture's shape is known once it has chosen its source; the measures need the real fonts (at most 1.5s)
if (!shImg.complete) shImg.addEventListener("load", relayout, { once: true });
Promise.race([document.fonts ? document.fonts.ready : Promise.resolve(), new Promise((r) => setTimeout(r, 1500))]).then(relayout);
addEventListener("load", relayout);
