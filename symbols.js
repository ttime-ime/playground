import init, { search_symbols_json, version } from "./pkg/ttime_wasm.js?v=e360af5557";

const $ = (id) => document.getElementById(id);
const VERDICTS = [
  ["", "Not marked"],
  ["ok", "Fine"],
  ["fix", "Needs a change"],
  ["unsure", "Unsure"],
  ["remove", "Should not be here"],
];
const marks = new Map(); // id -> { verdict, note }

const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};
const shown = (text) => (/^\p{M}/u.test(text) ? "◌" + text : text);
const ewtsText = (s) => (s.ewts === null ? "no EWTS" : s.ewts === " " ? "space" : s.ewts);

function mark(id) {
  if (!marks.has(id)) marks.set(id, { verdict: "", note: "" });
  return marks.get(id);
}

function draw(all) {
  const rows = $("rows");
  const q = $("filter").value.trim().toLowerCase();
  const hits = q
    ? all.filter((s) => [s.id, s.category, s.label, s.name, s.note, s.ewts ?? "", s.codePoints, s.text].join(" ").toLowerCase().includes(q))
    : all;
  $("count").textContent = `${hits.length} of ${all.length} entries`;
  rows.textContent = "";
  for (const s of hits) {
    const tr = el("tr");
    const glyph = el("td", "tib", shown(s.text));
    glyph.lang = "bo";
    glyph.style.fontSize = "1.5rem";
    const label = el("td");
    label.append(el("div", "", s.label));
    label.append(el("div", "hint", s.name + (s.note ? ` — ${s.note}` : "")));
    const verdict = el("select");
    verdict.setAttribute("aria-label", `Verdict for ${s.label}`);
    for (const [v, t] of VERDICTS) {
      const o = el("option", "", t);
      o.value = v;
      verdict.append(o);
    }
    verdict.value = mark(s.id).verdict;
    verdict.addEventListener("change", () => { mark(s.id).verdict = verdict.value; report(all); });
    const note = el("input");
    note.type = "text";
    note.setAttribute("aria-label", `Note on ${s.label}`);
    note.value = mark(s.id).note;
    note.addEventListener("input", () => { mark(s.id).note = note.value; report(all); });
    const code = (t) => { const c = el("td"); c.append(el("code", "", t)); return c; };
    const td = (child) => { const c = el("td"); c.append(child); return c; };
    tr.append(glyph, label, code(ewtsText(s)), code(s.codePoints), el("td", "", s.category), el("td", "", s.evidence), td(verdict), td(note));
    rows.append(tr);
  }
}

function report(all) {
  const lines = ["T-Time symbol review", `Version: ${version()}`, `Browser: ${navigator.userAgent}`];
  const who = $("reviewer").value.trim();
  if (who) lines.push(`Reviewer: ${who}`);
  const label = Object.fromEntries(VERDICTS);
  let n = 0;
  for (const s of all) {
    const m = marks.get(s.id);
    if (!m || (!m.verdict && !m.note.trim())) continue;
    n++;
    lines.push(`- ${s.id} (${s.codePoints}, EWTS ${ewtsText(s)}): ${label[m.verdict] || "Not marked"}${m.note.trim() ? ` — ${m.note.trim()}` : ""}`);
  }
  if (n === 0) lines.push("(no entries marked)");
  const missing = $("missing").value.trim();
  lines.push(`Missing: ${missing || "(none given)"}`);
  const text = lines.join("\n");
  $("review").textContent = text;
  const body = text.length > 6000 ? text.slice(0, 6000) + "\n…(truncated; use Copy review for the full text)" : text;
  $("gh-issue").href = "https://github.com/ttime-ime/playground/issues/new?" + new URLSearchParams({ title: "Symbol review", body });
}

function setStatus(msg) {
  $("status").textContent = msg;
  clearTimeout(setStatus.t);
  setStatus.t = setTimeout(() => ($("status").textContent = ""), 2500);
}

await init({ module_or_path: new URL("./pkg/ttime_wasm_bg.wasm?v=b9ce97e75e", import.meta.url) });
$("build").textContent = version();
const all = JSON.parse(search_symbols_json(""));
draw(all);
report(all);
$("filter").addEventListener("input", () => draw(all));
for (const id of ["missing", "reviewer"]) $(id).addEventListener("input", () => report(all));
$("copy-review").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText($("review").textContent);
    setStatus("Review copied");
  } catch {
    setStatus("Select the review text and copy it");
  }
});
