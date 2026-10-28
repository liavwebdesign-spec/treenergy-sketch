// The energy trail (v5, 28.10; Liav: "still too flat and static... not the three-dimensional, realistic trail I have in
// mind... too busy, it can be refined... the trail itself is heavy"). One ribbon of light instead of the fifteen lines,
// the dust and the sparks of v4: a band that turns slowly around its own length (wide where it shows its face, one
// bright line where it turns its edge, its rims lit like glass), drifts towards the visitor and away, carries packets of
// current to the head, and ends in a small hot bead with a lens streak. The shaders below say how.
// It all happens on the graphics card: a ribbon's shape is sent once when its path is set, and a frame only moves a few
// numbers (where it is on the screen, the time, how far the head has come), so scrolling costs almost nothing.
// One instance per stretch of the page (the tour's exit, the reasons, the process, the projects and the voices, the
// articles, the close). An instance keeps its geometry in the frame of its own <svg> (left empty, it only gives the
// frame), and every instance is painted by one fixed canvas under the page's words: one canvas, one frame loop.
// Without WebGL a plain 2D canvas draws the same path as a soft line, with a small glow for the head.
let uid = 0;

const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const rmq = typeof matchMedia === "function" ? matchMedia("(prefers-reduced-motion: reduce)") : null;
const still = () => (typeof window !== "undefined" && !!window.__still) || (!!rmq && rmq.matches);
const val = (v) => (typeof v === "function" ? v() : v);
const TAU = 2 * Math.PI;

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

/* ---------- the shaders ---------- */
// The trail is a band of light, a ribbon a few pixels wide, that turns slowly around its own length as it goes, the
// way a silk ribbon does when it falls: where it shows its face it is wide, shaded by the light from the upper left and
// catching a sheen as it turns towards it; where it turns its edge to the eye it closes into one bright line. Its two
// edges are lit like the rim of glass (the one nearer the eye brighter), so the turns read as depth. It drifts towards
// the visitor and away in a long slow swell (wider and brighter when near), packets of current run along it to the head,
// and the night air around it glows faintly. The strip on the card is as wide as that glow; every pixel knows how far it
// is from the middle (vD) and how far along (vS), and works out the light from those.
// Everything that moves with time is worked out per point in the vertex shader (the two shaders share no uniforms, so
// they never have to agree on precision); between points, 7px apart, it is smooth enough to be carried over as is.
const VS_TUBE = `
attribute vec2 aP; attribute vec2 aN; attribute vec4 aA;   // aA: s, side, taper, swayK
uniform vec2 uOff, uRes; uniform float uT, uS0, uHW, uSwA, uSwW, uZW, uTw, uPL; uniform vec4 uPh;
varying float vS, vD, vZ, vT, vL, vR, vPu; varying vec2 vTw;
void main(){
  float s = aA.x, ss = s + uS0;
  // the thread swims from side to side in two slow waves running towards the head (the projects, the voices)
  float sw = uSwA * aA.w * (0.66 * sin(6.28318 * (s - 34.0 * uT) / uSwW + uPh.z) + 0.34 * sin(6.28318 * (s - 15.0 * uT) / (uSwW * 0.47) + uPh.w));
  // depth: the band drifts towards the eye and away in a long wave that travels with the current
  float z = 0.62 * sin(6.28318 * (ss - 38.0 * uT) / uZW + uPh.x) + 0.38 * sin(6.28318 * (ss + 21.0 * uT) / (uZW * 0.41) + uPh.y);
  float hw = uHW * (1.0 + 0.28 * z);
  vec2 p = aP + aN * (sw + aA.y * hw) + uOff;
  gl_Position = vec4(p.x / uRes.x * 2.0 - 1.0, 1.0 - p.y / uRes.y * 2.0, 0.0, 1.0);
  // vR: how far this side of the strip reaches (less on the inside of a tight turn), so the glow fades out before it
  vS = s; vD = aA.y * hw; vZ = z; vT = aA.z; vR = abs(aA.y) * hw;
  // how the band has turned here: the turns run slowly towards the head
  float th = 6.28318 * (ss - 46.0 * uT) / uTw + uPh.x + uPh.w;
  vTw = vec2(cos(th), sin(th));
  // a packet of current every so often, running to the head
  float u = fract((ss - 230.0 * uT) / uPL), q = (u - 0.5) * uPL / 65.0;
  vPu = exp(-q * q);
  // how much the path's side faces the light (from the upper left of the screen)
  vL = dot(aN, vec2(-0.47, -0.88));
}`;
const FS_TUBE = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform float uHs, uW, uHR, uDim, uHot;
uniform vec4 uGap;
varying float vS, vD, vZ, vT, vL, vR, vPu; varying vec2 vTw;
void main(){
  float s = vS;
  if (s > uHs) discard;
  if ((s > uGap.x && s < uGap.y) || (s > uGap.z && s < uGap.w)) discard;
  float ds = uHs - s, z = vZ, d = abs(vD);
  float persp = 1.0 + 0.28 * z;
  // the band's half width: nearer is wider, and it narrows to a point at the head and where it is born
  float w = uW * persp * (0.25 + 0.75 * vT) * (0.15 + 0.85 * smoothstep(0.0, 150.0, ds));
  vec2 tw = normalize(vTw); float c = tw.x, sn = tw.y;
  float e = w * c, hb = abs(e);
  // crisp when far, a touch soft when near, like a lens focused just behind it
  float soft = 0.7 + 0.8 * max(z, 0.0);
  // the two edges, lit like the rim of glass; the one nearer the eye brighter (squared by hand: pow() of a negative
  // number is undefined in GLSL, and some phone GPUs return NaN for it)
  float r1 = (vD - e) / soft, r2 = (vD + e) / soft;
  float rim = exp(-r1 * r1) * (0.6 + 0.4 * sn) + exp(-r2 * r2) * (0.6 - 0.4 * sn);
  // the face: thin light seen at a slant gathers (brighter edge on), shaded by how it faces the light, with a sheen
  float inside = 1.0 - smoothstep(hb - soft * 0.5, hb + soft, d);
  float dens = min(1.9, 0.3 / max(abs(c), 0.15));
  vec2 nrm = vec2(-sn, c), Ld = normalize(vec2(vL * 0.8, 0.62));
  float lam = abs(dot(nrm, Ld));
  float spec = pow(abs(dot(nrm, normalize(Ld + vec2(0.0, 1.0)))), 26.0);
  vec3 green = vec3(0.188, 0.969, 0.482), deep = vec3(0.02, 0.30, 0.36), mint = vec3(0.74, 1.0, 0.87), white = vec3(0.97, 1.0, 0.98);
  vec3 col = mix(deep, green, 0.3 + 0.7 * lam) * dens * 0.5 * inside + mint * rim * 0.85 + white * spec * inside * 0.55;
  // the glow in the night air around it, tight and green, then wide and faint; gone at the strip's edge
  float o = max(d - hb, 0.0), hr = uHR * persp;
  col += green * (exp(-o / hr) * 0.26 + exp(-o / (hr * 2.8)) * 0.09) * (1.0 - smoothstep(vR * 0.6, vR, d));
  float I = (0.8 + 0.24 * z) * (1.0 + uHot * exp(-ds / 160.0)) * (1.0 + 0.8 * vPu) * (0.3 + 0.7 * vT) * uDim * smoothstep(0.0, 3.0, ds);
  col = min(col * I, 1.0);
  gl_FragColor = vec4(col, max(col.r, max(col.g, col.b)));
}`;
// the head: a small hot bead, its glow, and a faint horizontal streak like light caught in a lens
const VS_HEAD = `
attribute vec2 aQ;
uniform vec2 uC, uRes; uniform float uRad;
varying vec2 vQ;
void main(){ vQ = aQ; vec2 p = uC + aQ * uRad * vec2(2.6, 1.0);
  gl_Position = vec4(p.x / uRes.x * 2.0 - 1.0, 1.0 - p.y / uRes.y * 2.0, 0.0, 1.0); }`;
const FS_HEAD = `
precision mediump float;
uniform float uI;
varying vec2 vQ;
void main(){
  vec2 q = vQ * vec2(2.6, 1.0); float d = length(q);   // in head radii
  float core = exp(-pow(d / 0.11, 2.0));
  float glow = exp(-d / 0.3) * 0.5 + exp(-d / 0.75) * 0.12;
  float streak = exp(-abs(q.y) / 0.035) * exp(-abs(q.x) / 0.9) * 0.22;
  float edge = smoothstep(1.0, 0.7, max(abs(vQ.x), abs(vQ.y)));
  vec3 c = min((vec3(0.96, 1.0, 0.975) * core + vec3(0.19, 0.97, 0.48) * glow + vec3(0.6, 1.0, 0.8) * streak) * uI * edge, 1.0);
  gl_FragColor = vec4(c, max(c.r, max(c.g, c.b)));
}`;

/* ---------- the painter: one fixed canvas for every trail on the page ---------- */
const P = { set: new Set(), cv: null, gl: null, ctx: null, dpr: 1, W: 0, H: 0, aw: 0, ah: 0, dirty: true, t0: 0, blank: true, sy: null };

function compile(gl, vs, fs) {
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
  const p = gl.createProgram();
  gl.attachShader(p, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
  const loc = { p };
  const na = gl.getProgramParameter(p, gl.ACTIVE_ATTRIBUTES), nu = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < na; i++) { const a = gl.getActiveAttrib(p, i); loc[a.name] = gl.getAttribLocation(p, a.name); }
  for (let i = 0; i < nu; i++) { const u = gl.getActiveUniform(p, i); loc[u.name] = gl.getUniformLocation(p, u.name); }
  return loc;
}
// the programs and the head's quad; again after the card drops the context and gives it back
function glSetup() {
  const gl = P.gl;
  P.tube = compile(gl, VS_TUBE, FS_TUBE);
  P.head = compile(gl, VS_HEAD, FS_HEAD);
  P.quad = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, P.quad);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  gl.enable(gl.BLEND);
  // light meets light by its brighter value, so where a bend folds the strip on itself it is not lit twice
  const mm = gl.getExtension("EXT_blend_minmax");
  if (mm) gl.blendEquation(mm.MAX_EXT); else gl.blendFunc(gl.ONE, gl.ONE);
  gl.clearColor(0, 0, 0, 0);
  for (const r of P.set) { r.buf = null; r.fresh = true; }
}

function painter() {
  if (P.cv) return;
  const make = () => {
    const cv = document.createElement("canvas");
    cv.className = "trails"; cv.setAttribute("aria-hidden", "true");
    return cv;
  };
  let cv = P.cv = make();
  const sky = document.getElementById("sky");
  if (sky && sky.parentNode) sky.parentNode.insertBefore(cv, sky.nextSibling); else document.body.prepend(cv);
  try {
    P.gl = cv.getContext("webgl", { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false, preserveDrawingBuffer: false });
    if (P.gl) glSetup();
  } catch (e) { P.gl = null; }
  if (P.gl) {
    cv.addEventListener("webglcontextlost", (e) => { e.preventDefault(); P.lost = true; });
    cv.addEventListener("webglcontextrestored", () => { P.lost = false; glSetup(); P.dirty = true; });
  } else {
    // a canvas that has given out a WebGL context cannot give a 2D one: a fresh canvas for the plain line
    const c2 = make(); cv.replaceWith(c2); cv = P.cv = c2;
    P.ctx = cv.getContext("2d");
  }
  // A phone's address bar makes the screen a little taller or shorter as the visitor scrolls (round 8, for speed): the
  // canvas is kept as tall as the tallest screen yet at this width, hanging from the top with the spare foot off the
  // screen, so it is only made anew when the width changes or the screen grows past it, not on every turn of the scroll
  const size = () => {
    const w = innerWidth, h = innerHeight, dpr = Math.min(window.devicePixelRatio || 1, w < 768 ? 2 : 1.75);
    P.W = w; P.H = h; P.dirty = true;
    if (w !== P.aw || dpr !== P.dpr) P.ah = 0;
    else if (h <= P.ah) return;
    P.aw = w; P.dpr = dpr; P.ah = Math.max(h, P.ah);
    cv.width = Math.round(w * dpr); cv.height = Math.round(P.ah * dpr); cv.style.height = P.ah + "px";
  };
  size(); addEventListener("resize", size);
  P.t0 = performance.now();
  const loop = (now) => { requestAnimationFrame(loop); paint(now); };
  requestAnimationFrame(loop);
}

function paint(now) {
  if (P.lost || !(P.gl || P.ctx)) return;
  const moving = !still();
  // at rest (stop motion), only paint when something changed: a trail, or where the page is
  // the scroll from Lenis when it drives the page (a number it keeps, no layout read)
  const sy = window.__lenis ? window.__lenis.animatedScroll : scrollY;
  if (sy !== P.sy) { P.sy = sy; P.dirty = true; }
  if (!moving && !P.dirty) return;
  P.dirty = false;
  const t = moving ? (now - P.t0) / 1000 : 0;
  // read every frame first, then paint (no layout read between draws)
  const on = [];
  for (const r of P.set) {
    if (!r.pts || r.p <= 0.002) continue;
    const b = r.svg.getBoundingClientRect();
    if (!b.width && !b.height) continue;
    if (b.left + r.bx1 < 0 || b.left + r.bx0 > P.W || b.top + r.by1 < 0 || b.top + r.by0 > P.H) continue;
    on.push([r, b.left, b.top]);
  }
  const gl = P.gl, ctx = P.ctx;
  if (!on.length) {
    if (!P.blank) { if (gl) { gl.viewport(0, 0, P.cv.width, P.cv.height); gl.clear(gl.COLOR_BUFFER_BIT); } else { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, P.cv.width, P.cv.height); } P.blank = true; }
    return;
  }
  if (gl) {
    gl.viewport(0, 0, P.cv.width, P.cv.height);
    gl.clear(gl.COLOR_BUFFER_BIT);
    const T = P.tube; gl.useProgram(T.p);
    gl.uniform2f(T.uRes, P.W, P.ah); gl.uniform1f(T.uT, t);
    gl.enableVertexAttribArray(T.aP); gl.enableVertexAttribArray(T.aN); gl.enableVertexAttribArray(T.aA);
    for (const [r, ox, oy] of on) r.drawTube(gl, T, ox, oy, t);
    gl.disableVertexAttribArray(T.aN); gl.disableVertexAttribArray(T.aA);
    const H = P.head; gl.useProgram(H.p);
    gl.uniform2f(H.uRes, P.W, P.ah);
    gl.bindBuffer(gl.ARRAY_BUFFER, P.quad); gl.enableVertexAttribArray(H.aQ); gl.vertexAttribPointer(H.aQ, 2, gl.FLOAT, false, 0, 0);
    for (const [r, ox, oy] of on) r.drawHead(gl, H, ox, oy, t);
  } else {
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, P.cv.width, P.cv.height);
    ctx.setTransform(P.dpr, 0, 0, P.dpr, 0, 0); ctx.globalCompositeOperation = "lighter"; ctx.lineCap = "round"; ctx.lineJoin = "round";
    for (const [r, ox, oy] of on) r.draw2d(ctx, ox, oy, t);
    ctx.globalCompositeOperation = "source-over";
  }
  P.blank = false;
}

export class Ribbon {
  // opt: amp (px, or a function: how bold the trail is, the tube's radius and glow follow it), wave (px: the length the
  // winding, the swell and the packets of current are measured in), pinches (fractions 0..1 where the trail narrows:
  // energy passing a node), taperStart / taperEnd (px), seed, anchor ("end": the waves are counted back from the last
  // point, so a trail that starts where this one ends, with the same seed, carries the current on), dim (how bright,
  // 0..1: the stretches through the projects, the voices and the articles are a faint thread), sway (px, or a function:
  // the whole thread swims from side to side in slow waves that travel towards the head; Liav 25.10: "יותר חי ודינמי
  // ופחות ישר ומרובע") and swayWave (px, their length). strands and sparks belonged to v4 and are ignored.
  constructor(svg, opt = {}) {
    this.svg = svg;
    this.o = Object.assign({ amp: 24, wave: 520, pinches: [], taperStart: 90, taperEnd: 0, step: 7, seed: 1, dim: 1, sway: 0, swayWave: 520 }, opt);
    this.id = ++uid;
    svg.classList.add("rb");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");
    let r = this.o.seed * 9301 + 49297;
    const rnd = () => ((r = (r * 9301 + 49297) % 233280) / 233280);
    this.ph = [rnd() * TAU, rnd() * TAU, rnd() * TAU, rnd() * TAU];
    this.pts = null; this.L = 1; this.p = -1; this.gaps = []; this.amp = 0; this.swA = 0; this.swk = null;
    this.buf = null; this.data = null; this.fresh = false;
    this.headK = 1;                              // the head's size (the tour's exit makes it small as it is born)
    this.bx0 = this.by0 = 0; this.bx1 = this.by1 = 0;
    painter(); P.set.add(this);
  }

  // pinchAt: segment indices whose start is a node (besides the fractions in o.pinches); swayK: how far each segment may
  // sway (a factor of o.sway per segment, eased from one to the next: less where the way between words is narrow)
  setPath(segs, pinchAt, swayK) {
    const o = this.o, marks = [], pts = sample(segs, o.step, marks);
    this.pts = pts; this.marks = marks; const L = this.L = pts[pts.length - 1].s || 1;
    const pinches = o.pinches.concat((pinchAt || []).filter((i) => i >= 0 && i < marks.length).map((i) => marks[i] / L));
    this.amp = val(o.amp); this.swA = val(o.sway) || 0;
    const swk = this.swk = new Float32Array(pts.length), K = (i) => (swayK && swayK[i] != null ? swayK[i] : 1);
    if (this.swA) for (let j = 0; j < pts.length; j++) {
      let k = K(0);
      for (let i = 1; i < marks.length; i++) k += (K(i) - K(i - 1)) * smooth(marks[i] - 90, marks[i] + 90, pts[j].s);
      swk[j] = k;
    }
    // the ribbon's size from the old band's width: the 28px band (desktop) is now a ribbon of about 16px at its widest,
    // the 14px one (phone) about 10px, a thread about 8px; its glow, and the strip that carries both
    this.W = 2 + this.amp * 0.22;
    this.hr = 2.5 + this.W * 0.55;
    this.hw = Math.ceil(this.W * 1.3 + this.hr * 3.4);
    // where the path turns tighter than the strip is wide, the strip's inner side would fold over itself (a bow tie at
    // the bend): there the inner side reaches only as far as the room inside the turn, the ribbon itself kept whole
    const n = pts.length, reach = this.hw * 1.28, kmin = Math.min(1, (this.W * 1.4) / reach);
    const kP = new Float32Array(n).fill(1), kM = new Float32Array(n).fill(1);   // how far each side may reach
    for (let j = 0; j < n; j++) {
      const a = pts[Math.max(0, j - 2)], b = pts[Math.min(n - 1, j + 2)];
      const cr = a.nx * b.ny - a.ny * b.nx, ang = Math.abs(Math.atan2(cr, a.nx * b.nx + a.ny * b.ny));
      if (ang < 1e-4) continue;
      const R = (b.s - a.s) / ang - this.swA * swk[j];
      (cr > 0 ? kP : kM)[j] = Math.min(1, Math.max(kmin, (0.85 * R) / reach));
    }
    // and it changes gently from point to point: a reach that jumps leaves a crease in the glow (the strip's triangles
    // then disagree on how far a pixel is from the middle). The tightest reach around (6 points each way), then the
    // average of that over 3 points each way, which never reaches further than the room at any point
    const ease = (k) => {
      const e = new Float32Array(n), out = new Float32Array(n);
      for (let j = 0; j < n; j++) { let m = 1; for (let i = Math.max(0, j - 6); i <= Math.min(n - 1, j + 6); i++) m = Math.min(m, k[i]); e[j] = m; }
      for (let j = 0; j < n; j++) { let t = 0, c = 0; for (let i = Math.max(0, j - 3); i <= Math.min(n - 1, j + 3); i++) { t += e[i]; c++; } out[j] = t / c; }
      return out;
    };
    const kp = ease(kP), km = ease(kM);
    // every point twice, one on each side of the path: x, y, normal, then s, side (how far that side reaches, -1..1),
    // taper and sway
    const d = this.data = new Float32Array(pts.length * 16);
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (let j = 0; j < pts.length; j++) {
      const q = pts[j];
      let e = (o.taperStart ? smooth(0, o.taperStart, q.s) : 1) * (o.taperEnd ? smooth(L, L - o.taperEnd, q.s) : 1);
      for (const f of pinches) e *= 1 - 0.6 * Math.exp(-Math.pow((q.s - f * L) / 90, 2));
      for (let k = 0; k < 2; k++) {
        const i = (j * 2 + k) * 8;
        d[i] = q.x; d[i + 1] = q.y; d[i + 2] = q.nx; d[i + 3] = q.ny; d[i + 4] = q.s;
        d[i + 5] = k ? kp[j] : -km[j]; d[i + 6] = e; d[i + 7] = swk[j];
      }
      if (q.x < x0) x0 = q.x; if (q.x > x1) x1 = q.x; if (q.y < y0) y0 = q.y; if (q.y > y1) y1 = q.y;
    }
    this.fresh = true;
    const m = this.hw * 1.3 + this.swA + 80 * this.headK + 10;
    this.bx0 = x0 - m; this.bx1 = x1 + m; this.by0 = y0 - m; this.by1 = y1 + m;
    P.dirty = true;
    this.draw(this.p < 0 ? 0 : this.p);
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

  // how far the thread swims off its path at point j (the same two waves as in the shader, for the head)
  sway(j, t) {
    if (!this.swA) return 0;
    const s = this.pts[j].s, w = this.o.swayWave;
    return this.swA * this.swk[j] * (0.66 * Math.sin(TAU * (s - 34 * t) / w + this.ph[2]) + 0.34 * Math.sin(TAU * (s - 15 * t) / (w * 0.47) + this.ph[3]));
  }

  drawTube(gl, T, ox, oy, t) {
    if (!this.buf) this.buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buf);
    if (this.fresh) { gl.bufferData(gl.ARRAY_BUFFER, this.data, gl.STATIC_DRAW); this.fresh = false; }
    gl.vertexAttribPointer(T.aP, 2, gl.FLOAT, false, 32, 0);
    gl.vertexAttribPointer(T.aN, 2, gl.FLOAT, false, 32, 8);
    gl.vertexAttribPointer(T.aA, 4, gl.FLOAT, false, 32, 16);
    const h = this.head(), o = this.o, w = o.wave, g = this.gaps, L = this.L;
    gl.uniform2f(T.uOff, ox, oy);
    gl.uniform1f(T.uS0, o.anchor === "end" ? -L : 0);
    gl.uniform1f(T.uHs, h.s); gl.uniform1f(T.uHW, this.hw);
    gl.uniform1f(T.uW, this.W); gl.uniform1f(T.uHR, this.hr); gl.uniform1f(T.uDim, o.dim);
    gl.uniform1f(T.uSwA, this.swA); gl.uniform1f(T.uSwW, o.swayWave);
    gl.uniform1f(T.uZW, w * 2.3); gl.uniform1f(T.uTw, w * 0.8); gl.uniform1f(T.uPL, w * 1.7);
    gl.uniform1f(T.uHot, this.p < 0.998 ? 1.1 : 0);
    gl.uniform4f(T.uPh, this.ph[0], this.ph[1], this.ph[2], this.ph[3]);
    gl.uniform4f(T.uGap, g[0] ? g[0][0] * L : -1, g[0] ? g[0][1] * L : -1, g[1] ? g[1][0] * L : -1, g[1] ? g[1][1] * L : -1);
    // only the stretch up to the head
    const n = Math.min(this.pts.length, h.j + 2);
    if (n > 1) gl.drawArrays(gl.TRIANGLE_STRIP, 0, n * 2);
  }

  drawHead(gl, H, ox, oy, t) {
    if (this.p >= 0.998 || this.p <= 0.002) return;
    const h = this.head();
    if (this.gaps.length && this.inGap(h.s)) return;
    const q = this.pts[Math.min(h.j, this.pts.length - 1)], sw = this.sway(Math.min(h.j, this.pts.length - 1), t);
    const rad = (26 + this.W * 3) * this.headK * (1 + 0.1 * Math.sin(t * 2.4));
    gl.uniform2f(H.uC, h.x + q.nx * sw + ox, h.y + q.ny * sw + oy);
    gl.uniform1f(H.uRad, rad); gl.uniform1f(H.uI, this.o.dim);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  // without WebGL: the path as a soft line up to the head, and the head as a small glow
  draw2d(ctx, ox, oy, t) {
    const pts = this.pts, h = this.head(), n = Math.min(pts.length, h.j), dim = this.o.dim;
    const hj = Math.min(h.j, pts.length - 1), hsw = this.sway(hj, t), hx = h.x + pts[hj].nx * hsw + ox, hy = h.y + pts[hj].ny * hsw + oy;
    const hidden = this.gaps.length && this.inGap(h.s);
    for (const [w, a] of [[this.W * 2.6, 0.1], [this.W * 0.9, 0.32], [Math.max(1.4, this.W * 0.32), 0.9]]) {
      ctx.beginPath();
      let pen = false;
      for (let j = 0; j < n; j++) {
        const q = pts[j], sw = this.sway(j, t);
        if (this.gaps.length && this.inGap(q.s)) { pen = false; continue; }
        const x = q.x + q.nx * sw + ox, y = q.y + q.ny * sw + oy;
        if (pen) ctx.lineTo(x, y); else { ctx.moveTo(x, y); pen = true; }
      }
      if (pen && !hidden) ctx.lineTo(hx, hy);
      ctx.strokeStyle = a > 0.5 ? `rgba(214,255,232,${a * dim})` : `rgba(48,247,123,${a * dim})`;
      ctx.lineWidth = w; ctx.stroke();
    }
    if (hidden || this.p >= 0.998 || this.p <= 0.002) return;
    const rad = (26 + this.W * 3) * this.headK, g = ctx.createRadialGradient(hx, hy, 0, hx, hy, rad);
    g.addColorStop(0, `rgba(240,255,246,${dim})`); g.addColorStop(0.08, `rgba(140,250,185,${0.6 * dim})`); g.addColorStop(0.3, `rgba(48,247,123,${0.14 * dim})`); g.addColorStop(1, "rgba(48,247,123,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(hx, hy, rad, 0, TAU); ctx.fill();
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
