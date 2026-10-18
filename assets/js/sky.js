// Treenergy · the night behind the whole page.
// One fixed WebGL canvas, a grainy gradient (after Grainient on React Bits) taken right down: the brand blues in wide
// soft bands that bend slowly into one another, a cold teal where they meet, the grain laid over by the page. Darker
// and far quieter than the original; it drifts over minutes, never fast enough to be watched, and has no veins or
// ripples (a field that moves is read as water). It never changes colour with the scroll (the client asked for that);
// the scroll only slides it a little, so the page has depth. Drawn very small (it is soft by nature) and at a low
// frame rate, paused when the tab is hidden, a single still frame under reduced motion.

const VS = `attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}`;
const FS = `
precision mediump float;
uniform vec2 uRes; uniform float uTime, uDrift, uOrb;
uniform vec3 uC0, uC1, uC2, uC3;
float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
void main(){
  vec2 uv = gl_FragCoord.xy / uRes;
  vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
  float t = uTime * 0.018;
  p.y -= uDrift;
  // the gradient's axis turns a little, and its coordinates are bent by two slow waves, so the bands swell and lean
  float a = 0.62 + 0.18 * sin(t * 0.6);
  vec2 q = mat2(cos(a), -sin(a), sin(a), cos(a)) * p;
  q.x += 0.26 * sin(q.y * 1.9 + t * 1.1) + 0.10 * sin(q.y * 3.3 - t * 0.7);
  q.y += 0.16 * sin(q.x * 1.5 - t * 0.8);
  float b1 = 0.5 + 0.5 * sin(q.x * 1.45 + 0.7 * sin(q.y * 1.1 + t));
  float b2 = 0.5 + 0.5 * sin(q.x * 0.9 - q.y * 1.3 - t * 0.6 + 2.1);

  // the brand blues (PAL below): the deep night, the brand navy in the bands, a cold teal where two bands cross
  vec3 col = mix(uC0, uC1, smoothstep(0.40, 1.0, b1) * 0.72);
  col = mix(col, uC2, smoothstep(0.62, 1.0, b1 * b2) * 0.38);
  col = mix(col, uC3, smoothstep(0.74, 1.0, b2 * (1.0 - b1 * 0.6)) * 0.20);
  // the comparison's middle way (round 5, Liav: "neon circles in the brand colour"): two wide pools of the brand blue
  // that drift over minutes
  if (uOrb > 0.0) {
    vec2 d1 = p - vec2(0.42 + 0.09 * sin(t * 0.5), 0.16 + 0.07 * cos(t * 0.41));
    vec2 d2 = p - vec2(-0.48 + 0.08 * cos(t * 0.45), -0.30 + 0.06 * sin(t * 0.6));
    float g = exp(-dot(d1, d1) / 0.09) * 0.9 + exp(-dot(d2, d2) / 0.07) * 0.75;
    col += vec3(0.02, 0.17, 0.72) * g * 0.42 * uOrb;
  }

  // the edges sink into the night
  col *= mix(0.62, 1.04, smoothstep(1.3, 0.1, length((uv - 0.5) * vec2(1.0, 1.3))));
  col += (hash(gl_FragCoord.xy + fract(uTime)) - 0.5) / 255.0;
  gl_FragColor = vec4(col, 1.0);
}`;

// the night's palettes: the dark one is the site's; "mid" and "brand" are the round-5 comparison for the client
// (Idan, 18.10: "keep our Treenergy blue... a touch lighter"), switched by ?bg= until he decides
const PAL = {
  dark: { c: [[0, 0.026, 0.1], [0, 0.056, 0.19], [0, 0.085, 0.25], [0.008, 0.11, 0.16]], orb: 0 },
  mid: { c: [[0, 0.026, 0.1], [0, 0.07, 0.235], [0.01, 0.105, 0.32], [0.008, 0.11, 0.16]], orb: 1 },
  brand: { c: [[0, 0.1, 0.31], [0, 0.145, 0.42], [0.03, 0.195, 0.52], [0, 0.2, 0.3]], orb: 0 },
};

export function mountSky(canvas) {
  const reduce = !!window.__still || matchMedia("(prefers-reduced-motion: reduce)").matches;
  const gl = canvas.getContext("webgl", { antialias: false, alpha: false, depth: false, stencil: false, powerPreference: "low-power", preserveDrawingBuffer: false });
  if (!gl) return null;
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
  const pr = gl.createProgram();
  gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(pr);
  if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return null;
  gl.useProgram(pr);
  const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(pr, "a"); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const U = {}; ["uRes", "uTime", "uDrift", "uOrb", "uC0", "uC1", "uC2", "uC3"].forEach((n) => (U[n] = gl.getUniformLocation(pr, n)));
  const pal0 = PAL[document.documentElement.dataset.bg] || PAL.dark;
  const pal = { c: pal0.c.map((v) => [...v]), orb: pal0.orb };

  // the field changes over minutes: 20 frames a second is more than it needs
  const STEP = 1 / 20;
  let W = 1, H = 1, running = false, raf = 0, last = performance.now(), acc = 0, time = 40.0, drift = 0, dirty = true;

  function resize() {
    W = innerWidth; H = Math.max(innerHeight, document.documentElement.clientHeight);
    // wide pools: a texel for every three CSS pixels or so is plenty (the browser smooths it up)
    const scale = Math.min(0.36, 560 / Math.max(W, H));
    canvas.width = Math.max(2, Math.round(W * scale)); canvas.height = Math.max(2, Math.round(H * scale));
    gl.viewport(0, 0, canvas.width, canvas.height);
    draw();
  }
  function draw() {
    gl.uniform2f(U.uRes, canvas.width, canvas.height);
    gl.uniform1f(U.uTime, time);
    gl.uniform1f(U.uDrift, drift);
    gl.uniform1f(U.uOrb, pal.orb);
    pal.c.forEach((v, i) => gl.uniform3f(U["uC" + i], v[0], v[1], v[2]));
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    dirty = false;
  }
  function loop(now) {
    raf = requestAnimationFrame(loop);
    acc += Math.min(0.1, (now - last) / 1000); last = now;
    if (acc < STEP && !dirty) return;
    time += acc; acc = 0;
    draw();
  }
  function start() { if (running || reduce) return; running = true; last = performance.now(); raf = requestAnimationFrame(loop); }
  function stop() { running = false; cancelAnimationFrame(raf); }

  addEventListener("resize", resize);
  document.addEventListener("visibilitychange", () => (document.hidden ? stop() : start()));
  resize();
  canvas.classList.add("on");
  if (!reduce) start();

  return {
    // y: page scroll in px; the night slides a little with the page (no speed-up: it stays calm)
    scroll(y) { const d = y / H * 0.035; if (Math.abs(d - drift) < 1e-4) return; drift = d; if (running) dirty = true; else draw(); },
    // the comparison: ease the night to another palette over a second
    palette(name) {
      const to = PAL[name] || PAL.dark, from = { c: pal.c.map((v) => [...v]), orb: pal.orb }, t0 = performance.now();
      const step = (now) => {
        const k = reduce ? 1 : Math.min(1, (now - t0) / 1100), e = k * k * (3 - 2 * k);
        pal.c.forEach((v, i) => v.forEach((_, j) => (v[j] = from.c[i][j] + (to.c[i][j] - from.c[i][j]) * e)));
        pal.orb = from.orb + (to.orb - from.orb) * e;
        draw();
        if (k < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    },
  };
}
