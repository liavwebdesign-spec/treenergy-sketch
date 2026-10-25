// Treenergy · the night Earth behind the opening of the page.
// Round 5 (18.10): a real Earth at night, halfway between the owner's sketch and the client's picture: the day colours
// of the planet under moonlight (water, deserts, forests), the cities' own lights, thin clouds, the blue rim on the end
// side and the first light of a sun behind it. The company's work stands on it as small lit models, spread over the
// globe: the charging station in Israel, a solar farm in the Sahara, battery storage in Arabia, a server farm in northern
// Europe and the European site with its turbines. A green grid of glowing lines joins them. No labels: a hovered (or
// focused) model opens its domain's card; on touch the cards take turns by themselves until the visitor touches one.
// The green trail crosses the globe to Israel and rests there; when the first screen is left it flows on down, in one S,
// onto the domains rail. Scroll drives one value (0..1 over the journey): the camera dives toward Israel.
import * as THREE from "three";
import { Ribbon } from "./ribbon.js";

const DEG = Math.PI / 180;
const GREEN = new THREE.Color("#30F77B");
const ISR = { lat: 31.7, lon: 34.9 };
// the models, spread over the globe (Liav 18.10, from the client: "not in one spot", and a server farm must be there)
export const LL = {
  chg: [32.45, 35.35],   // Israel: the station the energy arrives at
  sol: [26.0, 20.0],     // the Sahara
  sto: [25.5, 46.0],     // Arabia
  srv: [54.4, 23.2],     // northern Europe
  eur: [44.6, 10.8],     // the European site, unchanged (Liav decides on it)
};
// the trail's way over the globe: in from the Atlantic over Iberia, through the European site, over Greece and the sea,
// and it ends on Israel, where its head rests (the client: "the dot should sit on Israel")
const ROUTE = [[40, -21], [42.6, -5], LL.eur, [39.2, 20.5], [34.4, 28.2], [ISR.lat, ISR.lon]];
const SUB = 10;                                   // samples per span: every site falls on a known sample
const SITE_K = { eur: 2, isr: 5 };
// the grid: lines of light from Israel and from the European site to the others, through real cities on the way
const NET = [
  { from: "chg", to: "sol", way: [[31.25, 32.3], [30.05, 31.25], [28.6, 25.4]] },
  { from: "chg", to: "sto", way: [[31.0, 37.6], [28.9, 41.6]] },
  { from: "chg", to: "srv", way: [[35.0, 33.4], [37.98, 23.73], [44.8, 20.5], [52.2, 21.0]] },
  { from: "eur", to: "srv", way: [[48.1, 11.6], [52.5, 13.4]] },
  { from: "eur", to: "sol", way: [[36.8, 10.2], [32.9, 13.2]] },
  { from: "eur", to: null, way: [[40.85, 14.27], [37.98, 23.73]], faint: true },
  { from: "chg", to: null, way: [[30.05, 31.25], [24.1, 32.9]], faint: true },
  { from: "chg", to: null, way: [[33.3, 44.4], [35.7, 51.4]], faint: true, short: 0.45 },
];

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
const NOISE = /* glsl */`
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0); const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy)); vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz); vec3 l=1.0-g; vec3 i1=min(g.xyz,l.zxy); vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx; vec3 x2=x0-i2+C.yyy; vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857; vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z);
  vec4 x_=floor(j*ns.z); vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy; vec4 y=y_*ns.x+ns.yyyy; vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy); vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0; vec4 s1=floor(b1)*2.0+1.0; vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy; vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x); vec3 p1=vec3(a0.zw,h.y); vec3 p2=vec3(a1.xy,h.z); vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0); m=m*m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}`;
const SPHERE_VS = /* glsl */`
varying vec3 vN; varying vec3 vV; varying vec3 vObj;
void main(){
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vN = normalize(normalMatrix * normal);
  vV = normalize(-mv.xyz);
  vObj = position;
  gl_Position = projectionMatrix * mv;
}`;
// The Earth. The textures are sRGB; the light is mixed in linear and the result is graded back.
// Moon: a cool light from the front and above, so land and sea read. Sun: just behind the end-side limb (the dawn the
// client's picture has), it lights a thin crescent and glints on the water there. Cities: warm, with their glow.
const EARTH_FS = /* glsl */`
uniform sampler2D uColor, uLights, uMask;
uniform vec3 uMoon, uSun, uHub;
uniform vec3 uSites[5];
uniform float uTime, uDim, uOn, uReveal, uSunAmt;
uniform vec2 uFocus; uniform float uDof, uDofR, uZoom;
varying vec3 vN; varying vec3 vV; varying vec3 vObj;
${NOISE}
float fbm(vec3 p){ float a = 0.5, s = 0.0; for (int i = 0; i < 4; i++){ s += a * snoise(p); p = p * 2.07 + vec3(3.1, 1.7, 5.3); a *= 0.5; } return s; }
vec3 lin(vec3 c){ return c * c * (c * 0.32 + 0.68); }   // close to sRGB -> linear, cheap
void main(){
  vec3 p = normalize(vObj);
  vec2 uv = vec2(atan(p.x, p.z) * 0.15915494 + 0.5, asin(clamp(p.y, -1.0, 1.0)) * 0.31830989 + 0.5);
  // the seam of the map (the date line) must not pick a tiny mip level
  vec2 dx = dFdx(uv), dy = dFdy(uv); dx.x -= floor(dx.x + 0.5); dy.x -= floor(dy.x + 0.5);
  // round 6: the dive has a depth of field, as the tour's pictures have. The ground round the sites in view stays sharp
  // and the rest of the screen goes soft (the words' side most), so the close Earth reads as a lens, not a soft map
  float soft = uDof * smoothstep(0.5, 1.45, length(gl_FragCoord.xy - uFocus) / uDofR);
  float bl = 1.0 + soft * 6.0;
  dx *= bl; dy *= bl;
  vec3 alb = lin(textureGrad(uColor, uv, dx, dy).rgb);
  float land = textureGrad(uMask, uv, dx, dy).r;
  float city = textureGrad(uLights, uv, dx, dy).r;
  float cityGlow = textureGrad(uLights, uv, dx * 9.0, dy * 9.0).r;
  // close up the maps are softer than the screen: where the ground is in focus it gets a fine relief of its own, and the
  // cities break into points of light instead of soft blots
  float zk = smoothstep(0.75, 1.7, uZoom) * (1.0 - soft);
  if (zk > 0.01) {
    float det = snoise(p * 230.0) * 0.6 + snoise(p * 540.0) * 0.4;
    alb *= 1.0 + det * 0.3 * zk * land;
    city = clamp(city * (1.0 + det * 0.85 * zk) - 0.04 * zk, 0.0, 1.0);
    cityGlow *= 1.0 - 0.45 * zk;
  }
  vec3 N = normalize(vN), V = normalize(vV);
  float facing = clamp(dot(N, V), 0.0, 1.0);
  float lm = max(dot(N, uMoon), 0.0), ls = max(dot(N, uSun), 0.0);
  float sunK = pow(ls, 1.6) * uSunAmt;                // the dawn: a thin crescent on the limb toward the sun
  float dawn = smoothstep(0.0, 0.3, dot(N, uSun)) * uSunAmt;
  vec3 moonC = vec3(0.58, 0.72, 1.0), skyC = vec3(0.42, 0.56, 1.0), sunC = vec3(1.0, 0.8, 0.58);
  float wet = 1.0 - land;

  // the night grade (halfway between the sketch's deep blue and a real night photograph): the ground keeps its relief
  // and a little of its colour, the deserts are pressed down, the forests keep their green (the client asked for trees)
  float lum = dot(alb, vec3(0.2126, 0.7152, 0.0722));
  float veg = smoothstep(0.0, 0.03, alb.g - max(alb.r * 0.9, alb.b));
  vec3 g = mix(vec3(lum) * vec3(0.9, 0.9, 1.0), alb, 0.4);
  g = mix(g, alb * vec3(0.55, 1.35, 0.75) * 1.9, veg * 0.9);
  // the bright deserts are pressed down further (close up they turned to grey sand under the words), so the lights
  // and the grid own the night
  g *= 1.0 - smoothstep(0.16, 0.5, lum) * (1.0 - veg) * 0.3;
  g = pow(g, vec3(0.8));
  vec3 landC = g * 0.11 * (vec3(0.5, 0.62, 0.9) * 0.34 + vec3(0.68, 0.78, 1.0) * lm * 0.95);
  // the sea: a deep brand blue, lighter over the shallow shelves
  float shelf = smoothstep(0.02, 0.11, alb.g + alb.b * 0.5);
  vec3 seaC = mix(vec3(0.0016, 0.011, 0.066), vec3(0.005, 0.04, 0.115), shelf) * (0.48 + 0.72 * lm);
  vec3 col = mix(seaC, landC, land);
  col += mix(vec3(0.02, 0.05, 0.12), g * 0.5, land) * sunC * sunK * 1.6;

  // water: the moon's sheen and the dawn's glint
  vec3 hm = normalize(uMoon + V), hs = normalize(uSun + V);
  float fres = 0.04 + 0.96 * pow(1.0 - facing, 5.0);
  col += wet * vec3(0.45, 0.62, 1.0) * (pow(max(dot(N, hm), 0.0), 160.0) * 0.16 + pow(max(dot(N, hm), 0.0), 18.0) * 0.012);
  col += wet * sunC * pow(max(dot(N, hs), 0.0), 50.0) * 1.4 * uSunAmt;
  col += wet * vec3(0.03, 0.1, 0.32) * fres * 0.5;

  // clouds: a few thin ones, mostly over the mid latitudes and the sea, never over the models
  float t = uTime * 0.0035;
  vec3 q = vec3(p.x * cos(t) - p.z * sin(t), p.y, p.x * sin(t) + p.z * cos(t)) * 2.4;
  float warp = snoise(q * 0.9 + vec3(7.2, 1.3, 4.1));
  float n = fbm(q + vec3(warp * 0.6, warp * 0.3, 0.0));
  float band = smoothstep(0.35, 0.7, abs(p.y)) * 0.4 + wet * 0.1;
  float keep = 1.0;
  for (int i = 0; i < 5; i++) keep *= smoothstep(0.05, 0.14, distance(p, uSites[i]));
  float cl = smoothstep(0.22, 0.72, n + band - 0.26) * 0.55 * keep;
  vec3 cloudC = skyC * 0.022 + moonC * lm * 0.05 + sunC * sunK * 0.5;
  col = mix(col, cloudC, cl);

  // the cities, lit outward from Israel as the page opens; the dawn puts them out
  float d = acos(clamp(dot(p, uHub), -1.0, 1.0));
  float lit = 1.0 - smoothstep(uReveal - 0.18, uReveal, d);
  float front = exp(-pow((d - uReveal) / 0.06, 2.0)) * step(0.001, uReveal) * (1.0 - step(3.0, uReveal));
  vec3 lc = mix(vec3(1.0, 0.46, 0.13), vec3(1.0, 0.84, 0.55), city);
  col += lc * (city * city * 2.2 + cityGlow * cityGlow * 0.9) * lit * (1.0 - cl * 0.8) * (1.0 - dawn * 0.8);
  col += vec3(0.19, 0.97, 0.48) * front * 0.1 * (0.4 + land);

  // the air at the limb: a blue haze, and the dawn's cyan where the sun is
  float rim = pow(1.0 - facing, 3.2);
  col += vec3(0.02, 0.09, 0.36) * rim * (0.45 + 0.8 * lm) + vec3(0.2, 0.62, 1.0) * rim * dawn * 0.9;

  col *= mix(0.45, 1.0, uDim);
  col = 1.0 - exp(-col * 1.25);                     // soft shoulder
  gl_FragColor = vec4(pow(col, vec3(0.4545)) * uOn, 1.0);
}`;
// the outer air: the blue and cyan rim on the end side of the globe (the client asked to keep it), and the sun's first
// light where the dawn is
const ATMO_FS = /* glsl */`
uniform vec3 uRimL, uSun; uniform float uDim, uOn, uSunAmt, uAir;
varying vec3 vN; varying vec3 vV; varying vec3 vObj;
void main(){
  float t = clamp(-dot(vN, vV), 0.0, 1.0);
  float i = pow(clamp(t / 0.553, 0.0, 1.0), 3.2);
  float lit = clamp(dot(vN, uRimL) * 0.5 + 0.5, 0.0, 1.0);
  vec3 col = mix(vec3(0.10, 0.33, 1.0), vec3(0.19, 0.97, 0.62), 0.45 * pow(lit, 3.0));
  vec2 sd = normalize(uSun.xy), nd = normalize(vN.xy + 1e-5);
  float hot = pow(max(dot(nd, sd), 0.0), 18.0) * uSunAmt;
  col = col * (0.3 + 0.9 * lit) + vec3(0.75, 0.92, 1.0) * hot * 1.1;
  gl_FragColor = vec4(col * i * mix(0.45, 1.0, uDim) * uOn * uAir, 1.0);
}`;
// the grid: flat ribbons on the ground, a bright core and a soft halo, growing out from their source, light running
// along them
const NET_VS = /* glsl */`
attribute vec3 aSide; attribute float aV, aS;
uniform float uHW;
varying float vV, vS, vF;
void main(){
  vec3 p = position + aSide * aV * uHW;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  vec3 n = normalize(normalMatrix * normalize(position));
  vF = smoothstep(0.02, 0.3, dot(n, normalize(-mv.xyz)));
  vV = aV; vS = aS;
  gl_Position = projectionMatrix * mv;
}`;
const NET_FS = /* glsl */`
uniform float uTime, uGrow, uOn, uDim, uK;
varying float vV, vS, vF;
void main(){
  float shown = 1.0 - smoothstep(uGrow - 0.025, uGrow, vS);
  if (shown <= 0.0) discard;
  float core = exp(-vV * vV * 26.0), halo = exp(-vV * vV * 3.2) * 0.3;
  float ph = fract(vS * 3.2 - uTime * 0.32);
  float pulse = smoothstep(0.0, 0.04, ph) * smoothstep(0.14, 0.04, ph);
  float tip = exp(-pow((uGrow - vS) / 0.035, 2.0));
  float a = (core * (0.5 + 1.1 * pulse) + halo * (0.55 + 0.8 * pulse) + tip * 1.4 * core) * shown * vF * uOn * mix(0.55, 1.0, uDim) * uK;
  vec3 col = mix(vec3(0.19, 0.97, 0.48), vec3(0.82, 1.0, 0.88), clamp(core * 0.3 + tip * 0.6 + pulse * core * 0.4, 0.0, 1.0));
  gl_FragColor = vec4(col * a, 1.0);
}`;
// the grid's junctions: small points of light, on once the line has reached them
const NODE_VS = /* glsl */`
attribute float aS;
uniform float uGrow, uPx, uOn;
varying float vA;
void main(){
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vec3 n = normalize(normalMatrix * normalize(position));
  vA = (1.0 - smoothstep(uGrow - 0.06, uGrow - 0.001, aS)) * smoothstep(0.05, 0.3, dot(n, normalize(-mv.xyz))) * uOn;
  gl_PointSize = uPx;
  gl_Position = projectionMatrix * mv;
}`;
const NODE_FS = /* glsl */`
varying float vA;
void main(){
  float r = length(gl_PointCoord - 0.5);
  float a = (smoothstep(0.5, 0.0, r) * 0.55 + smoothstep(0.16, 0.05, r)) * vA;
  if (a < 0.003) discard;
  gl_FragColor = vec4(mix(vec3(0.19, 0.97, 0.48), vec3(0.9, 1.0, 0.94), smoothstep(0.2, 0.0, r)) * a, 1.0);
}`;
// additive light that leaves the canvas alpha alone (the night behind the globe stays the page's)
const ADD = { transparent: true, depthWrite: false, blending: THREE.CustomBlending,
  blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor, blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor };

function canvasTex(size, draw) {
  const c = document.createElement("canvas"); c.width = c.height = size;
  draw(c.getContext("2d"), size);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const radial = (stops) => canvasTex(128, (g, s) => {
  const gr = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  stops.forEach(([o, c]) => gr.addColorStop(o, c)); g.fillStyle = gr; g.fillRect(0, 0, s, s);
});
const glowTexture = () => radial([[0, "rgba(235,255,240,1)"], [0.12, "rgba(120,255,170,.85)"], [0.35, "rgba(48,247,123,.32)"], [1, "rgba(48,247,123,0)"]]);
const poolTexture = () => radial([[0, "rgba(48,247,123,.55)"], [0.4, "rgba(48,247,123,.16)"], [1, "rgba(48,247,123,0)"]]);
// the glowing green frame round a site's footprint (the client's picture has one round its solar farm)
const frameTexture = () => canvasTex(256, (g, s) => {
  const r = (x, y, w, h, k) => { g.beginPath(); g.moveTo(x + k, y); g.arcTo(x + w, y, x + w, y + h, k); g.arcTo(x + w, y + h, x, y + h, k); g.arcTo(x, y + h, x, y, k); g.arcTo(x, y, x + w, y, k); g.closePath(); };
  // round 6: a finer line with a tighter glow (the thick one read as a sticker)
  g.shadowColor = "rgba(48,247,123,1)"; g.shadowBlur = 14; g.strokeStyle = "rgba(48,247,123,.75)"; g.lineWidth = 4;
  r(s * 0.17, s * 0.17, s * 0.66, s * 0.66, 8); g.stroke();
  g.shadowBlur = 0; g.strokeStyle = "rgba(225,255,236,.9)"; g.lineWidth = 1.4; r(s * 0.17, s * 0.17, s * 0.66, s * 0.66, 8); g.stroke();
});
// the soft shadow a building leaves on the ground: a dark rounded square, blurred (drawn off the canvas, its shadow on it)
const shadowTexture = () => canvasTex(128, (g, s) => {
  const o = s * 4, k = s * 0.24, w = s * 0.52;
  g.shadowColor = "rgba(0,3,14,1)"; g.shadowBlur = 16; g.shadowOffsetX = o; g.fillStyle = "#000";
  g.beginPath(); g.roundRect ? g.roundRect(k - o, k, w, w, 10) : g.rect(k - o, k, w, w); g.fill();
});
// the sun's first light over the limb: a white core, a cool halo and a long thin streak along the horizon
const sunTexture = () => canvasTex(256, (g, s) => {
  let gr = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.05, "rgba(240,250,255,.9)"); gr.addColorStop(0.2, "rgba(150,215,255,.32)");
  gr.addColorStop(0.5, "rgba(70,150,255,.08)"); gr.addColorStop(1, "rgba(40,120,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, s, s);
  g.save(); g.translate(s / 2, s / 2); g.scale(1, 0.035);
  gr = g.createRadialGradient(0, 0, 0, 0, 0, s / 2);
  gr.addColorStop(0, "rgba(235,248,255,.9)"); gr.addColorStop(0.4, "rgba(150,210,255,.25)"); gr.addColorStop(1, "rgba(120,190,255,0)");
  g.fillStyle = gr; g.beginPath(); g.arc(0, 0, s / 2, 0, Math.PI * 2); g.fill(); g.restore();
});

// ---- the sites: small lit models of the company's work ----
// Model units: x east, y up, z south; one unit is S of the globe's radius. No scene lights (the models stay crisp and
// cheap): the light is baked into vertex colours. Round 6 (20.10, Liav: "far more professional and tight"): the models
// are lit like the night they stand in, not like a diagram. The moon over the visitor's shoulder lights the roofs and
// the walls fall darker toward their foot; a soft shadow grounds every building; only the roof edges catch a fine line
// of light (no more wire edges round every box); the solar glass catches the sky toward its raised edge; and once the
// energy reaches a site, its green light spills up the walls from the ground. Everything green is light the energy
// switches on.
const SKY = new THREE.Vector3(-0.42, 1, 0.62).normalize();
const SPILL = 0.06;                                   // how high (model units) the green light climbs a wall
// each face: ambient + moon, and a wall falls darker toward its foot (tops keep their light). at: the height the
// geometry's foot stands at in its part, so the green spill is measured from the ground
function shade(g, hex, at = 0, amb = 0.24, dif = 0.88, foot = 0.5) {
  const c = new THREE.Color(hex), nr = g.attributes.normal, ps = g.attributes.position, n = nr.count;
  g.computeBoundingBox();
  const y0 = g.boundingBox.min.y, hh = Math.max(1e-6, g.boundingBox.max.y - y0);
  const col = new Float32Array(n * 3), low = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const ny = nr.getY(i), y = ps.getY(i);
    const k = (amb + dif * Math.max(0, nr.getX(i) * SKY.x + ny * SKY.y + nr.getZ(i) * SKY.z)) * (ny > 0.9 ? 1 : foot + (1 - foot) * ((y - y0) / hh));
    col[i * 3] = c.r * k; col[i * 3 + 1] = c.g * k; col[i * 3 + 2] = c.b * k;
    low[i] = ny > 0.9 ? 0 : Math.max(0, 1 - (at + y) / SPILL);
  }
  g.setAttribute("aCol", new THREE.BufferAttribute(col, 3));
  g.setAttribute("aLow", new THREE.BufferAttribute(low, 1));
  return g;
}
// the solar glass: deep blue at its low edge, catching the sky toward its raised one; the frame's sides pale metal
const GLASS_LO = new THREE.Color("#07173f"), GLASS_HI = new THREE.Color("#2f63cc"), GLASS_RIM = new THREE.Color("#5d709a");
function shadeGlass(g, d) {
  const nr = g.attributes.normal, ps = g.attributes.position, n = nr.count, c = new THREE.Color(), col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    if (nr.getY(i) > 0.9) { const t = Math.min(1, Math.max(0, 0.5 - ps.getZ(i) / d)); c.copy(GLASS_LO).lerp(GLASS_HI, t * t); }
    else c.copy(GLASS_RIM);
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  g.setAttribute("aCol", new THREE.BufferAttribute(col, 3));
  g.setAttribute("aLow", new THREE.BufferAttribute(new Float32Array(n), 1));
  return g;
}
// the models' material: the baked light, and the green spill from the ground once the site has power
const FILL_VS = /* glsl */`
attribute vec3 aCol; attribute float aLow;
varying vec3 vC; varying float vL;
void main(){ vC = aCol; vL = aLow; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const FILL_FS = /* glsl */`
uniform vec3 uGlow;
varying vec3 vC; varying float vL;
void main(){
  gl_FragColor = vec4(vC + uGlow * vL * vL, 1.0);
  #include <colorspace_fragment>
}`;
function lineGeo(a) { const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(a, 3)); return g; }

function buildSites(tex, pool, frameTex, shadowTex) {
  const rim = new THREE.LineBasicMaterial({ color: 0xdce8ff, transparent: true, opacity: 0.42 });
  const fine = new THREE.LineBasicMaterial({ color: 0xa9c2ff, transparent: true, opacity: 0.26 });
  const cell = new THREE.LineBasicMaterial({ color: 0x86a6ee, transparent: true, opacity: 0.3 });
  const ground = new THREE.LineBasicMaterial({ color: 0xcfe0ff, transparent: true, opacity: 0.16 });
  const seam = new THREE.LineBasicMaterial({ color: 0x0a1630, transparent: true, opacity: 0.6 });
  // the night palette: moonlit steel and the brand navy; only the turbines and the chargers are pale
  const NAVY = "#203f80", STEEL = "#566da0", HALL = "#6f84b2", PALE = "#c3cfe8", TURB = "#dde5f5", DARK = "#1b2c54";
  const fillMat = () => new THREE.ShaderMaterial({ vertexShader: FILL_VS, fragmentShader: FILL_FS,
    uniforms: { uGlow: { value: new THREE.Color(0, 0, 0) } }, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
  let cur = null;                                     // the site being built (its material carries its own spill)
  // the outline of a box's top: the one edge that catches the light
  const top = (w, y, d) => lineGeo([-w / 2, y, -d / 2, w / 2, y, -d / 2, w / 2, y, -d / 2, w / 2, y, d / 2, w / 2, y, d / 2, -w / 2, y, d / 2, -w / 2, y, d / 2, -w / 2, y, -d / 2]);
  const block = (w, h, d, hex, withRim = true, at = 0) => {
    const m = new THREE.Mesh(shade(new THREE.BoxGeometry(w, h, d).translate(0, h / 2, 0), hex, at), cur.fill);
    if (withRim) m.add(new THREE.LineSegments(top(w, h + 0.0003, d), rim));
    return m;
  };
  // a row of solar panels: a thin plate of glass tilted to the south, its cells drawn on it, a fine metal frame
  const panel = (w, d, nx, nz, tilt) => {
    const p = new THREE.Mesh(shadeGlass(new THREE.BoxGeometry(w, 0.006, d).translate(0, 0.003, 0), d), cur.fill);
    const a = [], y = 0.0064;
    for (let i = 1; i < nx; i++) { const x = -w / 2 + (w * i) / nx; a.push(x, y, -d / 2, x, y, d / 2); }
    for (let j = 1; j < nz; j++) { const z = -d / 2 + (d * j) / nz; a.push(-w / 2, y, z, w / 2, y, z); }
    p.add(new THREE.LineSegments(lineGeo(a), cell));
    p.add(new THREE.LineSegments(top(w, y, d), rim));
    p.rotation.x = tilt * DEG;
    return p;
  };
  const greenMat = () => new THREE.MeshBasicMaterial({ color: new THREE.Color("#0c3b2a") });
  const spark = (parent, x, y, z, s, list) => {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 }));
    sp.position.set(x, y, z); sp.scale.setScalar(s); parent.add(sp); list.push(sp); return sp;
  };
  // the light on the ground under a site: a soft pool, and a ring that breathes out (brighter while the site is pointed at)
  const hubLight = (s, r) => {
    const pad = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ map: pool, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 }));
    pad.position.y = 0.002; pad.scale.setScalar(r * 2); s.model.add(pad);
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.97, 1, 96).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: GREEN, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0, side: THREE.DoubleSide }));
    ring.position.y = 0.003; s.model.add(ring);
    s.pad = pad; s.ring = ring; s.ringR = r;
  };
  // a part stands on the ground at (x, z) and leans toward the viewer as one piece (see lean() in mountGlobe);
  // ex, ez: the half size of its footprint; k: how much of the lean it takes (a field lies lower than a building).
  // Its shadow stays flat on the ground (it does not lean) and darkens as the part comes up
  const part = (s, x, z, ex, ez, t, k = 1) => {
    const o = new THREE.Group(); o.position.set(x, 0, z);
    const sh = new THREE.Mesh(new THREE.PlaneGeometry(ex * 3.7, ez * 3.7).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, opacity: 0 }));
    sh.position.set(x, 0.0015, z); sh.renderOrder = -1;
    s.model.add(sh, o); s.parts.push({ o, sh, base: new THREE.Vector3(x, 0, z), ex, ez, t, k });
    return o;
  };
  // the glowing frame round a footprint, on the part's own ground
  const frame = (s, o, w, d) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w * 1.515, d * 1.515).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ map: frameTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 }));
    m.position.y = 0.003; o.add(m); s.glows.push(m);
  };
  const site = () => (cur = { model: new THREE.Group(), parts: [], lights: [], bars: [], rotors: [], glows: [], cool: [], green: greenMat(), fill: fillMat() });

  // --- Israel: a charging station under a solar canopy, its screens lit ---
  const chg = site();
  {
    const c = part(chg, 0, 0, 0.17, 0.09, 1.5);
    for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const post = block(0.008, 0.13, 0.008, STEEL, false); post.position.set(x * 0.15, 0, z * 0.07); c.add(post);
    }
    const roof = block(0.34, 0.012, 0.18, STEEL, true, 0.13); roof.position.y = 0.13; c.add(roof);
    for (let r = 0; r < 2; r++) { const p = panel(0.32, 0.075, 10, 2, 8); p.position.set(0, 0.146, -0.04 + r * 0.08); c.add(p); }
    for (let i = 0; i < 4; i++) {
      const x = -0.12 + i * 0.08;
      const pl = block(0.022, 0.075, 0.018, PALE); pl.position.set(x, 0, -0.03); c.add(pl);
      const scr = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.022, 0.003), chg.green); scr.position.set(x, 0.05, -0.0195); c.add(scr);
      spark(c, x, 0.05, -0.015, 0.06, chg.lights);
    }
    const bays = [];
    for (let x = -0.16; x <= 0.161; x += 0.08) bays.push(x, 0.001, 0.0, x, 0.001, 0.09);
    c.add(new THREE.LineSegments(lineGeo(bays), ground));
    frame(chg, c, 0.36, 0.2);
    hubLight(chg, 0.2);
    chg.anchor = [c, new THREE.Vector3(0, 0.08, 0)]; chg.hit = 0.36;
  }

  // --- the Sahara: a solar farm, long rows of panels inside a glowing frame, an inverter house at its corner ---
  const sol = site();
  {
    const f = part(sol, 0, 0, 0.29, 0.17, 1.15, 0.55);
    const legs = [];
    for (let r = 0; r < 6; r++) for (let c = 0; c < 2; c++) {
      const x = -0.135 + c * 0.27, z = 0.125 - r * 0.05;
      const p = panel(0.25, 0.034, 12, 2, 24); p.position.set(x, 0.016, z); f.add(p);
      legs.push(x - 0.1, 0, z, x - 0.1, 0.016, z, x + 0.1, 0, z, x + 0.1, 0.016, z);
    }
    f.add(new THREE.LineSegments(lineGeo(legs), ground));
    const inv = block(0.04, 0.03, 0.03, PALE); inv.position.set(0.27, 0, 0.16); f.add(inv);
    spark(f, 0.27, 0.035, 0.16, 0.05, sol.lights);
    frame(sol, f, 0.6, 0.36);
    hubLight(sol, 0.3);
    sol.anchor = [f, new THREE.Vector3(0, 0.03, 0)]; sol.hit = 0.62;
  }

  // --- Arabia: battery storage, a row of containers with their charge glowing, a transformer beside them ---
  const sto = site();
  {
    const b = part(sto, 0, 0, 0.22, 0.08, 1.35);
    const barGeo = new THREE.BoxGeometry(0.046, 0.066, 0.004).translate(0, 0.033, 0);
    const track = new THREE.MeshBasicMaterial({ color: 0x0a1a3a });
    // the door frames and the vent strip on each container's face
    const doors = lineGeo([-0.03, 0.006, 0.0653, -0.03, 0.092, 0.0653, 0.03, 0.006, 0.0653, 0.03, 0.092, 0.0653, -0.03, 0.088, 0.0653, 0.03, 0.088, 0.0653]);
    for (let i = 0; i < 5; i++) {
      const c = new THREE.Group(); c.position.set(-0.17 + i * 0.085, 0, 0);
      c.add(block(0.072, 0.1, 0.13, HALL));
      c.add(new THREE.LineSegments(doors, seam));
      const tr = new THREE.Mesh(barGeo, track); tr.position.set(0, 0.016, 0.0655); c.add(tr);
      const bar = new THREE.Mesh(barGeo, sto.green); bar.position.set(0, 0.016, 0.0675); c.add(bar);
      sto.bars.push({ m: bar, ph: i * 1.7 });
      spark(c, 0, 0.05, 0.075, 0.07, sto.lights);
      b.add(c);
    }
    const tf = block(0.06, 0.07, 0.05, NAVY); tf.position.set(0.25, 0, 0.02); b.add(tf);
    const fins = [];
    for (let k = 0; k < 4; k++) { const z = 0.0 + k * 0.012; fins.push(0.22, 0.02, z, 0.22, 0.06, z); }
    b.add(new THREE.LineSegments(lineGeo(fins), fine));
    frame(sto, b, 0.56, 0.2);
    hubLight(sto, 0.26);
    sto.anchor = [b, new THREE.Vector3(0, 0.06, 0)]; sto.hit = 0.52;
  }

  // --- northern Europe: a server farm, two long halls with their light strips, cooling on the roofs ---
  const srv = site();
  {
    const cool = new THREE.MeshBasicMaterial({ color: 0x9cc4ff, transparent: true, opacity: 0.25 });
    srv.cool.push(cool);
    const hall = (o, w, d, x, z) => {
      const h = 0.07;
      const m = block(w, h, d, HALL); m.position.set(x, 0, z); o.add(m);
      // the strips: rows of light along the long faces
      const sg = new THREE.PlaneGeometry(w * 0.9, 0.007);
      for (const y of [0.022, 0.044]) {
        const a = new THREE.Mesh(sg, cool); a.position.set(x, y, z + d / 2 + 0.0008); o.add(a);
      }
      // cooling units on the roof
      for (let i = 0; i < 6; i++) { const u = block(0.026, 0.012, 0.026, DARK, false, h); u.position.set(x - w / 2 + 0.04 + i * (w - 0.08) / 5, h, z); o.add(u); }
    };
    const s1 = part(srv, 0, 0, 0.22, 0.13, 1.25);
    hall(s1, 0.38, 0.1, 0, -0.06);
    hall(s1, 0.3, 0.09, -0.04, 0.075);
    spark(s1, 0.17, 0.08, 0.06, 0.05, srv.lights);
    frame(srv, s1, 0.46, 0.3);
    hubLight(srv, 0.26);
    srv.anchor = [s1, new THREE.Vector3(0, 0.05, 0)]; srv.hit = 0.5;
  }

  // --- the European site: a solar field, and wind turbines behind it (its place and layout unchanged) ---
  const eur = site();
  {
    const fd = part(eur, 0.16, -0.2, 0.245, 0.12, 1.0);
    const legs = [];
    for (let c = 0; c < 4; c++) for (let r = 0; r < 3; r++) {
      const x = -0.19 + c * 0.125, z = 0.09 - r * 0.09;
      const p = panel(0.11, 0.06, 5, 2, 25); p.position.set(x, 0.026, z); fd.add(p);
      legs.push(x, 0, z, x, 0.026, z);
    }
    fd.add(new THREE.LineSegments(lineGeo(legs), ground));
    const towerGeo = shade(new THREE.CylinderGeometry(0.0055, 0.011, 0.42, 10).translate(0, 0.21, 0), TURB, 0, 0.5, 0.55, 0.72);
    const bladeGeo = shade(new THREE.BoxGeometry(0.011, 0.15, 0.003).translate(0, 0.075, 0), TURB, 0.42, 0.58, 0.45, 1);
    const hubGeo = shade(new THREE.SphereGeometry(0.009, 10, 8), TURB, 0.42);
    const wind = [];
    for (let i = 0; i < 3; i++) {
      const t = part(eur, -0.5 + (i % 2) * 0.07, -0.26 + i * 0.16, 0.012, 0.012, 1.15 + i * 0.12);
      t.add(new THREE.Mesh(towerGeo, eur.fill));
      const nac = block(0.02, 0.02, 0.05, TURB, false, 0.415); nac.position.set(0, 0.415, -0.008); t.add(nac);
      const rotor = new THREE.Group(); rotor.position.set(0, 0.425, 0.02);
      rotor.add(new THREE.Mesh(hubGeo, eur.fill));
      for (let k = 0; k < 3; k++) { const bl = new THREE.Mesh(bladeGeo, eur.fill); bl.rotation.z = (k * 2 * Math.PI) / 3; rotor.add(bl); }
      rotor.rotation.z = i * 0.9;
      t.add(rotor); eur.rotors.push(rotor); wind.push(t);
      spark(t, 0, 0.43, 0.03, 0.05, eur.lights);
    }
    hubLight(eur, 0.18);
    eur.ringOff = 1.4;
    eur.anchor = [fd, new THREE.Vector3(0, 0.05, 0)]; eur.hit = 0.5;
  }
  return { chg, sol, sto, srv, eur };
}

// the grid's lines as flat ribbons: samples along a smooth way through the cities, each with its side on the ground
function buildNet(list, sites) {
  const make = (lines) => {
    const pos = [], side = [], av = [], as = [], idx = [], nodes = [], nodeS = [];
    let base = 0;
    for (const L of lines) {
      const pts = [L.p0, ...L.way.map(([a, b]) => ll2v(a, b)), ...(L.p1 ? [L.p1] : [])];
      const curve = new THREE.CatmullRomCurve3(pts, false, "centripetal", 0.5);
      let ang = 0; for (let i = 1; i < pts.length; i++) ang += pts[i - 1].angleTo(pts[i]);
      const N = Math.max(12, Math.ceil(ang / (0.35 * DEG)));
      const sm = curve.getSpacedPoints(N).map((v) => v.normalize());
      let s = 0;
      const cut = L.short ? Math.floor(N * L.short) : N;
      for (let i = 0; i <= cut; i++) {
        if (i) s += sm[i - 1].angleTo(sm[i]);
        const a = sm[Math.max(0, i - 1)], b = sm[Math.min(N, i + 1)];
        const t = b.clone().sub(a).normalize(), sd = sm[i].clone().cross(t).normalize(), p = sm[i].clone().multiplyScalar(1.0016);
        for (const v of [-1, 1]) { pos.push(p.x, p.y, p.z); side.push(sd.x, sd.y, sd.z); av.push(v); as.push(s); }
        if (i < cut) { const k = base + i * 2; idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3); }   // facing out
      }
      // the junctions: the cities the line passes, and its end
      const wayS = []; let acc = 0, j = 1;
      for (let i = 1; i <= cut && j < pts.length; i++) {
        acc += sm[i - 1].angleTo(sm[i]);
        if (sm[i].angleTo(pts[j]) < 0.5 * DEG || i === cut) { wayS.push([sm[i], acc]); j++; }
      }
      for (const [v, sAt] of wayS) { const p = v.clone().multiplyScalar(1.002); nodes.push(p.x, p.y, p.z); nodeS.push(sAt); }
      if (L.to) (sites[L.to].netAt ||= {})[L.from] = s;
      base += (cut + 1) * 2;
      L.len = s;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("aSide", new THREE.Float32BufferAttribute(side, 3));
    g.setAttribute("aV", new THREE.Float32BufferAttribute(av, 1));
    g.setAttribute("aS", new THREE.Float32BufferAttribute(as, 1));
    g.setIndex(idx);
    const ng = new THREE.BufferGeometry();
    ng.setAttribute("position", new THREE.Float32BufferAttribute(nodes, 3));
    ng.setAttribute("aS", new THREE.Float32BufferAttribute(nodeS, 1));
    return { g, ng };
  };
  const out = {};
  for (const src of ["chg", "eur"]) {
    for (const faint of [false, true]) {
      const lines = list.filter((l) => l.from === src && !!l.faint === faint).map((l) => ({ ...l, p0: ll2v(...LL[src]), p1: l.to ? ll2v(...LL[l.to]) : null }));
      if (lines.length) out[src + (faint ? "f" : "")] = make(lines);
    }
  }
  return out;
}

// Where the globe sits. The owner's drawing: a big Earth, cropped at the start edge of a phone, Europe and Africa in
// view. Wide screens: the same Earth on the end side, the sites up in its open sky, the giant opening line across its
// foot. The second state is the intro: the camera has dived toward Israel on the end side, so the trail leaves it in
// one S onto the rail and the statement has the start side. A frame gives the globe's centre (cx, cy) or, for the dive,
// where Israel must land on screen (hx, hy).
// Round 5: on wide screens the opening line stands high on the end side, in the open night beside the globe (Idan:
// "higher, not at the bottom"); the globe sits a little lower and further toward the start edge to give it the sky.
// low: the round 4 frame, the line across the globe's foot (where the screen is too narrow or square for the line on top)
function frame(W, H, low) {
  const tall = W / H < 1.05;
  if (tall) {
    const R = Math.min(0.8 * W, 0.42 * H);
    return { tall, S: 0.2,
      a: { R, cx: W - R - 14, cy: Math.max(0.355 * H, R * 0.96), lat: 26, lon: 2 },
      b: { R: Math.min(1.72 * W, 0.86 * H), hx: 0.52 * W, hy: 0.2 * H, lat: ISR.lat - 5, lon: ISR.lon - 7 } };
  }
  const R = low ? Math.min(0.8 * H, 0.48 * W) : Math.min(0.78 * H, 0.46 * W);
  // round 6: the dive stops short of where the maps go soft (it went to 1.7 screen heights)
  const b = { R: Math.min(0.72 * W, 1.28 * H), hx: 0.21 * W, hy: 0.37 * H, lat: ISR.lat - 10, lon: ISR.lon - 12 };
  if (low) return { tall, S: 0.17, a: { R, cx: 0.23 * W, cy: 0.65 * H, lat: 22, lon: 18 }, b };
  // the line stands high on the start side: down to the middle of the screen its last 40% stays clear of the rim.
  // On narrower screens the globe slides further out on the end side and turns east by as much, so the sites stay put
  const cy = 0.74 * H, d = cy - 0.5 * H, hc = Math.sqrt(Math.max(0, R * R - d * d));
  const cx = Math.min(0.2 * W, 0.6 * W - hc - 0.06 * R - 14), turn = Math.asin(Math.min(1, (0.2 * W - cx) / R)) * 180 / Math.PI;
  return { tall, S: 0.17, a: { R, cx, cy, lat: 22, lon: 18 - turn }, b };
}

export async function mountGlobe(stage, opt = {}) {
  const canvas = stage.querySelector(".gl-canvas");
  const pinsRoot = stage.querySelector(".gl-pins");
  const trailSvg = stage.querySelector(".gl-trail");
  const reduce = !!window.__still || matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = matchMedia("(hover:hover) and (pointer:fine)").matches;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  } catch (e) { return null; }                       // no WebGL: the night stays without the globe
  renderer.setClearColor(0x000000, 0);

  // the maps: the 2k set first, so the Earth is up quickly; once it stands, the sharper 4k maps take over (phones take
  // only the 4k colour: the lights glow anyway, and the memory is theirs)
  const small = Math.min(innerWidth, innerHeight) < 700;
  const loader = new THREE.TextureLoader(), aniso = renderer.capabilities.getMaxAnisotropy();
  const load = (url) => loader.loadAsync(url).then((t) => {
    t.colorSpace = THREE.NoColorSpace; t.wrapS = THREE.RepeatWrapping; t.anisotropy = Math.min(8, aniso);
    t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true; t.needsUpdate = true; return t;
  });
  const dir = opt.maps || "assets/img/globe/";
  const [mapC, mapL, mapM] = await Promise.all([load(`${dir}earth-color-2k.webp`), load(`${dir}earth-lights-2k.webp`), load(`${dir}earth-mask-2k.png`)]);
  let sharp = false;
  const sharpen = () => {
    if (sharp || opt.sharp === false) return; sharp = true;
    const up = [["uColor", "earth-color-4k.webp"], ...(small ? [] : [["uLights", "earth-lights-4k.webp"], ["uMask", "earth-mask-4k.png"]])];
    for (const [u, f] of up) load(dir + f).then((t) => { const old = U[u].value; U[u].value = t; old.dispose(); if (!running) render(); }).catch(() => {});
  };

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(24, 1, 0.3, 50);
  const globe = new THREE.Group(); globe.rotation.order = "XYZ"; scene.add(globe);
  const hubV = ll2v(ISR.lat, ISR.lon), FOCUS = ll2v(29.6, 39.5);
  // the rim's light (kept from the sketch the client liked), the moon over the visitor's shoulder, the sun behind the
  // end-side limb
  const rimL = new THREE.Vector3(0.55, 0.5, 0.45).normalize();
  const moon = new THREE.Vector3(-0.2, 0.55, 0.81).normalize();
  const sun = new THREE.Vector3(0.44, 0.42, -0.79).normalize();
  const sunAmt = opt.sun ?? (new URLSearchParams(location.search).get("sun") === "0" ? 0 : 1);

  const U = {
    uTime: { value: 0 }, uDim: { value: 1 }, uOn: { value: reduce ? 1 : 0 }, uReveal: { value: reduce ? 9 : 0 },
    uHub: { value: hubV }, uRimL: { value: rimL }, uMoon: { value: moon }, uSun: { value: sun }, uSunAmt: { value: sunAmt }, uAir: { value: opt.air ?? 1 },
    uColor: { value: mapC }, uLights: { value: mapL }, uMask: { value: mapM },
    uSites: { value: Object.values(LL).map(([a, b]) => ll2v(a, b)) },
    uFocus: { value: new THREE.Vector2() }, uDof: { value: 0 }, uDofR: { value: 1 }, uZoom: { value: 1 },
  };

  globe.add(new THREE.Mesh(new THREE.SphereGeometry(1, 160, 112),
    new THREE.ShaderMaterial({ vertexShader: SPHERE_VS, fragmentShader: EARTH_FS, uniforms: U })));
  // the outer air never rotates, so it lives in the scene
  scene.add(new THREE.Mesh(new THREE.SphereGeometry(1.2, 96, 64), new THREE.ShaderMaterial({
    vertexShader: SPHERE_VS, fragmentShader: ATMO_FS, uniforms: U, side: THREE.BackSide, ...ADD })));
  // the sun's first light, on the limb toward the sun (placed in resize)
  const sunSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: sunTexture(), blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, transparent: true, opacity: 0 }));
  sunSprite.renderOrder = 5; sunSprite.visible = sunAmt > 0; scene.add(sunSprite);

  // ---- the sites ----
  const tex = glowTexture();
  const sites = buildSites(tex, poolTexture(), frameTexture(), shadowTexture());
  const { chg, eur } = sites;
  for (const [key, s] of Object.entries(sites)) {
    const n = ll2v(...LL[key]), east = new THREE.Vector3(0, 1, 0).cross(n).normalize(), south = n.clone().cross(east).negate();
    s.key = key; s.n = n; s.f = 0; s.power = reduce ? 1 : 0; s.hot = 0; s.hotT = 0;
    s.root = new THREE.Group();
    s.root.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(east, n, south));
    s.root.position.copy(n).multiplyScalar(1.0035);
    s.root.add(s.model); globe.add(s.root);
    for (const p of s.parts) p.o.scale.y = reduce ? 1 : 0.001;
    // the models are drawn in a second pass, over the globe: a part that leans toward the viewer may dip below the
    // ground on its far side, and the Earth must not cut it
    s.model.traverse((o) => o.layers.set(1));
    // the light and the shadow on the ground are drawn before the models, under them: a leaning part dips below the
    // ground on its far side, and the green pool must not tint its roof (nor the shadow darken it)
    for (const o of [s.pad, s.ring, ...s.parts.map((p) => p.sh)]) o.layers.set(2);
  }
  const dimGreen = new THREE.Color("#0c3b2a");

  // ---- the grid ----
  const net = buildNet(NET, sites);
  const netU = {};
  for (const [key, { g, ng }] of Object.entries(net)) {
    const faint = key.endsWith("f");
    const u = netU[key] = { uTime: U.uTime, uOn: U.uOn, uDim: U.uDim, uGrow: { value: reduce ? 9 : 0 }, uHW: { value: 0.01 }, uK: { value: faint ? 0.45 : 1 }, uPx: { value: 8 } };
    globe.add(new THREE.Mesh(g, new THREE.ShaderMaterial({ vertexShader: NET_VS, fragmentShader: NET_FS, uniforms: u, ...ADD })));
    if (!faint) globe.add(new THREE.Points(ng, new THREE.ShaderMaterial({ vertexShader: NODE_VS, fragmentShader: NODE_FS, uniforms: u, ...ADD })));
  }
  // where the grid starts: Israel once the trail has reached it, the European site once the trail passes there
  const netT0 = { chg: -1, eur: -1 };

  // ---- the cards: each model is a link; pointing at it (or focusing it) opens its domain's card ----
  const pins = [...(pinsRoot ? pinsRoot.querySelectorAll(".gl-pin") : [])].map((el) => {
    const site = sites[el.dataset.site];
    const pin = { el, site, card: el.querySelector(".gl-card"), cw: 0, ch: 0, w: {} };
    const hot = (on) => () => { site.hot = on ? 1 : 0; wake(); };
    el.addEventListener("mouseenter", hot(true)); el.addEventListener("mouseleave", hot(false));
    el.addEventListener("focus", hot(true)); el.addEventListener("blur", hot(false));
    // touch: the first tap opens the card, the second follows the link
    el.addEventListener("click", (ev) => {
      if (finePointer || el.classList.contains("is-on")) return;
      ev.preventDefault(); touched = true; show(pin, 6);
    });
    return pin;
  });
  // on touch screens the cards take turns by themselves, gently, until the visitor touches one or scrolls on
  let touched = false, shown = null, shownUntil = 0, cycleAt = 0, cycleI = 0;
  const show = (pin, secs) => {
    if (shown && shown !== pin) { shown.el.classList.remove("is-on"); shown.site.hot = 0; }
    shown = pin; shownUntil = (performance.now() - t0) / 1000 + secs;
    if (pin) { pin.el.classList.add("is-on"); pin.site.hot = 1; }
  };
  if (!finePointer) addEventListener("pointerdown", (ev) => { if (!ev.target.closest || !ev.target.closest(".gl-pin")) { touched = true; show(null, 0); } }, { passive: true });

  // ---- the trail: over the globe to Israel, then down in one S onto the domains rail; it ends exactly on the
  // stage's bottom edge, the top of the domains, where the domains ribbon (same band) carries it on ----
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
  let W = 1, H = 1, F = frame(1, 1), dpr = 1, progress = 0, running = false, raf = 0, railX = 0;
  let downS = 0, tTrail = 0, swingAt = -1, easing = false;
  let sig = "", fG = 0.75, ready = false, tReady = 0, pinsShown = null, lastT = 0;
  // the roll runs while the visitor is with the page (the entrance, a scroll, the pointer) and settles when they rest:
  // the trail and the cards follow the globe in the page, so a globe that never stops would rewrite them every frame
  let rollT = 0, roll = 1, woke = 0;
  const wake = () => { woke = (performance.now() - t0) / 1000; };
  // the top of the opening words, in stage pixels: a model's link never lands on them (short phones)
  let floorY = Infinity;
  const measureFloor = () => {
    floorY = opt.floor ? opt.floor() : Infinity;
    for (const pin of pins) if (pin.card) { pin.cw = pin.card.offsetWidth; pin.ch = pin.card.offsetHeight; }
  };
  let t0 = performance.now();
  const pace = opt.pace || 1;
  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  // the menu's globe: where it is aimed (a place, eased to) and how far the visitor's hand has turned it
  const aim = { lat: 0, lon: 0, tlat: 0, tlon: 0, z: 1, tz: 1, set: false };
  let held = false;
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
  // a frame given by where Israel lands: find the centre that puts it there (the view offset moves every point on
  // screen by the same amount, so one projection is enough)
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
  // screen (an illustrated map's view); the ground under it (pool, ring) stays flat. A field takes part of the lean.
  const TILT = 52 * DEG, MAXL = 75 * DEG;
  const cW = new THREE.Vector3(), sW = new THREE.Vector3(), upL = new THREE.Vector3(), qL = new THREE.Quaternion(), qK = new THREE.Quaternion(), qI = new THREE.Quaternion(), Q0 = new THREE.Quaternion(), Y = new THREE.Vector3(0, 1, 0);
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
    for (const p of s.parts) {
      const thk = th * p.k, c = 1 - Math.cos(thk), sn = Math.sin(thk);
      const r = Math.abs(tx) * p.ex + Math.abs(tz) * p.ez;
      if (p.k === 1) p.o.quaternion.copy(qL); else p.o.quaternion.copy(qK.slerpQuaternions(Q0, qL, p.k));
      p.o.position.set(p.base.x - tx * r * c, -r * sn, p.base.z - tz * r * c);
    }
  }

  function resize() {
    const r = stage.getBoundingClientRect();
    W = Math.max(1, Math.round(r.width)); H = Math.max(1, Math.round(r.height));
    dpr = Math.min(devicePixelRatio || 1, small ? 1.5 : 2);
    renderer.setPixelRatio(dpr); renderer.setSize(W, H, false);
    camera.aspect = W / H;
    F = opt.frame ? opt.frame(W, H) : frame(W, H, opt.low ? opt.low() : true);
    resolve(F.a); resolve(F.b);
    stage.classList.toggle("is-tall", F.tall);
    // phones: the station the energy arrives at is drawn a little larger than the rest
    for (const s of Object.values(sites)) s.big = F.tall && s === chg ? 1.15 : 1;
    for (const u of Object.values(netU)) u.uPx.value = (F.tall ? 7 : 9) * dpr;
    if (trailSvg) trailSvg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    railX = opt.railX ? opt.railX() : W * 0.6;
    measureFloor();
    sig = "";
    if (!running) render();
  }

  // the trail is rebuilt only when the globe moved it by more than half a pixel
  function trail(time) {
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
    const key = `${W}|${H}|${railX.toFixed(1)}|${opt.joint ? opt.joint().toFixed(0) : ""}|${opt.joinDir ? opt.joinDir().map((v) => v.toFixed(2)).join(",") : ""}|${i0}|${seam ? seam.key : ""}|${fw ? [fw.left, fw.right, fw.top, fw.bottom].map(Math.round).join(",") : ""}|${wTop === null ? "" : Math.round(wTop / 4)}|` + [0, SITE_K.eur * SUB, M].map((i) => (rx[i] * 1.6).toFixed(0) + "," + (ry[i] * 1.6).toFixed(0)).join("|");
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
          // Israel, clear of the intro's words, and swings over to the rail only in the stage's lower third, which it
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
      const ke = SITE_K.eur * SUB - i0, ki = M - i0;
      ribbon.setPath(segs, [ke, ki]);
      const mk = ribbon.marks, L = ribbon.L;
      fG = mk[ki] / L;
      eur.f = ke >= 0 ? mk[ke] / L : 0;
      chg.f = fG;
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
    // while the head rests on Israel its flare is smaller, so the station it powers stays in sight (most on phones,
    // where the globe is half the size); it opens up again as the trail leaves the globe
    ribbon.headK = lerp(F.tall ? 0.42 : 0.7, 1, smooth(fG, fG + 0.12 * (1 - fG), head));
    ribbon.draw(head);
    return head;
  }

  function render(now = performance.now()) {
    const time = ((now - t0) / 1000) * pace, dt = Math.min(0.1, Math.max(0, time - lastT)); lastT = time;
    U.uTime.value = reduce ? 40 : time;

    // entrance: the Earth comes up out of the night and its cities light outward from Israel while the models rise;
    // then the trail runs to Israel and the grid spreads from there
    const e = reduce ? 1 : clamp01((time - 0.25) / 2.6);
    U.uReveal.value = reduce || e >= 1 ? 9 : easeOut(e) * 3.2;
    U.uOn.value = reduce ? 1 : smooth(0.0, 0.5, e);

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
    view.R = lerp(a.R, b.R, p) * aim.z; view.cx = lerp(a.cx, b.cx, p); view.cy = lerp(a.cy, b.cy, p);
    // the models grow far less than the Earth as the camera dives (they would turn into toys)
    const ms = F.S * Math.pow(a.R / view.R, 0.6);
    for (const s of Object.values(sites)) s.model.scale.setScalar(ms * s.big);
    if (aim.set) {
      const k = reduce ? 1 : Math.min(1, dt * 3.2);
      aim.lat += (aim.tlat - aim.lat) * k; aim.lon += (aim.tlon - aim.lon) * k; aim.z += (aim.tz - aim.z) * k * 0.7;
      if (Math.abs(aim.tlat - aim.lat) + Math.abs(aim.tlon - aim.lon) + Math.abs(aim.tz - aim.z) * 40 > 0.05) wake();
    }
    view.lat = lerp(a.lat, b.lat, p) + aim.lat + calm * (rollLat + mouse.y * 1.4);
    view.lon = lerp(a.lon, b.lon, p) + aim.lon + calm * (rollLon + spinIn + mouse.x * 2.2);
    globe.rotation.set(view.lat * DEG, -view.lon * DEG, 0);
    place(view.R, view.cx, view.cy);
    U.uDim.value = lerp(1, 0.5, smooth(0.3, 0.75, progress));
    // the dive's depth of field: in focus round Israel and the storage site beside it, soft toward the screen's edges
    // (gl_FragCoord: device pixels, from the bottom); how far the 4k maps are blown up on screen
    U.uDof.value = reduce ? 0 : smooth(0.12, 0.6, progress);
    if (U.uDof.value > 0) {
      globe.updateMatrixWorld(true);
      tmpW.copy(FOCUS).applyMatrix4(globe.matrixWorld); projectW(tmpW, tmpN.copy(tmpW).normalize(), sp);
      U.uFocus.value.set(sp.x * dpr, (H - sp.y) * dpr);
      U.uDofR.value = (F.tall ? 0.62 * W : 0.5 * Math.min(W, H * 1.2)) * dpr;
    }
    U.uZoom.value = (view.R * dpr) / (sharp ? 652 : 326);
    // the grid keeps the same width on screen through the dive
    for (const u of Object.values(netU)) u.uHW.value = (F.tall ? 4.6 : 5.6) / view.R;

    // the sun on the limb, toward the sun's side of the screen
    if (sunSprite.visible) {
      const d = camera.position.z, rr = Math.sqrt(1 - 1 / (d * d)), sl = Math.hypot(sun.x, sun.y);
      sunSprite.position.set((sun.x / sl) * rr, (sun.y / sl) * rr, 1 / d);
      sunSprite.material.rotation = Math.atan2(sun.y, sun.x) + Math.PI / 2;
      sunSprite.scale.setScalar(F.tall ? 0.85 : 0.68);
      sunSprite.material.opacity = 0.36 * U.uOn.value * U.uDim.value * sunAmt;
    }

    // the trail first (it tells Israel and the European site when the energy has reached them)
    const head = trail(time) ?? 1;

    // the grid grows from each source once it has power, and each site lights when its line reaches it
    for (const src of ["chg", "eur"]) {
      const s = sites[src];
      if (netT0[src] < 0 && (reduce || head >= s.f - 0.004)) netT0[src] = time;
      const grow = reduce ? 9 : netT0[src] < 0 ? 0 : (time - netT0[src]) * 0.62;
      for (const key of [src, src + "f"]) if (netU[key]) netU[key].uGrow.value = grow;
      s.grow = grow;
    }

    // the sites rise, then light up when the energy reaches them
    for (const s of Object.values(sites)) {
      for (const part of s.parts) {
        const g = reduce ? 1 : easeOut(clamp01((time - part.t) / 0.9));
        part.o.scale.y = Math.max(0.001, g); part.o.visible = g > 0.002;
        part.sh.material.opacity = 0.62 * g * U.uOn.value;
      }
      const on = s.netAt ? Object.entries(s.netAt).some(([src, at]) => sites[src].grow >= at - 0.01) : head >= s.f - 0.004;
      const target = reduce || on ? 1 : 0;
      s.power = reduce ? 1 : s.power + (target - s.power) * Math.min(1, dt * 2.6);
      s.hotT += ((s.hot ? 1 : 0) - s.hotT) * Math.min(1, dt * 6);
      const pw = s.power, ht = s.hotT;
      s.green.color.copy(dimGreen).lerp(GREEN, pw);
      s.fill.uniforms.uGlow.value.copy(GREEN).multiplyScalar((0.13 + 0.1 * ht) * pw);
      for (const l of s.lights) l.material.opacity = pw * (0.75 + 0.25 * Math.sin(time * 2.1 + l.position.x * 40));
      for (const bar of s.bars) bar.m.scale.y = Math.max(0.04, pw * (0.62 + 0.3 * Math.sin(time * 0.45 + bar.ph)));
      for (const r of s.rotors) r.rotation.z -= reduce ? 0 : dt * (0.35 + 1.5 * pw);
      for (const g of s.glows) g.material.opacity = pw * (0.55 + 0.35 * ht + 0.1 * Math.sin(time * 1.3 + s.n.x * 9));
      for (const c of s.cool) c.opacity = 0.18 + 0.62 * pw;
      s.pad.material.opacity = (0.12 + 0.42 * pw + 0.35 * ht) * U.uOn.value * (0.85 + 0.15 * Math.sin(time * 1.7));
      const kk = ((time + (s.ringOff || 0) + s.n.y * 3) % 3.4) / 3.4;
      s.ring.scale.setScalar(s.ringR * (0.9 + kk * (1.2 + 0.6 * ht)));
      s.ring.material.opacity = reduce ? 0.25 * ht : Math.pow(1 - kk, 1.7) * (0.35 + 0.5 * ht) * pw;
      if (s === chg && pw > 0.5 && !ready) { ready = true; tReady = time; stage.classList.add("gl-ready"); (window.requestIdleCallback || setTimeout)(sharpen); }
    }
    if (reduce && !ready) { ready = true; tReady = -9; stage.classList.add("gl-ready"); setTimeout(sharpen, 300); }

    globe.updateMatrixWorld(true);
    for (const s of Object.values(sites)) lean(s);
    globe.updateMatrixWorld(true);
    camera.layers.set(0); renderer.autoClear = true; renderer.render(scene, camera);
    renderer.autoClear = false; renderer.clearDepth();
    camera.layers.set(2); renderer.render(scene, camera);
    camera.layers.set(1); renderer.render(scene, camera);

    // the links ride on their models; they come in once Israel has power and leave as soon as the camera starts to
    // move (reduced motion: the camera stays, so do they)
    const pinA = (reduce ? 1 : smooth(0.1, 0.0, progress)) * (ready ? clamp01((time - tReady) / 0.8) : 0);
    // the links leave the reading order with the globe (a hidden link is not on the page)
    const pinsOn = pinA > 0.02;
    if (pinsRoot && pinsOn !== pinsShown) {
      pinsShown = pinsOn;
      if (pinsOn) { pinsRoot.removeAttribute("aria-hidden"); measureFloor(); } else { pinsRoot.setAttribute("aria-hidden", "true"); if (shown) show(null, 0); }
    }
    for (const pin of pins) {
      const s = pin.site, [atO, atV] = s.anchor;
      tmpW.copy(atV).applyMatrix4(atO.matrixWorld);
      tmpN.copy(s.n).applyQuaternion(globe.quaternion);
      projectW(tmpW, tmpN, pp);
      const size = Math.max(44, s.hit * s.model.scale.x * view.R);
      const o = pp.facing > 0.18 && pp.y + size / 2 < floorY - 8 && pp.x > 0 && pp.x < W ? pinA : 0;
      // every value is written only when it changed (the loop runs every frame, the page should not)
      const w = pin.w, vz = o > 0.02 ? "visible" : "hidden";
      const tr = `translate3d(${pp.x.toFixed(1)}px,${pp.y.toFixed(1)}px,0) translate(-50%,-50%)`;
      const sz = size.toFixed(0) + "px";
      if (tr !== w.tr) pin.el.style.transform = w.tr = tr;
      if (sz !== w.sz) { pin.el.style.width = pin.el.style.height = w.sz = sz; }
      if (vz !== w.vz) pin.el.style.visibility = w.vz = vz;
      // the card opens above the model, or under it when the top of the screen is too close; sideways it stays on
      // the screen (12px from either edge)
      const at = pp.y - size / 2 - pin.ch - 8 < 76 ? "b" : "t";
      if (at !== w.at) pin.el.dataset.at = w.at = at;
      const cl = (Math.min(Math.max(12, pp.x - pin.cw / 2), W - 12 - pin.cw) - (pp.x - size / 2)).toFixed(0) + "px";
      if (pin.card && cl !== w.cl) pin.card.style.left = w.cl = cl;
    }
    // touch: one card at a time, every few seconds, while the opening rests on screen
    if (!finePointer && ready && pinsOn && pins.length) {
      if (shown && time > shownUntil) show(null, 0);
      if (!touched && !reduce && progress < 0.02 && !shown && time > cycleAt) {
        const vis = pins.filter((pn) => pn.w.vz === "visible");
        if (vis.length) { show(vis[cycleI % vis.length], 2.8); cycleI++; }
        cycleAt = time + 4.2;
      }
    }
  }

  function loop(now) { raf = requestAnimationFrame(loop); render(now); }
  function start() { if (running || reduce || held) return; running = true; raf = requestAnimationFrame(loop); }
  function stop() { running = false; cancelAnimationFrame(raf); }

  if (finePointer && !reduce && opt.pointer !== false) {
    addEventListener("pointermove", (ev) => {
      mouse.tx = (ev.clientX / innerWidth) * 2 - 1; mouse.ty = (ev.clientY / innerHeight) * 2 - 1; wake();
    }, { passive: true });
  }
  if (opt.drag) {
    let dn = null;
    canvas.addEventListener("pointerdown", (ev) => {
      dn = { x: ev.clientX, y: ev.clientY, lat: aim.tlat, lon: aim.tlon, id: ev.pointerId, moved: false };
      aim.set = true;
    });
    addEventListener("pointermove", (ev) => {
      if (!dn || ev.pointerId !== dn.id) return;
      const dx = ev.clientX - dn.x, dy = ev.clientY - dn.y;
      if (!dn.moved) {
        if (Math.hypot(dx, dy) < 6) return;
        // a phone: an upright stroke is the page's scroll, not a turn
        if (opt.drag === "x" && Math.abs(dy) > Math.abs(dx)) { dn = null; return; }
        dn.moved = true; try { canvas.setPointerCapture(dn.id); } catch (e) {}
        canvas.classList.add("is-grab");
      }
      const k = 57 / Math.max(80, F.a.R);
      aim.tlon = dn.lon - dx * k;
      if (opt.drag !== "x") aim.tlat = Math.max(-50, Math.min(50, dn.lat + dy * k));
      wake(); if (!running) render();
    });
    const up = () => { if (dn) canvas.classList.remove("is-grab"); dn = null; };
    addEventListener("pointerup", up); addEventListener("pointercancel", up);
  }
  cycleAt = 5.6;
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
    // the menu: turn so a place faces the visitor (lat/lon of the place, relative to the frame's own view) and light
    // its model; pause while the menu is shut; play the entrance again when it opens
    aim(lat, lon, key) {
      aim.set = true; aim.tlat = lat - F.a.lat; aim.tlon = lon - F.a.lon;
      // the short way round
      while (aim.tlon - aim.lon > 180) aim.tlon -= 360;
      while (aim.tlon - aim.lon < -180) aim.tlon += 360;
      for (const [k, s] of Object.entries(sites)) s.hot = k === key ? 1 : 0;
      // and lean in a little toward a place (opt.lean: how much)
      aim.tz = key ? opt.lean || 1 : 1;
      wake(); if (!running) render();
    },
    hold(on) { held = on; if (on) stop(); else if (vis && !document.hidden) start(); },
    replay() {
      t0 = performance.now(); lastT = 0; rollT = 0; netT0.chg = netT0.eur = -1;
      for (const s of Object.values(sites)) s.power = reduce ? 1 : 0;
      if (!running) render();
    },
    // where the globe's end-side rim stands at a height of the opening frame (stage px, its air included): the opening
    // line keeps clear of it
    limb(y) { const a = F.a, d = y - a.cy; return Math.abs(d) >= a.R ? a.cx : a.cx + Math.sqrt(a.R * a.R - d * d) + a.R * 0.06 + 14; },
  };
}
