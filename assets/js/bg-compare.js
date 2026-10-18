// Treenergy · the night compared (round 5, sketch only: it leaves with the client's choice).
// ?bg= on the address shows a small switch at the foot of the screen: the site's dark night, a middle way with more of
// the brand blue in the pools and the coloured word, and the night in the brand navy itself (Idan, 18.10: "keep our
// Treenergy blue... a touch lighter"). The choice stays on the address, so a link opens on it.
const MODES = [["dark", "כהה"], ["mid", "ביניים"], ["brand", "כחול המותג"]];
const THEME = { dark: "#000B26", mid: "#000B26", brand: "#001A50" };

export function mount(sky) {
  const d = document.documentElement;
  const bar = document.createElement("div");
  bar.className = "bg-cmp"; bar.setAttribute("role", "group"); bar.setAttribute("aria-label", "צבע הרקע להשוואה");
  const set = (name, first) => {
    if (name === "dark") d.removeAttribute("data-bg"); else d.setAttribute("data-bg", name);
    bar.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.bg === name)));
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", THEME[name]);
    if (first) return;
    if (sky) sky.palette(name);
    const u = new URL(location.href); u.searchParams.set("bg", name); history.replaceState(history.state, "", u);
  };
  for (const [name, label] of MODES) {
    const b = document.createElement("button");
    b.type = "button"; b.dataset.bg = name; b.textContent = label;
    b.addEventListener("click", () => set(name));
    bar.append(b);
  }
  document.body.append(bar);
  set(MODES.some(([n]) => n === d.dataset.bg) ? d.dataset.bg : "dark", true);
}
