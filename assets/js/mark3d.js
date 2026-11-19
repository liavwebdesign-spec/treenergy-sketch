/* The about page's opening: the brand's triangle as a heavy solid in space.
   The mark is a slab of dark blue glass-metal, extruded from the logo's own outline (a distance map of it, data-sdf),
   with rounded edges that catch a soft light, its slots lit green from inside, and a slow pulse running down the slots
   to the tip, where the page's trail is born. It turns a little on its own, leans towards the pointer and tips back
   as the page scrolls. Ray-marched in one small WebGL pass; without WebGL, or if anything fails, the flat mark shows
   (.is-flat on the box). Stop-motion gets one still frame. */
const cv = document.querySelector("canvas.sh-mark[data-sdf]");
if (cv) init(cv);

function init(cv) {
  const box = cv.parentElement, html = document.documentElement;
  const flat = () => { box.classList.add("is-flat"); };
  let gl = null;
  try { gl = cv.getContext("webgl", { alpha: true, premultipliedAlpha: true, antialias: false, powerPreference: "high-performance" }); } catch (e) {}
  if (!gl) { flat(); return; }

  const VS = `attribute vec2 a;uniform vec2 uRes;varying vec2 vUv;
void main(){vUv=a*vec2(uRes.x/uRes.y,1.);gl_Position=vec4(a,0.,1.);}`;
  const FS = `precision highp float;
varying vec2 vUv;
uniform sampler2D uT;uniform mat3 uR,uRT;uniform vec2 uRes;uniform float uTime;
const float H=0.11,RR=0.012,BAND=0.06,F=0.2516;
const vec3 TIP=vec3(0.,-0.4957,0.);
const vec3 GRN=vec3(0.19,0.97,0.48);
float sd2(vec2 p){
  vec2 q=abs(p)-0.5;
  if(max(q.x,q.y)>0.08) return length(max(q,0.));
  vec4 t=texture2D(uT,vec2((p.x+.6)/1.2,(.6-p.y)/1.2));
  float v=dot(t.rg,vec2(65280.,255.))/65535.;
  return (v*2.-1.)*BAND;
}
float map(vec3 p){
  float d=sd2(p.xy);
  vec2 w=vec2(d+RR,abs(p.z)-H+RR);
  return min(max(w.x,w.y),0.)+length(max(w,0.))-RR;
}
float sdTri(vec2 p){
  vec2 p0=vec2(-.5,.4957),p1=vec2(-.00217,-.4957),p2=vec2(.5,.4957);
  vec2 e0=p1-p0,e1=p2-p1,e2=p0-p2,v0=p-p0,v1=p-p1,v2=p-p2;
  vec2 q0=v0-e0*clamp(dot(v0,e0)/dot(e0,e0),0.,1.);
  vec2 q1=v1-e1*clamp(dot(v1,e1)/dot(e1,e1),0.,1.);
  vec2 q2=v2-e2*clamp(dot(v2,e2)/dot(e2,e2),0.,1.);
  float s=sign(e0.x*e2.y-e0.y*e2.x);
  vec2 d=min(min(vec2(dot(q0,q0),s*(v0.x*e0.y-v0.y*e0.x)),vec2(dot(q1,q1),s*(v1.x*e1.y-v1.y*e1.x))),vec2(dot(q2,q2),s*(v2.x*e2.y-v2.y*e2.x)));
  return -sqrt(d.x)*sign(d.y);
}
vec2 ibox(vec3 o,vec3 d,vec3 b){
  vec3 m=1./(d+vec3(1e-7));vec3 n=m*o;vec3 k=abs(m)*b;
  vec3 t1=-n-k,t2=-n+k;
  return vec2(max(max(t1.x,t1.y),t1.z),min(min(t2.x,t2.y),t2.z));
}
vec3 env(vec3 r){
  vec3 c=mix(vec3(.01,.03,.09),vec3(.06,.14,.32),smoothstep(-.6,.8,r.y));
  c+=vec3(1.)*1.5*smoothstep(.1,0.,abs(r.y-.55))*smoothstep(1.,.3,abs(r.x));
  c+=GRN*1.1*smoothstep(.14,0.,abs(r.x+.75))*smoothstep(.2,-.4,r.y);
  float gx=sin(uTime*.35)*.9;
  c+=vec3(.8,.9,1.)*.8*smoothstep(.06,0.,abs(r.x-gx))*smoothstep(-.2,.6,r.y);
  return c;
}
void main(){
  vec3 ro=vec3(0.,.085,3.2),rd=normalize(vec3(vUv*F,-1.));
  vec3 o=uRT*(ro-TIP)+TIP,d=uRT*rd;
  vec2 bx=ibox(o,d,vec3(.52,.52,H+.01));
  if(bx.x>bx.y||bx.y<0.){gl_FragColor=vec4(0.);return;}
  float t=max(bx.x,0.),dmin=1e9,tm=t;
  for(int i=0;i<110;i++){
    float h=map(o+d*t);
    if(h<dmin){dmin=h;tm=t;}
    if(h<.0004)break;
    t+=h*.9;
    if(t>bx.y)break;
  }
  float pxw=2.*F*3.2/uRes.y;
  float a=1.-smoothstep(0.,pxw*1.5,dmin);
  if(a<=0.){gl_FragColor=vec4(0.);return;}
  vec3 p=o+d*tm;
  const vec2 e=vec2(.0015,0.);
  vec3 no=normalize(vec3(map(p+e.xyy)-map(p-e.xyy),map(p+e.yxy)-map(p-e.yxy),map(p+e.yyx)-map(p-e.yyx)));
  vec3 n=uR*no;
  vec3 L=normalize(vec3(.5,.7,.6));
  float dif=max(dot(n,L),0.);
  float ao=clamp(map(p+no*.03)/.03,0.,1.);
  // the face is deep and dark (little reflection head-on); the rounded edges and the sides take the light
  float face=smoothstep(.85,.98,abs(no.z));
  vec3 F0=mix(vec3(.1,.14,.22),vec3(.02,.03,.06),face);
  float c=1.-max(dot(n,-rd),0.);
  vec3 fr=F0+(1.-F0)*c*c*c*c*c;
  vec3 base=mix(vec3(.02,.045,.1),vec3(.002,.006,.02),face);
  float sp=pow(max(dot(reflect(-L,n),-rd),0.),48.);
  vec3 col=base*(.25+.9*dif)*(.4+.6*ao)+fr*env(reflect(rd,n))*(.5+.5*ao)+vec3(.85,.92,1.)*sp*(1.-face*.75)*.9;
  // a faint vertical sheen across the face, so the slab reads as polished rather than flat
  col+=vec3(.01,.03,.09)*face*smoothstep(.5,-.5,p.y)*.3;
  float inT=sdTri(p.xy);
  // the slots' walls glow green from inside, with a pulse running down to the tip
  if(inT<-.01&&abs(no.z)<.7){
    float pu=.55+.9*pow(1.-fract(-p.y*1.2-uTime*.25),5.);
    col+=GRN*.55*pu*smoothstep(-.01,-.03,inT);
  }
  // and spill a little onto the face round the slots' edges
  if(inT<-.02&&no.z>.5){
    float d2=sd2(p.xy);
    col+=GRN*exp(-abs(d2)*80.)*.18;
  }
  col=1.-exp(-col*1.4);
  col=pow(col,vec3(1./2.2));
  gl_FragColor=vec4(col*a,a);
}`;
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null; };
  const vs = sh(gl.VERTEX_SHADER, VS), fs = sh(gl.FRAGMENT_SHADER, FS);
  if (!vs || !fs) { flat(); return; }
  const pr = gl.createProgram(); gl.attachShader(pr, vs); gl.attachShader(pr, fs); gl.linkProgram(pr);
  if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) { flat(); return; }
  gl.useProgram(pr);
  const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const aLoc = gl.getAttribLocation(pr, "a"); gl.enableVertexAttribArray(aLoc); gl.vertexAttribPointer(aLoc, 2, gl.FLOAT, false, 0, 0);
  const U = (n) => gl.getUniformLocation(pr, n);
  const uR = U("uR"), uRT = U("uRT"), uRes = U("uRes"), uTime = U("uTime"), uT = U("uT");
  gl.uniform1i(uT, 0);
  gl.clearColor(0, 0, 0, 0);

  let ready = false, lost = false;
  let on = true, drawn = false, last = 0, raf = 0, t0 = 0;
  const tex = gl.createTexture();
  const img = new Image();
  img.onload = () => {
    if (lost) return;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    ready = true; drawn = false; kick();
  };
  img.onerror = flat;
  img.src = cv.dataset.sdf;

  cv.addEventListener("webglcontextlost", (e) => { e.preventDefault(); lost = true; flat(); });

  // the backing store: the box's size, a little sharper than CSS pixels on fine screens, 1:1 on touch
  const coarse = matchMedia("(pointer:coarse)").matches;
  const k = coarse ? 1 : Math.min(devicePixelRatio || 1, 1.25);
  const fit = () => {
    const w = Math.max(1, Math.round(cv.clientWidth * k)), h = Math.max(1, Math.round(cv.clientHeight * k));
    if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; drawn = false; kick(); }
  };
  new ResizeObserver(fit).observe(cv);
  fit();

  // the pointer, about the box's centre, eased
  let px = 0, py = 0, tx = 0, ty = 0;
  addEventListener("pointermove", (e) => {
    const b = box.getBoundingClientRect(); if (!b.width) return;
    tx = Math.max(-1, Math.min(1, (e.clientX - (b.left + b.width / 2)) / (innerWidth / 2)));
    ty = Math.max(-1, Math.min(1, (e.clientY - (b.top + b.height / 2)) / (innerHeight / 2)));
  }, { passive: true });

  const mq = matchMedia("(prefers-reduced-motion: reduce)");
  const still = () => window.__still || mq.matches || html.classList.contains("ax-still");
  new IntersectionObserver((es) => { on = es[es.length - 1].isIntersecting; if (on) kick(); }).observe(box);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) kick(); });

  const mat = (yaw, pitch) => {
    const cy = Math.cos(yaw), sy = Math.sin(yaw), cx = Math.cos(pitch), sx = Math.sin(pitch);
    // R = Ry(yaw) * Rx(pitch), rows
    const R = [cy, sy * sx, sy * cx, 0, cx, -sx, -sy, cy * sx, cy * cx];
    // column-major for GL: the columns of R are its rows' transposes
    const colR = [R[0], R[3], R[6], R[1], R[4], R[7], R[2], R[5], R[8]];
    const colRT = R.slice();   // R transposed, column-major, is R's rows in order
    return [colR, colRT];
  };

  function draw(t, yaw, pitch) {
    const [a, b] = mat(yaw, pitch);
    gl.viewport(0, 0, cv.width, cv.height);
    gl.uniformMatrix3fv(uR, false, a);
    gl.uniformMatrix3fv(uRT, false, b);
    gl.uniform2f(uRes, cv.width, cv.height);
    gl.uniform1f(uTime, t);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (!cv.classList.contains("is-in")) cv.classList.add("is-in");
  }

  function frame(now) {
    raf = 0;
    if (!ready || lost || !on || document.hidden) return;
    if (still()) {
      if (!drawn) { draw(0, -0.28, -0.08); drawn = true; }
      raf = requestAnimationFrame(frame); return;
    }
    drawn = false;
    if (now - last < 32) { raf = requestAnimationFrame(frame); return; }
    last = now;
    if (!t0) t0 = now;
    const t = (now - t0) / 1000;
    px += (tx - px) * 0.08; py += (ty - py) * 0.08;
    const sc = Math.max(0, Math.min(1, scrollY / innerHeight)) * 0.25;
    const yaw = Math.sin(t * 0.25) * 0.42 + px * 0.35;
    const pitch = -0.08 + Math.sin(t * 0.31) * 0.06 + py * 0.2 + sc;
    draw(t, yaw, pitch);
    raf = requestAnimationFrame(frame);
  }
  function kick() { if (!raf) raf = requestAnimationFrame(frame); }
  kick();
}
