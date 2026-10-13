// The energy trail (v4, round 3): a tail of light, drawn against the two vectors Liav sent ("fiery wavy green tail
// light", "glowing green lines, sparkling wavy light"): a few bright fine lines close together, a mist of fainter
// hairlines around them, a soft bloom of green light under all of it, and a dust of sparkles drifting along. The lines
// part and gather in long slow waves and a flicker of light runs along them towards the head, where they meet in one
// point; the trail is never still, even when the page is (light-pillar and soft-aurora gave the bloom and the drift).
// One instance per stretch of the page (the globe, the domains, the reasons, the process, the calculator, the close).
// An instance keeps its geometry in the frame of its own <svg> (left empty, it only gives the frame), and every
// instance is painted by one fixed canvas under the page's words: one canvas, one frame loop, only the part on screen.
// Geometry is computed from cubic segments in JS (no layout reads), so it can be rebuilt every frame on the globe.
let uid = 0;

const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const still = () => (typeof window !== "undefined" && !!window.__still) || (typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches);
const val = (v) => (typeof v === "function" ? v() : v);

// a path is a list of segments: ["C", x0,y0, x1,y1, x2,y2, x3,y3] or ["L", x0,y0, x1,y1]; marks keeps the length
// at the start of every segment
function sample(segs, step, marks) {
  const pts = [];
  let s = 0, px = null, py = null;
  for (const g of segs) {
    if (marks) marks.push(s);
    let P = g.slice(1);
    if (g[0] === "L") P = [P[0], P[1], P[0] + (P[2] - P[0]) / 3, P[1] + (P[3] - P[1]) / 3, P[0] + (P[2] - P[0]) * 2 / 3, P[1] + (P[3] - P[1]) * 2 / 3, P[2], P[3]];
    const [x0, y0, x1, y1, x2, y2, x3, y3] = P;
    const est = Math.hypot(x1 - x0, y1 - y0) + Math.hypot(x2 - x1, y2 - y1) + Math.hypot(x3 - x2, y3 - y2);
    const n = Math.max(2, Math.ceil(est / step));
    for (let i = pts.length ? 1 : 0; i <= n; i++) {
      const t = i / n, u = 1 - t;
      const x = u * u * u * x0 + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x3;
      const y = u * u * u * y0 + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y3;
      let dx = 3 * u * u * (x1 - x0) + 6 * u * t * (x2 - x1) + 3 * t * t * (x3 - x2);
      let dy = 3 * u * u * (y1 - y0) + 6 * u * t * (y2 - y1) + 3 * t * t * (y3 - y2);
      const L = Math.hypot(dx, dy) || 1; dx /= L; dy /= L;
      if (px !== null) s += Math.hypot(x - px, y - py);
      pts.push({ x, y, nx: -dy, ny: dx, s });
      px = x; py = y;
    }
  }
  return pts;
}

/* ---------- the painter: one fixed canvas for every trail on the page ---------- */
const P = { set: new Set(), cv: null, ctx: null, low: null, lctx: null, k: 3, dpr: 1, W: 0, H: 0, dirty: true, t0: 0, blank: true, glow: null, spark: null };
function sprite(r, stops) {
  const c = document.createElement("canvas"); c.width = c.height = r * 2;
  const g = c.getContext("2d"), gr = g.createRadialGradient(r, r, 0, r, r, r);
  for (const [o, col] of stops) gr.addColorStop(o, col);
  g.fillStyle = gr; g.fillRect(0, 0, r * 2, r * 2); return c;
}
function painter() {
  if (P.cv) return;
  const cv = P.cv = document.createElement("canvas");
  cv.className = "trails"; cv.setAttribute("aria-hidden", "true");
  const sky = document.getElementById("sky");
  if (sky && sky.parentNode) sky.parentNode.insertBefore(cv, sky.nextSibling); else document.body.prepend(cv);
  P.ctx = cv.getContext("2d");
  // the bloom is painted small and laid over the page soft (a blur, or at least the stretch of a small picture)
  P.low = document.createElement("canvas"); P.lctx = P.low.getContext("2d");
  P.glow = sprite(64, [[0, "rgba(246,255,249,1)"], [0.08, "rgba(210,255,228,.95)"], [0.22, "rgba(48,247,123,.45)"], [0.5, "rgba(48,247,123,.12)"], [1, "rgba(48,247,123,0)"]]);
  P.spark = sprite(16, [[0, "rgba(246,255,249,1)"], [0.3, "rgba(150,255,196,.7)"], [1, "rgba(48,247,123,0)"]]);
  const size = () => {
    P.dpr = Math.min(window.devicePixelRatio || 1, innerWidth < 768 ? 2 : 1.75);
    P.W = innerWidth; P.H = innerHeight;
    cv.width = Math.round(P.W * P.dpr); cv.height = Math.round(P.H * P.dpr);
    P.k = P.W < 768 ? 4 : 3; P.low.width = Math.ceil(P.W / P.k); P.low.height = Math.ceil(P.H / P.k);
    P.dirty = true;
  };
  size(); addEventListener("resize", size);
  P.t0 = performance.now();
  const loop = (now) => { requestAnimationFrame(loop); paint(now); };
  requestAnimationFrame(loop);
}
function paint(now) {
  const moving = !still();
  // at rest (stop motion), only paint when something changed: a trail, or where the page is
  if (scrollY !== P.sy) { P.sy = scrollY; P.dirty = true; }
  if (!moving && !P.dirty) return;
  P.dirty = false;
  const ctx = P.ctx, t = moving ? (now - P.t0) / 1000 : 0;
  // read every frame first, then paint (no layout read between strokes)
  const on = [];
  for (const r of P.set) {
    if (!r.pts || r.p <= 0.002) continue;
    const b = r.svg.getBoundingClientRect();
    if (!b.width && !b.height) continue;
    if (b.left + r.bx1 < -80 || b.left + r.bx0 > P.W + 80 || b.top + r.by1 < -120 || b.top + r.by0 > P.H + 120) continue;
    on.push([r, b.left, b.top]);
  }
  if (!on.length) { if (!P.blank) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, P.cv.width, P.cv.height); P.blank = true; } return; }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, P.cv.width, P.cv.height);
  const l = P.lctx;
  l.setTransform(1, 0, 0, 1, 0, 0); l.clearRect(0, 0, P.low.width, P.low.height);
  l.setTransform(1 / P.k, 0, 0, 1 / P.k, 0, 0);
  l.globalCompositeOperation = "lighter"; l.lineCap = "round"; l.lineJoin = "round";
  const geo = on.map(([r, ox, oy]) => r.lines(ox, oy, t));
  on.forEach(([r, ox, oy], i) => r.bloom(l, geo[i], ox, oy));
  ctx.setTransform(P.dpr, 0, 0, P.dpr, 0, 0);
  ctx.globalCompositeOperation = "lighter";
  ctx.lineCap = "round"; ctx.lineJoin = "round";
  if (P.W >= 768) ctx.filter = "blur(5px)";
  ctx.drawImage(P.low, 0, 0, P.low.width * P.k, P.low.height * P.k);
  ctx.filter = "none";
  on.forEach(([r, ox, oy], i) => r.paint(ctx, ox, oy, t, geo[i]));
  ctx.globalCompositeOperation = "source-over";
  P.blank = false;
}

export class Ribbon {
  // opt: strands (how full the trail is: the lines are fewer than the old band's fibres), amp (px, half the trail's
  // width, or a function), wave (px, the lines' typical wavelength), pinches (fractions 0..1 where the trail gathers:
  // energy passing a node), taperStart / taperEnd (px), sparks, seed, anchor ("end": the waves are counted back from
  // the last point, so a trail that starts where this one ends, with the same seed, carries every line on)
  constructor(svg, opt = {}) {
    this.svg = svg;
    this.o = Object.assign({ strands: 16, amp: 24, wave: 520, pinches: [], taperStart: 90, taperEnd: 0, sparks: 4, step: 6, seed: 1 }, opt);
    this.id = ++uid;
    svg.classList.add("rb");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");
    let r = this.o.seed * 9301 + 49297;
    const rnd = () => ((r = (r * 9301 + 49297) % 233280) / 233280);
    // the lines: two near-white cores, a few mint and green ones close to them, and faint hairlines around (the mist
    // of fibres in the first vector). Each parts from the middle in its own long slow wave, so they open and gather
    const n = this.o.strands >= 20 ? 6 : 5, nh = this.o.strands >= 20 ? 9 : 6;
    this.ln = [];
    for (let i = 0; i < n + nh; i++) {
      const core = i < 2, hair = i >= n;
      this.ln.push({
        hair,
        lane: hair ? (rnd() - 0.5) * 1.6 : (rnd() - 0.5) * 0.35,
        lam: (1.6 + rnd() * 1.6) * this.o.wave,
        a: hair ? 0.35 + rnd() * 0.4 : core ? 0.2 + rnd() * 0.2 : 0.35 + rnd() * 0.35,
        ph: rnd() * 6.28,
        v: 26 + rnd() * 30,                     // px a second the waves travel towards the head
        fl: 0.5 + rnd() * 0.5,                  // the flicker running along it: wavelength (x wave) and speed
        fv: 180 + rnd() * 160, fp: rnd() * 6.28,
        w: hair ? 0.5 + rnd() * 0.35 : core ? 1.6 + rnd() * 0.4 : 0.9 + rnd() * 0.5,
        col: core ? (i ? "205,255,224" : "240,255,246") : hair ? (rnd() < 0.5 ? "48,247,123" : "150,255,196") : rnd() < 0.5 ? "62,247,132" : "125,251,172",
        al: hair ? 0.14 + rnd() * 0.14 : core ? 0.9 : 0.5 + rnd() * 0.3,
      });
    }
    this.sp = [];
    for (let i = 0; i < this.o.sparks; i++) this.sp.push({ k: i % 2, v: 220 + rnd() * 200, o: rnd() });
    // the dust: sparkles scattered around the trail, drifting slowly towards the head and twinkling
    this.du = [];
    for (let i = 0; i < 160; i++) { const g = (rnd() + rnd() + rnd() - 1.5) / 1.5; this.du.push({ u: rnd(), off: g * 2.6, z: 0.6 + rnd() * rnd() * 2.2, tw: 1 + rnd() * 3, tp: rnd() * 6.28 }); }
    this.pts = null; this.L = 1; this.p = -1; this.gaps = []; this.env = null; this.amp = 0;
    this.bx0 = this.by0 = 0; this.bx1 = this.by1 = 0;
    painter(); P.set.add(this);
  }

  // pinchAt: segment indices whose start is a node (besides the fractions in o.pinches)
  setPath(segs, pinchAt) {
    const o = this.o, marks = [], pts = sample(segs, o.step, marks);
    this.pts = pts; this.marks = marks; const L = this.L = pts[pts.length - 1].s || 1;
    const pinches = o.pinches.concat((pinchAt || []).filter((i) => i >= 0 && i < marks.length).map((i) => marks[i] / L));
    this.amp = val(o.amp);
    const env = this.env = new Float32Array(pts.length);
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (let j = 0; j < pts.length; j++) {
      const q = pts[j];
      let e = (o.taperStart ? smooth(0, o.taperStart, q.s) : 1) * (o.taperEnd ? smooth(L, L - o.taperEnd, q.s) : 1);
      for (const f of pinches) e *= 1 - 0.75 * Math.exp(-Math.pow((q.s - f * L) / 90, 2));
      env[j] = e;
      if (q.x < x0) x0 = q.x; if (q.x > x1) x1 = q.x; if (q.y < y0) y0 = q.y; if (q.y > y1) y1 = q.y;
    }
    const m = this.amp * 3 + 40;
    this.bx0 = x0 - m; this.bx1 = x1 + m; this.by0 = y0 - m; this.by1 = y1 + m;
    P.dirty = true;
    this.draw(this.p < 0 ? 0 : this.p, true);
  }

  // stretches (fractions of the length) where the trail runs out of sight, inside something (the battery)
  setGaps(g) { this.gaps = g || []; P.dirty = true; }

  // p: how much of the trail is drawn, 0..1
  draw(p) {
    p = Math.min(1, Math.max(0, p));
    if (Math.abs(p - this.p) < 0.0002) return;
    this.p = p; P.dirty = true;
  }

  // the head, in the svg's frame
  head() {
    const pts = this.pts, target = this.p * this.L;
    let lo = 0, hi = pts.length - 1;
    while (lo < hi) { const m = (lo + hi) >> 1; if (pts[m].s < target) lo = m + 1; else hi = m; }
    const j0 = Math.max(0, lo - 1), a = pts[j0], b = pts[lo], t = lo ? Math.min(1, Math.max(0, (target - a.s) / ((b.s - a.s) || 1))) : 0;
    return { j: lo, x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, s: target };
  }

  inGap(s) { const f = s / this.L; for (const [a, b] of this.gaps) if (f > a && f < b) return true; return false; }

  // the visible stretch and every line's points on it, shared by the bloom and the lines
  lines(ox, oy, t) {
    const pts = this.pts, env = this.env, amp = this.amp, h = this.head(), hs = h.s, L = this.L;
    let j0 = 0, j1 = h.j;
    const top = -oy - 200, bot = P.H - oy + 200, left = -ox - 200, right = P.W - ox + 200;
    const out = (q) => q.y < top || q.y > bot || q.x < left || q.x > right;
    while (j0 < j1 && out(pts[j0])) j0++;
    while (j1 > j0 && out(pts[j1])) j1--;
    if (j1 - j0 < 1) return { h, runs: [], j0, j1, xy: null };
    // runs of points outside the gaps
    const runs = [];
    let a = -1;
    for (let j = j0; j <= j1; j++) {
      const hid = this.gaps.length && this.inGap(pts[j].s);
      if (!hid && a < 0) a = j;
      if ((hid || j === j1) && a >= 0) { runs.push([a, hid ? j - 1 : j]); a = -1; }
    }
    // the lines gather into the head: wide behind it, one point at the front
    const two = 2 * Math.PI, s0 = this.o.anchor === "end" ? -L : 0, m = j1 - j0 + 1;
    const xy = this.ln.map((ln) => {
      const xs = new Float32Array(m), ys = new Float32Array(m), br = new Float32Array(m);
      for (let j = j0; j <= j1; j++) {
        const q = pts[j], s = q.s + s0, e = env[j] * smooth(0, 320, hs - q.s);
        const off = amp * e * (ln.lane + ln.a * Math.sin(two * (s - ln.v * t) / ln.lam + ln.ph));
        xs[j - j0] = q.x + q.nx * off + ox; ys[j - j0] = q.y + q.ny * off + oy;
        br[j - j0] = (0.25 + 0.75 * e) * (0.6 + 0.4 * Math.sin(two * (s - ln.fv * t) / (ln.fl * this.o.wave) + ln.fp));
      }
      return { xs, ys, br };
    });
    return { h, runs, j0, j1, xy };
  }

  // the bloom, painted small: a soft wide band of light under the lines, and the head's flare
  bloom(l, g, ox, oy) {
    const amp = this.amp;
    if (g.xy) for (const [r0, r1] of g.runs) {
      if (r1 - r0 < 1) continue;
      const A = g.xy[0], B = g.xy[1];
      for (const [wm, al] of [[2.8, 0.1], [1.2, 0.18]]) {
        l.beginPath();
        for (let j = r0; j <= r1; j++) { const i = j - g.j0, x = (A.xs[i] + B.xs[i]) / 2, y = (A.ys[i] + B.ys[i]) / 2; if (j === r0) l.moveTo(x, y); else l.lineTo(x, y); }
        l.strokeStyle = `rgba(48,247,123,${al})`; l.lineWidth = Math.max(6, amp * wm); l.stroke();
      }
    }
    if (this.p > 0.002 && this.p < 0.998 && !(this.gaps.length && this.inGap(g.h.s))) {
      const r = 110; l.drawImage(P.glow, g.h.x + ox - r, g.h.y + oy - r, r * 2, r * 2);
    }
  }

  paint(ctx, ox, oy, t, g) {
    if (!g.xy) { this.paintHead(ctx, ox, oy, g.h, t); return; }
    const pts = this.pts, amp = this.amp, hs = g.h.s, step = this.L / (pts.length - 1);
    // the lines, in short runs so the flicker can run along them
    const C = 8;
    for (let k = 0; k < this.ln.length; k++) {
      const ln = this.ln[k], { xs, ys, br } = g.xy[k];
      for (const [r0, r1] of g.runs) {
        for (let c = r0; c < r1; c += C) {
          const e = Math.min(r1, c + C), i0 = c - g.j0, im = Math.min(e, c + (C >> 1)) - g.j0, al = ln.al * br[im];
          if (al < 0.01) continue;
          ctx.beginPath(); ctx.moveTo(xs[i0], ys[i0]);
          for (let j = c + 1; j <= e; j++) ctx.lineTo(xs[j - g.j0], ys[j - g.j0]);
          if (!ln.hair) { ctx.strokeStyle = `rgba(${ln.col},${(al * 0.16).toFixed(3)})`; ctx.lineWidth = ln.w * 4; ctx.stroke(); }
          ctx.strokeStyle = `rgba(${ln.col},${al.toFixed(3)})`; ctx.lineWidth = ln.w; ctx.stroke();
        }
      }
    }
    // the dust, around the lit part only
    for (const d of this.du) {
      const s = (d.u * this.L + 14 * t) % this.L;
      if (s > hs) continue;
      const j = Math.min(pts.length - 1, Math.round(s / step));
      if (j < g.j0 || j > g.j1 || (this.gaps.length && this.inGap(pts[j].s))) continue;
      const q = pts[j], e = this.env[j] * smooth(0, 320, hs - s), off = amp * (0.25 + e) * d.off;
      const a = (0.35 + 0.65 * Math.abs(Math.sin(t * d.tw + d.tp))) * smooth(0, 160, s) * (0.4 + 0.6 * e);
      if (a < 0.04) continue;
      const z = d.z * 3.2;
      ctx.globalAlpha = a; ctx.drawImage(P.spark, q.x + q.nx * off + ox - z / 2, q.y + q.ny * off + oy - z / 2, z, z);
    }
    ctx.globalAlpha = 1;
    // sparks: small lights running along the two cores towards the head
    if (t) for (const sp of this.sp) {
      const { xs, ys } = g.xy[sp.k], s = (sp.o * hs + sp.v * t) % Math.max(1, hs);
      const j = Math.min(pts.length - 1, Math.round(s / step));
      if (j < g.j0 || j > g.j1 || (this.gaps.length && this.inGap(pts[j].s))) continue;
      const fade = smooth(0, 120, s) * smooth(hs, hs - 60, s);
      if (fade < 0.02) continue;
      ctx.globalAlpha = fade; ctx.drawImage(P.spark, xs[j - g.j0] - 9, ys[j - g.j0] - 9, 18, 18); ctx.globalAlpha = 1;
    }
    this.paintHead(ctx, ox, oy, g.h, t);
  }

  paintHead(ctx, ox, oy, h, t) {
    if (this.p >= 0.998 || this.p <= 0.002 || (this.gaps.length && this.inGap(h.s))) return;
    const r = 34 * (1 + 0.12 * Math.sin(t * 2.4));
    ctx.drawImage(P.glow, h.x + ox - r, h.y + oy - r, r * 2, r * 2);
  }

  // the fraction of the trail drawn when its head is at height y (the path must only ever go down, as the page does)
  fracAtY(y) {
    const pts = this.pts; if (!pts) return 0;
    if (y <= pts[0].y) return 0;
    if (y >= pts[pts.length - 1].y) return 1;
    let lo = 0, hi = pts.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (pts[m].y < y) lo = m; else hi = m; }
    const a = pts[lo], b = pts[hi], t = (y - a.y) / ((b.y - a.y) || 1);
    return (a.s + (b.s - a.s) * t) / this.L;
  }

  // the fraction of the trail at the point nearest to (x, y) (a node the trail passes through)
  nearest(x, y) {
    const pts = this.pts; if (!pts) return 0;
    let bi = 0, bd = Infinity;
    for (let i = 0; i < pts.length; i++) { const d = (pts[i].x - x) ** 2 + (pts[i].y - y) ** 2; if (d < bd) { bd = d; bi = i; } }
    return pts[bi].s / this.L;
  }

  // where along the trail a fraction of its length sits (to place nodes)
  at(f) {
    if (!this.pts) return { x: 0, y: 0 };
    const target = f * this.L, pts = this.pts;
    let i = 0; while (i < pts.length - 1 && pts[i].s < target) i++;
    return pts[i];
  }
}
