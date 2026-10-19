// The tour's marks (sketch only, Liav 19.10: the places looked "FLAT מדי"). Each place gets a ring of light lying on
// the ground in the picture's own perspective (the half behind the place dim and thin, the half before it bright), a
// second ring turning inside it, a spark running round, a soft beam rising from the ground, and a leader line out to
// the place's words on the frosted side. Everything here is in stage pixels; lab-hero.js says where and how much.
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
  const M = [];
  for (let i = 0; i < n; i++) {
    const g = add("g", { class: "mk" }, svg);
    const glow = add("ellipse", { class: "mk-glow", fill: "url(#mk-glow)" }, g);
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
      g, glow, back, inner, frontW, front, sparkWrap, motion,
      lead: add("path", { class: "mk-lead", pathLength: "1" }, svg),
      dot: add("circle", { class: "mk-dot", r: "3.5" }, svg),
      beam: beams.appendChild(document.createElement("i")),
      c: {},
    });
  }

  // s: x, y (the ring's centre), rx, ry, rot (deg), o (opacity), d (drawn in, 0..1), beam (0..1), lead (points or
  // null), leadK (drawn in, 0..1)
  function draw(i, s) {
    const m = M[i], vis = s.o > 0.004;
    put(m, "vis", vis, (v) => {
      const d = v ? "" : "none";
      m.g.style.display = d;
      if (!v) { m.lead.style.display = "none"; m.dot.style.display = "none"; m.beam.style.display = "none"; m.c.lv = false; m.c.bv = false; }
    });
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
  return { draw };
}
