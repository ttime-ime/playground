import init, { convert_json, version } from "./pkg/ttime_wasm.js";

const $ = (id) => document.getElementById(id);
const unescape = (s) => s.replace(/\\u([0-9A-Fa-f]{4})/g, (_, h) => String.fromCodePoint(parseInt(h, 16)));
const hex = (s) => [...s].map((c) => c.codePointAt(0).toString(16)).join(" ");

await init();
$("build").textContent = version();
const names = (await (await fetch("fixtures/index.txt")).text()).split("\n").filter((n) => n.endsWith(".tsv"));
let total = 0, failed = 0;
const out = [];
const body = $("files").tBodies[0];
for (const name of names) {
  const text = await (await fetch("fixtures/" + name)).text();
  const pre = name === "precomposed.tsv";
  let n = 0, bad = 0;
  for (const line of text.split("\n")) {
    if (!line || line.startsWith("#")) continue;
    const tab = line.indexOf("\t");
    if (tab < 0) continue;
    const input = line.slice(0, tab), expected = unescape(line.slice(tab + 1));
    const got = JSON.parse(convert_json(input, pre)).text;
    n++;
    if (got !== expected) {
      bad++;
      out.push(`${name}: ${JSON.stringify(input)}\n  expected ${hex(expected)}\n  got      ${hex(got)}`);
    }
  }
  total += n;
  failed += bad;
  const tr = body.insertRow();
  tr.insertCell().textContent = name;
  const c = tr.insertCell();
  c.className = "num";
  c.textContent = n;
  const r = tr.insertCell();
  r.className = bad ? "fail" : "pass";
  r.textContent = bad ? `${bad} failed` : "ok";
}
$("summary").textContent = `${total} cases, ${failed} failed`;
$("failures").textContent = out.length ? out.join("\n") : "none";
document.title = `parity: ${total} cases, ${failed} failed`;
$("copy-failures").addEventListener("click", async () => {
  const text = `${version()}\n${total} cases, ${failed} failed\n\n${out.join("\n") || "none"}`;
  try { await navigator.clipboard.writeText(text); $("status").textContent = "Copied"; } catch { $("status").textContent = "Select the text and copy it"; }
});
