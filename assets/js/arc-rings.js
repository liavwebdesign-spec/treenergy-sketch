/* The crackle round the plug, for Apple's engine (Safari, and every browser on an iPhone).
   Everywhere else it is an SVG noise filter over a thin ring (site.css, the #arc filter in the page). In Apple's engine
   that filter costs many frames every frame it runs, and draws nothing at all: the page sticks as the trail reaches the
   plug and the crackle never shows (measured 5.11.2026). So here the same jagged line is drawn once, a few times over
   with different noise, and from then on nothing repaints: CSS only turns the rings and fades them in turn (.arc-r,
   site.css), which the compositor does on its own. */

const RINGS = 4;       // how many different lines take turns
const PAD = 16;        // how far a spike may reach past the ring, px (site.css keeps the same inset)
const MAX_DPR = 2;
const TAU = Math.PI * 2;
const FOLD_MEAN = 4 / Math.PI;   // the average of a folded sine times two, so the line stays centred on the ring

// a small seeded generator, so each ring is the same on every visit
const rng = (seed) => () => (seed = (seed * 16807) % 2147483647) / 2147483647;

// Noise round the circle, -1..1. Whole numbers of waves, so the line meets itself; the folded sines (abs) give the sharp
// creases of an electric line, and each octave is twice as fine and half as tall, as in the filter it stands in for.
function noiseRound(rand, base, octaves) {
  const parts = [];
  for (let o = 0, amp = 1; o < octaves; o++, amp *= 0.55) {
    for (let j = 0; j < 3; j++) {
      parts.push({ f: Math.round(base * 2 ** o * (0.6 + rand() * 0.9)) + j, p: rand() * TAU, a: amp * (0.5 + rand() * 0.5) });
    }
  }
  const sum = parts.reduce((s, c) => s + c.a, 0);
  return (t) => {
    let v = 0;
    for (const c of parts) v += c.a * (Math.abs(Math.sin((c.f * t) / 2 + c.p)) * 2 - FOLD_MEAN);
    return (v / sum) * 2;
  };
}

function drawRing(ctx, size, r, unit, seed) {
  const rand = rng(seed * 7919 + 13);
  const big = noiseRound(rand, 10, 2);     // the slow wander away from the ring (lobes small enough not to look off centre)
  const fine = noiseRound(rand, 42, 3);    // the fine crackle along the line
  const body = noiseRound(rand, 9, 2);     // where the line runs thicker and brighter
  const c = size / 2, steps = Math.ceil(TAU * r / (0.9 * unit));
  const at = (i) => {
    const t = (i / steps) * TAU, d = r + unit * (big(t) * 3.4 + fine(t) * 1.6);
    return [c + Math.cos(t) * d, c + Math.sin(t) * d, t];
  };
  ctx.clearRect(0, 0, size, size);
  ctx.strokeStyle = "#9DFFC2";
  ctx.lineCap = "round";
  let [x0, y0] = at(0);
  for (let i = 1; i <= steps; i++) {
    const [x, y, t] = at(i), b = body(t);
    ctx.lineWidth = unit * Math.max(0.6, 1 + b * 0.35);
    ctx.globalAlpha = Math.min(1, 0.72 + b * 0.4);
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x, y); ctx.stroke();
    x0 = x; y0 = y;
  }
  ctx.globalAlpha = 1;
}

export function mountArcRings(host) {
  if (!host || host.querySelector(".arc-r")) return;
  const rings = Array.from({ length: RINGS }, () => {
    const c = document.createElement("canvas");
    c.className = "arc-r";
    host.append(c);
    return c;
  });
  let drawn = 0;
  const draw = () => {
    const w = host.offsetWidth;
    if (!w || w === drawn) return;
    drawn = w;
    const unit = Math.min(MAX_DPR, devicePixelRatio || 1), size = Math.round((w + PAD * 2) * unit);
    rings.forEach((c, i) => {
      c.width = c.height = size;
      drawRing(c.getContext("2d"), size, (w / 2 - 1) * unit, unit, i + 1);
    });
  };
  draw();
  if ("ResizeObserver" in window) new ResizeObserver(draw).observe(host);
}
