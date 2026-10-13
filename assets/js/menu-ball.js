// Treenergy · the menu as a ball of the page's places (after React Bits' Infinite Menu, made in the site's language).
// The night globe of the opening again, small: a sphere of faint points carrying a disc for every place on the page,
// each place several times over so the ball is full all round. Drag it and it turns, and runs on a little when it is
// let go; when it comes to rest the disc nearest the visitor swings round to face them, and that place's name stands
// beside the ball with the way there. A tap on the front disc goes there, a tap on another disc turns the ball to it,
// and pointing at a line of the list turns the ball to that place. Discs keep their writing upright wherever they are.
import * as THREE from "three";

const clamp01 = (x) => Math.min(1, Math.max(0, x));
const smooth = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const EZ = new THREE.Vector3(0, 0, 1), EY = new THREE.Vector3(0, 1, 0);

// evenly spread points on the unit sphere, top to bottom
function fib(n) {
  const out = [], g = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const y = 1 - ((i + 0.5) / n) * 2, r = Math.sqrt(1 - y * y), a = g * i;
    out.push(new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r));
  }
  return out;
}

// a disc: the navy of the brand, a green rim, the place's number large in green and its name under it
function face(it) {
  const S = 512, c = document.createElement("canvas"); c.width = c.height = S;
  const x = c.getContext("2d");
  const g = x.createRadialGradient(256, 170, 0, 256, 256, 256);
  g.addColorStop(0, "#0B2F7E"); g.addColorStop(0.62, "#00194F"); g.addColorStop(1, "#000F30");
  x.fillStyle = g; x.fillRect(0, 0, S, S);
  x.lineWidth = 7; x.strokeStyle = "rgba(48,247,123,.92)";
  x.beginPath(); x.arc(256, 256, 247, 0, Math.PI * 2); x.stroke();
  x.lineWidth = 2; x.strokeStyle = "rgba(243,246,252,.14)";
  x.beginPath(); x.arc(256, 256, 222, 0, Math.PI * 2); x.stroke();
  x.direction = "rtl"; x.textAlign = "center"; x.textBaseline = "alphabetic";
  x.fillStyle = "#30F77B"; x.font = '300 176px Hatzor, Almoni, sans-serif';
  x.fillText(it.n, 256, 268);
  let fs = 46; x.font = `400 ${fs}px Almoni, sans-serif`;
  while (x.measureText(it.t).width > 380 && fs > 30) { fs -= 2; x.font = `400 ${fs}px Almoni, sans-serif`; }
  x.fillStyle = "#F3F6FC"; x.fillText(it.t, 256, 356);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}

function glowTexture() {
  const S = 128, c = document.createElement("canvas"); c.width = c.height = S;
  const x = c.getContext("2d"), g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, "rgba(48,247,123,.55)"); g.addColorStop(0.45, "rgba(48,247,123,.16)"); g.addColorStop(1, "rgba(48,247,123,0)");
  x.fillStyle = g; x.fillRect(0, 0, S, S);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export async function mountBall(host, { items, onActive, onMove, onPick }) {
  await Promise.all([document.fonts.load("300 176px Hatzor"), document.fonts.load("400 46px Almoni")]).catch(() => {});
  const canvas = document.createElement("canvas");
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "low-power" });
  renderer.setClearColor(0x000000, 0);
  host.appendChild(canvas);

  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(36, 1, 0.1, 20);
  cam.position.set(0, 0, 3.6);

  // small screens carry fewer, larger discs
  const N = innerWidth < 768 ? 18 : 30, DR = N === 18 ? 0.3 : 0.235;
  const dirs = fib(N), maps = items.map(face), geo = new THREE.CircleGeometry(DR, 72);
  const discs = dirs.map((d, i) => {
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: maps[i % items.length], transparent: true }));
    m.userData = { d, k: i % items.length, w: new THREE.Vector3(), lit: 0, s: 1 };
    scene.add(m);
    return m;
  });

  // the points of the night globe, brighter on the side facing the visitor
  const P = innerWidth < 768 ? 900 : 1500, pos = new Float32Array(P * 3);
  fib(P).forEach((v, i) => v.multiplyScalar(0.975).toArray(pos, i * 3));
  const pg = new THREE.BufferGeometry(); pg.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const dots = new THREE.Points(pg, new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uPx: { value: 1 }, uA: { value: 0 } },
    vertexShader: `uniform float uPx; varying float vA;
      void main(){ vec3 n = normalize(mat3(modelViewMatrix) * position); vA = mix(.04, .34, smoothstep(-.3, .95, n.z));
        gl_PointSize = 1.7 * uPx; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
    fragmentShader: `uniform float uA; varying float vA;
      void main(){ vec2 p = gl_PointCoord - .5; if (dot(p, p) > .25) discard; gl_FragColor = vec4(.56, .69, 1., vA * uA); }`,
  }));
  scene.add(dots);

  // a green glow behind the disc that faces the visitor
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 }));
  glow.scale.setScalar(DR * 4.2);
  scene.add(glow);

  const Q = new THREE.Quaternion(), target = new THREE.Quaternion(), from = new THREE.Quaternion(), qa = new THREE.Quaternion();
  const w = new THREE.Vector3(), axis = new THREE.Vector3(), tmp = new THREE.Vector3();
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  const tau = 130;
  let mode = "rest", front = -1, active = -1, intro = false, isOpen = false, raf = 0, last = 0, t0 = 0, mv = 0, wheelT = 0, drag = null;

  function fit() {
    const W = host.clientWidth, H = host.clientHeight; if (!W || !H) return;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    renderer.setPixelRatio(dpr); renderer.setSize(W, H, false);
    cam.aspect = W / H;
    cam.position.z = N === 18 ? 4 : 3.6;            // the larger discs of small screens stand further out of the ball
    cam.fov = W >= H ? 36 : (2 * Math.atan(Math.tan(18 * Math.PI / 180) / cam.aspect) * 180) / Math.PI;
    cam.updateProjectionMatrix();
    dots.material.uniforms.uPx.value = dpr;
  }
  const worldDir = (i, out) => out.copy(discs[i].userData.d).applyQuaternion(Q);

  // turn the ball so disc i faces the visitor (the shortest way round)
  function snapTo(i) {
    worldDir(i, tmp);
    qa.setFromUnitVectors(tmp, EZ);
    target.copy(Q).premultiply(qa);
    mode = "snap"; w.set(0, 0, 0);
    wake();
  }
  function nearest(k) {
    let best = -1, bz = -9;
    discs.forEach((m, i) => { if (k != null && m.userData.k !== k) return; const z = worldDir(i, tmp).z; if (z > bz) { bz = z; best = i; } });
    return best;
  }

  function frame(now) {
    raf = isOpen ? requestAnimationFrame(frame) : 0;
    const dt = Math.max(0, Math.min(64, now - last || 16)); last = now;
    if (mode === "spin") {
      const sp = w.length();
      if (sp < 0.00022) snapTo(nearest());
      else { qa.setFromAxisAngle(axis.copy(w).normalize(), sp * dt); Q.premultiply(qa); w.multiplyScalar(Math.exp(-dt / 300)); }
    }
    if (mode === "intro") {
      // the way in: one long easing turn onto the place the visitor is at
      const t = clamp01((now - t0 - 80) / 1500);
      Q.copy(from).slerp(target, easeOut(t));
      if (t >= 1) { mode = "rest"; intro = false; }
    }
    if (mode === "snap") {
      Q.slerp(target, 1 - Math.exp(-dt / tau));
      if (Q.angleTo(target) < 0.002) { Q.copy(target); mode = "rest"; onMove(false); }
    }
    const moving = mode === "drag" || mode === "spin" || mode === "wheel" || (mode === "snap" && Q.angleTo(target) > 0.06);
    mv += ((moving ? 1 : 0) - mv) * (1 - Math.exp(-dt / 110));

    let best = -1, bz = -9;
    discs.forEach((m, i) => {
      const u = m.userData; worldDir(i, u.w);
      if (u.w.z > bz) { bz = u.w.z; best = i; }
    });
    front = best;
    const fk = discs[front].userData.k;
    if (!intro && fk !== active) { active = fk; onActive(fk); }
    const age = now - t0;
    discs.forEach((m, i) => {
      const u = m.userData, on = i === front ? 1 : 0;
      u.lit += (on * (1 - mv) - u.lit) * (1 - Math.exp(-dt / 160));
      const appear = easeOut(clamp01((age - 120 - i * (520 / N)) / 520));
      m.position.copy(u.w);
      m.lookAt(tmp.copy(u.w).multiplyScalar(2));
      const s = (1 - 0.16 * mv + 0.07 * u.lit) * (0.6 + 0.4 * appear);
      m.scale.setScalar(s);
      m.material.opacity = smooth(0.08, 0.44, u.w.z) * appear;
      const c = 0.5 + 0.22 * mv + (0.5 - 0.22 * mv) * u.lit;
      m.material.color.setRGB(c, c, c);
    });
    dots.quaternion.copy(Q);
    dots.material.uniforms.uA.value = clamp01(age / 700);
    const fm = discs[front];
    glow.position.copy(fm.position).multiplyScalar(0.96);
    glow.material.opacity = fm.userData.lit * clamp01((age - 500) / 500);
    renderer.render(scene, cam);
  }
  function wake() { if (isOpen && !raf) { last = performance.now(); raf = requestAnimationFrame(frame); } }

  // ---------- the hand ----------
  const pick = (e) => {
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, cam);
    const hit = ray.intersectObjects(discs, false).find((h) => h.object.material.opacity > 0.4);
    return hit ? discs.indexOf(hit.object) : -1;
  };
  canvas.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    canvas.setPointerCapture(e.pointerId);
    drag = { x: e.clientX, y: e.clientY, t: performance.now(), moved: 0 };
    mode = "drag"; intro = false; w.set(0, 0, 0);
    canvas.classList.add("is-grab");
    wake();
  });
  canvas.addEventListener("pointermove", (e) => {
    if (!drag) { canvas.style.cursor = pick(e) >= 0 ? "pointer" : ""; return; }
    const now = performance.now(), dx = e.clientX - drag.x, dy = e.clientY - drag.y, dt = Math.max(8, now - drag.t);
    drag.x = e.clientX; drag.y = e.clientY; drag.t = now; drag.moved += Math.abs(dx) + Math.abs(dy);
    const ang = Math.hypot(dx, dy) * (Math.PI / canvas.clientHeight) * 1.15;
    if (ang > 0) {
      axis.set(dy, dx, 0).normalize();
      qa.setFromAxisAngle(axis, ang); Q.premultiply(qa);
      w.lerp(tmp.copy(axis).multiplyScalar(Math.min(0.012, ang / dt)), 0.6);
    }
    if (drag.moved > 6) onMove(true);
  });
  const release = (e) => {
    if (!drag) return;
    const tap = drag.moved <= 6, idle = performance.now() - drag.t > 90;
    drag = null; canvas.classList.remove("is-grab");
    if (tap) {
      const i = pick(e);
      if (i >= 0 && i === front) { mode = "rest"; onPick(discs[i].userData.k); return; }
      snapTo(i >= 0 ? i : nearest());
      return;
    }
    if (idle) w.set(0, 0, 0);
    mode = "spin"; wake();
  };
  canvas.addEventListener("pointerup", release);
  canvas.addEventListener("pointercancel", release);
  canvas.addEventListener("wheel", (e) => {
    e.preventDefault();
    qa.setFromAxisAngle(EY, (e.deltaY + e.deltaX) * 0.003); Q.premultiply(qa);
    mode = "wheel"; intro = false; onMove(true); wake();
    clearTimeout(wheelT); wheelT = setTimeout(() => snapTo(nearest()), 160);
  }, { passive: false });
  addEventListener("resize", () => { if (isOpen) fit(); });

  return {
    // the ball comes in turning and settles on place k
    open(k) {
      isOpen = true; fit();
      const i = nearest(k);
      worldDir(i, tmp); qa.setFromUnitVectors(tmp, EZ); target.copy(Q).premultiply(qa);
      Q.copy(target).premultiply(qa.setFromAxisAngle(EY, -1.1)); from.copy(Q);
      active = k; onActive(k); onMove(false);
      intro = true; mode = "intro"; mv = 0; t0 = performance.now();
      discs.forEach((m) => { m.userData.lit = 0; });
      wake();
    },
    close() { isOpen = false; if (raf) cancelAnimationFrame(raf); raf = 0; drag = null; },
    turnTo(k) { if (!isOpen || mode === "drag" || k === active && (mode === "rest" || mode === "intro")) return; intro = false; snapTo(nearest(k)); },
  };
}
