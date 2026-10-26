// Treenergy · the title behind the Earth compared (scene page, sketch only: it leaves with Liav's choice). ?hero= on the
// address shows a small switch: the title as it is, the title going down behind the horizon with the first scroll, and
// the name TREENERGY large and tilted half behind the Earth. The choice stays on the address, so a link opens on it
const MODES = [["now", "כמו היום"], ["sink", "שקיעה"], ["word", "TREENERGY"]];

export function mount() {
  const d = document.documentElement;
  const bar = document.createElement("div");
  bar.className = "bg-cmp hero-cmp"; bar.setAttribute("role", "group"); bar.setAttribute("aria-label", "הכותרת בפתיחה להשוואה");
  const set = (name, first) => {
    if (name === "now") d.removeAttribute("data-hero"); else d.setAttribute("data-hero", name);
    bar.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.hero === name)));
    if (first) return;
    const u = new URL(location.href); u.searchParams.set("hero", name); history.replaceState(history.state, "", u);
    // scene.js lays the opening out again (the word's size, how low the picture starts)
    dispatchEvent(new Event("resize"));
  };
  for (const [name, label] of MODES) {
    const b = document.createElement("button");
    b.type = "button"; b.dataset.hero = name; b.textContent = label;
    b.addEventListener("click", () => set(name));
    bar.append(b);
  }
  document.body.append(bar);
  set(MODES.some(([n]) => n === d.dataset.hero) ? d.dataset.hero : "now", true);
}
