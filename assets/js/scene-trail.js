// Treenergy · the scene page's trail out of the tour (Liav 20.10: "חייבים שהשובל יצא בצורה מושלמת מההירו וימשיך
// במסלול הרגיל שלו"). As the camera pulls back over the whole scene after the last place and the scene starts to rise,
// the site's trail comes out of the city, where the network's energy starts, and the scroll draws it down: it reaches
// the head's line (HEAD of the screen) the moment the stage lets go, and from there its head rides that line through the
// intro, as on the home page. Its tail stays on the city while the scene rises past the visitor.
// Through the intro it keeps clear of the words (round 4): wide screens, in the open night on their end side; below
// 1024, down the rail in the start margin (site.css keeps it clear). Past the words it bends away by a side while the
// reasons' trail comes in (as after the domains on the home page), so there is a trail on the screen all the way.
// One ribbon in the stage's frame: once the stage lets go it scrolls with the page, so the way through the intro is laid
// out where the intro stands then, and the way out of the city is the only part that moves.
import { Ribbon } from "./ribbon.js";

const clamp01 = (x) => Math.min(1, Math.max(0, x));
const smooth = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const NS = "http://www.w3.org/2000/svg";

// the band's half width and its fibres, as on the home page
const trailAmp = () => (innerWidth < 768 ? 14 : 28);
const BAND = () => (innerWidth < 768 ? { strands: 16, loose: 4 } : { strands: 26, loose: 6 });
// below 1024 the intro's words keep the rail in the start margin clear (site.css)
const railed = () => innerWidth < 1024;
const textBox = (el) => { const g = document.createRange(); g.selectNodeContents(el); return g.getBoundingClientRect(); };

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

// cityEnd(): where the city stands on the stage the moment it lets go (the hand-over leans towards it)
export function mountTrail({ stage, sec, HEAD, cityEnd }) {
  const intro = document.querySelector(".intro"), inner = intro && intro.querySelector(".intro-in"), why = document.getElementById("why");
  if (!intro || !inner) return null;
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("class", "lb-trail");
  stage.appendChild(svg);
  // anchor "end": the waves are counted from the far end, so they stay put while the way out of the city changes length
  const ribbon = new Ribbon(svg, { ...BAND(), amp: trailAmp, wave: 520, taperStart: 140, taperEnd: 0, sparks: 4, seed: 3, anchor: "end" });
  // E: the hand-over on the head's line, jd: the heading there; way: from E through the intro and away
  let E = null, jd = [0, 1], way = [], key = "", lenA = 0, iB = 0, C0 = null, rail = false;

  function layout() {
    const W = stage.clientWidth, H = stage.clientHeight, amp = trailAmp();
    const sr = stage.getBoundingClientRect(), sb = sec.getBoundingClientRect().bottom;
    // the page in the stage's frame once it has let go (the stage's foot is then the section's foot)
    const yS = (y) => y - sb + H, xS = (x) => x - sr.left;
    const rtl = getComputedStyle(intro).direction === "rtl";
    const kids = [...inner.children].filter((e) => e.getClientRects().length), boxes = kids.map((e) => e.getBoundingClientRect());
    const top = yS(Math.min(...boxes.map((b) => b.top))), bot = yS(Math.max(...boxes.map((b) => b.bottom)));
    const foot = yS(intro.getBoundingClientRect().bottom), J = innerHeight * HEAD, off = Math.max(120, amp * 6);
    let pts;
    rail = railed();
    if (rail) {
      // the rail, half way through the start margin, on past the intro beside the reasons' heading and figures (they keep
      // the rail clear too); it bends away over that edge just where the reasons' trail swings in from it above the
      // battery's terminal (as layoutWhy in site.js), so the one goes out as the other comes in on the head's line
      const pad = parseFloat(getComputedStyle(intro)[rtl ? "paddingRight" : "paddingLeft"]) || 48, x0 = W - pad / 2;
      const bend = Math.max(120, (W + off - x0) * 0.9), cells = why && why.querySelector(".cells"), figs = why && why.querySelector(".figs");
      let yEnd = Math.max(J + 40, bot + Math.max(28, amp * 1.6)) + bend;
      if (cells && figs) {
        const nub = parseFloat(getComputedStyle(cells).getPropertyValue("--nub")) || 12, t = yS(cells.getBoundingClientRect().top) - nub;
        yEnd = Math.max(yEnd, t - Math.max(90, Math.min(240, t - yS(figs.getBoundingClientRect().bottom) - 8)));
      } else yEnd = Math.max(yEnd, foot);
      jd = [0, 1];
      pts = [{ x: x0, y: J, tx: 0, ty: 1, line: true }, { x: x0, y: yEnd - bend }, { x: W + off, y: yEnd, tx: 1, ty: 0.6 }];
    } else {
      // a lane in the open night on the words' end side, clear of their furthest letters; the hand-over between the
      // city and the lane, so the way down from the city and on beside the words is one long soft swing
      const ends = kids.map(textBox).filter((b) => b.width), edge = rtl ? xS(Math.min(...ends.map((b) => b.left))) : W - xS(Math.max(...ends.map((b) => b.right)));
      const pad = 16 + amp * 1.5, lane = Math.max(24 + amp * 2, Math.min(W * 0.3, edge - pad - amp * 1.6));
      const c = cityEnd(), cx = rtl ? c[0] : W - c[0], xJ = lane + (cx - lane) * 0.35;
      const y1 = Math.max(J + 60, top - pad), y2 = Math.max(y1 + 40, bot + pad);
      // on down the lane past the intro, and away by the side just above the first of the reasons that reaches into it,
      // so it is still going out while the reasons' trail comes in from the other side
      let block = Infinity;
      if (why) for (const el of why.children) {
        if (el instanceof SVGElement || !el.getClientRects().length) continue;
        const b = textBox(el);
        if (b.width && (rtl ? xS(b.left) : W - xS(b.right)) < lane + pad + amp * 1.6) block = Math.min(block, yS(b.top));
      }
      // the way out is one wide swing (a short one bends into a knee); a long way down holds the lane first
      const xL = lane - Math.min(60, lane * 0.15), bend = Math.max(160, (xL + off) * 0.8);
      const yEnd = Number.isFinite(block) ? Math.max(y2 + 160, block - pad - amp) : Math.max(foot, y2 + 160);
      const jx = (lane - xJ) * 0.8, jy = y1 - J, jl = Math.hypot(jx, jy) || 1;
      jd = [jx / jl, jy / jl];
      pts = [{ x: xJ, y: J, tx: jd[0], ty: jd[1] }, { x: lane, y: y1 }, { x: xL, y: y2 }];
      if (yEnd - bend > y2 + 120) pts.push({ x: xL, y: yEnd - bend });
      pts.push({ x: -off, y: yEnd, tx: -1, ty: 0.45 });
    }
    // built for the start on the right, mirrored for the left
    if (!rtl) { for (const p of pts) { p.x = W - p.x; if (p.tx !== undefined) p.tx = -p.tx; } jd = [-jd[0], jd[1]]; }
    way = spline(pts);
    E = [pts[0].x, J];
    key = "";
  }

  // the way out of the city: it leaves the city heading down towards the hand-over and arrives on the heading the way
  // through the intro sets off in, so the two are one line. jy: where it joins the rail (E's height, or lower)
  function build(C, jy) {
    const T = [E[0], jy], rest = jy > E[1] ? [["L", E[0], jy, E[0], way[0][4]], ...way.slice(1)] : way;
    const d = Math.hypot(T[0] - C[0], T[1] - C[1]) || 1;
    let tx = (T[0] - C[0]) * 0.35, ty = Math.max(T[1] - C[1], d * 0.3); const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
    const k1 = d * 0.42, k2 = d * 0.45;
    ribbon.setPath([["C", C[0], C[1], C[0] + tx * k1, C[1] + ty * k1, T[0] - jd[0] * k2, T[1] - jd[1] * k2, T[0], T[1]], ...rest]);
    lenA = ribbon.marks[1];
    const pts = ribbon.pts; let lo = 0, hi = pts.length - 1;
    while (lo < hi) { const k = (lo + hi) >> 1; if (pts[k].s < lenA - 0.01) lo = k + 1; else hi = k; }
    iB = lo;
  }

  // p: the tour's progress, pB: where the trail is born, C: the city on the stage now, span: the tour's scroll length
  function tick(p, pB, C, span) {
    if (!E) return;
    if (p <= pB) { ribbon.draw(0); return; }
    // the screen's height changed (a phone's bars): the hand-over moves with the head's line
    if (Math.abs(innerHeight * HEAD - E[1]) > 0.5) layout();
    const sr = stage.getBoundingClientRect();
    // the city is followed while the stage is on the screen (a phone's slow drift would rebuild it forever after)
    if (sr.bottom > -40 || !C0) C0 = C;
    // on the rail the city closes in on the hand-over as the scene rises slower than the page, so the way down from it
    // joins the rail lower (never below the head): one soft swing, never a knee
    const jy = rail ? Math.min(E[1] + (p < 1 ? 0 : Math.max(0, -sr.top)), way[0][4] - 1, Math.max(E[1], C0[1] + Math.abs(E[0] - C0[0]) * 1.4)) : E[1];
    const k = C0[0].toFixed(1) + "," + C0[1].toFixed(1) + "," + jy.toFixed(1);
    if (k !== key) { key = k; build(C0, jy); }
    const L = ribbon.L;
    let s;
    if (p < 1) {
      // out of the city by the scroll, easing in, and at the page's own pace on the head's line as the stage lets go
      // (after that the head stays on the line and the page carries the trail under it)
      const q = clamp01((p - pB) / (1 - pB)), r = Math.min(3, Math.max(0.5, span * (1 - pB) / (lenA * Math.max(0.3, jd[1]))));
      s = lenA * ((3 - r) * q * q + (r - 2) * q * q * q);
    } else {
      const y = innerHeight * HEAD - sr.top, pts = ribbon.pts, n = pts.length - 1;
      if (y <= pts[iB].y) s = lenA;
      else if (y >= pts[n].y) s = L;
      else {
        let lo = iB, hi = n;
        while (hi - lo > 1) { const k = (lo + hi) >> 1; if (pts[k].y < y) lo = k; else hi = k; }
        const a = pts[lo], b = pts[hi];
        s = a.s + (b.s - a.s) * ((y - a.y) / ((b.y - a.y) || 1));
      }
    }
    // the flare opens up as the trail leaves the city
    ribbon.headK = 0.5 + 0.5 * smooth(0, 160, s);
    ribbon.draw(s / L);
  }

  return { layout, tick };
}
