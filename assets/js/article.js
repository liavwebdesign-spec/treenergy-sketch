// Treenergy · an article. The chrome (night, header, menu, accessibility) is page.js; here only the reading line:
// a thin green line fixed right under the header bar (client doc 5.11: it rose over the logo on the draft site; here it
// never moves, only fills), from the first paragraph to the last.
const bar = document.querySelector(".ar-progress"), body = document.querySelector("[data-ar-body]");
if (bar && body) {
  let top = 0, end = 1, last = -1, raf = 0;
  const measure = () => {
    const r = body.getBoundingClientRect(), hd = parseFloat(getComputedStyle(bar).top) || 0;
    top = r.top + scrollY - hd;                        // the body's top under the header bar: the line starts
    end = Math.max(1, r.bottom + scrollY - innerHeight - top);  // the body's last line at the bottom of the screen: full
    tick();
  };
  const tick = () => {
    raf = 0;
    const p = Math.min(1, Math.max(0, (scrollY - top) / end));
    const k = Math.round(p * 1000) / 1000;
    if (k === last) return;
    last = k;
    bar.style.setProperty("--p", k);
    bar.classList.toggle("is-on", k > 0);
  };
  addEventListener("scroll", () => { if (!raf) raf = requestAnimationFrame(tick); }, { passive: true });
  addEventListener("resize", measure, { passive: true });
  new ResizeObserver(measure).observe(document.body);
  measure();
}
