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
uniform vec2 uRes; uniform float uTime, uDrift;
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

  // the brand blues: the deep night, the brand navy in the bands, a cold teal where two bands cross
  vec3 c0 = vec3(0.000, 0.026, 0.100);
  vec3 c1 = vec3(0.000, 0.056, 0.190);
  vec3 c2 = vec3(0.000, 0.085, 0.250);
  vec3 c3 = vec3(0.008, 0.110, 0.160);
  vec3 col = mix(c0, c1, smoothstep(0.40, 1.0, b1) * 0.72);
  col = mix(col, c2, smoothstep(0.62, 1.0, b1 * b2) * 0.38);
  col = mix(col, c3, smoothstep(0.74, 1.0, b2 * (1.0 - b1 * 0.6)) * 0.20);

  // the edges sink into the night
  col *= mix(0.62, 1.04, smoothstep(1.3, 0.1, length((uv - 0.5) * vec2(1.0, 1.3))));
  col += (hash(gl_FragCoord.xy + fract(uTime)) - 0.5) / 255.0;
  gl_FragColor = vec4(col, 1.0);
}`;

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
  const U = {}; ["uRes", "uTime", "uDrift"].forEach((n) => (U[n] = gl.getUniformLocation(pr, n)));

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
    scroll(y) { const d = y / H * 0.035; if (Math.abs(d - drift) < 1e-4) return; drift = d; if (running) dirty = true; else draw(); }
  };
}
