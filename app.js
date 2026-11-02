import init, { Session, version, convert_json_with } from "./pkg/ttime_wasm.js?v=e360af5557";
import { initPalette } from "./palette.js?v=2bb9bbcb87";

const $ = (id) => document.getElementById(id);
const editor = $("editor");

const EXAMPLES = [
  ["Ordinary text (other implementations agree)", [
    ["bod skad", "two syllables"],
    ["bkra shis bde legs", "prefix letters"],
    ["rgyal ba'i mdo", "stack, 'a-chung, genitive"],
    ["bsgrubs", "prefix, stack and two suffixes"],
    ["khong [New York] la phebs song /", "bracketed literal, shad (THL rule 9)"],
    ["gyon g.yon ", "stack versus prefix with a dot (THL rule 3)"],
    ["sat+t+wa", "explicit stack with + (THL rule 4)"],
    ["sarba mang+galaM ", "Sanskrit in one syllable (THL rule 7)"],
  ]],
  ["Open questions: please judge, do not trust", [
    ["oM maNi padme hUM", "oM becomes ༀ here; some converters give ཨོཾ"],
    ["kii", "repeated vowel: stacked here; others insert a-chen"],
    ["ghri", "gh + ra: separate here; others subjoin"],
    ["kaa", "second a is silently ignored here"],
  ]],
];

let session = null;
let typed = ""; // keystrokes since the last reset; null once direct edits make it unreliable
let prov = "";

function setStatus(msg) {
  $("status").textContent = msg;
  clearTimeout(setStatus.t);
  setStatus.t = setTimeout(() => ($("status").textContent = ""), 2500);
}

function render() {
  const committed = session.committed();
  prov = session.provisional();
  editor.value = committed + prov;
  if (prov) editor.setSelectionRange(committed.length, editor.value.length);
  else editor.setSelectionRange(editor.value.length, editor.value.length);
  inspect();
}

function atEnd() {
  const end = editor.value.length;
  if (editor.selectionEnd !== end) return false;
  if (editor.selectionStart === end) return true;
  return prov !== "" && editor.selectionStart === end - prov.length;
}

function commitProvisional() {
  if (session.raw() !== "") {
    session.finish();
    render();
  }
}

function inspect() {
  $("i-raw").textContent = session.raw();
  $("i-prov").textContent = prov;
  $("i-comm").textContent = session.committed();
  const cps = [...editor.value].slice(0, 300).map((c) => c.codePointAt(0).toString(16).toUpperCase().padStart(4, "0"));
  $("i-cp").textContent = cps.join(" ") + ([...editor.value].length > 300 ? " …" : "");
  const nfc = editor.value.normalize("NFC") === editor.value;
  $("i-nf").textContent = editor.value === "" ? "—" : nfc ? "NFC (unchanged by normalization)" : "Not NFC: normalizing would change this text";
  // In diplomatic mode the whole typed text is checked, so a warning is not lost
  // when its syllable is fixed. Direct edits make the typed text unreliable.
  const whole = session.diplomatic() && typed !== null;
  const source = whole ? typed : session.raw();
  const diags = whole
    ? JSON.parse(convert_json_with(typed, session.precomposed(), true)).diagnostics
    : JSON.parse(session.diagnostics_json());
  $("i-diag-label").textContent = whole ? "Diagnostics (all typed text)" : "Diagnostics (highlighted run)";
  const bytes = new TextEncoder().encode(source);
  const quote = (d) => new TextDecoder().decode(bytes.slice(d.start, d.end));
  drawDiagnostics($("i-diag"), diags, quote);
  if (session.diplomatic()) drawDiagnostics($("dip-diag"), diags, quote);
  else {
    const li = document.createElement("li");
    li.textContent = "Diplomatic mode is off.";
    $("dip-diag").replaceChildren(li);
  }
  const warnings = diags.filter((d) => d.severity === "Warning").length;
  const state = $("dip-state");
  state.hidden = !session.diplomatic();
  state.textContent = warnings === 0 ? "Diplomatic: no warnings" : `Diplomatic: ${warnings} warning${warnings === 1 ? "" : "s"}`;
  report();
}

function drawDiagnostics(ul, diags, quote) {
  ul.textContent = "";
  if (diags.length === 0) {
    const li = document.createElement("li");
    li.textContent = "none";
    ul.append(li);
  }
  for (const d of diags) {
    const li = document.createElement("li");
    li.className = d.severity === "Warning" ? "warn" : "note";
    const tag = document.createElement("span");
    tag.className = "tag";
    tag.textContent = d.severity === "Warning" ? "Warning" : "Note";
    li.append(tag, `${d.code} on “${quote(d)}”: ${d.message}`);
    ul.append(li);
  }
}

function issueUrl(title, body) {
  const max = 6000; // keep the URL within what GitHub accepts
  const text = body.length > max ? body.slice(0, max) + "\n…(truncated; use Copy report for the full text)" : body;
  return "https://github.com/ttime-ime/playground/issues/new?" + new URLSearchParams({ title, body: text });
}

function report() {
  const include = $("include-text").checked;
  const lines = [
    `T-Time Writing Room report`,
    `Version: ${version()}`,
    `Browser: ${navigator.userAgent}`,
    `Precomposed output: ${session.precomposed()}`,
    `Diplomatic mode: ${session.diplomatic()}`,
    `Latin mode: ${session.latin()}`,
    `Dead keys in Latin mode: ${session.dead_keys()}`,
  ];
  if (include) {
    lines.push(`EWTS typed: ${typed === null ? "(not available: text was edited directly)" : JSON.stringify(typed)}`);
    lines.push(`Editor text: ${JSON.stringify(editor.value)}`);
    lines.push(`Code points: ${$("i-cp").textContent}`);
  } else {
    lines.push("(editor text omitted by the sender)");
  }
  lines.push(`Expected: ${$("expected").value || "(not given)"}`);
  lines.push(`Comment: ${$("comment").value || "(none)"}`);
  $("report").textContent = lines.join("\n");
  $("gh-issue").href = issueUrl("Writing Room: ", $("report").textContent);
}

// Tools live in tabs under the editor. A tab opens its panel; selecting the open
// tab again closes it. Modes stay on when their panel is closed, and the tab
// shows a dot so the state is never hidden.
function initTabs() {
  const tabs = [...document.querySelectorAll('[role="tab"]')];
  const select = (tab, open) => {
    for (const t of tabs) {
      const on = open && t === tab;
      t.setAttribute("aria-selected", String(on));
      $(t.getAttribute("aria-controls")).hidden = !on;
    }
  };
  tabs.forEach((tab, i) => {
    tab.addEventListener("click", () => select(tab, tab.getAttribute("aria-selected") !== "true"));
    tab.addEventListener("keydown", (e) => {
      const step = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
      const to = e.key === "Home" ? 0 : e.key === "End" ? tabs.length - 1 : step === undefined ? -1 : (i + step + tabs.length) % tabs.length;
      if (to < 0) return;
      e.preventDefault();
      tabs.forEach((t, k) => (t.tabIndex = k === to ? 0 : -1));
      tabs[to].focus();
    });
  });
}

function showModes() {
  const modes = { latin: session.latin(), diplomatic: session.diplomatic(), form: session.precomposed() };
  for (const [k, on] of Object.entries(modes)) {
    $(`tab-${k}`).classList.toggle("on", on);
    $(`on-${k}`).textContent = on ? " (on)" : "";
  }
  $("lat-state").hidden = !session.latin();
  $("latin").checked = session.latin();
  editor.classList.toggle("latin", session.latin());
  editor.lang = session.latin() ? "en" : "bo";
}

function setLatin(on) {
  session.set_latin(on);
  showModes();
  render();
  setStatus(on ? "Latin mode: typing is not converted" : "Tibetan mode: EWTS typing");
}

function newSession(precomposed, diplomatic, keepFrom) {
  const s = new Session(precomposed, diplomatic);
  if (keepFrom) {
    s.set_committed(keepFrom.committed());
    s.insert_text(keepFrom.raw());
    s.set_latin(keepFrom.latin());
    s.set_dead_keys(keepFrom.dead_keys());
    keepFrom.free();
  }
  return s;
}

// Takes whatever the browser left in the editor as the committed text.
function adoptEditorText() {
  session.set_committed(editor.value);
  typed = null;
  prov = "";
  inspect();
}

// Inserts at the caret (or over the selection) as an ordinary edit: a pending
// run is fixed first, and the result becomes committed text.
function insertAtCaret(text) {
  commitProvisional();
  const start = editor.selectionStart;
  const end = editor.selectionEnd;
  editor.setRangeText(text, start, end, "end");
  adoptEditorText();
  editor.focus();
}

function bind() {
  editor.addEventListener("beforeinput", (e) => {
    if (!$("ewts-on").checked || e.isComposing) return;
    const t = e.inputType;
    if (!atEnd()) {
      if (prov !== "") commitProvisional();
      return; // ordinary editing; resynced on "input"
    }
    if (t === "insertText" && e.data) {
      e.preventDefault();
      session.insert_text(e.data);
      if (typed !== null) typed += e.data;
      render();
    } else if (t === "insertLineBreak" || (t === "insertParagraph")) {
      e.preventDefault();
      session.insert_text("\n");
      if (typed !== null) typed += "\n";
      render();
    } else if (t === "deleteContentBackward") {
      if (session.backspace()) {
        e.preventDefault();
        if (typed !== null) typed = typed.slice(0, -1);
        render();
      } else if (prov === "") {
        typed = null; // browser deletes committed text
      }
    } else if (prov !== "") {
      commitProvisional(); // paste, cut, drop, ...
      typed = null;
    }
  });

  editor.addEventListener("input", adoptEditorText);
  editor.addEventListener("pointerdown", () => commitProvisional());
  editor.addEventListener("blur", () => commitProvisional());

  $("copy").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(editor.value);
      setStatus("Copied");
    } catch {
      editor.select();
      setStatus("Press Ctrl/Cmd+C");
    }
  });
  $("clear").addEventListener("click", () => {
    session.reset();
    typed = "";
    render();
    editor.focus();
  });
  $("precomposed").addEventListener("change", (e) => {
    session = newSession(e.target.checked, session.diplomatic(), session);
    showModes();
    render();
  });
  $("latin").addEventListener("change", (e) => {
    setLatin(e.target.checked);
    editor.focus();
  });
  document.addEventListener("keydown", (e) => {
    if (e.altKey && e.shiftKey && !e.ctrlKey && !e.metaKey && e.code === "KeyL") {
      e.preventDefault();
      setLatin(!session.latin());
      editor.focus();
    }
  });
  $("dead-keys").addEventListener("change", (e) => {
    session.set_dead_keys(e.target.checked);
    setStatus(e.target.checked ? "Dead keys on: ; or : then a letter, in Latin mode" : "Dead keys off");
    render();
    editor.focus();
  });
  $("diplomatic").addEventListener("change", (e) => {
    session = newSession(session.precomposed(), e.target.checked, session);
    showModes();
    setStatus(e.target.checked ? "Diplomatic mode on: text is unchanged, choices are reported" : "Diplomatic mode off");
    render();
  });
  $("ewts-on").addEventListener("change", (e) => {
    if (!e.target.checked) commitProvisional();
    setStatus(e.target.checked ? "EWTS typing on" : "EWTS typing off");
  });
  $("font").addEventListener("change", (e) => {
    const v = e.target.value;
    const stacks = {
      auto: "",
      jomolhari: '"Jomolhari", "Noto Serif Tibetan", serif',
      system: '"Kailasa", "Tibetan Machine Uni", "Microsoft Himalaya", "Noto Serif Tibetan", serif',
    };
    if (stacks[v]) document.documentElement.style.setProperty("--tib", stacks[v]);
    else document.documentElement.style.removeProperty("--tib");
  });
  for (const id of ["expected", "comment", "include-text"]) $(id).addEventListener("input", report);
  $("copy-report").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText($("report").textContent);
      setStatus("Report copied");
    } catch {
      setStatus("Select the report text and copy it");
    }
  });
}

function buildExamples() {
  const host = $("examples");
  for (const [title, items] of EXAMPLES) {
    const group = document.createElement("div");
    group.className = "example-group";
    const h = document.createElement("h3");
    h.textContent = title;
    const row = document.createElement("div");
    row.className = "chips";
    for (const [ewts, note] of items) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "chip";
      const code = document.createElement("code");
      code.textContent = ewts.trim();
      b.append(code);
      const small = document.createElement("small");
      small.textContent = note;
      b.append(small);
      b.addEventListener("click", () => {
        session.reset();
        typed = "";
        session.insert_text(ewts);
        typed = ewts;
        render();
        editor.focus();
      });
      row.append(b);
    }
    group.append(h, row);
    host.append(group);
  }
}

await init({ module_or_path: new URL("./pkg/ttime_wasm_bg.wasm?v=b9ce97e75e", import.meta.url) });
$("build").textContent = version();
session = new Session(false, false);
session.set_dead_keys(true);
buildExamples();
bind();
initTabs();
initPalette({
  panel: $("panel-symbols"),
  input: $("pal-search"),
  cats: $("pal-cats"),
  count: $("pal-count"),
  list: $("pal-list"),
  insert: (s) => {
    insertAtCaret(s.text);
    setStatus(`Inserted ${s.label}`);
  },
  copy: async (s) => {
    try {
      await navigator.clipboard.writeText(s.text);
      setStatus(`Copied ${s.label}`);
    } catch {
      setStatus("Clipboard blocked: use Insert instead");
    }
  },
  focusEditor: () => editor.focus(),
});
showModes();
render();
editor.focus();
window.__ttime = { get session() { return session; } };
