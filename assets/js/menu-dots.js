// Treenergy · the Earth in the menu, made of white points.
// Round 6 (the client 25.10): the realistic night Earth of the menu was heavy ("המודל הזה של הכדור הוא יחסית כבד") and
// the least liked; Idan asked for the first globe of the sketch again, "כדור הארץ עם הנקודות הלבנות". So: a light ball
// of white points, the land in a dense matrix (the sketch's first globe, 14.10) and a faint even sprinkle over the sea
// so the whole sphere reads. No places marked on it, no trail, no colour. It turns slowly by itself, the hand can turn
// it, and pointing at a line of the list gives it a gentle push. Plain WebGL 1 and one draw call: no library, no
// textures, about 110 KB of land data, loaded the first time the menu opens on a desktop.
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const DEG = Math.PI / 180;

// the land matrix: rows of latitude, each sorted by longitude (tools/globe-data/gen-land.mjs). A point that misses one
// of its neighbours is on a coast, and a coast reads a little brighter, so the continents keep their outline
async function loadLand(url) {
  const buf = await (await fetch(url)).arrayBuffer();
  const dv = new DataView(buf), n = dv.getUint32(0, true);
  const lat = new Float32Array(n), lon = new Float32Array(n);
  for (let i = 0; i < n; i++) { lat[i] = dv.getInt16(4 + i * 4, true) / 100; lon[i] = dv.getInt16(6 + i * 4, true) / 100; }
  const rows = new Map();
  for (let i = 0; i < n; i++) { const k = Math.round(lat[i] * 100); let r = rows.get(k); if (!r) rows.set(k, (r = [])); r.push(lon[i]); }
  const keys = [...rows.keys()].sort((a, b) => a - b), idx = new Map(keys.map((k, i) => [k, i]));
  let step = Infinity;
  for (let i = 1; i < keys.length; i++) step = Math.min(step, keys[i] - keys[i - 1]);
  step /= 100;
  const near = (arr, x, tol) => {
    let lo = 0, hi = arr.length - 1;
    while (lo < hi) { const m = (lo + hi) >> 1; if (arr[m] < x) lo = m + 1; else hi = m; }
    return (lo < arr.length && Math.abs(arr[lo] - x) <= tol) || (lo > 0 && Math.abs(arr[lo - 1] - x) <= tol);
  };
  const dl = (la) => 360 / Math.max(1, Math.round((360 * Math.cos(la * DEG)) / step));
  const out = new Float32Array(n * 5);
  for (let i = 0; i < n; i++) {
    const k = Math.round(lat[i] * 100), row = rows.get(k), ki = idx.get(k), d = dl(lat[i]);
    let c = !near(row, lon[i] - d, d * 0.3) || !near(row, lon[i] + d, d * 0.3);
    for (const kk of [keys[ki - 1], keys[ki + 1]]) {
      if (c) break;
      if (kk === undefined || Math.abs(kk - k) > step * 150 || !near(rows.get(kk), lon[i], dl(kk / 100) * 0.75)) c = true;
    }
    // a little loose in its cell, so the rows don't beat against the screen's pixels in stripes
    const la = (lat[i] + (Math.random() - 0.5) * step * 0.4) * DEG, lo = (lon[i] + (Math.random() - 0.5) * d * 0.4) * DEG;
    out.set([Math.cos(la) * Math.sin(lo), Math.sin(la), Math.cos(la) * Math.cos(lo), c ? 1.25 : 1, Math.random()], i * 5);
  }
  return out;
}
// the sea: an even sprinkle of fainter points over the whole sphere
function sea(n) {
  const out = new Float32Array(n * 5), g = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const y = 1 - ((i + 0.5) / n) * 2, r = Math.sqrt(1 - y * y), a = g * i;
    out.set([Math.cos(a) * r, y, Math.sin(a) * r, 0, Math.random()], i * 5);
  }
  return out;
}

const VS = `
attribute vec3 aP; attribute vec2 aK;
uniform mat3 uR; uniform float uSize, uT, uIn, uLift, uStill;
varying float vA;
void main(){
  vec3 p = uR * aP;
  float land = step(.5, aK.x);
  // the near side bright, the edge thin, the far side seen faintly through the ball (land only)
  float front = smoothstep(-.04, .42, p.z), back = (1. - smoothstep(-.3, .02, p.z)) * .07 * land;
  vec3 L = normalize(vec3(-.42, .5, .76));
  float lit = .72 + .38 * clamp(dot(p, L), 0., 1.);
  float tw = 1. - .12 * (1. - uStill) * (.5 + .5 * sin(uT * (.5 + aK.y * 1.3) + aK.y * 40.));
  float a = mix(.17 + .08 * aK.y, .62 + .24 * aK.y + (aK.x - 1.) * .9, land) * lit * tw;
  // the way in: the points come up from the middle of the near side outwards
  float shown = smoothstep(uIn, uIn - .12, (1. - p.z) * .5);
  vA = (a * front + back) * shown * (1. + uLift * .35 * front);
  gl_PointSize = uSize * mix(.8, 1. + (aK.x - 1.) * .6, land) * (1. + .1 * p.z);
  gl_Position = vec4(p.xy * .74, 0., 1.);
}`;
const FS = `
precision mediump float;
varying float vA;
void main(){
  float m = smoothstep(.5, .28, length(gl_PointCoord - .5)) * vA;
  if (m < .004) discard;
  gl_FragColor = vec4(vec3(.94, .97, 1.) * m, m);
}`;

export async function mountDots(host) {
  const cv = host.querySelector("canvas");
  const gl = cv.getContext("webgl", { alpha: true, antialias: false, premultipliedAlpha: true, powerPreference: "low-power" });
  if (!gl) return null;
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
  const pr = gl.createProgram();
  gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(pr);
  if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(pr));
  gl.useProgram(pr);
  const U = {}; for (const k of ["uR", "uSize", "uT", "uIn", "uLift", "uStill"]) U[k] = gl.getUniformLocation(pr, k);

  const land = await loadLand("assets/data/land-m.bin"), water = sea(4200);
  const data = new Float32Array(land.length + water.length); data.set(water); data.set(land, water.length);
  const count = data.length / 5;
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer()); gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
  const aP = gl.getAttribLocation(pr, "aP"), aK = gl.getAttribLocation(pr, "aK");
  gl.enableVertexAttribArray(aP); gl.vertexAttribPointer(aP, 3, gl.FLOAT, false, 20, 0);
  gl.enableVertexAttribArray(aK); gl.vertexAttribPointer(aK, 2, gl.FLOAT, false, 20, 12);
  gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  gl.clearColor(0, 0, 0, 0);

  const still = () => !!window.__still || matchMedia("(prefers-reduced-motion: reduce)").matches;
  // the view: the longitude and latitude at the middle of the ball (Europe, Africa and the Middle East first)
  const V = { lon: 24, lat: 16, vLon: 0, vLat: 0, push: 0, lift: 0, inT: -1 };
  let W = 1, dpr = 1, raf = 0, held = true, last = 0, dirty = true;
  const size = () => {
    const r = cv.getBoundingClientRect();
    dpr = Math.min(devicePixelRatio || 1, 2); W = Math.max(1, Math.round(r.width * dpr));
    if (cv.width !== W || cv.height !== W) { cv.width = cv.height = W; gl.viewport(0, 0, W, W); }
    dirty = true;
  };
  new ResizeObserver(() => { size(); if (held) draw(performance.now() / 1000); }).observe(cv);
  size();
  // drawn once at rest, then shown (site.css: .gl-on)
  requestAnimationFrame(() => { draw(performance.now() / 1000); host.classList.add("gl-on"); });

  function matrix() {
    const a = V.lat * DEG, b = -V.lon * DEG, ca = Math.cos(a), sa = Math.sin(a), cb = Math.cos(b), sb = Math.sin(b);
    // Rx(lat) * Ry(-lon), column-major for WebGL
    return new Float32Array([cb, sa * sb, -ca * sb, 0, ca, sa, sb, -sa * cb, ca * cb]);
  }
  function draw(t) {
    const s = still();
    const inK = s || V.inT < 0 ? 1.2 : clamp01((t - V.inT) / 1.5);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniformMatrix3fv(U.uR, false, matrix());
    // a point about 60% of the land matrix's spacing (0.7 degrees) at the ball's radius, so the points never touch
    gl.uniform1f(U.uSize, Math.max(1.1, (W / dpr) * 0.37 * 0.7 * DEG * 0.62) * dpr);
    gl.uniform1f(U.uT, s ? 0 : t); gl.uniform1f(U.uStill, s ? 1 : 0);
    gl.uniform1f(U.uIn, s ? 1.2 : 1.2 * (1 - Math.pow(1 - inK, 3)));
    gl.uniform1f(U.uLift, V.lift);
    gl.drawArrays(gl.POINTS, 0, count);
    dirty = false;
  }
  function loop(now) {
    raf = held ? 0 : requestAnimationFrame(loop);
    const t = now / 1000, dt = Math.min(0.05, last ? t - last : 0); last = t;
    const s = still();
    if (!drag.on) {
      // its own slow turn, the hand's throw running out, and the list's push easing off
      V.lon += (s ? 0 : 3.2 * dt) + V.vLon * dt + V.push * dt;
      V.lat = Math.max(-50, Math.min(60, V.lat + V.vLat * dt));
      const k = Math.exp(-dt * 2.6); V.vLon *= k; V.vLat *= k;
      V.push *= Math.exp(-dt * 1.6);
      // the tilt eases back toward the resting view
      if (!s && Math.abs(V.vLat) < 4) V.lat += (16 - V.lat) * (1 - Math.exp(-dt * 0.5));
    }
    V.lift *= Math.exp(-dt * 1.8);
    if (s && !dirty && !drag.on && Math.abs(V.vLon) < 0.01) return;
    draw(t);
  }

  // the hand turns it; a throw runs on and slows
  const drag = { on: false, x: 0, y: 0, t: 0 };
  cv.addEventListener("pointerdown", (e) => {
    drag.on = true; drag.x = e.clientX; drag.y = e.clientY; drag.t = performance.now();
    V.vLon = V.vLat = 0; cv.setPointerCapture(e.pointerId); cv.classList.add("is-grab");
  });
  cv.addEventListener("pointermove", (e) => {
    if (!drag.on) return;
    const k = 180 / Math.max(120, W / dpr), dx = e.clientX - drag.x, dy = e.clientY - drag.y, now = performance.now(), dt = Math.max(8, now - drag.t) / 1000;
    V.lon -= dx * k; V.lat = Math.max(-50, Math.min(60, V.lat + dy * k));
    V.vLon = (-dx * k) / dt * 0.6; V.vLat = (dy * k) / dt * 0.6;
    drag.x = e.clientX; drag.y = e.clientY; drag.t = now; dirty = true;
    if (held) draw(now / 1000);
  });
  // no throw when motion is stopped: it stays where the hand left it
  const up = () => { if (!drag.on) return; drag.on = false; cv.classList.remove("is-grab"); if (still() || performance.now() - drag.t > 90) V.vLon = V.vLat = 0; };
  cv.addEventListener("pointerup", up); cv.addEventListener("pointercancel", up);

  return {
    // rest while the menu is closed
    hold(h) { held = h; if (!h && !raf) { last = 0; raf = requestAnimationFrame(loop); } else if (h && raf) { cancelAnimationFrame(raf); raf = 0; } },
    // the way in, each time the menu opens
    replay() { V.inT = performance.now() / 1000; dirty = true; },
    // a line of the list pointed at: a soft push on, the points a touch brighter for a moment
    nudge() { if (still()) return; V.push = Math.min(V.push + 16, 26); V.lift = 1; },
  };
}
