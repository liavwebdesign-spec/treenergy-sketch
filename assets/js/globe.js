// Treenergy · the night Earth behind the opening of the page, the way the owner drew it.
// A big, cropped dot-matrix Earth (land baked from Natural Earth into assets/data, coasts a little brighter) that rolls
// slowly. The company's work stands on it as small lit models: in Israel the campus of the old hero picture (a building
// under a solar roof, battery containers, chargers under a solar canopy), in Europe a solar field with wind turbines.
// The green trail crosses the globe through both sites, powering each one as its head passes, and when the first screen
// is left it flows on down, in one S, onto the domains rail. Scroll drives one value (0..1 over the journey): the
// camera dives toward the Israeli campus while the intro is read.
import * as THREE from "three";
import { Ribbon } from "./ribbon.js";

const DEG = Math.PI / 180;
const GREEN = new THREE.Color("#30F77B");
const ISR = { lat: 31.5, lon: 34.85 };
const EUR = { lat: 44.6, lon: 10.8 };
// the trail's way over the globe: in from the Atlantic over Iberia, through the European site, across the sea to the
// campus, and out to the south, where it leaves the surface
const ROUTE = [[40, -21], [42.6, -5], [EUR.lat, EUR.lon], [39.2, 20.5], [34.6, 28.4], [ISR.lat, ISR.lon], [27.4, 33.2]];
const SUB = 10;                                   // samples per span: every site falls on a known sample
const SITE_K = { eur: 2, isr: 5 };

export function ll2v(lat, lon, r = 1, out = new THREE.Vector3()) {
  const la = lat * DEG, lo = lon * DEG;
  return out.set(Math.cos(la) * Math.sin(lo) * r, Math.sin(la) * r, Math.cos(la) * Math.cos(lo) * r);
}
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

// ---- shaders ----
const LAND_VS = /* glsl */`
attribute float aRnd; attribute float aCoast;
uniform float uTime, uSize, uPx, uRef, uDim, uReveal;
uniform vec3 uHub, uLight;
varying vec3 vCol; varying float vA;
void main(){
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vec3 n = normalize(normalMatrix * position);
  float facing = dot(n, normalize(-mv.xyz));
  float limb = smoothstep(0.02, 0.45, facing);
  float d = acos(clamp(dot(normalize(position), uHub), -1.0, 1.0));
  float halo = exp(-d * d / 0.012);
  // entrance: the matrix lights up from Israel outwards, its front edge flashes green
  float shown = smoothstep(uReveal, uReveal - 0.05, d);
  float front = exp(-pow((d - uReveal) / 0.05, 2.0)) * step(0.001, uReveal) * (1.0 - step(3.0, uReveal));
  float tw = 0.86 + 0.14 * sin(uTime * (0.5 + aRnd * 1.3) + aRnd * 40.0);
  float lit = clamp(dot(n, uLight), 0.0, 1.0);
  vec3 base = mix(vec3(0.55, 0.66, 0.96), vec3(0.80, 0.87, 1.0), aCoast);
  vec3 col = mix(base, vec3(0.19, 0.97, 0.48), clamp(halo * 0.7 + front, 0.0, 1.0));
  float a = (0.24 + 0.2 * aRnd + 0.24 * aCoast) * tw * (0.7 + 0.5 * lit);
  a = a * mix(uDim, 1.0, halo) + halo * 0.16 + front * 0.7;
  vA = a * limb * shown;
  vCol = col;
  gl_PointSize = uSize * uPx * (1.0 + 0.16 * aCoast + front * 0.8) * (uRef / -mv.z);
  gl_Position = projectionMatrix * mv;
}`;
const DOT_FS = /* glsl */`
varying vec3 vCol; varying float vA;
void main(){
  float r = length(gl_PointCoord - 0.5);
  float m = smoothstep(0.5, 0.36, r);
  if (m * vA < 0.004) discard;
  gl_FragColor = vec4(vCol, vA * m);
}`;
const ISR_VS = /* glsl */`
attribute float aRnd;
uniform float uTime, uSize, uPx, uRef, uOn;
varying vec3 vCol; varying float vA;
void main(){
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  float tw = 0.7 + 0.3 * sin(uTime * (1.1 + aRnd * 2.0) + aRnd * 30.0);
  vCol = mix(vec3(0.19, 0.97, 0.48), vec3(0.85, 1.0, 0.9), aRnd * 0.35);
  vA = 0.4 * tw * uOn;
  gl_PointSize = uSize * uPx * 0.9 * (uRef / -mv.z);
  gl_Position = projectionMatrix * mv;
}`;
// the graticule: a faint grid that shows the roll
const GRID_VS = /* glsl */`
uniform float uDim, uOn;
varying float vA;
void main(){
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vec3 n = normalize(normalMatrix * position);
  vA = smoothstep(0.05, 0.6, dot(n, normalize(-mv.xyz))) * 0.075 * mix(0.6, 1.0, uDim) * uOn;
  gl_Position = projectionMatrix * mv;
}`;
const GRID_FS = /* glsl */`
varying float vA;
void main(){ gl_FragColor = vec4(0.6, 0.72, 1.0, vA); }`;
const SPHERE_VS = /* glsl */`
varying vec3 vN; varying vec3 vV;
void main(){
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vN = normalize(normalMatrix * normal);
  vV = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}`;
const OCEAN_FS = /* glsl */`
uniform vec3 uLight; uniform float uDim;
varying vec3 vN; varying vec3 vV;
void main(){
  float f = clamp(dot(vN, vV), 0.0, 1.0);
  vec3 col = mix(vec3(0.0, 0.03, 0.12), vec3(0.0, 0.115, 0.33), pow(f, 1.35));
  float lit = clamp(dot(vN, uLight), 0.0, 1.0);
  col += vec3(0.0, 0.045, 0.11) * lit * lit;
  float rim = pow(1.0 - f, 4.0);
  col += mix(vec3(0.16, 0.42, 1.0), vec3(0.19, 0.97, 0.55), 0.4 * lit) * rim * (0.3 + 0.85 * lit);
  col *= mix(0.55, 1.0, uDim);
  gl_FragColor = vec4(col, 1.0);
}`;
const ATMO_FS = /* glsl */`
uniform vec3 uLight; uniform float uDim, uOn;
varying vec3 vN; varying vec3 vV;
void main(){
  float t = clamp(-dot(vN, vV), 0.0, 1.0);
  float i = pow(clamp(t / 0.553, 0.0, 1.0), 3.2);
  float lit = clamp(dot(vN, uLight) * 0.5 + 0.5, 0.0, 1.0);
  vec3 col = mix(vec3(0.10, 0.33, 1.0), vec3(0.19, 0.97, 0.62), 0.45 * pow(lit, 3.0));
  gl_FragColor = vec4(col * i * (0.3 + 0.9 * lit) * mix(0.45, 1.0, uDim) * uOn, 1.0);
}`;

function glowTexture() {
  const c = document.createElement("canvas"); c.width = c.height = 128;
  const g = c.getContext("2d"), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, "rgba(235,255,240,1)");
  gr.addColorStop(0.12, "rgba(120,255,170,.85)");
  gr.addColorStop(0.35, "rgba(48,247,123,.32)");
  gr.addColorStop(1, "rgba(48,247,123,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
// a wide, soft pool of light for the ground under a site
function poolTexture() {
  const c = document.createElement("canvas"); c.width = c.height = 128;
  const g = c.getContext("2d"), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, "rgba(48,247,123,.55)");
  gr.addColorStop(0.4, "rgba(48,247,123,.16)");
  gr.addColorStop(1, "rgba(48,247,123,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

async function loadLand(url) {
  const buf = await (await fetch(url)).arrayBuffer();
  const dv = new DataView(buf), n = dv.getUint32(0, true);
  const lat = new Float32Array(n), lon = new Float32Array(n);
  for (let i = 0; i < n; i++) { lat[i] = dv.getInt16(4 + i * 4, true) / 100; lon[i] = dv.getInt16(6 + i * 4, true) / 100; }
  // the matrix is rows of latitude, each sorted by longitude: a dot that misses one of its six neighbours is on a coast
  const rows = new Map();
  for (let i = 0; i < n; i++) { const k = Math.round(lat[i] * 100); let r = rows.get(k); if (!r) rows.set(k, (r = [])); r.push(lon[i]); }
  const keys = [...rows.keys()].sort((a, b) => a - b);
  let step = Infinity;
  for (let i = 1; i < keys.length; i++) step = Math.min(step, keys[i] - keys[i - 1]);
  step /= 100;
  const near = (arr, x, tol) => {
    let lo = 0, hi = arr.length - 1;
    while (lo < hi) { const m = (lo + hi) >> 1; if (arr[m] < x) lo = m + 1; else hi = m; }
    return (lo < arr.length && Math.abs(arr[lo] - x) <= tol) || (lo > 0 && Math.abs(arr[lo - 1] - x) <= tol);
  };
  const idx = new Map(keys.map((k, i) => [k, i]));
  const pos = [], rnd = [], coast = [], v = new THREE.Vector3();
  for (let i = 0; i < n; i++) {
    if (dv.getUint8(4 + n * 4 + i)) continue;          // Israel's own dots come from the dense set
    const k = Math.round(lat[i] * 100), row = rows.get(k), ki = idx.get(k);
    const dl = 360 / Math.max(1, Math.round((360 * Math.cos(lat[i] * DEG)) / step));
    let c = 0;
    if (!near(row, lon[i] - dl, dl * 0.3) || !near(row, lon[i] + dl, dl * 0.3)) c = 1;
    for (const kk of [keys[ki - 1], keys[ki + 1]]) {
      if (c) break;
      if (kk === undefined || Math.abs(kk - k) > step * 150) { c = 1; break; }
      const r2 = rows.get(kk), d2 = 360 / Math.max(1, Math.round((360 * Math.cos((kk / 100) * DEG)) / step));
      if (!near(r2, lon[i], d2 * 0.75)) c = 1;
    }
    ll2v(lat[i], lon[i], 1.003, v);
    pos.push(v.x, v.y, v.z); rnd.push(Math.random()); coast.push(c);
  }
  return { pos: new Float32Array(pos), rnd: new Float32Array(rnd), coast: new Float32Array(coast) };
}
async function loadIsrael(url) {
  const f = new Float32Array(await (await fetch(url)).arrayBuffer()), n = f.length / 2;
  const pos = new Float32Array(n * 3), rnd = new Float32Array(n), v = new THREE.Vector3();
  for (let i = 0; i < n; i++) {
    ll2v(f[i * 2], f[i * 2 + 1], 1.004, v);
    pos[i * 3] = v.x; pos[i * 3 + 1] = v.y; pos[i * 3 + 2] = v.z; rnd[i] = Math.random();
  }
  return { pos, rnd };
}
function graticule() {
  const a = [], v = new THREE.Vector3(), w = new THREE.Vector3(), r = 1.0015;
  for (let la = -45; la <= 75; la += 15) for (let lo = -180; lo < 180; lo += 3) {
    ll2v(la, lo, r, v); ll2v(la, lo + 3, r, w); a.push(v.x, v.y, v.z, w.x, w.y, w.z);
  }
  for (let lo = -180; lo < 180; lo += 15) for (let la = -60; la < 80; la += 3) {
    ll2v(la, lo, r, v); ll2v(la + 3, lo, r, w); a.push(v.x, v.y, v.z, w.x, w.y, w.z);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(a, 3)); return g;
}

// ---- the sites: small lit models of the company's work ----
// Model units: x east, y up, z south; one unit is S of the globe's radius. Faces are shaded by a fixed sky light
// baked into vertex colours (no scene lights: the models stay crisp and cheap), edges are fine pale lines, and
// everything green is light that the trail switches on.
const SKY = new THREE.Vector3(-0.42, 1, 0.62).normalize();
function shade(g, hex, amb = 0.4, dif = 0.66) {
  const c = new THREE.Color(hex), nr = g.attributes.normal, col = new Float32Array(nr.count * 3);
  for (let i = 0; i < nr.count; i++) {
    const k = amb + dif * Math.max(0, nr.getX(i) * SKY.x + nr.getY(i) * SKY.y + nr.getZ(i) * SKY.z);
    col[i * 3] = c.r * k; col[i * 3 + 1] = c.g * k; col[i * 3 + 2] = c.b * k;
  }
  g.setAttribute("color", new THREE.BufferAttribute(col, 3));
  return g;
}
function lineGeo(a) { const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(a, 3)); return g; }

function buildSites(tex, pool) {
  const fill = new THREE.MeshBasicMaterial({ vertexColors: true, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
  const edge = new THREE.LineBasicMaterial({ color: 0xd6e4ff, transparent: true, opacity: 0.7 });
  const fine = new THREE.LineBasicMaterial({ color: 0xa9c2ff, transparent: true, opacity: 0.36 });
  const mull = new THREE.LineBasicMaterial({ color: 0x9db8ff, transparent: true, opacity: 0.12 });
  const cell = new THREE.LineBasicMaterial({ color: 0x6d8fe0, transparent: true, opacity: 0.34 });
  const ground = new THREE.LineBasicMaterial({ color: 0xcfe0ff, transparent: true, opacity: 0.2 });
  const NAVY = "#24478f", PANEL = "#0f2d6e", STEEL = "#6a82b6", WHITE = "#eef3ff";

  // a block standing on its foot
  const block = (w, h, d, hex, withEdge = true) => {
    const g = shade(new THREE.BoxGeometry(w, h, d).translate(0, h / 2, 0), hex);
    const m = new THREE.Mesh(g, fill);
    if (withEdge) m.add(new THREE.LineSegments(new THREE.EdgesGeometry(g), edge));
    return m;
  };
  // a row of solar panels: a thin plate tilted to the south, its cells drawn on top
  const panel = (w, d, nx, nz, tilt) => {
    const p = block(w, 0.006, d, PANEL);
    const a = [], y = 0.0066;
    for (let i = 1; i < nx; i++) { const x = -w / 2 + (w * i) / nx; a.push(x, y, -d / 2, x, y, d / 2); }
    for (let j = 1; j < nz; j++) { const z = -d / 2 + (d * j) / nz; a.push(-w / 2, y, z, w / 2, y, z); }
    p.add(new THREE.LineSegments(lineGeo(a), cell));
    p.rotation.x = tilt * DEG;
    return p;
  };
  // the green parts: one material per site, its colour follows the site's power
  const greenMat = () => new THREE.MeshBasicMaterial({ color: new THREE.Color("#0c3b2a") });
  const spark = (parent, x, y, z, s, list) => {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 }));
    sp.position.set(x, y, z); sp.scale.setScalar(s); parent.add(sp); list.push(sp); return sp;
  };
  const hubLight = (model, list, r) => {
    const pad = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ map: pool, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 }));
    pad.position.y = 0.002; pad.scale.setScalar(r * 2); model.add(pad);
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.95, 1, 72).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: GREEN, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0, side: THREE.DoubleSide }));
    ring.position.y = 0.003; model.add(ring);
    const core = spark(model, 0, 0.015, 0, r * 0.5, list);
    return { pad, ring, core };
  };
  // a part stands on the ground at (x, z) and leans toward the viewer as one piece (see lean() in mountGlobe);
  // ex, ez: the half size of its footprint, so it can lean on the edge of its foot
  const part = (site, x, z, ex, ez, t) => {
    const o = new THREE.Group(); o.position.set(x, 0, z);
    site.model.add(o); site.parts.push({ o, base: new THREE.Vector3(x, 0, z), ex, ez, t });
    return o;
  };

  // --- Israel: the campus of the old hero picture, around an open square where the trail passes ---
  const isr = { model: new THREE.Group(), parts: [], lights: [], bars: [], rotors: [], green: greenMat() };
  {
    const BH = 0.36, BW = 0.34, BD = 0.22, FL = 6;
    // the building: a glass office block, its floors and mullions drawn on the faces, a few windows lit
    const b = part(isr, 0.04, -0.3, BW / 2 + 0.025, BD / 2, 0.9);
    b.add(block(BW, BH, BD, NAVY));
    const a = [], o = 0.0016, hw = BW / 2 + o, hd = BD / 2 + o;
    for (let i = 1; i < FL; i++) {
      const y = (BH * i) / FL;
      a.push(-hw, y, hd, hw, y, hd, -hw, y, -hd, hw, y, -hd, hw, y, -hd, hw, y, hd, -hw, y, -hd, -hw, y, hd);
    }
    b.add(new THREE.LineSegments(lineGeo(a), fine));
    // the mullions are fainter than the floors: a glass block reads by its floors
    const mx = BW / 8, mz = BD / 5, m2 = [];
    for (let x = -BW / 2 + mx; x < BW / 2 - 0.01; x += mx) m2.push(x, 0, hd, x, BH, hd, x, 0, -hd, x, BH, -hd);
    for (let z = -BD / 2 + mz; z < BD / 2 - 0.01; z += mz) m2.push(hw, 0, z, hw, BH, z, -hw, 0, z, -hw, BH, z);
    b.add(new THREE.LineSegments(lineGeo(m2), mull));
    const win = new THREE.MeshBasicMaterial({ color: 0xc4d6ff, transparent: true, opacity: 0.62 });
    const wS = new THREE.PlaneGeometry(mx * 0.8, (BH / FL) * 0.62), wE = new THREE.PlaneGeometry(mz * 0.8, (BH / FL) * 0.62);
    [[0, 0], [1, 2], [3, 1], [4, 3], [6, 0], [7, 2], [2, 4], [5, 4], [1, 5], [6, 5], [3, 5]].forEach(([c, f]) => {
      const m = new THREE.Mesh(wS, win); m.position.set(-BW / 2 + mx * (c + 0.5), (BH * (f + 0.5)) / FL, hd + 0.0006); b.add(m);
    });
    [[0, 1], [2, 3], [4, 0], [1, 4]].forEach(([c, f]) => {
      const m = new THREE.Mesh(wE, win); m.rotation.y = -Math.PI / 2; m.position.set(-hw - 0.0006, (BH * (f + 0.5)) / FL, -BD / 2 + mz * (c + 0.5)); b.add(m);
    });
    // the solar roof: rows of panels on a light frame over the roof
    for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const post = block(0.006, 0.04, 0.006, WHITE, false); post.position.set(x * (BW / 2 - 0.012), BH, z * (BD / 2 - 0.012)); b.add(post);
    }
    for (let r = 0; r < 3; r++) { const p = panel(BW + 0.05, 0.082, 10, 2, 16); p.position.set(0, BH + 0.036, -0.088 + r * 0.088); b.add(p); }
    // battery containers on the east, a charge gauge glowing on each south face
    const bt = part(isr, 0.3, 0.03, 0.17, 0.065, 1.3);
    const barGeo = new THREE.BoxGeometry(0.046, 0.07, 0.004).translate(0, 0.035, 0);
    const track = new THREE.MeshBasicMaterial({ color: 0x0a1a3a });
    for (let i = 0; i < 4; i++) {
      const c = new THREE.Group(); c.position.set(-0.13 + i * 0.087, 0, 0);
      c.add(block(0.074, 0.104, 0.13, STEEL));
      const t = new THREE.Mesh(barGeo, track); t.position.set(0, 0.016, 0.0655); c.add(t);
      const bar = new THREE.Mesh(barGeo, isr.green); bar.position.set(0, 0.016, 0.0675); c.add(bar);
      isr.bars.push({ m: bar, ph: i * 1.7 });
      spark(c, 0, 0.05, 0.075, 0.08, isr.lights);
      bt.add(c);
    }
    // chargers on the south, each with its screen lit, parking bays in front
    const ch = part(isr, 0.1, 0.27, 0.115, 0.012, 1.5);
    for (let i = 0; i < 3; i++) {
      const x = -0.1 + i * 0.1;
      const p = block(0.03, 0.12, 0.024, WHITE, false); p.position.set(x, 0, 0); ch.add(p);
      const scr = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.03, 0.003), isr.green); scr.position.set(x, 0.08, 0.0135); ch.add(scr);
      spark(ch, x, 0.08, 0.02, 0.075, isr.lights);
    }
    const bays = [];
    for (let x = -0.05; x < 0.3; x += 0.1) bays.push(x, 0.001, 0.3, x, 0.001, 0.44);
    bays.push(-0.05, 0.001, 0.44, 0.25, 0.001, 0.44);
    isr.model.add(new THREE.LineSegments(lineGeo(bays), ground));
    Object.assign(isr, hubLight(isr.model, isr.lights, 0.22));
    isr.anchors = { roof: [b, new THREE.Vector3(0, BH + 0.06, 0)], bat: [bt, new THREE.Vector3(0, 0.12, 0)], chg: [ch, new THREE.Vector3(0, 0.13, 0)], hub: [isr.model, new THREE.Vector3()] };
  }

  // --- Europe: a solar field, and wind turbines behind it ---
  const eur = { model: new THREE.Group(), parts: [], lights: [], bars: [], rotors: [], green: greenMat() };
  {
    const fd = part(eur, 0.16, -0.2, 0.245, 0.12, 1.0);
    const legs = [];
    for (let c = 0; c < 4; c++) for (let r = 0; r < 3; r++) {
      const x = -0.19 + c * 0.125, z = 0.09 - r * 0.09;
      const p = panel(0.11, 0.06, 5, 2, 25); p.position.set(x, 0.026, z); fd.add(p);
      legs.push(x, 0, z, x, 0.026, z);
    }
    fd.add(new THREE.LineSegments(lineGeo(legs), ground));
    const towerGeo = shade(new THREE.CylinderGeometry(0.0055, 0.011, 0.42, 10).translate(0, 0.21, 0), WHITE, 0.55, 0.5);
    const bladeGeo = shade(new THREE.BoxGeometry(0.011, 0.15, 0.003).translate(0, 0.075, 0), WHITE, 0.6, 0.45);
    const hubGeo = shade(new THREE.SphereGeometry(0.009, 10, 8), WHITE);
    const wind = [];
    for (let i = 0; i < 3; i++) {
      const t = part(eur, -0.14 + i * 0.25, -0.48 + (i % 2) * 0.06, 0.012, 0.012, 1.15 + i * 0.12);
      t.add(new THREE.Mesh(towerGeo, fill));
      const nac = block(0.02, 0.02, 0.05, WHITE, false); nac.position.set(0, 0.415, -0.008); t.add(nac);
      const rotor = new THREE.Group(); rotor.position.set(0, 0.425, 0.02);
      rotor.add(new THREE.Mesh(hubGeo, fill));
      for (let k = 0; k < 3; k++) { const bl = new THREE.Mesh(bladeGeo, fill); bl.rotation.z = (k * 2 * Math.PI) / 3; rotor.add(bl); }
      rotor.rotation.z = i * 0.9;
      t.add(rotor); eur.rotors.push(rotor); wind.push(t);
      spark(t, 0, 0.43, 0.03, 0.05, eur.lights);
    }
    Object.assign(eur, hubLight(eur.model, eur.lights, 0.18));
    eur.anchors = { field: [fd, new THREE.Vector3(0, 0.05, 0)], wind: [wind[1], new THREE.Vector3(0, 0.5, 0)], hub: [eur.model, new THREE.Vector3()] };
  }
  return { isr, eur };
}

// Where the globe sits. The owner's drawing: a big Earth, cropped at the start edge of a phone, Europe and Africa in
// view. Wide screens: the same Earth on the end side, Europe and the campus up in its open sky, the giant opening line
// across its foot. The second state is the intro: the camera has dived toward the campus on the end side, so the trail
// leaves it in one S onto the rail and the statement has the start side. A frame gives the globe's centre (cx, cy) or,
// for the dive, where the campus must land on screen (hx, hy).
function frame(W, H) {
  const tall = W / H < 1.05;
  if (tall) {
    const R = Math.min(0.8 * W, 0.42 * H);
    return { tall, S: 0.3,
      a: { R, cx: W - R - 14, cy: Math.max(0.355 * H, R * 0.96), lat: 26, lon: 2 },
      b: { R: Math.min(1.9 * W, 0.95 * H), hx: 0.52 * W, hy: 0.2 * H, lat: ISR.lat - 5, lon: ISR.lon - 7 } };
  }
  const R = Math.min(0.8 * H, 0.48 * W);
  return { tall, S: 0.2,
    a: { R, cx: 0.23 * W, cy: 0.65 * H, lat: 22, lon: 18 },
    b: { R: Math.min(0.95 * W, 1.7 * H), hx: 0.21 * W, hy: 0.37 * H, lat: ISR.lat - 10, lon: ISR.lon - 12 } };
}

export async function mountGlobe(stage, opt = {}) {
  const canvas = stage.querySelector(".gl-canvas");
  const pinsRoot = stage.querySelector(".gl-pins");
  const linesSvg = stage.querySelector(".gl-lines");
  const trailSvg = stage.querySelector(".gl-trail");
  const reduce = !!window.__still || matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = matchMedia("(hover:hover) and (pointer:fine)").matches;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  } catch (e) { return null; }                       // no WebGL: the poster image stays
  renderer.setClearColor(0x000000, 0);

  const small = Math.min(innerWidth, innerHeight) < 700;
  const [land, isrDots] = await Promise.all([
    loadLand(opt.land || (small ? "assets/data/land-m.bin" : "assets/data/land.bin")),
    loadIsrael(opt.israel || "assets/data/israel.bin"),
  ]);
  const STEP = (small ? 0.7 : 0.42) * DEG;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(24, 1, 0.3, 50);
  const globe = new THREE.Group(); globe.rotation.order = "XYZ"; scene.add(globe);
  const hubV = ll2v(ISR.lat, ISR.lon);
  const light = new THREE.Vector3(0.55, 0.5, 0.45).normalize();     // the rim catches light on the open, end side

  const U = {
    uTime: { value: 0 }, uSize: { value: 2 }, uPx: { value: 1 }, uRef: { value: 4 }, uDim: { value: 1 },
    uReveal: { value: reduce ? 9 : 0 }, uHub: { value: hubV }, uLight: { value: light }, uOn: { value: reduce ? 1 : 0 },
  };

  globe.add(new THREE.Mesh(new THREE.SphereGeometry(1, 96, 64),
    new THREE.ShaderMaterial({ vertexShader: SPHERE_VS, fragmentShader: OCEAN_FS, uniforms: U })));
  globe.add(new THREE.LineSegments(graticule(), new THREE.ShaderMaterial({
    vertexShader: GRID_VS, fragmentShader: GRID_FS, uniforms: U, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })));

  const lg = new THREE.BufferGeometry();
  lg.setAttribute("position", new THREE.BufferAttribute(land.pos, 3));
  lg.setAttribute("aRnd", new THREE.BufferAttribute(land.rnd, 1));
  lg.setAttribute("aCoast", new THREE.BufferAttribute(land.coast, 1));
  globe.add(new THREE.Points(lg, new THREE.ShaderMaterial({
    vertexShader: LAND_VS, fragmentShader: DOT_FS, uniforms: U, transparent: true, depthWrite: false })));

  const ig = new THREE.BufferGeometry();
  ig.setAttribute("position", new THREE.BufferAttribute(isrDots.pos, 3));
  ig.setAttribute("aRnd", new THREE.BufferAttribute(isrDots.rnd, 1));
  globe.add(new THREE.Points(ig, new THREE.ShaderMaterial({
    vertexShader: ISR_VS, fragmentShader: DOT_FS, uniforms: U, transparent: true, depthWrite: false,
    blending: THREE.AdditiveBlending })));

  // pure light: the colour adds and the canvas alpha is left alone, so outside the ocean the shell never turns into an
  // opaque dark disc over the night (that disc was the black halo around the globe)
  scene.add(new THREE.Mesh(new THREE.SphereGeometry(1.2, 96, 64), new THREE.ShaderMaterial({
    vertexShader: SPHERE_VS, fragmentShader: ATMO_FS, uniforms: U, side: THREE.BackSide,
    transparent: true, depthWrite: false, blending: THREE.CustomBlending,
    blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor, blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor })));   // never rotates, so it lives in the scene

  // ---- the sites ----
  const tex = glowTexture();
  const { isr, eur } = buildSites(tex, poolTexture());
  const sites = { isr, eur };
  for (const [k, s] of Object.entries(sites)) {
    const ll = k === "isr" ? ISR : EUR;
    const n = ll2v(ll.lat, ll.lon), east = new THREE.Vector3(0, 1, 0).cross(n).normalize(), south = n.clone().cross(east).negate();
    s.n = n; s.f = 0; s.power = reduce ? 1 : 0;
    s.root = new THREE.Group();
    s.root.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(east, n, south));
    s.root.position.copy(n).multiplyScalar(1.0035);
    s.root.add(s.model); globe.add(s.root);
    for (const p of s.parts) p.o.scale.y = reduce ? 1 : 0.001;
    // the models are drawn in a second pass, over the globe: a part that leans toward the viewer may dip below the
    // ground on its far side, and the Earth must not cut it
    s.model.traverse((o) => o.layers.set(1));
  }
  const dimGreen = new THREE.Color("#0c3b2a");

  // ---- pins: HTML links that hang on the models ----
  const pins = [...pinsRoot.querySelectorAll(".gl-pin")].map((el) => {
    const dot = document.createElement("i"); dot.className = "gl-dot"; dot.setAttribute("aria-hidden", "true");
    pinsRoot.appendChild(dot);
    const line = document.createElementNS("http://www.w3.org/2000/svg", "path"); linesSvg.appendChild(line);
    if (el.classList.contains("is-soft")) line.classList.add("is-soft");
    const set = (on) => () => { dot.classList.toggle("on", on); line.classList.toggle("on", on); };
    el.addEventListener("mouseenter", set(true)); el.addEventListener("mouseleave", set(false));
    el.addEventListener("focus", set(true)); el.addEventListener("blur", set(false));
    const site = sites[el.dataset.site] || isr;
    const [atO, atV] = site.anchors[el.dataset.part] || site.anchors.hub;
    return { el, dot, line, w: {}, site, atO, atV,
      dx: +el.dataset.dx, dy: +el.dataset.dy, tdx: +(el.dataset.tdx ?? el.dataset.dx), tdy: +(el.dataset.tdy ?? el.dataset.dy),
      tallHide: el.hasAttribute("data-tall-hide") };
  });

  // ---- the trail: over the globe through both sites, then down in one S onto the domains rail; it ends exactly on
  // the stage's bottom edge, the top of the domains, where the domains ribbon (same band) carries it on ----
  const ribbon = trailSvg ? new Ribbon(trailSvg, { strands: 14, loose: 3, ...(opt.band || {}), amp: opt.amp || 26, wave: 520, taperStart: 120, sparks: 4, seed: 3, anchor: "end" }) : null;
  const route3 = [];
  {
    const curve = new THREE.CatmullRomCurve3(ROUTE.map(([la, lo]) => ll2v(la, lo)), false, "centripetal");
    const N = (ROUTE.length - 1) * SUB;
    for (let j = 0; j <= N; j++) {
      // between the two sites the line lifts a little off the surface, like a span between two towers
      const u = j / SUB, lift = u > SITE_K.eur && u < SITE_K.isr ? 0.03 * Math.sin((Math.PI * (u - SITE_K.eur)) / (SITE_K.isr - SITE_K.eur)) : 0;
      const v = j % SUB === 0 ? ll2v(...ROUTE[j / SUB]) : curve.getPoint(j / N).normalize();
      route3.push(v.multiplyScalar(1.006 + lift));
    }
  }
  const NR = route3.length, rx = new Float32Array(NR), ry = new Float32Array(NR), rf = new Float32Array(NR);

  // ---- state ----
  let W = 1, H = 1, F = frame(1, 1), dpr = 1, progress = 0, running = false, raf = 0, baseD = 4, railX = 0;
  let downS = 0, tTrail = 0, swingAt = -1, easing = false;
  let sig = "", fG = 0.75, ready = false, tReady = 0, pinsShown = null, lastT = 0;
  // the roll runs while the visitor is with the page (the entrance, a scroll, the pointer) and settles when they rest:
  // the trail and the labels follow the globe in the page, so a globe that never stops would rewrite them every frame
  let rollT = 0, roll = 1, woke = 0;
  const wake = () => { woke = (performance.now() - t0) / 1000; };
  // the top of the opening words, in stage pixels: a label never lands on them (short phones, where the words climb the globe)
  let floorY = Infinity;
  const measureFloor = () => { floorY = opt.floor ? opt.floor() : Infinity; pins.forEach((pin) => (pin.h = pin.el.offsetHeight)); };
  const t0 = performance.now();
  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  const view = { R: 1, cx: 0, cy: 0, lat: 0, lon: 0 };
  const tmp = new THREE.Vector3(), tmpN = new THREE.Vector3(), tmpV = new THREE.Vector3(), tmpW = new THREE.Vector3();
  const pp = { x: 0, y: 0, facing: 1 }, sp = { x: 0, y: 0, facing: 1 };

  const distFor = (R) => 1 / Math.sin(Math.atan((R * Math.tan((camera.fov * DEG) / 2)) / (H / 2)));

  // place the camera so the unit sphere shows with radius R px, centred at (cx, cy)
  function place(R, cx, cy) {
    camera.position.set(0, 0, distFor(R)); camera.lookAt(0, 0, 0);
    camera.setViewOffset(W, H, W / 2 - cx, H / 2 - cy, W, H);
    camera.updateProjectionMatrix();
  }
  // a world point on screen; facing: how much the surface normal n looks at the camera
  function projectW(w, n, out) {
    tmpV.copy(camera.position).sub(w).normalize();
    out.facing = n.dot(tmpV);
    tmp.copy(w).project(camera);
    out.x = (tmp.x + 1) / 2 * W; out.y = (1 - tmp.y) / 2 * H;
    return out;
  }
  // a frame given by where the campus lands: find the centre that puts it there (the view offset moves every point
  // on screen by the same amount, so one projection is enough)
  function resolve(f) {
    if (f.hx == null) return;
    globe.rotation.set(f.lat * DEG, -f.lon * DEG, 0); globe.updateMatrixWorld(true);
    place(f.R, W / 2, H / 2);
    tmpW.copy(hubV).multiplyScalar(1.0035).applyMatrix4(globe.matrixWorld);
    projectW(tmpW, tmpN.copy(tmpW).normalize(), pp);
    f.cx = W / 2 + f.hx - pp.x; f.cy = H / 2 + f.hy - pp.y;
  }

  // The camera sees the sites almost from above, where a building is only its roof. Each part leans as one piece on
  // the edge of its foot nearest the viewer, so it is seen from about 38° above the horizon and stands upright on
  // screen (an illustrated map's view); the ground under it (pool, ring, bays) stays flat.
  const TILT = 52 * DEG, MAXL = 75 * DEG;
  const cW = new THREE.Vector3(), sW = new THREE.Vector3(), upL = new THREE.Vector3(), qL = new THREE.Quaternion(), qI = new THREE.Quaternion(), Q0 = new THREE.Quaternion(), Y = new THREE.Vector3(0, 1, 0);
  function lean(s) {
    s.model.getWorldPosition(tmpV);
    cW.copy(camera.position).sub(tmpV).normalize();
    tmpN.copy(s.n).applyQuaternion(globe.quaternion);
    s.root.visible = tmpN.dot(cW) > 0.02;
    sW.set(0, 1, 0).addScaledVector(cW, -cW.y).normalize();
    upL.copy(cW).multiplyScalar(Math.cos(TILT)).addScaledVector(sW, Math.sin(TILT));
    s.model.getWorldQuaternion(qI).invert();
    upL.applyQuaternion(qI).normalize();
    const ang = Math.acos(Math.min(1, Math.max(-1, upL.y))), th = Math.min(ang, MAXL);
    qL.setFromUnitVectors(Y, upL);
    if (ang > MAXL) qL.slerpQuaternions(Q0, qL, MAXL / ang);
    let tx = upL.x, tz = upL.z; const tl = Math.hypot(tx, tz) || 1; tx /= tl; tz /= tl;
    const c = 1 - Math.cos(th), sn = Math.sin(th);
    for (const p of s.parts) {
      const r = Math.abs(tx) * p.ex + Math.abs(tz) * p.ez;
      p.o.quaternion.copy(qL);
      p.o.position.set(p.base.x - tx * r * c, -r * sn, p.base.z - tz * r * c);
    }
  }

  function resize() {
    const r = stage.getBoundingClientRect();
    W = Math.max(1, Math.round(r.width)); H = Math.max(1, Math.round(r.height));
    dpr = Math.min(devicePixelRatio || 1, small ? 1.5 : 2);
    renderer.setPixelRatio(dpr); renderer.setSize(W, H, false);
    camera.aspect = W / H;
    F = frame(W, H);
    resolve(F.a); resolve(F.b);
    stage.classList.toggle("is-tall", F.tall);
    U.uPx.value = dpr;
    // dot size is set at the hero frame (about 60% of the spacing between dots); the dive grows it with perspective
    baseD = distFor(F.a.R);
    U.uRef.value = baseD;
    U.uSize.value = Math.max(1.2, F.a.R * STEP * 0.6);
    for (const s of Object.values(sites)) s.model.scale.setScalar(F.S);
    linesSvg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    if (trailSvg) trailSvg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    railX = opt.railX ? opt.railX() : W * 0.6;
    measureFloor();
    sig = "";
    if (!running) render();
  }

  // the trail is rebuilt only when the globe moved it by more than half a pixel
  function trail(time, e) {
    if (!ribbon) return;
    const dtT = Math.min(0.1, Math.max(0.016, time - tTrail)); tTrail = time;
    globe.updateMatrixWorld(true);
    for (let i = 0; i < NR; i++) {
      tmpW.copy(route3[i]).applyMatrix4(globe.matrixWorld);
      projectW(tmpW, tmpN.copy(tmpW).normalize(), pp);
      rx[i] = pp.x; ry[i] = pp.y; rf[i] = pp.facing;
    }
    let i0 = 0; while (i0 < NR - 2 && rf[i0] < 0.05) i0++;
    // the phone rail: portrait frames on narrow screens (a tall tablet keeps the wide layout, and its trail with it)
    const M = NR - 1, rail = F.tall && !(opt.wide && opt.wide()), seam = rail && opt.seam ? opt.seam() : null;
    // a tall wide frame: where the intro's words come to rest, under Israel and across most of the width
    const fw = F.tall && !rail && opt.rest ? opt.rest() : null;
    // phones: the words' top edge (the hook has to reach the rail above it)
    const wTop = rail && opt.words ? opt.words().top : null;
    const key = `${W}|${H}|${railX.toFixed(1)}|${opt.joint ? opt.joint().toFixed(0) : ""}|${opt.joinDir ? opt.joinDir().map((v) => v.toFixed(2)).join(",") : ""}|${i0}|${seam ? seam.key : ""}|${fw ? [fw.left, fw.right, fw.top, fw.bottom].map(Math.round).join(",") : ""}|${wTop === null ? "" : Math.round(wTop / 4)}|` +[0, SITE_K.eur * SUB, SITE_K.isr * SUB, M].map((i) => (rx[i] * 1.6).toFixed(0) + "," + (ry[i] * 1.6).toFixed(0)).join("|");
    if (key !== sig) {
      sig = key;
      const segs = [];
      const P = (i) => Math.min(M, Math.max(i0, i));
      for (let i = i0; i < M; i++) {
        const a = P(i - 1), b = P(i), c = P(i + 1), d = P(i + 2);
        segs.push(["C", rx[b], ry[b], rx[b] + (rx[c] - rx[a]) / 6, ry[b] + (ry[c] - ry[a]) / 6,
          rx[c] - (rx[d] - rx[b]) / 6, ry[c] - (ry[d] - ry[b]) / 6, rx[c], ry[c]]);
      }
      // leaving the globe: on along its own heading, past the rail, and back onto it, arriving straight down
      // the hand-over to the domains is on the head's own line (opt.joint: where it falls in the domains' frame, above
      // their top edge), so the head never waits at the stage's foot; it arrives along the domains' first heading
      const ex = rx[M], ey = ry[M], bx = railX, by = opt.joint ? H + opt.joint() : H;
      const jd = opt.joinDir ? opt.joinDir() : [0, 1];
      let tx = ex - rx[M - 1], ty = ey - ry[M - 1], tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
      if (ty < 0.3) { ty = 0.3; tl = Math.hypot(tx, ty); tx /= tl; ty /= tl; }
      swingAt = -1;
      if (rail) {
        // phones: the rail is the start margin; the S lands on it before the words, then the band runs down the rail.
        // Under the words it sweeps across to the domains' lane (the upper part of the S the page shares)
        const sw = seam && seam.above, ys = sw ? H + sw[2] : by, rx0 = sw ? sw[1] : bx;
        // the hook lands on the rail above the words while they rise past Israel, never across them
        // (when they come close under Israel the turn tightens rather than cut through them)
        const pad = 10 + (opt.amp ? opt.amp() : 26) * 1.2;
        let yJ = Math.min(by - 30, ys, ey + Math.max(140, 0.22 * H));
        if (wTop !== null && wTop - pad > ey + 28) yJ = Math.min(yJ, wTop - pad);
        const k = (yJ - ey) * 0.5;
        segs.push(["C", ex, ey, ex + tx * k, ey + ty * k, rx0, yJ - k * 0.8, rx0, yJ]);
        if (yJ < ys - 1) segs.push(["L", rx0, yJ, rx0, ys]);
        if (sw) { swingAt = segs.length; segs.push(["C", sw[1], H + sw[2], sw[3], H + sw[4], sw[5], H + sw[6], sw[7], H + sw[8]]); }
      } else {
        // a tall wide frame: the band hooks out to a lane beside the words' resting place, runs down it and swings over
        // to the rail below them (the head waits while the words pass; this way they never keep it for good)
        let lane = null;
        if (fw) {
          const a = opt.amp ? opt.amp() : 26, pad = 16 + a * 1.5, yL = fw.top - pad, yS = fw.bottom + pad;
          const xl = fw.left - pad - a, xr = fw.right + pad + a;
          const x = xl >= 24 + a * 2 ? xl : xr <= W - 24 - a * 2 ? xr : null;
          if (x !== null && yL > ey + 60 && by - yS > 80) lane = { x, yL, yS };
        }
        if (lane) {
          const k = (lane.yL - ey) * 0.5, k2 = (by - lane.yS) * 0.5;
          segs.push(["C", ex, ey, ex + tx * k, ey + ty * k, lane.x, lane.yL - k * 0.8, lane.x, lane.yL]);
          segs.push(["L", lane.x, lane.yL, lane.x, lane.yS]);
          segs.push(["C", lane.x, lane.yS, lane.x, lane.yS + k2, bx - jd[0] * k2, by - jd[1] * k2, bx, by]);
        } else {
          // wide: the rail is out in the open night beside the first picture. The band first falls on the start side of
          // the campus, clear of the intro's words, and swings over to the rail only in the stage's lower third, which it
          // reaches after the words have scrolled up past it
          const side = bx > ex ? 1 : -1;
          const mx = ex + (bx - ex) * 0.25, my = ey + (by - ey) * 0.38;
          let mtx = side * 0.55, mty = 0.84; const ml = Math.hypot(mtx, mty); mtx /= ml; mty /= ml;
          const d1 = Math.hypot(mx - ex, my - ey), d2 = Math.hypot(bx - mx, by - my);
          segs.push(["C", ex, ey, ex + tx * d1 * 0.45, ey + ty * d1 * 0.45, mx - mtx * d1 * 0.4, my - mty * d1 * 0.4, mx, my]);
          const k3 = (by - my) * 0.5;
          segs.push(["C", mx, my, mx + mtx * d2 * 0.4, my + mty * d2 * 0.4, bx - jd[0] * k3, by - jd[1] * k3, bx, by]);
        }
      }
      const ke = SITE_K.eur * SUB - i0, ki = SITE_K.isr * SUB - i0;
      ribbon.setPath(segs, [ke, ki]);
      const mk = ribbon.marks, L = ribbon.L;
      fG = mk[M - i0] / L;
      eur.f = ke >= 0 ? mk[ke] / L : 0;
      isr.f = mk[ki] / L;
    }
    // the entrance draws the line over the globe; the scroll draws its way down. Reduced motion: the line over the globe,
    // and its way down once the opening words have gone (it would run behind them)
    const ent = reduce ? 1 : easeInOut(clamp01((time - 1.15) / 2.5));
    // eased in, and at full speed when the journey ends, so the domains' head takes over without a stop
    const u = clamp01((progress - 0.05) / 0.95);
    let down = reduce ? (progress > 0.5 ? 1 : 0) : u * u * (2 - u) * ent;
    // the band never runs over the intro's words. Where its way down would enter them (with the band's width around
    // it) the head waits, and it goes on once they have scrolled up past that point; it eases there. Wide screens:
    // all the way down. Phones: the rail runs beside the words, only the S under them waits (even with reduced motion,
    // where it then simply appears once the intro has settled)
    const gate = opt.words && (rail ? swingAt >= 0 : !reduce);
    if (gate) {
      const w = opt.words(), pts = ribbon.pts, L = ribbon.L;
      let hit = false;
      if (w && pts && w.bottom > 0 && w.top < H) {
        const pad = rail ? 12 : 16 + (opt.amp ? opt.amp() : 26) * 1.5, from = rail ? ribbon.marks[swingAt] : fG * L;
        for (let j = 0; j < pts.length; j++) {
          const q = pts[j];
          if (q.s < from || q.x < w.left - pad || q.x > w.right + pad || q.y < w.top - pad || q.y > w.bottom + pad) continue;
          const d = Math.max(0, (q.s / L - fG) / (1 - fG) - 0.01);
          if (d < down) { down = d; hit = true; }
          break;
        }
      }
      // the head eases only around a wait (held, and catching up after it); otherwise it is exactly where the scroll
      // puts it, so it is complete the moment the journey ends and the domains' head goes on from there
      if (hit) easing = true;
      if (reduce || progress >= 1) { easing = false; downS = down; }
      else if (easing) { downS += (down - downS) * Math.min(1, dtT * 7); if (!hit && Math.abs(down - downS) < 0.003) easing = false; down = downS; }
      else downS = down;
    } else downS = down;
    const head = fG * ent + (1 - fG) * down;
    ribbon.draw(head);
    return head;
  }

  function render(now = performance.now()) {
    const time = (now - t0) / 1000, dt = Math.min(0.1, Math.max(0, time - lastT)); lastT = time;
    U.uTime.value = reduce ? 4 : time;

    // entrance: the matrix lights up outwards from Israel while the models rise; then the trail runs through them
    const e = reduce ? 1 : clamp01((time - 0.25) / 2.3);
    U.uReveal.value = reduce || e >= 1 ? 9 : easeOut(e) * 3.2;
    U.uOn.value = reduce ? 1 : smooth(0.15, 0.6, e);

    // scroll: from the hero frame to the dive
    const p = reduce ? 0 : smooth(0, 0.7, progress);
    const a = F.a, b = F.b;
    // the roll: the Earth turns slowly to and fro (and leans with the pointer); it settles as the camera dives
    const calm = reduce ? 0 : 1 - p;
    const spinIn = reduce ? 0 : (1 - easeOut(e)) * -24;
    mouse.x += (mouse.tx - mouse.x) * 0.05; mouse.y += (mouse.ty - mouse.y) * 0.05;
    if (Math.abs(mouse.tx - mouse.x) + Math.abs(mouse.ty - mouse.y) < 0.002) { mouse.x = mouse.tx; mouse.y = mouse.ty; }
    const awake = time < 3.4 || time - woke < 1.6 ? 1 : 0;
    roll += (awake - roll) * Math.min(1, dt * 2.6); if (!awake && roll < 0.01) roll = 0;
    rollT += dt * roll;
    const rollLon = 4 * Math.sin((rollT * 2 * Math.PI) / 46 + 0.6), rollLat = 1.8 * Math.sin((rollT * 2 * Math.PI) / 61 + 2.1);
    view.R = lerp(a.R, b.R, p); view.cx = lerp(a.cx, b.cx, p); view.cy = lerp(a.cy, b.cy, p);
    view.lat = lerp(a.lat, b.lat, p) + calm * (rollLat + mouse.y * 1.4);
    view.lon = lerp(a.lon, b.lon, p) + calm * (rollLon + spinIn + mouse.x * 2.2);
    globe.rotation.set(view.lat * DEG, -view.lon * DEG, 0);
    place(view.R, view.cx, view.cy);
    U.uDim.value = lerp(1, 0.5, smooth(0.3, 0.75, progress));

    // the trail first (it tells each site whether the energy has reached it)
    const head = trail(time, e) ?? 1;

    // the sites rise, then light up when the trail's head reaches them
    for (const s of Object.values(sites)) {
      for (const part of s.parts) {
        const g = reduce ? 1 : easeOut(clamp01((time - part.t) / 0.9));
        part.o.scale.y = Math.max(0.001, g); part.o.visible = g > 0.002;
      }
      const target = reduce || head >= s.f - 0.004 ? 1 : 0;
      s.power = reduce ? 1 : s.power + (target - s.power) * Math.min(1, dt * 2.6);
      const pw = s.power;
      s.green.color.copy(dimGreen).lerp(GREEN, pw);
      for (const l of s.lights) l.material.opacity = pw * (0.75 + 0.25 * Math.sin(time * 2.1 + l.position.x * 40));
      for (const bar of s.bars) bar.m.scale.y = Math.max(0.04, pw * (0.62 + 0.3 * Math.sin(time * 0.45 + bar.ph)));
      for (const r of s.rotors) r.rotation.z -= reduce ? 0 : dt * (0.35 + 1.5 * pw);
      s.pad.material.opacity = (0.18 + 0.5 * pw) * U.uOn.value * (0.85 + 0.15 * Math.sin(time * 1.7));
      s.core.material.opacity = pw * (0.65 + 0.2 * Math.sin(time * 2.4));
      const k = ((time + (s === eur ? 1.4 : 0)) % 3.4) / 3.4;
      s.ring.scale.setScalar((s === isr ? 0.25 : 0.2) + k * (s === isr ? 0.35 : 0.28));
      s.ring.material.opacity = reduce ? 0 : Math.pow(1 - k, 1.7) * 0.4 * pw;
      if (s === isr && pw > 0.5 && !ready) { ready = true; tReady = time; stage.classList.add("gl-ready"); }
    }
    if (reduce && !ready) { ready = true; tReady = -9; stage.classList.add("gl-ready"); }

    globe.updateMatrixWorld(true);
    for (const s of Object.values(sites)) lean(s);
    globe.updateMatrixWorld(true);
    camera.layers.set(0); renderer.autoClear = true; renderer.render(scene, camera);
    renderer.autoClear = false; renderer.clearDepth();
    camera.layers.set(1); renderer.render(scene, camera);

    // pins follow their models; they come in once the campus has power and leave as soon as the camera starts to move
    // (reduced motion: the camera stays, so do they)
    const pinA = (reduce ? 1 : smooth(0.1, 0.0, progress)) * (ready ? clamp01((time - tReady) / 0.8) : 0);
    // the labels leave the reading order with the globe (a hidden label is not text on the page)
    const pinsOn = pinA > 0.02;
    if (pinsOn !== pinsShown) { pinsShown = pinsOn; if (pinsOn) { pinsRoot.removeAttribute("aria-hidden"); measureFloor(); } else pinsRoot.setAttribute("aria-hidden", "true"); }
    for (const pin of pins) {
      tmpW.copy(pin.atV).applyMatrix4(pin.atO.matrixWorld);
      tmpN.copy(pin.site.n).applyQuaternion(globe.quaternion);
      projectW(tmpW, tmpN, pp);
      const tx = pp.x + (F.tall ? pin.tdx : pin.dx) * view.R, ty = pp.y + (F.tall ? pin.tdy : pin.dy) * view.R;
      const o = pp.facing > 0.15 && !(F.tall && pin.tallHide) && ty + (pin.h || 0) / 2 < floorY - 8 ? pinA : 0;
      const left = tx < pp.x;
      // every value is written only when it changed (the loop runs every frame, the page should not)
      const w = pin.w, op = o.toFixed(3), ex = left ? tx + 6 : tx - 6;
      const dtr = `translate3d(${pp.x.toFixed(1)}px,${pp.y.toFixed(1)}px,0)`;
      const pt = `translate3d(${tx.toFixed(1)}px,${ty.toFixed(1)}px,0) translate(${left ? "-100%" : "0"},-50%)`;
      const ld = `M${pp.x.toFixed(1)} ${pp.y.toFixed(1)} L${ex.toFixed(1)} ${ty.toFixed(1)}`;
      if (dtr !== w.dt) pin.dot.style.transform = w.dt = dtr;
      if (pt !== w.pt) pin.el.style.transform = w.pt = pt;
      if (ld !== w.ld) pin.line.setAttribute("d", w.ld = ld);
      if (op !== w.op) { w.op = op; pin.dot.style.opacity = pin.el.style.opacity = pin.line.style.opacity = op; }
      const vz = o > 0.02 ? "visible" : "hidden";
      if (vz !== w.vz) { pin.el.style.visibility = w.vz = vz; pin.line.style.display = vz === "hidden" ? "none" : ""; }
    }
  }

  function loop(now) { raf = requestAnimationFrame(loop); render(now); }
  function start() { if (running || reduce) return; running = true; raf = requestAnimationFrame(loop); }
  function stop() { running = false; cancelAnimationFrame(raf); }

  if (finePointer && !reduce) {
    addEventListener("pointermove", (ev) => {
      mouse.tx = (ev.clientX / innerWidth) * 2 - 1; mouse.ty = (ev.clientY / innerHeight) * 2 - 1; wake();
    }, { passive: true });
  }
  new ResizeObserver(resize).observe(stage);
  resize();
  // the opening words settle when the font arrives
  if (document.fonts) document.fonts.ready.then(() => { measureFloor(); sig = ""; if (!running) render(); });
  // render only while the stage is on screen and the tab is visible
  let vis = true;
  new IntersectionObserver((es) => { vis = es[0].isIntersecting; vis && !document.hidden ? start() : stop(); }).observe(stage);
  document.addEventListener("visibilitychange", () => { document.hidden ? stop() : vis && start(); });
  stage.classList.add("gl-on");
  if (reduce) render(); else start();

  return {
    setProgress(v) { const pv = clamp01(v); if (pv !== progress) wake(); progress = pv; if (!running) render(); },
    hub() { tmpW.copy(hubV).applyMatrix4(globe.matrixWorld); projectW(tmpW, tmpN.copy(tmpW).normalize(), sp); return { x: sp.x, y: sp.y }; },
    resize,
  };
}
