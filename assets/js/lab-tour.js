// The tour's marks (sketch only, Liav 19.10: the places looked "FLAT מדי"). Each place gets a ring of light lying on
// the ground in the picture's own perspective (the half behind the place dim and thin, the half before it bright), a
// second ring turning inside it, a spark running round, a soft beam rising from the ground, and a leader line out to
// the place's words on the frosted side. When the camera lands, a ripple of light rolls out over the ground from the
// place; at the end one line hops from place to place over the whole scene (Liav 19.10: "וואו זה נראה מדהיםם!", and
// polish it further without changing it). Everything here is in stage pixels; lab-hero.js says where and how much.
// The page at rest must not keep writing to the DOM (dom-churn): the spark runs by itself (SMIL, along the ring), and
// every other value is written only when it changed.
const NS = "http://www.w3.org/2000/svg";
const SPARK_S = 9; // seconds round the ring
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const smooth = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const add = (name, attrs, parent) => {
  const e = document.createElementNS(NS, name);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  parent.appendChild(e); return e;
};
// a write that happens only when the value changed
const put = (m, key, v, write) => { if (m.c[key] !== v) { m.c[key] = v; write(v); } };

export function mountMarks(host, n) {
  const svg = host.querySelector(".lb-marks"), beams = document.createElement("div");
  beams.className = "lb-beams"; beams.setAttribute("aria-hidden", "true"); host.insertBefore(beams, svg);
  const defs = add("defs", {}, svg), rg = add("radialGradient", { id: "mk-glow" }, defs);
  add("stop", { offset: "0", "stop-color": "#30F77B", "stop-opacity": ".26" }, rg);
  add("stop", { offset: ".6", "stop-color": "#30F77B", "stop-opacity": ".07" }, rg);
  add("stop", { offset: "1", "stop-color": "#30F77B", "stop-opacity": "0" }, rg);
  // the end: one line of energy hops from place to place over the whole scene, a soft glow under a bright core
  const linkW = add("path", { class: "mk-link-w", pathLength: "1" }, svg), link = add("path", { class: "mk-link", pathLength: "1" }, svg);
  const headG = add("g", { class: "mk-head" }, svg);
  add("circle", { class: "mk-halo", r: "14" }, headG); add("circle", { class: "mk-spark", r: "3.6" }, headG);
  const L = { c: {} };
  const M = [];
  for (let i = 0; i < n; i++) {
    const g = add("g", { class: "mk" }, svg);
    const glow = add("ellipse", { class: "mk-glow", fill: "url(#mk-glow)" }, g);
    // the landing: a ring of light rolls out over the ground from the place, in the ground's own perspective
    const wave = add("ellipse", { class: "mk-wave" }, g);
    const back = add("path", { class: "mk-back", pathLength: "1" }, g);
    const inner = add("ellipse", { class: "mk-in" }, g);
    add("circle", { class: "mk-core", r: "3" }, g);
    const frontW = add("path", { class: "mk-front-w", pathLength: "1" }, g);
    const front = add("path", { class: "mk-front", pathLength: "1" }, g);
    // the spark and its halo ride the ring: the motion and the brightness (bright in front of the place, dim behind it)
    // are the browser's own animation; the path follows the ring's size
    const sparkWrap = add("g", {}, g), spark = add("g", {}, sparkWrap);
    add("circle", { class: "mk-halo", r: "9" }, spark);
    add("circle", { class: "mk-spark", r: "2.4" }, spark);
    const begin = `-${((i * 1.9) / (2 * Math.PI) * SPARK_S).toFixed(2)}s`;
    const motion = add("animateMotion", { dur: SPARK_S + "s", repeatCount: "indefinite", begin, path: "M1 0A1 1 0 1 1 -1 0A1 1 0 1 1 1 0" }, spark);
    add("animate", { attributeName: "opacity", dur: SPARK_S + "s", repeatCount: "indefinite", begin, values: ".4;1;.4;.12;.4", keyTimes: "0;.25;.5;.75;1" }, spark);
    M.push({
      g, glow, wave, back, inner, frontW, front, sparkWrap, motion,
      lead: add("path", { class: "mk-lead", pathLength: "1" }, svg),
      dot: add("circle", { class: "mk-dot", r: "3.5" }, svg),
      beam: beams.appendChild(document.createElement("i")),
      c: {},
    });
  }

  // s: x, y (the ring's centre), rx, ry, rot (deg), o (opacity), d (drawn in, 0..1), beam (0..1, over 1 as it
  // surges), wave (the landing's ripple, 0..1 on its way out, else none), lead (points or null), leadK (drawn in, 0..1)
  function draw(i, s) {
    const m = M[i], vis = s.o > 0.004;
    put(m, "vis", vis, (v) => {
      const d = v ? "" : "none";
      m.g.style.display = d;
      if (!v) { m.lead.style.display = "none"; m.dot.style.display = "none"; m.beam.style.display = "none"; m.c.lv = false; m.c.bv = false; }
    });
    const wOn = vis && s.wave > 0 && s.wave < 1;
    put(m, "wv", wOn, (v) => { m.wave.style.display = v ? "" : "none"; });
    if (wOn) {
      const w = s.wave, grow = 1 + 1.7 * (1 - Math.pow(1 - w, 2.2));
      put(m, "wr", (s.rx * grow).toFixed(1) + " " + (s.ry * grow).toFixed(1), (v) => { const [a, b] = v.split(" "); m.wave.setAttribute("rx", a); m.wave.setAttribute("ry", b); });
      put(m, "wo", (Math.pow(1 - w, 1.6) * 0.95).toFixed(3), (v) => { m.wave.style.opacity = v; });
      put(m, "ww", (1 + 5 * w).toFixed(2), (v) => { m.wave.style.strokeWidth = v; });
    }
    if (!vis) return;
    const rx = Math.max(4, s.rx), ry = Math.max(2, s.ry);
    put(m, "size", rx.toFixed(1) + " " + ry.toFixed(1), (size) => {
      // the half behind the place (over the top) and the half before it, both from the end nearest the start
      m.back.setAttribute("d", `M${-rx} 0A${size} 0 0 1 ${rx} 0`);
      const fr = `M${-rx} 0A${size} 0 0 0 ${rx} 0`;
      m.front.setAttribute("d", fr); m.frontW.setAttribute("d", fr);
      m.glow.setAttribute("rx", (rx * 1.08).toFixed(1)); m.glow.setAttribute("ry", (ry * 1.08).toFixed(1));
      m.inner.setAttribute("rx", (rx * 0.62).toFixed(1)); m.inner.setAttribute("ry", (ry * 0.62).toFixed(1));
      m.motion.setAttribute("path", `M${rx} 0A${size} 0 1 1 ${-rx} 0A${size} 0 1 1 ${rx} 0`);
    });
    // the place moves on the screen only with the camera; a still camera writes nothing
    const lx = m.c.x, ly = m.c.y;
    if (lx === undefined || Math.abs(s.x - lx) > 0.3 || Math.abs(s.y - ly) > 0.3 || m.c.rot !== s.rot) {
      m.c.x = s.x; m.c.y = s.y; m.c.rot = s.rot;
      m.g.setAttribute("transform", `translate(${s.x.toFixed(1)} ${s.y.toFixed(1)}) rotate(${s.rot})`);
    }
    put(m, "o", s.o.toFixed(3), (v) => { m.g.style.opacity = v; });
    put(m, "off", (1 - s.d).toFixed(4), (off) => { m.back.style.strokeDashoffset = off; m.front.style.strokeDashoffset = off; m.frontW.style.strokeDashoffset = off; });
    put(m, "sp", s.d.toFixed(3), (v) => { m.sparkWrap.style.opacity = v; });
    // the beam rises from the ground at the place
    const bOn = s.beam > 0.005;
    put(m, "bv", bOn, (v) => { m.beam.style.display = v ? "" : "none"; });
    if (bOn) {
      const bw = Math.min(90, Math.max(26, rx * 0.42)), bh = Math.min(300, Math.max(90, ry * 4));
      put(m, "bs", bw.toFixed(0) + "|" + bh.toFixed(0), () => { m.beam.style.width = bw.toFixed(0) + "px"; m.beam.style.height = bh.toFixed(0) + "px"; });
      put(m, "bt", `translate(${(s.x - bw / 2).toFixed(1)}px,${(s.y - bh).toFixed(1)}px) scaleY(${(0.3 + 0.7 * s.beam).toFixed(3)})`, (v) => { m.beam.style.transform = v; });
      put(m, "bo", (s.beam * s.o).toFixed(3), (v) => { m.beam.style.opacity = v; });
    }
    // the leader line out to the words, a dot where it meets them
    const lOn = !!(s.lead && s.leadK > 0.005);
    put(m, "lv", lOn, (v) => { const d = v ? "" : "none"; m.lead.style.display = d; m.dot.style.display = d; });
    if (lOn) {
      const P = s.lead, e = P[P.length - 1];
      put(m, "ld", "M" + P.map((p) => p[0].toFixed(1) + " " + p[1].toFixed(1)).join("L"), (v) => {
        m.lead.setAttribute("d", v); m.dot.setAttribute("cx", e[0].toFixed(1)); m.dot.setAttribute("cy", e[1].toFixed(1));
      });
      put(m, "lk", (1 - s.leadK).toFixed(4), (v) => { m.lead.style.strokeDashoffset = v; });
      put(m, "lo", s.o.toFixed(3), (v) => { m.lead.style.opacity = v; });
      put(m, "do", (smooth(0.85, 1, s.leadK) * s.o).toFixed(3), (v) => { m.dot.style.opacity = v; });
    }
  }

  // the end's line through the places (P: their centres in order), arcing up between each two like a jump of energy,
  // drawn in up to k (0..1)
  function hop(P, k, o) {
    const on = !!P && k > 0.002 && o > 0.004;
    put(L, "v", on, (v) => { const d = v ? "" : "none"; link.style.display = d; linkW.style.display = d; if (!v) { headG.style.display = "none"; L.c.hv = false; } });
    if (!on) return;
    let d = `M${P[0][0].toFixed(1)} ${P[0][1].toFixed(1)}`;
    for (let i = 1; i < P.length; i++) {
      const a = P[i - 1], b = P[i], up = Math.hypot(b[0] - a[0], b[1] - a[1]) * 0.24;
      d += `Q${((a[0] + b[0]) / 2).toFixed(1)} ${((a[1] + b[1]) / 2 - up).toFixed(1)} ${b[0].toFixed(1)} ${b[1].toFixed(1)}`;
    }
    put(L, "d", d, (v) => { link.setAttribute("d", v); linkW.setAttribute("d", v); L.len = link.getTotalLength(); });
    put(L, "k", (1 - k).toFixed(4), (v) => { link.style.strokeDashoffset = v; linkW.style.strokeDashoffset = v; });
    put(L, "o", o.toFixed(3), (v) => { link.style.opacity = v; linkW.style.opacity = v; });
    // a head of light runs at the front of the line while it is on its way
    const hv = k < 0.999;
    put(L, "hv", hv, (v) => { headG.style.display = v ? "" : "none"; });
    if (hv) {
      put(L, "h", d + "|" + k.toFixed(4), () => { const pt = link.getPointAtLength(L.len * k); headG.setAttribute("transform", `translate(${pt.x.toFixed(1)} ${pt.y.toFixed(1)})`); });
      put(L, "ho", o.toFixed(3), (v) => { headG.style.opacity = v; });
    }
  }
  return { draw, hop };
}
