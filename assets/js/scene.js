// Treenergy · the scene page's opening (scene.html, sketch only). Daniel's picture, made again twice: the network on
// and the network off, the same pixels otherwise. The scene lives on them: the network lights up from the city outward
// and energy keeps running along its lines, the city lights and the stars breathe, the sunrise pulses, the clouds
// roil, and the land has depth under the pointer.
// The tour (Liav 19.10): the scroll takes the camera from place to place in the scene, and it stops at each one. The
// place comes alive (the panels catch a sweep of light, the storage fills, the energy runs into the city, the data
// center scans), the rest of the picture goes soft, the side across from it thins out into the page's night and the
// place's words open there. It takes the place of the domains section, which stays for a visitor without WebGL or
// motion. The flight between two places lifts, banks into the turn and streaks at the edges through mist; the landing
// sends a ripple over the ground and a front of energy out from the place. After the last place nothing new plays
// (Liav 19.10: "אנימציות מיותרות של עיגולי רדיוס"): the camera pulls back and the scene stays, rising slower than the
// page as the visitor goes on down (Liav 19.10: "להשאיר אותו ... שירגיש כאילו הוא עולה ואנחנו יורדים").
// Round 6 (the client 25.10: "מדי ירוק", "יותר מדי שובלים", "בלי העיגול"): the scene at rest is quiet. The network glows
// at a fraction of its light and nothing runs on it by itself; the stars, the city and the sunrise barely breathe. A place
// pointed at in the opening shows its name and comes alive (its lines at full light with the energy running, its own
// life), and a click takes the tour there; at a stop only that place is lit. No rings, beams or ripples on the places.
// The rest of the page is the home page's own (site.js: the night, the header, the menu, Lenis, every section below).
import { mountDom } from "./scene-dom.js";
import { mountMarks } from "./scene-marks.js";
import { mountTrail } from "./scene-trail.js";

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };

const root = document.documentElement;
// __still: the visitor stopped motion in the accessibility panel (as in site.js)
const reduce = !!window.__still || matchMedia("(prefers-reduced-motion: reduce)").matches;
const fine = matchMedia("(hover:hover) and (pointer:fine)").matches;
const sec = $(".lb"), stage = $(".lb-stage"), cv = $(".lb-scene"), h1 = $(".lb-h"), sub = $(".lb-sub"), pinsEl = $(".lb-pins"), cue = $(".lb-cue"), word = $(".lb-word");
const HEAD = 0.72; // the screen line the trail's head rides, as on the home page

// the two pictures and their places (image fractions, y down): the city is where the energy starts; the cards of the
// opening stand on the tour's own places
const ZMAX = 2.6; // how close the camera lands before it pulls back over the whole scene
const SETS = {
  wide: { on: "assets/img/scene/wide-on.webp", off: "assets/img/scene/wide-off.webp", near: "assets/img/scene/wide-near.webp", w: 2752, h: 1536, base: [0.5, 0.52],
    src: [0.47, 0.555], horizon: 0.21, sun: [0.6, 0.213], rim: [0.38728, 2.92359, 1.52285],
    // the tour: where each place is (u), how close the camera comes (z), the side its words open on (side: 1 the
    // right of the screen, -1 the left), its life (fx: 1 the panels' sweep, 2 the storage filling, 3 the energy
    // running into the city, 4 the data center's scan) on the ground it covers (O + a·A + b·B), and its ring on the
    // ground (centre, radius as a fraction of the picture's width, how flat, the turn). patches: the same picture made
    // twice as sharp around each place (an upscale of the original, its colour matched to this picture)
    tour: {
      stops: [
        { k: "sol", u: [0.155, 0.583], z: 1.6, side: 1, fx: 1, O: [0.0563, 0.5811], A: [0.1381, -0.054], B: [0.0418, 0.0573], ring: [0.155, 0.585, 0.122, 0.36, -9] },
        { k: "sto", u: [0.54, 0.485], z: 2.6, side: -1, fx: 2, O: [0.494, 0.52], A: [0.083, 0], B: [0, -0.072], ring: [0.535, 0.505, 0.06, 0.42, -4] },
        { k: "chg", u: [0.482, 0.665], z: 2.5, side: 1, fx: 3, ring: [0.482, 0.68, 0.075, 0.4, 0] },
        { k: "srv", u: [0.885, 0.7], z: 2.1, side: -1, fx: 4, O: [0.805, 0.756], A: [0.155, 0], B: [0, -0.104], ring: [0.883, 0.712, 0.095, 0.4, -6] },
      ],
      patches: [["sol", [0.03815, 0.42253, 0.27798, 0.74805]], ["sto", [0.42006, 0.32552, 0.65988, 0.65104]],
        ["chg", [0.35501, 0.44206, 0.59484, 0.76758]], ["srv", [0.76017, 0.53711, 1, 0.86263]]],
    } },
  tall: { on: "assets/img/scene/tall-on.webp", off: "assets/img/scene/tall-off.webp", near: "assets/img/scene/tall-near.webp", w: 1536, h: 2752, base: [0.5, 0.5],
    src: [0.55, 0.575], horizon: 0.255, sun: [0.826, 0.263], rim: [0.38989, 2.6906, 4.37507],
    // a phone's picture has no data center: the fourth stop is the wind turbines on the hill (fx 5: the power running
    // out of them), for the power stations; the words open under the place
    tour: {
      stops: [
        { k: "sol", u: [0.1, 0.578], z: 1.8, side: 0, fx: 1, O: [-0.17, 0.592], A: [0.3004, -0.0658], B: [0.0914, 0.0407], ring: [0.075, 0.58, 0.15, 0.36, -9] },
        { k: "sto", u: [0.68, 0.485], z: 2.4, side: 0, fx: 2, O: [0.603, 0.511], A: [0.156, 0], B: [0, -0.053], ring: [0.68, 0.5, 0.11, 0.42, -4] },
        { k: "chg", u: [0.592, 0.638], z: 2.4, side: 0, fx: 3, ring: [0.594, 0.647, 0.12, 0.4, 0] },
        { k: "srv", u: [0.37, 0.355], z: 2, side: 0, fx: 5, ring: [0.375, 0.37, 0.12, 0.4, 0] },
      ],
      patches: [["sol", [0, 0.47275, 0.30534, 0.6835]], ["sto", [0.48438, 0.38263, 0.875, 0.59339]],
        ["chg", [0.36979, 0.49455, 0.76042, 0.70531]], ["pwr", [0.17448, 0.25472, 0.5651, 0.46548]]],
    } },
};
for (const [name, s] of Object.entries(SETS)) {
  s.name = name; s.pins = {};
  for (const t of s.tour.stops) s.pins[t.k] = t.u;
}

const VS = `#version 300 es
in vec2 p; out vec2 vUv;
void main(){ vUv = vec2(p.x * .5 + .5, .5 - p.y * .5); gl_Position = vec4(p, 0., 1.); }`;

const FS = `#version 300 es
precision highp float;
in vec2 vUv; out vec4 o;
uniform sampler2D tOn, tOff, tNear, tP0, tP1, tP2, tP3;
uniform vec4 uPR[4];
uniform mat2 uFxM;
uniform vec2 uRes, uImg, uCenter, uPar, uSrc, uSun, uFoe, uHeadS, uFoc, uFxO, uFxC, uEnO;
uniform float uZoom, uReveal, uTime, uAlpha, uHorizon, uStill, uM, uLow, uLift, uSink, uDim, uFly, uOut;
uniform float uPK, uFocR, uFocA, uPanS, uPanA, uFx, uFxK, uFxT, uEnR, uEnK, uRoll, uSpd, uMist, uMistP;
// round 6 (the client 25.10: "מדי ירוק", "יותר מדי שובלים"): the network's light at rest (uGlow), the place pointed at or
// stood at (uHov: where, how much; uHovR: its reach), and the energy running on the lines near it (uRun, the hover only)
uniform vec3 uHov;
uniform float uGlow, uGlowQ, uHovR, uRun;
float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y); }
float fbm(vec2 p){ float a = .5, s = 0.; for (int i = 0; i < 4; i++){ s += a * noise(p); p *= 2.03; a *= .5; } return s; }
float lum(vec3 c){ return dot(c, vec3(.2126, .7152, .0722)); }
float greenness(vec3 c){ return c.g - max(c.r, c.b); }
float satf(vec3 c){ return max(c.r, max(c.g, c.b)) - min(c.r, min(c.g, c.b)); }
// the tour's detail patches: the same picture twice as sharp around a place, feathered into it
vec3 patchOn(sampler2D t, vec4 r, vec2 uv, vec3 c, float lod){
  vec2 sz = r.zw - r.xy, f = (uv - r.xy) / sz;
  if (f.x <= 0. || f.y <= 0. || f.x >= 1. || f.y >= 1.) return c;
  vec2 e = min(f, 1. - f) * sz;
  return mix(c, textureLod(t, f, lod).rgb, smoothstep(0., .03, e.x) * smoothstep(0., .05, e.y));
}
void main(){
  // cover, around the centre the camera looks at
  float sa = uRes.x / uRes.y, ia = uImg.x / uImg.y;
  vec2 s = sa > ia ? vec2(1., ia / sa) : vec2(sa / ia, 1.);
  s /= uZoom;
  vec2 c = clamp(uCenter, s * .5, 1. - s * .5);
  // the flight between two places: the camera moves forward towards uFoe and down; a point moves out from uFoe the
  // more, the nearer it is (the depth map), and up as the camera drops. Found backwards from the screen in a few steps.
  // uLift: the scene rising past the visitor at the end. uRoll: the camera banks into a turn between two places
  vec2 v = vUv;
  if (uRoll != 0.) { vec2 rp = (v - .5) * vec2(sa, 1.); float cr = cos(uRoll), sr = sin(uRoll); v = mat2(cr, -sr, sr, cr) * rp / vec2(sa, 1.) + .5; }
  v += vec2(0., uLift);
  vec2 vs = v;
  if (uM + uLow > 0.) {
    float n = texture(tNear, c + (v - .5) * s).r;
    for (int i = 0; i < 4; i++){ vs = uFoe + (v - uFoe) * (1. - uM * n) + vec2(0., uLow * n); n = texture(tNear, c + (vs - .5) * s).r; }
  }
  vec2 uv = c + (vs - .5) * s;
  // the opening lowers the picture under its title (uLift below 0): above the picture's top edge is the page's night
  float topK = smoothstep(0., .05, uv.y);
  // depth under the pointer: the sky far, the land nearer the lower it lies
  float d = smoothstep(uHorizon - .04, 1., uv.y);
  uv += uPar * (.004 + d * .012) / uZoom;
  // the clouds roil: low-saturation, light pixels drift a little in a slow field (the field is worked out only on them)
  if (uStill < .5 && uv.y > uHorizon) {
    vec3 probe = texture(tOff, uv).rgb;
    float cloud = smoothstep(.22, .45, lum(probe)) * (1. - smoothstep(.06, .16, satf(probe)));
    if (cloud > .001) uv += (vec2(fbm(uv * 6. + uTime * .05), fbm(uv * 6. - uTime * .04 + 7.)) - .5) * cloud * .006;
  }
  uv = clamp(uv, vec2(.0005), vec2(.9995));

  vec3 on = texture(tOn, uv).rgb, off = texture(tOff, uv).rgb;
  // the tour: the place in focus sharp (its detail patch), the rest of the picture soft, and the side the words open
  // on (uPanS: 1 the right, -1 the left, 0 the foot) softer still
  float fd = length((vUv - uFoc) * vec2(sa, 1.));
  float side = uPanS > .5 ? vUv.x : uPanS < -.5 ? 1. - vUv.x : vUv.y;
  float pan = uPanA * smoothstep(.42, .64, side);
  // on a flight the edges streak away from the point the camera flies at (uFoe), the middle stays sharp
  vec2 rq = (vUv - uFoe) * vec2(sa, 1.);
  float spd = uSpd * smoothstep(.22, .9, length(rq));
  float bl = max(max(uFocA * smoothstep(uFocR, uFocR * 2.4, fd), pan), spd);
  float lod0 = log2(max(1., s.x * uImg.x / uRes.x));
  // the network is read from the picture as it was made (the sharper patch is for the eye only)
  vec3 onM = on;
  if (uPK > 0.) {
    float lp = log2(max(1., 2. * s.x * uImg.x / uRes.x));
    vec3 sharp = patchOn(tP0, uPR[0], uv, on, lp);
    sharp = patchOn(tP1, uPR[1], uv, sharp, lp); sharp = patchOn(tP2, uPR[2], uv, sharp, lp); sharp = patchOn(tP3, uPR[3], uv, sharp, lp);
    on = mix(on, sharp, uPK * (1. - smoothstep(0., .25, bl)));
  }
  if (bl > .01) {
    // a soft blur from the smaller copies of the picture, four taps turned against their blocks
    float lod = lod0 + bl * 3.4;
    vec2 o1 = vec2(.7, .35) * exp2(lod) / uImg, o2 = vec2(-.35, .7) * exp2(lod) / uImg;
    // where the flight's streak is the blur, the four taps lie along the way out from uFoe instead of across it
    if (spd > .01) {
      vec2 rd = normalize(rq + 1e-5) / vec2(sa, 1.) * s, ks = vec2(smoothstep(0., 1., spd / bl));
      float st = exp2(lod) / uImg.x * 1.6 / length(s);
      o1 = mix(o1, rd * st, ks); o2 = mix(o2, rd * st * 2.4, ks);
    }
    vec3 bo = (textureLod(tOn, uv + o1, lod) + textureLod(tOn, uv - o1, lod) + textureLod(tOn, uv + o2, lod) + textureLod(tOn, uv - o2, lod)).rgb * .25;
    vec3 bf = (textureLod(tOff, uv + o1, lod) + textureLod(tOff, uv - o1, lod) + textureLod(tOff, uv + o2, lod) + textureLod(tOff, uv - o2, lod)).rgb * .25;
    float t = smoothstep(.01, .2, bl);
    on = mix(on, bo, t); onM = mix(onM, bo, t); off = mix(off, bf, t);
  }
  // the network's own pixels: what the lit picture has and the dark one has not
  // (only where the lit picture is really bright and green: the dark sky's compression noise stays out)
  float m = clamp((greenness(onM) - greenness(off)) * 5. + (lum(onM) - lum(off)) * 2., 0., 1.)
    * smoothstep(.16, .34, lum(onM)) * smoothstep(.04, .12, greenness(onM)) * step(uHorizon - .02, uv.y);
  // the light spreads from the city: a soft front, the picture turning on behind it
  vec2 dd = (uv - uSrc) * vec2(ia, 1.);
  float r = length(dd), R = uReveal * 1.9;
  float lit = 1. - smoothstep(R - .1, R, r);
  // at rest the network glows at a fraction of the picture's light (round 6: "פחות ירוק"); the place pointed at, or the
  // one the camera stands at, has its own lines back at full light
  vec2 hv = (uv - uHov.xy) * vec2(ia, 1.);
  float hm = exp(-dot(hv, hv) / (uHovR * uHovR)), hk = uHov.z * hm;
  vec3 col = mix(off, on, lit * mix(uGlow, 1., hk) * (1. - uDim * .6 * m));
  // the bright green the dark picture keeps by itself (the rim round the solar farm, Idan: "ההילה הירוקה") goes quiet
  // too, the trees' dark green untouched; the place pointed at keeps its colour
  float ng = smoothstep(.06, .2, greenness(col)) * smoothstep(.14, .3, lum(col)) * step(uHorizon - .02, uv.y);
  col = mix(col, mix(vec3(lum(col)), col, .4) * .9, ng * (1. - hk) * uGlowQ);
  vec3 G = vec3(.19, .97, .48);
  // the front itself, soft where it crosses a line
  float front = exp(-pow((r - R) / .028, 2.)) * step(uReveal, .999);
  col += G * m * front * .55;
  // energy runs along the lines only near the place pointed at (the client: no lines running by themselves)
  if (uRun > .001) {
    float pulse = pow(.5 + .5 * sin(r * 46. - uTime * 2.4), 14.);
    col += G * m * lit * (pulse * .75 + .1 * sin(uTime * 1.3 + r * 4.)) * uRun * hm;
  }
  // the city lights flicker a little, the stars twinkle faintly (each on its own cell)
  vec2 cell = floor(uv * uImg / 3.);
  float tw = hash(cell);
  float warm = smoothstep(.45, .75, on.r) * smoothstep(.05, .2, on.r - on.b) * step(uHorizon, uv.y);
  col *= 1. + warm * .05 * sin(uTime * (1.5 + tw * 3.) + tw * 40.) * (1. - uStill);
  // a star is a point brighter than the sky around it (the sunrise and the air are not stars); only the sky is looked at
  if (uv.y < uHorizon - .03 && uStill < .5) {
    vec2 px = 5. / uImg;
    float around = (lum(texture(tOff, uv + vec2(px.x, 0.)).rgb) + lum(texture(tOff, uv - vec2(px.x, 0.)).rgb)
      + lum(texture(tOff, uv + vec2(0., px.y)).rgb) + lum(texture(tOff, uv - vec2(0., px.y)).rgb)) * .25;
    float star = smoothstep(.12, .3, lum(off) - around);
    col += star * .22 * sin(uTime * (1. + tw * 2.5) + tw * 60.);
  }
  // the sunrise breathes slowly, and a thin streak runs along the horizon from it
  vec2 sv = (uv - uSun) * vec2(ia, 1.);
  float sunG = exp(-dot(sv, sv) * 260.) * (.24 + .04 * sin(uTime * .7));
  float streak = exp(-abs(sv.y) * 260.) * exp(-abs(sv.x) * 3.2) * .18;
  col += vec3(1., .82, .58) * (sunG + streak);
  // the tour: the place the camera stands at comes alive, on its own ground (a = along A, b = along B)
  if (uFxK > 0.) {
    vec2 ab = uFxM * (uv - uFxO);
    float inside = smoothstep(0., .04, ab.x) * smoothstep(1., .96, ab.x) * smoothstep(0., .04, ab.y) * smoothstep(1., .96, ab.y);
    vec2 dv = (uv - uFxC) * vec2(ia, 1.);
    float rr = length(dv);
    if (uFx < 1.5) {
      // solar: a sweep of light runs along the rows of blue panels, and leaves them faintly charged behind it
      float panel = smoothstep(.02, .1, on.b - on.r) * smoothstep(.06, .26, lum(on)) * (1. - smoothstep(.04, .16, greenness(on)));
      float sw = fract(uTime * .2) * 1.5 - .25;
      float band = exp(-pow((ab.x - sw) / .045, 2.)), after = smoothstep(sw + .02, sw - .25, ab.x) * smoothstep(sw - .9, sw - .25, ab.x);
      col += (vec3(.6, .88, 1.) * band * 1.1 + G * after * .16) * panel * inside * uFxK;
    } else if (uFx < 2.5) {
      // storage: the buildings fill up like batteries as the scroll goes on, a bright level line at the top of the charge
      float bld = smoothstep(.22, .42, lum(on)) * (1. - smoothstep(.14, .32, satf(on)));
      float below = smoothstep(uFxT + .012, uFxT - .012, ab.y);
      col = mix(col, col * vec3(.5, 1.18, .78) + G * .14, below * bld * inside * uFxK * .9);
      col += G * exp(-pow((ab.y - uFxT) / .011, 2.)) * (.35 + bld) * inside * uFxK * 1.3;
    } else if (uFx < 3.5) {
      // charging: the energy runs in along every line to the charging hub (made into the picture, 19.10) and lights it
      float pl = pow(.5 + .5 * sin(rr * 70. + uTime * 5.), 16.);
      col += G * m * pl * smoothstep(.24, .02, rr) * uFxK * 1.3;
      col *= 1. + warm * .4 * uFxK * smoothstep(.22, .0, rr);
      col += G * exp(-rr * rr * 1400.) * uFxK * (.12 + .08 * sin(uTime * 3.));
    } else if (uFx < 4.5) {
      // the data center: its windows flicker and a scan runs up through it
      float lit2 = smoothstep(.28, .55, lum(on)) * smoothstep(0., .06, on.b - on.r);
      vec2 cl = floor(uv * uImg / 2.);
      float fl = step(.55, fract(hash(cl) + uTime * (.5 + hash(cl + 3.))));
      float scan = exp(-pow((ab.y - (fract(uTime * .32) * 1.3 - .15)) / .05, 2.));
      col += (vec3(.6, .85, 1.) * lit2 * fl * .3 + vec3(.45, 1., .75) * scan * (.25 + lit2) * .5) * inside * uFxK;
    } else {
      // the power stations (a phone's fourth stop, the wind turbines): the power runs out of them along the lines
      col += G * m * pow(.5 + .5 * sin(rr * 55. - uTime * 4.), 16.) * smoothstep(.36, .02, rr) * uFxK * 1.6;
      col += G * exp(-rr * rr * 900.) * uFxK * .3;
    }
  }
  // on the way from one place to the next, a soft front of energy runs out along the lines from the place before
  if (uEnK > 0.) col += G * m * exp(-pow((length((uv - uEnO) * vec2(ia, 1.)) - uEnR) / .02, 2.)) * uEnK * .8;
  // on a flight thin mist streams past the lens: three veils, each coming at the camera from where it flies and
  // opening out past the edges, the middle kept clear (uMistP moves with the scroll, so the mist stops when it does)
  if (uMist > 0.) {
    float veil = 0.;
    for (int i = 0; i < 3; i++) {
      float t = fract(uMistP * 1.15 + float(i) / 3.), z = mix(.55, 3.2, t * t);
      float w = fbm(rq / z * 2.6 + vec2(float(i) * 7.3, float(i) * 3.1) + vec2(uTime * .02, 0.));
      veil += smoothstep(.4, .74, w) * sin(3.14159 * t) * (.55 + .45 * t);
    }
    veil *= uMist * smoothstep(.08, .55, length(rq));
    col = mix(col, vec3(.66, .76, .9) * (.55 + .3 * lum(col)), clamp(veil * .85, 0., .78));
  }
  // the edges sink into the page's night: a vignette, and the foot melts into it (on the tour: into the page's living
  // night itself, so the foot fades out rather than to one colour)
  vec2 q = vUv - .5;
  col *= 1. - dot(q, q) * .55;
  vec3 night = vec3(0., 11., 38.) / 255.;
  float foot = smoothstep(.86, 1., max(v.y, vUv.y));
  // the tour's end: as the stage scrolls away the scene stays, so its bottom edge melts into the night under it
  foot = max(foot, smoothstep(.78, 1., vUv.y) * clamp(uOut * 4., 0., 1.));
  col = mix(col, night, foot * .92 * (1. - uFly));
  float a = uAlpha * (1. - foot * uFly) * topK;
  // the tour: out of the focus the scene steps back, and on the words' side it thins out into the page's night
  col *= 1. - uFocA * smoothstep(uFocR, uFocR * 2.8, fd) * .3;
  col = mix(col, night, pan * .4);
  a *= 1. - pan * .58;
  // the sink: the scene goes back into the night from the edges in, the line's head last
  float rd = length((vUv - uHeadS) * vec2(sa, 1.)), edge = 2.2 * (1. - uSink);
  a *= (1. - smoothstep(edge - .3, edge + .1, rd)) * (1. - smoothstep(.55, 1., uSink));
  col = mix(col, night, uSink * .55);
  o = vec4(col * a, a);
}`;

const UNIFORMS = ["tOn", "tOff", "tNear", "uRes", "uImg", "uCenter", "uPar", "uSrc", "uSun", "uFoe", "uHeadS", "uZoom", "uReveal", "uTime", "uAlpha", "uHorizon", "uStill", "uM", "uLow", "uLift", "uSink", "uDim", "uFly", "uOut",
  "tP0", "tP1", "tP2", "tP3", "uPR", "uPK", "uFoc", "uFocR", "uFocA", "uPanS", "uPanA", "uFx", "uFxK", "uFxT", "uFxO", "uFxM", "uFxC", "uEnO", "uEnR", "uEnK",
  "uRoll", "uSpd", "uMist", "uMistP", "uGlow", "uGlowQ", "uHov", "uHovR", "uRun"];
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
  const U = {}; for (const n of UNIFORMS) U[n] = gl.getUniformLocation(pr, n);
  gl.uniform1i(U.tOn, 0); gl.uniform1i(U.tOff, 1); gl.uniform1i(U.tNear, 2);
  // the tour's patches on units 3-6, a dark pixel in each until they come
  ["tP0", "tP1", "tP2", "tP3"].forEach((n, i) => { gl.uniform1i(U[n], 3 + i); blank(gl, 3 + i); });
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
function blank(gl, unit) {
  const t = gl.createTexture(); gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, t);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
  return t;
}

let W = 1, H = 1, dpr = 1, set = null, ctx = null;
const pins = $$(".lb-pin").map((el) => ({ el, k: el.dataset.k, card: $(".lb-card", el) }));
// the tour's words, one block for each place (tourOn: the tour runs, with WebGL and with motion)
const arts = $$(".lb-stop").map((el, i) => ({ el, i, h: $("h2", el), on: false, box: null }));
let tourOn = false;

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
  W = stage.clientWidth; H = stage.clientHeight; dpr = Math.min(devicePixelRatio || 1, Q.cap);
  const next = W / H < 0.9 ? SETS.tall : SETS.wide;
  if (next !== set && ctx) { set = next; loadSet(); } else set = next;
  // the tour's words: beside the place on a wide screen, under it on a tall one
  stage.dataset.fmt = set.name;
  for (const a of arts) a.el.dataset.side = String(set.tour.stops[a.i].side);
  cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
  if (ctx) ctx.gl.viewport(0, 0, cv.width, cv.height);
}

// the depth map is read twice: by the shader, and here, small, to place the marks on the moving land
function nearData(img) {
  const w = Math.round(img.naturalWidth / 4), h = Math.round(img.naturalHeight / 4);
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const g = c.getContext("2d", { willReadFrequently: true }); g.drawImage(img, 0, 0, w, h);
  const px = g.getImageData(0, 0, w, h).data, a = new Float32Array(w * h);
  for (let i = 0; i < a.length; i++) a[i] = px[i * 4] / 255;
  return { w, h, a };
}
function nearAt(u) {
  const N = set.nd; if (!N) return 0;
  const x = clamp01(u[0]) * (N.w - 1), y = clamp01(u[1]) * (N.h - 1), x0 = Math.floor(x), y0 = Math.floor(y);
  const x1 = Math.min(N.w - 1, x0 + 1), y1 = Math.min(N.h - 1, y0 + 1), fx = x - x0, fy = y - y0, A = N.a;
  return lerp(lerp(A[y0 * N.w + x0], A[y0 * N.w + x1], fx), lerp(A[y1 * N.w + x0], A[y1 * N.w + x1], fx), fy);
}

async function loadSet() {
  const s = set;
  const [on, off, near] = await Promise.all([loadImg(s.on), loadImg(s.off), tourOn ? loadImg(s.near) : null]);
  if (s !== set) return;
  const { gl } = ctx;
  texture(gl, 0, on); texture(gl, 1, off);
  // a 1px black stand-in where there is no flight: the land does not move
  if (near) { texture(gl, 2, near); s.nd = nearData(near); }
  else blank(gl, 2);
  s.ready = true; $(".lb-still").src = s.on;
  // the tour's sharper patches come after the scene itself, and step in when they are all here
  if (tourOn) {
    s.patchReady = false;
    Promise.all(s.tour.patches.map(([k]) => loadImg(`assets/img/scene/${s.name}-p-${k}.webp`))).then((imgs) => {
      if (s !== set) return;
      imgs.forEach((im, i) => texture(gl, 3 + i, im));
      s.patchReady = true;
    }).catch((e) => console.warn("patches", e));
  }
}

// ---- the scroll ----
// the tour reads the page as it is (the page's own Lenis smooths the wheel)
let target = 0, prog = 0, outY = 0;
// The section's place on the page is measured on a layout; between layouts its place on the screen comes from Lenis's
// own scroll, so the frame asks nothing of the layout (round 6: a read after the page's writes would lay it out again)
let secTop = 0, secH = 0, stageTop = 0;
function readScroll() {
  const vh = H || innerHeight;
  let top;
  if (lenis && secH) top = secTop - lenis.animatedScroll;
  else { const r = sec.getBoundingClientRect(); top = r.top; secH = r.height; secTop = r.top + scrollY; }
  const bottom = top + secH, span = secH - vh;
  target = span > 0 ? clamp01(-top / span) : 0;
  // how far the stage has gone up past its end, in screens (the tour's end keeps the scene and lets it rise)
  outY = clamp01((vh - bottom) / vh);
  stageTop = Math.min(Math.max(top, 0), bottom - vh);
}
addEventListener("scroll", readScroll, { passive: true });
// the page's own smooth scroll (site.js, which also follows a desktop wheel more softly here, with the longer way in
// the css); none where motion is stopped
const slowDesk = matchMedia("(min-width:1024px)").matches;
const lenis = reduce ? null : window.__lenis || null;

// the pointer gives the land its depth (fine pointers only); phones get a slow drift instead
const par = { x: 0, y: 0, tx: 0, ty: 0 };
if (fine && !reduce) addEventListener("pointermove", (e) => { par.tx = (e.clientX / innerWidth - 0.5) * -2; par.ty = (e.clientY / innerHeight - 0.5) * -2; }, { passive: true });

// ---- the places in the opening ----
// round 6 (the client 25.10): a place pointed at shows its name alone, as a small label that reads as a button ("בלי
// יותר מדי הסבר"), and comes alive by itself; pointing at it or clicking takes the tour there. The pointer finds a place
// anywhere on its ground (the ellipse its ring used to draw, now unseen), not only on its point. Nothing opens by itself
let hot = null, lastV = null, pinOn = 0;
function show(k) { if (k === hot) return; hot = k; for (const p of pins) p.el.classList.toggle("is-on", p.k === k); }
for (const p of pins) {
  p.el.addEventListener("focus", () => show(p.k));
  p.el.addEventListener("blur", () => show(null));
}
// the place under a stage point: on its point, or inside its ground's ellipse (the nearest middle when two overlap)
function pick(x, y) {
  if (!lastV || !set || pinOn < 0.5) return null;
  let best = null, bd = 1;
  for (const s of set.tour.stops) {
    const [px, py] = screenOf(lastV, s.u);
    if (Math.hypot(x - px, y - py) < 24) return s.k;
    const [cx, cy] = screenOf(lastV, s.ring), rx = (s.ring[2] * W) / lastV.sx, ry = rx * s.ring[3];
    const d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
    if (d < bd) { bd = d; best = s.k; }
  }
  return best;
}
const stagePt = (e) => { const r = stage.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
// a style written only when it changed: the frame runs at the screen's rate, and most of what it sets stands still
const put = (el, k, val) => {
  const c = el.__put || (el.__put = {});
  if (c[k] === val) return;
  c[k] = val;
  if (k[0] === "-") el.style.setProperty(k, val); else el.style[k] = val;
};
function placePins(v, alpha) {
  // hidden (the tour has started), they stay as they were
  const po = alpha.toFixed(3);
  if (po === "0.000" && pinsEl.__put && pinsEl.__put["--po"] === po) return;
  put(pinsEl, "--po", po);
  put(pinsEl, "pointerEvents", alpha > 0.5 ? "" : "none");
  for (const p of pins) {
    const [x, y] = screenOf(v, set.pins[p.k]);
    put(p.el, "--x", x.toFixed(1) + "px"); put(p.el, "--y", y.toFixed(1) + "px");
    // a place that has left the screen has no point and no label
    const off = x < 10 || x > W - 10 || y < 10 || y > H - 10;
    put(p.el, "display", off ? "none" : "");
    // the label keeps inside the screen: it slides sideways on its stem, and opens under the point when there is no room above
    if (off) continue;
    if (!p.cw) { p.cw = p.card.offsetWidth; p.ch = p.card.offsetHeight; p.gap = parseFloat(getComputedStyle(p.card).getPropertyValue("--gap")) || 54; }
    const half = p.cw / 2, pad = 14, gap = p.gap;
    const shift = Math.max(pad + half - x, Math.min(0, W - pad - half - x));
    put(p.card, "--cx", shift.toFixed(0) + "px");
    // it opens under the point too when above it would cover the opening's words, if there is room below
    const l = x + shift - half, r = x + shift + half, top = y - gap - p.ch;
    const onTitle = r > titleBox.l && l < titleBox.r && top < titleBox.b && y - gap > titleBox.t;
    const below = top < pad + 64 || (onTitle && y + gap + p.ch < H - pad);
    if (below !== p.below) { p.below = below; p.el.classList.toggle("is-below", below); }
  }
}
// the opening's words in the stage (the labels keep off them); set on every layout, before the title's own fade
const titleBox = { l: 0, r: 0, t: 0, b: 0 };
// the opening lowers the picture (DROP, a fraction of the screen) so its land starts under the title with a little
// room between them (Idan 25.10: "שהכותרת לא יושבת על הכדור עצמו... שיהיה טיפה מרווח"); the first flight takes it back
let DROP = 0;
function measureTitle() {
  titleBox.l = h1.offsetLeft - 12; titleBox.r = h1.offsetLeft + h1.offsetWidth + 12; titleBox.t = h1.offsetTop; titleBox.b = h1.offsetTop + h1.offsetHeight + 8;
  if (!set) return;
  const v = view(1, set.base), hy = ((set.horizon - v.cy) / v.sy + 0.5) * H;
  DROP = Math.min(0.24, Math.max(0, (titleBox.b + Math.max(24, H * 0.035) - hy) / H));
  if (hero() === "word") layoutWord(v);
  stage.style.setProperty("--lb-drop", (DROP * H).toFixed(1) + "px");
}

// ---- the title behind the Earth (sketch only, ?hero=): the planet's edge in the picture is a circle (fitted to its rim
// in the dark pictures: centre and radius as fractions of the picture's width and height), so the words can go behind
// it. "sink": the title goes down behind the horizon with the first scroll, like the sun setting. "word" (Liav 25.10:
// "כותרת גדולה בהטיה עם המילה TREENERGY שחלקה מוסתרת מאחורי הגלובוס"): the name, large and tilted, half behind the
// Earth, rising out of it as the scene opens and going down behind it with the title. A mask cuts each at the rim
const hero = () => (tourOn ? root.dataset.hero || "" : "");
function rimOf(v) {
  const [cx, cy, r] = set.rim, R = (r / v.sx) * W, [x, y] = screenOf(v, [cx, cy - (r * set.w) / set.h]);
  return { x, y: y + R, R };
}
const rimY = (c, x) => c.y - Math.sqrt(Math.max(0, c.R * c.R - (x - c.x) ** 2));
// the mask's circle in an element's own frame: its box's top-left at (l, t), turned by a (radians) about its middle
function maskTo(el, c, l, t, w, h, a, feather) {
  const dx = c.x - (l + w / 2), dy = c.y - (t + h / 2), co = Math.cos(a), si = Math.sin(a);
  put(el, "--mx", (dx * co + dy * si + w / 2).toFixed(1) + "px");
  put(el, "--my", (-dx * si + dy * co + h / 2).toFixed(1) + "px");
  put(el, "--mr", c.R.toFixed(1) + "px"); put(el, "--mf", feather.toFixed(1) + "px");
}
// the word's size and place, at rest: across the dark beside the title on a wide screen and under it on a tall one,
// tilted down towards the title so its far end comes out of the Earth and its near end stays deep in it; the picture
// goes lower when the word needs the room under the title (the first flight takes it back, as it does DROP)
const WD = { F: 0, w: 0, h: 0, x: 0, a: 0, dy: 0 };
function layoutWord(v) {
  word.style.fontSize = "100px";
  const rw = word.offsetWidth / 100, rh = word.offsetHeight / 100, tall = set === SETS.tall;
  const g = Math.max(16, W - titleBox.r + 12), span = tall ? W - 2 * g : Math.min(W * 0.6, 1180);
  WD.F = span / rw; WD.w = span; WD.h = rh * WD.F; WD.a = ((tall ? 4 : 6) * Math.PI) / 180;
  WD.x = tall ? W / 2 : g + span / 2; WD.dy = 0.06 * WD.F;
  word.style.fontSize = WD.F.toFixed(1) + "px";
  const [cx, cy, r] = set.rim, c = { x: ((cx - v.cx) / v.sx + 0.5) * W, R: (r / v.sx) * W };
  c.y = ((cy - (r * set.w) / set.h - v.cy) / v.sy + 0.5) * H + DROP * H + c.R;
  const yc = rimY(c, WD.x) + WD.dy, top = (x) => yc - WD.h / 2 + (x - WD.x) * Math.tan(WD.a);
  const x0 = WD.x - span / 2, x1 = WD.x + span / 2, o = Math.max(x0, titleBox.l);
  let need = 18 - top(x0);
  if (o < Math.min(x1, titleBox.r)) need = Math.max(need, titleBox.b + 10 - top(o));
  DROP = Math.min(0.42, DROP + Math.max(0, need) / H);
}
function heroTick(v, p, since) {
  const mode = hero();
  if (!mode) return false;
  const c = rimOf(v), sk = smooth(0.002, 0.03, p);
  // the title: down until its top is under the rim at its lower end
  const l = h1.offsetLeft, t = h1.offsetTop, w = h1.offsetWidth, h = h1.offsetHeight;
  const deep = Math.max(rimY(c, l), rimY(c, l + w)) + 8 - t, hs = sk * Math.max(0, deep);
  put(h1, "--hs", hs.toFixed(1) + "px"); put(h1, "--ho", sk > 0.999 ? "0" : "1");
  maskTo(h1, c, l, t + hs, w, h, 0, 5);
  if (mode === "word" && WD.F) {
    // it rises out of the Earth as the scene opens, and goes back down with the first scroll
    const up = 1 - Math.pow(1 - smooth(0.9, 3.2, since), 3), out = Math.max(sk, 1 - up);
    const yc = rimY(c, WD.x) + WD.dy + out * (WD.h + (WD.w / 2) * Math.sin(WD.a) + 12);
    const lx = WD.x - WD.w / 2, ty = yc - WD.h / 2;
    put(word, "transform", `translate(${lx.toFixed(1)}px,${ty.toFixed(1)}px) rotate(${WD.a.toFixed(4)}rad)`);
    put(word, "opacity", out > 0.999 ? "0" : "1");
    maskTo(word, c, lx, ty, WD.w, WD.h, WD.a, 0.08 * WD.F);
  }
  return true;
}

// where a point of the picture shows, with the flight applied (the shader's mapping, run forwards), in stage pixels
const F = { m: 0, low: 0, lift: 0, sink: 0, roll: 0, foe: [0.5, 0.46], head: [0.5, 0.5] };
function project(v, u) {
  const n = nearAt(u), k = 1 / (1 - F.m * n);
  const x0 = (u[0] - v.cx) / v.sx + 0.5, y0 = (u[1] - v.cy) / v.sy + 0.5;
  let x = F.foe[0] + (x0 - F.foe[0]) * k, y = F.foe[1] + (y0 - F.foe[1] - F.low * n) * k - F.lift;
  // the bank (the tour's turns): the screen turned about its middle, as the shader turns it
  if (F.roll) {
    const sa = W / H, px = (x - 0.5) * sa, py = y - 0.5, c = Math.cos(F.roll), s = Math.sin(F.roll);
    x = (c * px - s * py) / sa + 0.5; y = s * px + c * py + 0.5;
  }
  return [x * W, y * H];
}
let dom = null;

// ---- the tour ----
// the section reads as: up to .022 the scene as it opens, then for each place a flight (.085) and a stop (.125), and
// from .862 the camera pulls back over the whole scene, which stays and rises past the visitor. Nothing new plays after the
// last place (Liav 19.10: "אפשר לדעתי לסיים עם כל האנימציות אחרי שמסיימים את המעבירים בין העמדות")
const TT = { t0: 0.022, tr: 0.085, dw: 0.125, out: 0.07 }, SEG = TT.tr + TT.dw;
const easeIO = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(2 - 2 * t, 3) / 2);
let TS = { mode: "ov", from: -1, to: -1, raw: 0, e: 0, dw: 0, u: [0.5, 0.5] };
function tourAt(p) {
  const n = set.tour.stops.length, end = TT.t0 + n * SEG;
  if (p < TT.t0) return { mode: "ov", from: -1, to: -1, raw: 0, e: 0, dw: 0 };
  if (p >= end) { const raw = clamp01((p - end) / TT.out); return { mode: "out", from: n - 1, to: -1, raw, e: easeIO(raw), dw: 1 }; }
  const i = Math.min(n - 1, Math.floor((p - TT.t0) / SEG)), q = p - TT.t0 - i * SEG;
  if (q < TT.tr) { const raw = q / TT.tr; return { mode: "go", from: i - 1, to: i, raw, e: easeIO(raw), dw: 0 }; }
  return { mode: "at", from: i, to: i, raw: 1, e: 1, dw: clamp01((q - TT.tr) / TT.dw) };
}
// where the camera stands for a place: close in, the place on the side of the screen away from its words (on a tall
// screen high up, the words under it); -1 is the whole scene
function poseOf(i, intro) {
  if (i < 0) return { u: set.base, a: [0.5, 0.5], z: intro };
  const s = set.tour.stops[i];
  if (set === SETS.tall) return { u: s.u, a: [0.5, 0.34], z: s.z };
  return { u: s.u, a: [s.side > 0 ? 0.3 : 0.7, 0.56], z: Math.max(1.05, s.z * Math.min(1.1, Math.max(0.82, W / H / 1.6))) };
}
// how present a place is (its ring, its words, its life): 1 while the camera stands at it, in and out on the flights
function presence(st, i, a = 0.45) {
  if (st.mode === "at") return i === st.to ? 1 : 0;
  if (st.mode === "go") return i === st.from ? 1 - smooth(0, a, st.raw) : i === st.to ? smooth(1 - a, 1, st.raw) : 0;
  if (st.mode === "out") return i === st.from ? 1 - smooth(0, a, st.raw) : 0;
  return 0;
}
// a point of the picture on the stage, with the pointer's depth (as the shader moves the land)
function screenOf(v, u) {
  const [x, y] = project(v, u), d = 0.004 + smooth(set.horizon, 1, u[1]) * 0.012;
  return [x - par.x * d / v.zoom / v.sx * W, y - par.y * d / v.zoom / v.sy * H];
}
// the words' boxes, read once per layout (the leader lines end on them)
function measureStops() {
  const sr = stage.getBoundingClientRect();
  for (const a of arts) {
    const r = a.el.getBoundingClientRect();
    a.box = { l: r.left - sr.left, r: r.right - sr.left, t: r.top - sr.top, b: r.bottom - sr.top, nY: r.top - sr.top + a.h.offsetTop + parseFloat(getComputedStyle(a.h).fontSize) * 0.55 };
  }
}
// the leader line: from just off the place's point towards its words, a short level step, then on to the heading's first
// line; on a tall screen down from the point to just over the words, then along to their start
function leadOf(x, y, s, b, tall) {
  if (tall) {
    const P0 = [x, y + 9], y1 = b.t - 18;
    if (y1 < P0[1] + 16) return null;
    return [P0, [P0[0], y1], [b.r - 6, y1]];
  }
  const side = s.side, P0 = [x + side * 9, y], edge = side > 0 ? b.l - 18 : b.r + 18;
  if ((edge - P0[0]) * side < 60) return null;
  return [P0, [P0[0] + side * 26, P0[1]], [edge, b.nY]];
}
// the scroll position of a place's stop, and the way there
const yAt = (p) => sec.getBoundingClientRect().top + scrollY + p * (sec.offsetHeight - H);
// while the page itself takes the camera somewhere, a slow frame must not read as a flight left half way
let flyUntil = 0;
function glide(y, duration) { flyUntil = performance.now() + duration * 1000 + 120; lenis.scrollTo(y, { duration, easing: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(2 - 2 * t, 2) / 2) }); }
function goStop(i) {
  const y = yAt(TT.t0 + i * SEG + TT.tr + 0.012);
  if (lenis) glide(y, (slowDesk ? 1.4 : 1.1) + 0.35 * Math.abs(i - Math.max(0, TS.to)));
  else scrollTo({ top: y, behavior: "smooth" });
}
// the domains' ids move from their articles (hidden while the tour runs) to a point in the tour, a little into each
// place's stop: an in-page link centres a point (site.js), so the point lies half a screen below the stop's scroll
// position, and the css places it (scene.css: .lb-at), so it is right at every size without a measure. The data
// center has no node on the header's wire: its point is a gap there, so at its stop "charging" is no longer lit
const AT = { sol: "dom-solar", sto: "dom-storage", chg: "dom-charge" };
function placeAnchors() {
  set.tour.stops.forEach((st, i) => {
    const id = AT[st.k], art = id && document.getElementById(id); if (id && !art) return;
    const at = document.createElement("span");
    at.className = "lb-at"; at.setAttribute("aria-hidden", "true");
    if (art) { art.removeAttribute("id"); at.id = id; } else at.dataset.hdGap = "";
    // a hair before where a flight lands (goStop: + 0.012), so the header lights the place the camera has come down on
    at.style.setProperty("--p", (TT.t0 + i * SEG + TT.tr + 0.008).toFixed(4));
    sec.appendChild(at);
  });
}
// a flight left half way settles: past its middle on to the next place, before it back to the last one
let idleT = 0;
function settle() {
  if (!tourOn || !lenis || performance.now() < flyUntil || TS.mode !== "go" || TS.raw < 0.03 || TS.raw > 0.97) return;
  // on a desktop the way is longer, so a short push of the wheel already carries on in the way it went
  const pa = TT.t0 + TS.to * SEG, mid = slowDesk ? (lenis.direction < 0 ? 0.8 : 0.2) : 0.5;
  glide(yAt(TS.raw < mid ? (TS.to === 0 ? 0 : pa - 0.004) : pa + TT.tr + 0.012), slowDesk ? 1.25 : 0.9);
}
// what the tour shows this frame: the marks, the words, and the shader's focus, frost, life and energy front
const TU = { foc: [0.5, 0.5], focR: 1, focA: 0, panS: 1, panA: 0, fx: 0, fxK: 0, fxT: 0, fxO: [0, 0], fxM: [1, 0, 0, 1], fxC: [0, 0], enO: [0, 0], enR: 0, enK: 0,
  spd: 0, mist: 0, mistP: 0, hov: [0, 0, 0], hovR: 0.2, run: 0 };
let marks = null;
// the place pointed at in the opening (i, how much: k, since when: t0); it eases in, and out before another comes
const HV = { i: -1, k: 0, t0: 0, last: 0 };
function hoverStep(time) {
  const dt = Math.min(0.05, Math.max(0, time - HV.last)); HV.last = time;
  const want = hot && pinOn > 0.5 ? set.tour.stops.findIndex((s) => s.k === hot) : -1;
  if (want !== HV.i) { HV.k = Math.max(0, HV.k - dt / 0.3); if (HV.k === 0) { HV.i = want; HV.t0 = time; } }
  else if (want >= 0) HV.k = Math.min(1, HV.k + dt / 0.45);
}
function tourDraw(v, time) {
  const st = TS, S = set.tour.stops, n = S.length, tall = set === SETS.tall, ia = set.w / set.h;
  const ringR = (i) => (i < 0 ? 1 : (S[i].ring[2] * W) / v.sx / H * 1.05);
  // only the place the camera stands at has a mark: its point, and the line out to its words
  for (let i = 0; i < n; i++) {
    const s = S[i], k = presence(st, i), [x, y] = screenOf(v, s.u);
    const lead = k > 0.01 && arts[i].box ? leadOf(x, y, s, arts[i].box, tall) : null;
    marks.draw(i, { x, y, o: Math.min(1, k * 1.6), lead, leadK: smooth(0.55, 1, k) });
  }
  // the place in focus, and the words: the place the camera leaves until half way, then the one it is going to
  const cur = st.mode === "go" && st.raw >= 0.5 ? st.to : st.from;
  TU.foc = [screenOf(v, st.u)[0] / W, screenOf(v, st.u)[1] / H];
  TU.focR = lerp(ringR(st.from), ringR(st.to < 0 ? st.from : st.to), st.e);
  TU.focA = st.mode === "at" ? 1 : st.mode === "go" ? (st.from < 0 ? smooth(0.3, 1, st.raw) : 1 - 0.8 * Math.sin(Math.PI * st.raw)) : st.mode === "out" ? 1 - smooth(0, 0.5, st.raw) : 0;
  // a place's life (as at its stop, a little quieter: "נוריד את הווליום"); in the opening the place pointed at has it
  const life = (s, k, t) => {
    TU.fx = s.fx; TU.fxK = k * 0.75; TU.fxC = s.u; TU.fxT = t;
    if (s.O) {
      const [ax, ay] = s.A, [bx, by] = s.B, det = ax * by - ay * bx;
      TU.fxO = s.O; TU.fxM = [by / det, -ay / det, -bx / det, ax / det];
    }
  };
  // the network back at full light around the place the camera is at, or the one pointed at; the energy runs on its
  // lines only while a place is pointed at
  TU.run = 0;
  if (cur >= 0) {
    const s = S[cur], k = presence(st, cur, 0.4);
    TU.panS = tall ? 0 : s.side; TU.panA = k;
    life(s, presence(st, cur, 0.45), st.mode === "at" ? 0.1 + 0.86 * smooth(0, 0.9, st.dw) : cur === st.to ? 0.1 : 0.96);
    TU.hov = [s.u[0], s.u[1], presence(st, cur, 0.45)]; TU.hovR = s.ring[2] * ia * 1.15;
  } else if (HV.i >= 0 && HV.k > 0) {
    const s = S[HV.i], k = smooth(0, 1, HV.k);
    TU.panA = 0;
    life(s, k, 0.1 + 0.86 * smooth(0, 2.2, time - HV.t0));
    TU.hov = [s.u[0], s.u[1], k]; TU.hovR = s.ring[2] * ia * 1.15; TU.run = k * 0.8;
  } else { TU.panA = 0; TU.fxK = 0; TU.hov[2] = 0; }
  // the energy front, softly, on the way between places (out of the city on the way to the first)
  if (st.mode === "go") {
    const o = st.from >= 0 ? S[st.from].u : set.src, t = S[st.to].u;
    TU.enO = o; TU.enR = 0.02 + st.raw * Math.hypot((t[0] - o[0]) * ia, t[1] - o[1]) * 1.08; TU.enK = Math.sin(Math.PI * st.raw);
  } else TU.enK = 0;
  // on a flight the edges streak and mist streams past
  const fl = st.mode === "go" ? Math.sin(Math.PI * st.raw) : 0;
  TU.spd = fl * (st.from >= 0 ? 0.5 : 0.35);
  TU.mist = fl * (st.from >= 0 ? 1 : 0.75);
  TU.mistP = st.to + st.e;
  // the words: in as the camera arrives (each line after the one before), out as it leaves; the current tick fills with
  // the stop
  for (const a of arts) {
    const on = presence(st, a.i, 0.4) > 0.5;
    if (on !== a.on) { a.on = on; a.el.classList.toggle("is-on", on); }
  }
  if (cur >= 0) put(arts[cur].el, "--pw", (st.mode === "at" ? st.dw : cur === st.to ? 0 : 1).toFixed(3));
}

// the end: from e0 the scene rises (and the site's trail comes out of the city); once the stage lets go it keeps rising
// slower than the page (LIFT_K), so the visitor goes down past it. liftEnd: how far it has risen when the stage lets go,
// so the two speeds meet there
const LIFT_K = 0.45;
const endAt = () => TT.t0 + set.tour.stops.length * SEG + 0.035;
const liftEnd = () => { const e0 = endAt(); return (1 - LIFT_K) * (1 - e0) * ((secH || sec.offsetHeight) - H) / H / 2; };
// where the city stands on the stage the moment it lets go: the whole scene, risen by liftEnd
function cityEnd() { const [x, y] = toScreen(view(1, set.base), set.src); return [x, y - liftEnd() * H]; }
let trail = null;

// ---- the timeline ----
const t0 = performance.now(); let tReady = -1;
// round 6 ("שירוץ חלק בכל המכשירים"): the scene draws only what shows. Once the stage has gone up past the screen it
// does not draw at all; at rest (nothing scrolled or pointed at, no place alive, the opening over) it draws every other
// frame, and the still picture of reduced motion only when its camera moves; and a screen of 2x or more whose frames
// keep coming late (a weak phone's graphics) draws its canvas at 1.5x from then on
const Q = { cap: 2, last: 0, n: 0, slow: 0, drew: false, tg: -1, t: 0, odd: false, key: "" };
function frame(now) {
  requestAnimationFrame(frame);
  const dt = now - Q.last; Q.last = now;
  if (Q.drew && Q.cap > 1.5 && devicePixelRatio > 1.5 && dt < 120 && tReady >= 0 && (now - t0) / 1000 - tReady > 3) {
    Q.n++; if (dt > 24) Q.slow++;
    if (Q.n >= 90) { if (Q.slow * 2 > Q.n) { Q.cap = 1.5; resize(); } Q.n = Q.slow = 0; }
  }
  readScroll();
  if (dom) dom.tick();
  const time = (now - t0) / 1000;
  prog = tourOn ? target : prog + (target - prog) * (reduce ? 1 : 0.1);
  par.x += (par.tx - par.x) * 0.05; par.y += (par.ty - par.y) * 0.05;
  if (!fine && !reduce) { par.x = Math.sin(time * 0.21) * 0.5; par.y = Math.cos(time * 0.17) * 0.3; }
  if (!set || !set.ready || !ctx) return;
  if (tReady < 0) { tReady = time; h1.classList.add("is-in"); if (sub) sub.classList.add("is-in"); }
  const since = time - tReady;

  let alpha, zoom, reveal, titleA, pinA, center = null;
  F.m = F.low = F.lift = F.sink = F.roll = 0;
  if (tourOn) {
    // the tour: the scene opens by the clock; then the camera goes from place to place. On a flight
    // the target point and its place on the screen glide over together, and between two places the camera lifts,
    // banks into the turn (the near land sweeping against the far, sinking as it climbs and rising as it comes down)
    // before it comes down on the next; at a stop it eases in
    const p = prog, intro = lerp(1.18, 1, 1 - Math.pow(1 - smooth(0, 2.6, since), 3));
    alpha = smooth(0, 0.9, since);
    reveal = smooth(0.6, 3.4, since);
    const st = tourAt(p), A = poseOf(st.from, intro), B = st.mode === "at" ? A : poseOf(st.to, intro), e = st.e;
    const u = [lerp(A.u[0], B.u[0], e), lerp(A.u[1], B.u[1], e)], a = [lerp(A.a[0], B.a[0], e), lerp(A.a[1], B.a[1], e)];
    const hop = st.mode === "go" && st.from >= 0 ? Math.sin(Math.PI * e) : 0;
    F.roll = -0.038 * (Math.sign(B.u[0] - A.u[0]) || 1) * hop * (set === SETS.tall ? 0.7 : 1);
    zoom = Math.max(1, lerp(A.z, B.z, e) * (1 - 0.24 * hop) * (st.mode === "at" ? 1 + 0.05 * st.dw : 1)) * (1 + Math.abs(F.roll) * 1.6);
    center = centerFor(zoom, u, a[0] * W, a[1] * H);
    F.m = 0.24 * hop; F.low = hop > 0 ? -0.035 * Math.sin(2 * Math.PI * e) : 0; F.foe = a;
    st.u = u; TS = st;
    // the end: the camera back over the whole scene, which stays (Liav 19.10: "אין צורך לעשות FADE לגמרי על כדור
    // הארץ אלא להשאיר אותו ... שירגיש כאילו הוא עולה ואנחנו יורדים"). It starts to rise, and once the stage lets go
    // it keeps rising slower than the page (LIFT_K), so the visitor goes down past it; the two speeds meet at the release
    const e0 = endAt(), s = clamp01((p - e0) / (1 - e0));
    F.lift = liftEnd() * s * s - LIFT_K * outY - DROP * (1 - smooth(TT.t0 * 0.4, TT.t0 + TT.tr * 0.7, p)); F.sink = 0.2 * s + 0.15 * outY; F.head = [0.5, 0.5];
    titleA = 1 - smooth(0.004, 0.02, p);
    pinA = smooth(2.6, 3.4, since) * (1 - smooth(0, 0.016, p));
  } else {
    alpha = reduce ? 1 : smooth(0, 0.9, since);
    zoom = reduce ? 1 : lerp(1.18, 1, 1 - Math.pow(1 - smooth(0, 2.6, since), 3)) * lerp(1, 1.1, prog);
    reveal = reduce ? 1 : smooth(0.6, 3.4, since);
    titleA = 1; pinA = reduce ? 1 : smooth(2.6, 3.4, since);
    F.lift = -DROP;
  }
  if (!center) {
    // where the camera looks: from the city (where the Earth's point lands) out to the whole picture
    const home = set.base, focus = set.src;
    const k = clamp01((zoom - 1) / (ZMAX - 1));
    center = [lerp(home[0], focus[0], k), lerp(home[1], focus[1], k)];
  }
  const v = view(zoom, center); v.zoom = zoom;
  lastV = v; pinOn = pinA;
  if (tourOn) hoverStep(time);
  // the site's trail out of the city (its tail stays on the city as the scene rises)
  if (trail) trail.tick(prog, endAt(), screenOf(v, set.src), secH - H, stageTop, stageTop + H);
  // the stage gone up past the screen: nothing of it to draw until the page comes back to it
  if (outY >= 1) { Q.drew = false; return; }
  if (tourOn && marks) tourDraw(v, time);
  // at rest, every other frame: what still moves then is slow (the lights, the clouds, the sun's glow)
  if (target !== Q.tg || (fine && Math.abs(par.tx - par.x) + Math.abs(par.ty - par.y) > 0.001)) { Q.tg = target; Q.t = now; }
  if (reduce) {
    const k = [cv.width, cv.height, set.name, v.cx, v.cy, zoom, F.lift].join();
    if (k === Q.key) { Q.drew = false; return; }
    Q.key = k;
  } else if (since > 4 && now - Q.t > 600 && !(tourOn && (TU.fxK > 0 || HV.k > 0)) && (Q.odd = !Q.odd)) { Q.drew = false; return; }
  Q.drew = true;

  const { gl, U } = ctx;
  gl.uniform2f(U.uRes, cv.width, cv.height); gl.uniform2f(U.uImg, set.w, set.h);
  gl.uniform2f(U.uCenter, v.cx, v.cy); gl.uniform2f(U.uPar, par.x, par.y);
  gl.uniform2f(U.uSrc, set.src[0], set.src[1]); gl.uniform2f(U.uSun, set.sun[0], set.sun[1]);
  gl.uniform2f(U.uFoe, F.foe[0], F.foe[1]); gl.uniform2f(U.uHeadS, F.head[0], F.head[1]);
  gl.uniform1f(U.uZoom, zoom); gl.uniform1f(U.uReveal, reveal); gl.uniform1f(U.uTime, reduce ? 0 : time);
  gl.uniform1f(U.uAlpha, alpha); gl.uniform1f(U.uHorizon, set.horizon); gl.uniform1f(U.uStill, reduce ? 1 : 0);
  gl.uniform1f(U.uM, F.m); gl.uniform1f(U.uLow, F.low); gl.uniform1f(U.uLift, F.lift); gl.uniform1f(U.uSink, F.sink);
  gl.uniform1f(U.uDim, 0); gl.uniform1f(U.uFly, tourOn ? 1 : 0); gl.uniform1f(U.uOut, tourOn ? outY : 0);
  // the tour (nothing of it outside the tour: every amount stays 0)
  const T = TU, live = tourOn ? 1 : 0;
  gl.uniform1f(U.uPK, tourOn && set.patchReady ? 1 : 0);
  if (tourOn && frame.prs !== set.name) { frame.prs = set.name; gl.uniform4fv(U.uPR, new Float32Array(set.tour.patches.flatMap(([, r]) => r))); }
  gl.uniform2f(U.uFoc, T.foc[0], T.foc[1]); gl.uniform1f(U.uFocR, T.focR); gl.uniform1f(U.uFocA, T.focA * live);
  gl.uniform1f(U.uPanS, T.panS); gl.uniform1f(U.uPanA, T.panA * live);
  gl.uniform1f(U.uFx, T.fx); gl.uniform1f(U.uFxK, T.fxK * live); gl.uniform1f(U.uFxT, T.fxT);
  gl.uniform2f(U.uFxO, T.fxO[0], T.fxO[1]); gl.uniformMatrix2fv(U.uFxM, false, T.fxM); gl.uniform2f(U.uFxC, T.fxC[0], T.fxC[1]);
  gl.uniform2f(U.uEnO, T.enO[0], T.enO[1]); gl.uniform1f(U.uEnR, T.enR); gl.uniform1f(U.uEnK, T.enK * live);
  gl.uniform1f(U.uRoll, F.roll); gl.uniform1f(U.uSpd, T.spd * live); gl.uniform1f(U.uMist, T.mist * live); gl.uniform1f(U.uMistP, T.mistP);
  // the network at rest at a fraction of its light (round 6: "פחות ירוק"), full around the place pointed at or stood at
  gl.uniform1f(U.uGlow, 0.42); gl.uniform1f(U.uGlowQ, 0.65); gl.uniform3f(U.uHov, T.hov[0], T.hov[1], T.hov[2] * live); gl.uniform1f(U.uHovR, T.hovR);
  gl.uniform1f(U.uRun, T.run * live);
  gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); gl.drawArrays(gl.TRIANGLES, 0, 3);
  put(cv, "opacity", "1");

  if (!heroTick(v, prog, since)) put(h1, "--ho", clamp01(titleA).toFixed(3));
  if (sub) put(sub, "--ho", clamp01(titleA).toFixed(3));
  if (cue) put(cue, "--co", ((1 - (tourOn ? smooth(0.002, 0.014, prog) : smooth(0.02, 0.1, prog))) * (reduce ? 1 : smooth(2.4, 3.2, since))).toFixed(3));
  placePins(v, pinA);
  if (pinA < 0.5 && hot) { show(null); stage.style.cursor = ""; }
}

// ---- start ----
try { ctx = setupGL(); } catch (e) { ctx = null; console.warn(e); }
if (!ctx) root.classList.add("no-gl");
tourOn = !reduce && !!ctx;
if (!tourOn) root.removeAttribute("data-hero");
else if (root.hasAttribute("data-hero-cmp")) import("./hero-compare.js").then((m) => m.mount());
resize(); readScroll();
// the tour takes the place of the domains section; without WebGL or motion the section stays, as on the home page
if (!tourOn) dom = mountDom({ HEAD, reduce, stageH: () => H });
if (dom) dom.layout();
if (tourOn) {
  // the domains' places on the page are now the tour's stops: the header's nodes and the menu land on them
  placeAnchors();
  marks = mountMarks($(".lb-tour"), arts.length);
  measureStops();
  trail = mountTrail({ stage, sec, HEAD, cityEnd });
  if (trail) trail.layout();
  // a place pointed at in the opening shows its name; a click on it (its point, its name or its ground) or a tap takes
  // the tour there, as does a link in a place's words reached by the keyboard
  const go = (k) => { show(k); goStop(arts.findIndex((a) => a.el.dataset.k === k)); };
  for (const p of pins) p.el.addEventListener("click", (e) => { e.preventDefault(); e.stopPropagation(); go(p.k); });
  stage.addEventListener("pointermove", (e) => {
    if (e.pointerType !== "mouse") return;
    const k = pick(...stagePt(e)); show(k); stage.style.cursor = k ? "pointer" : "";
  });
  stage.addEventListener("pointerleave", (e) => { if (e.pointerType === "mouse") { show(null); stage.style.cursor = ""; } });
  stage.addEventListener("click", (e) => { if (e.target.closest("a, button")) return; const k = pick(...stagePt(e)); if (k) go(k); });
  for (const a of arts) a.el.addEventListener("focusin", () => { if (!a.on) goStop(a.i); });
  if (lenis) lenis.on("scroll", () => { clearTimeout(idleT); idleT = setTimeout(settle, 220); });
}
const relayout = () => { Q.key = ""; Q.tg = -1; secH = 0; resize(); readScroll(); measureTitle(); for (const p of pins) p.cw = 0; if (dom) dom.layout(); if (tourOn) measureStops(); if (trail) trail.layout(); };
let rz = 0;
addEventListener("resize", () => { clearTimeout(rz); rz = setTimeout(relayout, 120); });
addEventListener("load", relayout);
if (document.fonts) document.fonts.ready.then(relayout);
measureTitle();
if (ctx) {
  loadSet();
  requestAnimationFrame(frame);
} else {
  // no WebGL: the picture is there at once, and so are its words; the domains' trail still runs with the scroll.
  // Its network at the living scene's quiet light (round 6): the lit picture at that light over the dark one
  const lit = $(".lb-still"), dark = lit.cloneNode();
  dark.src = set.off; lit.src = set.on; lit.classList.add("is-lit"); lit.before(dark);
  h1.classList.add("is-in"); if (sub) sub.classList.add("is-in");
  const loop = () => { requestAnimationFrame(loop); if (dom) dom.tick(); };
  requestAnimationFrame(loop);
}

