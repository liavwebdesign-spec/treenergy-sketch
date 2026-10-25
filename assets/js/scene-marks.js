// The tour's marks (sketch only). Round 6 (the client 25.10: "בלי העיגול מסביב למוקד", "יותר מדי רעש"): no ring on the
// ground, no beam, no ripple and no spark any more. A place the camera stands at has a small point of light on it and a
// thin leader line from that point out to its words, a dot where it meets them. Everything here is in stage pixels;
// scene.js says where and how much.
// The page at rest must not keep writing to the DOM (dom-churn): every value is written only when it changed.
const NS = "http://www.w3.org/2000/svg";
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
  const svg = host.querySelector(".lb-marks");
  const M = [];
  for (let i = 0; i < n; i++) {
    M.push({
      lead: add("path", { class: "mk-lead", pathLength: "1" }, svg),
      core: add("circle", { class: "mk-core", r: "3" }, svg),
      dot: add("circle", { class: "mk-dot", r: "3" }, svg),
      c: {},
    });
  }

  // s: x, y (the place), o (opacity), lead (points or null), leadK (drawn in, 0..1)
  function draw(i, s) {
    const m = M[i], vis = s.o > 0.004;
    put(m, "vis", vis, (v) => { m.core.style.display = v ? "" : "none"; if (!v) { m.lead.style.display = "none"; m.dot.style.display = "none"; m.c.lv = false; } });
    if (!vis) return;
    // the place moves on the screen only with the camera; a still camera writes nothing
    const lx = m.c.x, ly = m.c.y;
    if (lx === undefined || Math.abs(s.x - lx) > 0.3 || Math.abs(s.y - ly) > 0.3) {
      m.c.x = s.x; m.c.y = s.y;
      m.core.setAttribute("cx", s.x.toFixed(1)); m.core.setAttribute("cy", s.y.toFixed(1));
    }
    put(m, "o", s.o.toFixed(3), (v) => { m.core.style.opacity = v; });
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
