// Treenergy · the scene page's domains section, for a visitor the tour can't run for (no WebGL, or motion stopped):
// the same section as the home page and the same trail. The band comes down onto the rail, goes into each machine
// (the ring, the scan, the numeral filling) and leaves by the side. Ported from site.js (layoutDom, domTick and their
// helpers), which there hands over from the globe; here the scene above stands still. Its words come in by site.js.
import { Ribbon } from "./ribbon.js";

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const NS = "http://www.w3.org/2000/svg";
const RINGS = [[1, 1, -7, 0, 1.6, 0.95], [0.95, 0.78, -4.5, 0.035, 1, 0.5], [1.06, 1.22, -9.5, -0.03, 0.8, 0.32]];
const KEY_TY = 0.15;

const wide = () => innerWidth >= 1024;
// the band's half width and its fibres, as on the home page
const trailAmp = () => (innerWidth < 768 ? 14 : 28);
const BAND = () => (innerWidth < 768 ? { strands: 16, loose: 4 } : { strands: 26, loose: 6 });

// a smooth way down through given points (y only grows), as on the home page
function spline(pts) {
  const n = pts.length, segs = [];
  const T = pts.map((p, i) => {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
    if (p.tx !== undefined) { const d = Math.hypot(b.x - a.x, b.y - a.y) * (i === 0 || i === n - 1 ? 1 : 0.5), l = Math.hypot(p.tx, p.ty) || 1; return [p.tx / l * d, p.ty / l * d]; }
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

// HEAD: the screen line the head rides; stageH: the scene's height above the section
export function mountDom({ HEAD, reduce, stageH }) {
  const dom = $("#domains"); if (!dom) return null;
  const shots = $$(".shot", dom), svg = $(".dom-trail", dom), more = $(".dom-more", dom);
  const wipes = shots.map((f) => ({ f, o: $(".obj", f), pw: -1 }));
  const ribbon = new Ribbon(svg, { ...BAND(), amp: trailAmp, wave: 520, taperStart: 0, taperEnd: 0, sparks: 4, seed: 3 });
  const join = { x: 0, y: 0, dx: 0, dy: 1 };
  let boxes = [];

  function ringPaths(w) {
    const o = w.o, W = o.offsetWidth, H = o.offsetHeight;
    if (!W || (w.W === W && w.H === H)) return;
    w.W = W; w.H = H;
    const rx0 = W * 0.5 + Math.max(22, W * 0.07), ry0 = Math.max(16, Math.min(rx0 * 0.2, H * 0.16));
    const pt = (cx, cy, rx, ry, c, sn, t) => [cx + rx * Math.cos(t) * c - ry * Math.sin(t) * sn, cy + rx * Math.cos(t) * sn + ry * Math.sin(t) * c];
    [["orb-back", Math.PI], ["orb-front", 0]].forEach(([cls, t0]) => {
      const s = $("." + cls, o);
      s.setAttribute("viewBox", `0 0 ${W} ${H}`);
      s.innerHTML = "";
      RINGS.forEach(([kx, ky, rot, dy, sw, op], i) => {
        const rx = rx0 * kx, ry = ry0 * ky, a = (rot * Math.PI) / 180, c = Math.cos(a), sn = Math.sin(a), cx = W / 2, cy = H * (0.56 + dy);
        const p0 = pt(cx, cy, rx, ry, c, sn, t0), p1 = pt(cx, cy, rx, ry, c, sn, t0 + Math.PI);
        const d = `M${p0[0].toFixed(1)} ${p0[1].toFixed(1)}A${rx.toFixed(1)} ${ry.toFixed(1)} ${rot} 0 1 ${p1[0].toFixed(1)} ${p1[1].toFixed(1)}`;
        for (const sp of i ? [0] : [0, 1]) {
          const p = document.createElementNS(NS, "path");
          p.setAttribute("d", d); p.setAttribute("pathLength", "1");
          if (sp) p.setAttribute("class", "sp"); else p.setAttribute("style", `--w:${sw};--o:${op}`);
          s.appendChild(p);
        }
      });
    });
  }
  function setScan(i, pw) {
    const w = wipes[i]; pw = clamp01(pw); if (Math.abs(w.pw - pw) < 0.0005) return; w.pw = pw;
    const r = clamp01((pw - 0.18) / 0.62);
    w.f.style.setProperty("--pw", pw.toFixed(4));
    w.f.style.setProperty("--rb", clamp01(r * 2).toFixed(4));
    w.f.style.setProperty("--rf", clamp01(r * 2 - 1).toFixed(4));
    w.f.classList.toggle("is-scan", pw > 0.004 && pw < 0.98);
    w.f.classList.toggle("is-lit", pw >= 0.98);
  }

  // x where the band comes in: wide screens, between the first machine and the middle; phones, the rail on the start
  // side, half way through the gutter and the rail pad
  function railX() {
    const W = document.documentElement.clientWidth;
    if (wide()) { const r = shots[0].getBoundingClientRect(), c = r.left + r.width / 2; return c + (W / 2 - c) * 0.2; }
    const g = parseFloat(getComputedStyle(dom).paddingRight), rp = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--rail-pad")) || 28;
    return W - (g + rp) / 2;
  }
  // where the band starts, in the domains' frame: on the head's line at the moment the scene above has gone by (the
  // domains' top is then its foot); never through the opening's second line (round 6), it starts under it instead
  const sub = document.querySelector(".lb-sub");
  function jointY(x0, r) {
    const J = innerHeight * HEAD - stageH();
    if (!sub || x0 === undefined) return J;
    const b = sub.getBoundingClientRect();
    return x0 > b.left - 40 && x0 < b.right + 40 ? Math.max(J, b.bottom - r.top + 24) : J;
  }

  function layout() {
    const r = dom.getBoundingClientRect(), W = r.width, H = r.height, x0 = railX(), J = jointY(x0, r);
    join.x = x0;
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    wipes.forEach(ringPaths);
    boxes = wipes.map((w) => { const b = w.o.getBoundingClientRect(); return { top: b.top - r.top, h: b.height, cx: b.left - r.left + b.width / 2, w: b.width }; });
    const last = boxes.length - 1, amp = trailAmp();
    const cy = (b) => b.top + b.h * 0.56;
    const yEnd = Math.min(H - 8, more.getBoundingClientRect().top - r.top - 20), xEnd = -Math.max(120, amp * 6);
    let pts;
    if (wide()) {
      const v = [boxes[0].cx - x0, cy(boxes[0]) - J], l = Math.hypot(v[0] * 0.6, v[1]) || 1;
      join.y = J; join.dx = v[0] * 0.6 / l; join.dy = v[1] / l;
      pts = [{ x: x0, y: J, tx: join.dx, ty: join.dy }, ...boxes.map((b) => ({ x: b.cx, y: cy(b) }))];
    } else {
      const pad = Math.max(28, amp * 1.6);
      join.y = J; join.dx = 0; join.dy = 1;
      pts = [{ x: x0, y: J, tx: 0, ty: 1, line: true }];
      boxes.forEach((b) => {
        pts.push({ x: x0, y: b.top - pad, line: false });
        pts.push({ x: b.cx, y: cy(b) });
        pts.push({ x: x0, y: b.top + b.h + pad, line: true });
      });
      const foot = shots[last].closest(".scene").getBoundingClientRect().bottom - r.top;
      if (foot > pts[pts.length - 1].y + 24) pts.push({ x: x0, y: foot, line: true });
    }
    if (yEnd > pts[pts.length - 1].y + 40) {
      if (wide()) pts.push({ x: xEnd, y: yEnd, tx: -1, ty: 0.22 });
      else { const s = x0 > W / 2 ? 1 : -1; pts.push({ x: s > 0 ? W - xEnd : xEnd, y: yEnd, tx: s, ty: 0.6 }); }
    }
    if (wide()) for (let i = 1; i < pts.length - 1; i++) { const p = pts[i], q = pts[i + 1]; p.tx = q.x - p.x; p.ty = (q.y - p.y) * KEY_TY; }
    const segs = spline(pts);
    ribbon.o.pinches = [];
    ribbon.setPath(segs);
    ribbon.o.pinches = boxes.map((b) => ribbon.fracAtY(b.top + b.h * 0.3));
    ribbon.setPath(segs);
    if (reduce) { ribbon.draw(1); boxes.forEach((b, i) => setScan(i, 1)); }
  }
  function tick() {
    if (reduce) return;
    const r = dom.getBoundingClientRect();
    if (r.top > innerHeight * 1.4 || r.bottom < -innerHeight * 0.2) { if (r.top > innerHeight * 1.4) ribbon.draw(0); return; }
    const headY = innerHeight * HEAD - r.top;
    ribbon.draw(ribbon.fracAtY(headY));
    boxes.forEach((b, i) => setScan(i, (headY - b.top) / (b.h * 0.92)));
  }


  return { railX, join, layout, tick, jointY };
}
