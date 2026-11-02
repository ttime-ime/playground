import init, { convert_json, reverse_json, version } from "./pkg/ttime_wasm.js";

const $ = (id) => document.getElementById(id);
const enc = new TextEncoder(), dec = new TextDecoder();
let last = "ewts"; // which box the user edited most recently
let precomposed = false;
let guard = false;

const hex = (s) => [...s].slice(0, 400).map((c) => c.codePointAt(0).toString(16).toUpperCase().padStart(4, "0")).join(" ") + ([...s].length > 400 ? " …" : "");
const slice = (s, a, b) => dec.decode(enc.encode(s).slice(a, b));

function setStatus(msg) {
  $("status").textContent = msg;
  clearTimeout(setStatus.t);
  setStatus.t = setTimeout(() => ($("status").textContent = ""), 2500);
}

function diagItems(diags, source, label) {
  return diags.map((d) => {
    const li = document.createElement("li");
    li.className = d.severity === "Warning" ? "warn" : "note";
    const tag = document.createElement("span");
    tag.className = "tag";
    tag.textContent = d.severity === "Warning" ? "Warning" : "Note";
    const at = slice(source, d.start, d.end);
    li.append(tag, `${label}: ${d.code} at ${JSON.stringify(at)}: ${d.message}`);
    return li;
  });
}

function countBadge() {
  const items = [...$("r-diag").children].filter((li) => li.className);
  const warn = items.filter((li) => li.className === "warn").length;
  const note = items.length - warn;
  const el = $("diag-count");
  const parts = [];
  if (warn) parts.push(`${warn} warning${warn > 1 ? "s" : ""}`);
  if (note) parts.push(`${note} note${note > 1 ? "s" : ""}`);
  el.textContent = parts.length ? parts.join(", ") : "no notes";
  el.classList.toggle("has", warn > 0);
}

function update() {
  if (guard) return;
  guard = true;
  const ul = $("r-diag");
  ul.textContent = "";
  let fid = "n/a", rt = "n/a";
  if (last === "ewts") {
    const f = JSON.parse(convert_json($("ewts").value, precomposed));
    $("uni").value = f.text;
    ul.append(...diagItems(f.diagnostics, $("ewts").value, "EWTS→Unicode"));
    const r = JSON.parse(reverse_json(f.text));
    fid = r.fidelity;
    const back = JSON.parse(convert_json(r.text, precomposed)).text;
    rt = back === f.text ? `Unicode → EWTS → Unicode is unchanged (EWTS written back: ${JSON.stringify(r.text)})` : `DIFFERS: EWTS written back ${JSON.stringify(r.text)} gives ${hex(back)}`;
    ul.append(...diagItems(r.diagnostics, f.text, "Unicode→EWTS"));
  } else {
    const r = JSON.parse(reverse_json($("uni").value));
    $("ewts").value = r.text;
    fid = r.fidelity;
    ul.append(...diagItems(r.diagnostics, $("uni").value, "Unicode→EWTS"));
    const f = JSON.parse(convert_json(r.text, precomposed));
    rt = f.text === $("uni").value ? "EWTS → Unicode gives the text back exactly" : f.text.normalize("NFC") === $("uni").value.normalize("NFC") ? "Equal after NFC normalization only" : `DIFFERS: EWTS gives ${hex(f.text)}`;
    ul.append(...diagItems(f.diagnostics, r.text, "EWTS→Unicode"));
  }
  if (!ul.children.length) ul.innerHTML = "<li>none</li>";
  $("r-dir").textContent = last === "ewts" ? "EWTS box, converted to Unicode" : "Unicode box, converted to EWTS";
  countBadge();
  $("r-fid").textContent = $("uni").value || $("ewts").value ? fid : "—";
  $("r-rt").textContent = $("uni").value || $("ewts").value ? rt : "—";
  $("r-cp").textContent = hex($("uni").value);
  $("r-nf").textContent = $("uni").value === "" ? "—" : $("uni").value.normalize("NFC") === $("uni").value ? "NFC (unchanged by normalization)" : "Not NFC: normalizing would change this text";
  guard = false;
  report();
}

function report() {
  const lines = ["T-Time Converter report", `Version: ${version()}`, `Browser: ${navigator.userAgent}`, `Precomposed output: ${precomposed}`, `Last edited: ${last}`];
  if ($("include-text").checked) {
    lines.push(`EWTS: ${JSON.stringify($("ewts").value)}`, `Unicode: ${JSON.stringify($("uni").value)}`, `Code points: ${hex($("uni").value)}`);
  } else lines.push("(text omitted by the sender)");
  lines.push(`Fidelity: ${$("r-fid").textContent}`, `Round trip: ${$("r-rt").textContent}`, `Expected: ${$("expected").value || "(not given)"}`);
  $("report").textContent = lines.join("\n");
}

async function copy(text, ok) {
  try { await navigator.clipboard.writeText(text); setStatus(ok); } catch { setStatus("Select the text and copy it"); }
}

await init();
$("build").textContent = version();
$("ewts").addEventListener("input", () => { last = "ewts"; update(); });
$("uni").addEventListener("input", () => { last = "uni"; update(); });
$("precomposed").addEventListener("change", (e) => { precomposed = e.target.checked; update(); });
$("example").addEventListener("change", (e) => {
  if (!e.target.value) return;
  $("ewts").value = e.target.value;
  last = "ewts";
  update();
  e.target.value = "";
  $("ewts").focus();
});
$("clear").addEventListener("click", () => { $("ewts").value = ""; $("uni").value = ""; last = "ewts"; update(); });
$("copy-uni").addEventListener("click", () => copy($("uni").value, "Unicode copied"));
$("copy-ewts").addEventListener("click", () => copy($("ewts").value, "EWTS copied"));
$("copy-report").addEventListener("click", () => copy($("report").textContent, "Report copied"));
$("expected").addEventListener("input", report);
$("include-text").addEventListener("input", report);
$("ewts").value = "bkra shis bde legs";
update();
