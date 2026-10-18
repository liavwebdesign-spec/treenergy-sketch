// The hero experiment (sketch only, Liav 18.10: "a separate page that recreates the reference as closely as possible").
// Daniel's picture, made again twice: the network on and the network off, the same pixels otherwise. The scene lives
// on them: the network lights up from the city outward and energy keeps running along its lines, the city lights and
// the stars breathe, the sunrise pulses, the clouds roil, and the land has depth under the pointer. The default dives
// into it from the night Earth of the site (?v=scene opens straight on it).

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };

const root = document.documentElement;
const dive = root.dataset.v !== "scene";
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const fine = matchMedia("(hover:hover) and (pointer:fine)").matches;
const sec = $(".lb"), stage = $(".lb-stage"), cv = $(".lb-scene"), h1 = $(".lb-h"), pinsEl = $(".lb-pins"), cue = $(".lb-cue");

// the two pictures and their places (image fractions, y down): the city is where the energy starts, the solar farm,
// the network's high node and the data center carry the other cards
const ZMAX = 2.6; // how close the camera lands before it pulls back over the whole scene
const SETS = {
  wide: { on: "assets/img/lab/wide-on.webp", off: "assets/img/lab/wide-off.webp", w: 2752, h: 1536, base: [0.5, 0.52],
    src: [0.47, 0.555], horizon: 0.21, sun: [0.6, 0.213],
    pins: { sol: [0.156, 0.57], sto: [0.512, 0.336], chg: [0.47, 0.555], srv: [0.884, 0.69] } },
  tall: { on: "assets/img/lab/tall-on.webp", off: "assets/img/lab/tall-off.webp", w: 1536, h: 2752, base: [0.5, 0.5],
    src: [0.55, 0.575], horizon: 0.255, sun: [0.826, 0.263],
    pins: { sol: [0.1, 0.585], sto: [0.63, 0.367], chg: [0.55, 0.575], srv: [0.7, 0.487] } },
};

const VS = `#version 300 es
in vec2 p; out vec2 vUv;
void main(){ vUv = vec2(p.x * .5 + .5, .5 - p.y * .5); gl_Position = vec4(p, 0., 1.); }`;

const FS = `#version 300 es
precision highp float;
in vec2 vUv; out vec4 o;
uniform sampler2D tOn, tOff;
uniform vec2 uRes, uImg, uCenter, uPar, uSrc, uSun;
uniform float uZoom, uReveal, uTime, uAlpha, uHorizon, uStill;
float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y); }
float fbm(vec2 p){ float a = .5, s = 0.; for (int i = 0; i < 4; i++){ s += a * noise(p); p *= 2.03; a *= .5; } return s; }
float lum(vec3 c){ return dot(c, vec3(.2126, .7152, .0722)); }
float greenness(vec3 c){ return c.g - max(c.r, c.b); }
void main(){
  // cover, around the centre the camera looks at
  float sa = uRes.x / uRes.y, ia = uImg.x / uImg.y;
  vec2 s = sa > ia ? vec2(1., ia / sa) : vec2(sa / ia, 1.);
  s /= uZoom;
  vec2 c = clamp(uCenter, s * .5, 1. - s * .5);
  vec2 uv = c + (vUv - .5) * s;
  // depth: the sky far, the land nearer the lower it lies
  float d = smoothstep(uHorizon - .04, 1., uv.y);
  uv += uPar * (.004 + d * .012) / uZoom;
  // the clouds roil: low-saturation, light pixels drift a little in a slow field
  vec3 probe = texture(tOff, uv).rgb;
  float sat = max(probe.r, max(probe.g, probe.b)) - min(probe.r, min(probe.g, probe.b));
  float cloud = smoothstep(.22, .45, lum(probe)) * (1. - smoothstep(.06, .16, sat)) * step(uHorizon, uv.y) * (1. - uStill);
  vec2 flow = vec2(fbm(uv * 6. + uTime * .05), fbm(uv * 6. - uTime * .04 + 7.)) - .5;
  uv += flow * cloud * .006;
  uv = clamp(uv, vec2(.0005), vec2(.9995));

  vec3 on = texture(tOn, uv).rgb, off = texture(tOff, uv).rgb;
  // the network's own pixels: what the lit picture has and the dark one has not
  // (only where the lit picture is really bright and green: the dark sky's compression noise stays out)
  float m = clamp((greenness(on) - greenness(off)) * 5. + (lum(on) - lum(off)) * 2., 0., 1.)
    * smoothstep(.16, .34, lum(on)) * smoothstep(.04, .12, greenness(on)) * step(uHorizon - .02, uv.y);
  // the light spreads from the city: a soft front, the picture turning on behind it
  vec2 dd = (uv - uSrc) * vec2(ia, 1.);
  float r = length(dd), R = uReveal * 1.9;
  float lit = 1. - smoothstep(R - .1, R, r);
  vec3 col = mix(off, on, lit);
  vec3 G = vec3(.19, .97, .48);
  // the front itself, bright where it crosses a line
  float front = exp(-pow((r - R) / .028, 2.)) * step(uReveal, .999);
  col += G * m * front * 1.8;
  // energy keeps running out of the city along the lines, and the lines breathe
  float pulse = pow(.5 + .5 * sin(r * 46. - uTime * 2.4), 14.) * (1. - uStill);
  col += G * m * lit * (pulse * .9 + .12 * sin(uTime * 1.3 + r * 4.) * (1. - uStill));
  // the city lights flicker, the stars twinkle (each on its own cell)
  vec2 cell = floor(uv * uImg / 3.);
  float tw = hash(cell);
  float warm = smoothstep(.45, .75, on.r) * smoothstep(.05, .2, on.r - on.b) * step(uHorizon, uv.y);
  col *= 1. + warm * .14 * sin(uTime * (1.5 + tw * 3.) + tw * 40.) * (1. - uStill);
  // a star is a point brighter than the sky around it (the sunrise and the air are not stars)
  vec2 px = 5. / uImg;
  float around = (lum(texture(tOff, uv + vec2(px.x, 0.)).rgb) + lum(texture(tOff, uv - vec2(px.x, 0.)).rgb)
    + lum(texture(tOff, uv + vec2(0., px.y)).rgb) + lum(texture(tOff, uv - vec2(0., px.y)).rgb)) * .25;
  float star = smoothstep(.12, .3, lum(off) - around) * (1. - step(uHorizon - .03, uv.y));
  col += star * .35 * sin(uTime * (1. + tw * 2.5) + tw * 60.) * (1. - uStill);
  // the sunrise breathes, and a thin streak runs along the horizon from it
  vec2 sv = (uv - uSun) * vec2(ia, 1.);
  float sunG = exp(-dot(sv, sv) * 260.) * (.22 + .1 * sin(uTime * .7));
  float streak = exp(-abs(sv.y) * 260.) * exp(-abs(sv.x) * 3.2) * .18;
  col += vec3(1., .82, .58) * (sunG + streak);
  // the edges sink into the page's night: a vignette, and the foot melts into it
  vec2 q = vUv - .5;
  col *= 1. - dot(q, q) * .55;
  vec3 night = vec3(0., 11., 38.) / 255.;
  col = mix(col, night, smoothstep(.86, 1., vUv.y) * .92);
  o = vec4(col * uAlpha, uAlpha);
}`;

function setupGL() {
  const gl = cv.getContext("webgl2", { premultipliedAlpha: true, alpha: true, antialias: false });
  if (!gl) return null;
  const sh = (t, src) => { const s = gl.createShader(t); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
  const pr = gl.createProgram();
  gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(pr);
  if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(pr));
  gl.useProgram(pr);
  const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(pr, "p"); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const U = {}; for (const n of ["tOn", "tOff", "uRes", "uImg", "uCenter", "uPar", "uSrc", "uSun", "uZoom", "uReveal", "uTime", "uAlpha", "uHorizon", "uStill"]) U[n] = gl.getUniformLocation(pr, n);
  gl.uniform1i(U.tOn, 0); gl.uniform1i(U.tOff, 1);
  return { gl, U };
}

function loadImg(src) { return new Promise((res, rej) => { const i = new Image(); i.decoding = "async"; i.onload = () => res(i); i.onerror = rej; i.src = src; }); }

function texture(gl, unit, img) {
  const t = gl.createTexture(); gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, t);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
  gl.generateMipmap(gl.TEXTURE_2D);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return t;
}

let W = 1, H = 1, dpr = 1, set = null, ctx = null, globe = null;
const pins = $$(".lb-pin").map((el) => ({ el, k: el.dataset.k, card: $(".lb-card", el) }));

// the camera over the picture: how much of it shows and around which point
function view(zoom, center) {
  const sa = W / H, ia = set.w / set.h;
  let sx = sa > ia ? 1 : sa / ia, sy = sa > ia ? ia / sa : 1; sx /= zoom; sy /= zoom;
  const cx = Math.min(1 - sx / 2, Math.max(sx / 2, center[0])), cy = Math.min(1 - sy / 2, Math.max(sy / 2, center[1]));
  return { sx, sy, cx, cy };
}
const toScreen = (v, u) => [((u[0] - v.cx) / v.sx + 0.5) * W, ((u[1] - v.cy) / v.sy + 0.5) * H];
// the centre that puts image point u on screen point (x, y) at this zoom
function centerFor(zoom, u, x, y) {
  const v = view(zoom, [0.5, 0.5]);
  return [u[0] - (x / W - 0.5) * v.sx, u[1] - (y / H - 0.5) * v.sy];
}

function resize() {
  W = stage.clientWidth; H = stage.clientHeight; dpr = Math.min(devicePixelRatio || 1, 2);
  const next = W / H < 0.9 ? SETS.tall : SETS.wide;
  if (next !== set && ctx) { set = next; loadSet(); } else set = next;
  cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
  if (ctx) ctx.gl.viewport(0, 0, cv.width, cv.height);
  if (globe) globe.resize();
}

async function loadSet() {
  const s = set;
  const [on, off] = await Promise.all([loadImg(s.on), loadImg(s.off)]);
  if (s !== set) return;
  const { gl } = ctx;
  texture(gl, 0, on); texture(gl, 1, off);
  s.ready = true; $(".lb-still").src = s.on;
}

// ---- the scroll, eased: the stage reads a progress that follows the page smoothly ----
let target = 0, prog = 0;
function readScroll() {
  const r = sec.getBoundingClientRect(), span = r.height - innerHeight;
  target = span > 0 ? clamp01(-r.top / span) : 0;
}
addEventListener("scroll", readScroll, { passive: true });

// the pointer gives the land its depth (fine pointers only); phones get a slow drift instead
const par = { x: 0, y: 0, tx: 0, ty: 0 };
if (fine && !reduce) addEventListener("pointermove", (e) => { par.tx = (e.clientX / innerWidth - 0.5) * -2; par.ty = (e.clientY / innerHeight - 0.5) * -2; }, { passive: true });

// ---- the cards ----
let hot = null, touched = false, cycleAt = 0, cycleI = 0;
const order = ["sol", "chg", "srv", "sto"];
function show(k) { hot = k; for (const p of pins) p.el.classList.toggle("is-on", p.k === k); }
for (const p of pins) {
  p.el.addEventListener("pointerenter", (e) => { if (e.pointerType === "mouse") { touched = true; show(p.k); } });
  p.el.addEventListener("pointerleave", (e) => { if (e.pointerType === "mouse") show(null); });
  p.el.addEventListener("focus", () => { touched = true; show(p.k); });
  p.el.addEventListener("blur", () => show(null));
  p.el.addEventListener("click", (e) => { if (!fine && hot !== p.k) { e.preventDefault(); touched = true; show(p.k); } });
}
function placePins(v, alpha) {
  pinsEl.style.setProperty("--po", alpha.toFixed(3));
  pinsEl.style.pointerEvents = alpha > 0.5 ? "" : "none";
  for (const p of pins) {
    const u = set.pins[p.k]; let [x, y] = toScreen(v, u);
    x -= par.x * (0.004 + smooth(set.horizon, 1, u[1]) * 0.012) / v.zoom / v.sx * W;
    y -= par.y * (0.004 + smooth(set.horizon, 1, u[1]) * 0.012) / v.zoom / v.sy * H;
    p.el.style.setProperty("--x", x.toFixed(1) + "px"); p.el.style.setProperty("--y", y.toFixed(1) + "px");
    // a place that has left the screen (the landing zoom) has no ring and no card
    const off = x < 0 || x > W || y < 0 || y > H;
    p.el.style.display = off ? "none" : "";
    // the card keeps inside the screen: it slides sideways on its stem, and opens under the ring when there is no room above
    if (off) continue;
    if (!p.cw) { p.cw = p.card.offsetWidth; p.ch = p.card.offsetHeight; p.gap = parseFloat(getComputedStyle(p.card).getPropertyValue("--gap")) || 54; }
    const half = p.cw / 2, pad = 14, gap = p.gap;
    const shift = Math.max(pad + half - x, Math.min(0, W - pad - half - x));
    p.card.style.setProperty("--cx", shift.toFixed(0) + "px");
    p.el.classList.toggle("is-below", y - gap - p.ch < pad + 64);
  }
}

// ---- the timeline ----
// dive: 0-.42 the Earth turns and dives to Israel, .3-.55 the scene takes over and the camera lands, .5-.78 the
// network lights up from the city, then the camera settles in. scene: the network lights by itself on arrival.
const t0 = performance.now(); let tReady = -1, lastPin = -1;
function frame(now) {
  requestAnimationFrame(frame);
  const time = (now - t0) / 1000;
  prog += (target - prog) * (reduce ? 1 : 0.1);
  par.x += (par.tx - par.x) * 0.05; par.y += (par.ty - par.y) * 0.05;
  if (!fine && !reduce) { par.x = Math.sin(time * 0.21) * 0.5; par.y = Math.cos(time * 0.17) * 0.3; }
  if (!set || !set.ready || !ctx) return;
  if (tReady < 0) tReady = time;
  const since = time - tReady;

  let alpha, zoom, reveal, globeA, titleA, pinA;
  if (dive && !reduce) {
    const land = smooth(0.3, 0.58, prog);
    alpha = smooth(0.3, 0.46, prog);
    zoom = lerp(ZMAX, 1, 1 - Math.pow(1 - land, 2.2)) * lerp(1, 1.07, smooth(0.78, 1, prog));
    reveal = smooth(0.5, 0.8, prog);
    globeA = 1 - smooth(0.34, 0.5, prog);
    titleA = (1 - smooth(0.04, 0.16, prog)) + smooth(0.74, 0.86, prog);
    pinA = smooth(0.74, 0.84, prog);
    if (globe) globe.setProgress(clamp01(prog / 0.5));
  } else {
    alpha = reduce ? 1 : smooth(0, 0.9, since);
    zoom = reduce ? 1 : lerp(1.18, 1, 1 - Math.pow(1 - smooth(0, 2.6, since), 3)) * lerp(1, 1.1, prog);
    reveal = reduce ? 1 : smooth(0.6, 3.4, since);
    globeA = 0; titleA = 1; pinA = reduce ? 1 : smooth(2.6, 3.4, since);
  }
  // where the camera looks: from the city (where the Earth's point lands) out to the whole picture
  const home = set.base, focus = set.src;
  const k = clamp01((zoom - 1) / (ZMAX - 1));
  const center = [lerp(home[0], focus[0], k), lerp(home[1], focus[1], k)];
  const v = view(zoom, center); v.zoom = zoom;

  const { gl, U } = ctx;
  gl.uniform2f(U.uRes, cv.width, cv.height); gl.uniform2f(U.uImg, set.w, set.h);
  gl.uniform2f(U.uCenter, v.cx, v.cy); gl.uniform2f(U.uPar, par.x, par.y);
  gl.uniform2f(U.uSrc, set.src[0], set.src[1]); gl.uniform2f(U.uSun, set.sun[0], set.sun[1]);
  gl.uniform1f(U.uZoom, zoom); gl.uniform1f(U.uReveal, reveal); gl.uniform1f(U.uTime, reduce ? 0 : time);
  gl.uniform1f(U.uAlpha, alpha); gl.uniform1f(U.uHorizon, set.horizon); gl.uniform1f(U.uStill, reduce ? 1 : 0);
  gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); gl.drawArrays(gl.TRIANGLES, 0, 3);
  cv.style.opacity = 1;

  $(".lb-globe").style.opacity = globeA.toFixed(3);
  h1.style.setProperty("--ho", clamp01(titleA).toFixed(3));
  if (cue) cue.style.setProperty("--co", (1 - smooth(0.02, 0.1, prog)).toFixed(3));
  placePins(v, pinA);
  // the solar farm's card stands open like the reference; on touch the cards take turns until one is touched
  if (pinA > 0.9 && lastPin < 0.9 && !touched) { show("sol"); cycleAt = time + 4.5; cycleI = 0; }
  if (pinA < 0.5 && hot && !touched) show(null);
  if (!fine && !touched && pinA > 0.9 && time > cycleAt && !reduce) { cycleI = (cycleI + 1) % order.length; show(order[cycleI]); cycleAt = time + 4.5; }
  lastPin = pinA;
}

// ---- start ----
try { ctx = setupGL(); } catch (e) { ctx = null; console.warn(e); }
if (!ctx) root.classList.add("no-gl");
resize(); readScroll();
addEventListener("resize", () => { resize(); readScroll(); for (const p of pins) p.cw = 0; });
if (document.fonts) document.fonts.ready.then(() => { for (const p of pins) p.cw = 0; });
if (ctx) {
  loadSet();
  requestAnimationFrame(frame);
  // the night Earth of the site, framed here for the dive: whole in the opening, and in the end Israel fills the
  // screen exactly where the city of the scene will land
  if (dive && !reduce) {
    import("./globe.js").then(({ mountGlobe, LL }) => mountGlobe($(".lb-globe"), {
      frame: (w, h) => {
        const tall = w / h < 1.05, R = tall ? Math.min(0.86 * w, 0.4 * h) : Math.min(0.62 * h, 0.4 * w);
        const a = tall ? { R, cx: 0.5 * w, cy: 0.6 * h, lat: 24, lon: 22 } : { R, cx: 0.5 * w, cy: 0.62 * h, lat: 24, lon: 20 };
        const s = w / h < 0.9 ? SETS.tall : SETS.wide, z = ZMAX;
        const cv0 = view(z, s.src), at = toScreen({ ...cv0 }, s.src);
        return { tall, S: 0.2, a, b: { R: Math.max(w, h) * 5.5, hx: at[0], hy: at[1], lat: LL.chg[0], lon: LL.chg[1] } };
      },
      pointer: false, sharp: true,
    })).then((g) => { globe = g; if (g) { g.setProgress(0); g.replay && g.replay(); } }).catch((e) => console.warn(e));
  }
}

// the comparison switch steps aside once the end of the page shows, so it never sits on its words
const sw = $(".lb-switch"), endEl = $(".lb-end");
if (sw && endEl && "IntersectionObserver" in window) new IntersectionObserver(([e]) => sw.classList.toggle("is-away", e.isIntersecting)).observe(endEl);
