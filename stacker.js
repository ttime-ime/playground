import { build_stack_json, stack_alphabet_json } from "./pkg/ttime_wasm.js?v=7787aafc88";

// The stacker: build one stack letter by letter, see what it is, and learn what
// to type for it next time. The engine does all the work (`build_stack_json`):
// this file only collects choices and draws the answer, so what is shown here
// cannot disagree with typing.
//
// `insert(text, code)` puts the stack at the caret; `copy(text, what)` puts text
// on the clipboard. Both come from the page.

const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};

// How the consonant grid is laid out. Keys the engine knows but this list
// misses are added in a last row, so nothing is ever unreachable.
const ROWS = [
  ["Velar", ["k", "kh", "g", "gh", "ng"]],
  ["Palatal", ["c", "ch", "j", "dzh", "ny"]],
  ["Retroflex", ["T", "Th", "D", "Dh", "N"]],
  ["Dental", ["t", "th", "d", "dh", "n"]],
  ["Labial", ["p", "ph", "b", "bh", "m"]],
  ["Affricate, w, z", ["ts", "tsh", "dz", "w", "zh", "z"]],
  ["Others", ["'", "y", "r", "l", "sh", "Sh", "s", "h"]],
  ["Special", ["f", "v", "R"]],
];

// Starting points: [label, letters]. Each is built by the engine like any other stack.
const PRESETS = [
  ["kṣa", ["k", "Sh"]],
  ["jña", ["j", "ny"]],
  ["ṣṭha", ["Sh", "Th"]],
  ["stra", ["s", "t", "r"]],
  ["ddhya", ["d", "dh", "y"]],
  ["kṣma", ["k", "Sh", "m"]],
  ["rgya", ["r", "g", "y"]],
  ["bsgrub", ["b", "s", "g", "r"]],
];

export function initStacker({ ids, insert, copy, getPrecomposed, focusEditor }) {
  const $ = (name) => document.getElementById(ids[name]);
  const alphabet = JSON.parse(stack_alphabet_json());
  const glyphOf = new Map();
  for (const l of [...alphabet.consonants, ...alphabet.subjoinedOnly]) glyphOf.set(l.key, l.example);
  const subjoinedOnly = alphabet.subjoinedOnly.map((l) => l.key);

  let layers = [];
  let vowel = "";
  let marks = [];
  let built = null; // the engine's last answer, when it was ok

  const keyInput = $("key");
  const gridCells = new Map(); // key -> button
  const vowelButtons = new Map();
  const markButtons = new Map();

  // ---------- Building the pickers ----------

  function cell(key, example, onClick, label) {
    const b = el("button", "cell");
    b.type = "button";
    const g = el("span", "tib glyph", example);
    g.lang = "bo";
    g.setAttribute("aria-hidden", "true");
    b.append(g, el("code", "", key));
    b.setAttribute("aria-label", label);
    b.addEventListener("click", onClick);
    return b;
  }

  function drawGrid() {
    const grid = $("grid");
    grid.textContent = "";
    const known = new Set(alphabet.consonants.map((l) => l.key));
    const rows = ROWS.map(([title, keys]) => [title, keys.filter((k) => known.has(k))]);
    const rest = [...known].filter((k) => !ROWS.some(([, keys]) => keys.includes(k)));
    if (rest.length) rows.push(["More", rest]);
    rows.push(["Only under another letter", subjoinedOnly]);
    for (const [title, keys] of rows) {
      if (!keys.length) continue;
      const line = el("div", "chart-row");
      line.append(el("div", "chart-label", title));
      const cells = el("div", "chart-cells");
      for (const key of keys) {
        const b = cell(key, glyphOf.get(key) ?? key, () => addLayer(key), `Add ${key}, ${glyphOf.get(key) ?? ""}`);
        gridCells.set(key, b);
        cells.append(b);
      }
      line.append(cells);
      grid.append(line);
    }
  }

  function chipWithGlyph(example, key, label, onClick) {
    const b = el("button", "chip");
    b.type = "button";
    const g = el("span", "tib", example);
    g.lang = "bo";
    b.append(g, el("code", "", key));
    b.setAttribute("aria-label", label);
    b.addEventListener("click", onClick);
    return b;
  }

  function drawVowelsMarksPresets() {
    const inherent = el("button", "chip", "a (none)");
    inherent.type = "button";
    inherent.addEventListener("click", () => setVowel(""));
    vowelButtons.set("", inherent);
    $("vowels").append(inherent);
    // The engine lists vowels in matching order (longest first); people scan them
    // in the usual order.
    const vowelOrder = ["i", "I", "u", "U", "e", "o", "ai", "au", "A", "-i", "-I", "ui", "ue", "uo"];
    const rank = (k) => (vowelOrder.includes(k) ? vowelOrder.indexOf(k) : vowelOrder.length);
    for (const v of [...alphabet.vowels].sort((a, b) => rank(a.key) - rank(b.key))) {
      const b = chipWithGlyph(v.example, v.key, `Vowel ${v.key}`, () => setVowel(vowel === v.key ? "" : v.key));
      vowelButtons.set(v.key, b);
      $("vowels").append(b);
    }
    for (const m of alphabet.marks) {
      const b = chipWithGlyph(m.example, m.key, `Mark ${m.key}`, () => toggleMark(m.key));
      markButtons.set(m.key, b);
      $("marks").append(b);
    }
    for (const [label, letters] of PRESETS) {
      const b = el("button", "chip", label);
      b.type = "button";
      b.lang = "en";
      b.setAttribute("aria-label", `Start from ${label}`);
      b.addEventListener("click", () => {
        layers = [...letters];
        vowel = "";
        marks = [];
        update();
        keyInput.focus();
      });
      $("presets").append(b);
    }
  }

  // ---------- State changes ----------

  function addLayer(key) {
    layers.push(key);
    keyInput.value = "";
    filterGrid();
    update();
    keyInput.focus();
  }
  function removeLayer(i) {
    layers.splice(i, 1);
    update();
    keyInput.focus();
  }
  function setVowel(v) {
    vowel = v;
    update();
  }
  function toggleMark(m) {
    marks = marks.includes(m) ? marks.filter((x) => x !== m) : [...marks, m];
    update();
  }
  function clearAll() {
    layers = [];
    vowel = "";
    marks = [];
    keyInput.value = "";
    filterGrid();
    update();
    keyInput.focus();
  }

  // ---------- Typing a letter ----------

  // Narrow the grid to the keys that start with what was typed.
  function filterGrid() {
    const q = keyInput.value;
    for (const [key, b] of gridCells) b.hidden = q !== "" && !key.startsWith(q);
    for (const row of $("grid").querySelectorAll(".chart-row")) {
      row.hidden = ![...row.querySelectorAll(".cell")].some((b) => !b.hidden);
    }
  }

  // The key to add for what is typed: an exact match, else the only candidate.
  function typedKey() {
    const q = keyInput.value;
    if (q === "") return null;
    if (gridCells.has(q)) return q;
    const candidates = [...gridCells.keys()].filter((k) => k.startsWith(q));
    return candidates.length === 1 ? candidates[0] : null;
  }

  keyInput.addEventListener("input", filterGrid);
  keyInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === "+" || e.key === " ") {
      e.preventDefault();
      const k = typedKey();
      if (k && gridCells.get(k).disabled) {
        // Same rule as the greyed-out button: it needs a letter above it.
        $("learn").textContent = `${k} only exists under another letter. Add a letter first.`;
      } else if (k) addLayer(k);
      else if (e.key === "Enter" && keyInput.value === "" && built) $("insert").click();
    } else if (e.key === "Backspace" && keyInput.value === "" && layers.length) {
      e.preventDefault();
      removeLayer(layers.length - 1);
    } else if (e.key === "Escape") {
      e.preventDefault();
      if (keyInput.value !== "") {
        keyInput.value = "";
        filterGrid();
      } else focusEditor();
    }
  });

  // ---------- Drawing the answer ----------

  function drawLayers() {
    const box = $("layers");
    box.textContent = "";
    layers.forEach((key, i) => {
      const chip = el("span", "layer");
      chip.setAttribute("role", "listitem");
      const g = el("span", "tib", glyphOf.get(key) ?? key);
      g.lang = "bo";
      g.setAttribute("aria-hidden", "true");
      const rm = el("button", "quiet", "×");
      rm.type = "button";
      rm.setAttribute("aria-label", `Remove ${key}, position ${i + 1}`);
      rm.addEventListener("click", () => removeLayer(i));
      chip.append(g, el("code", "", key), rm);
      box.append(chip);
    });
    $("layers-empty").hidden = layers.length > 0;
  }

  function blankResult() {
    for (const id of ["preview", "canonical", "shortest", "codepoints"]) $(id).textContent = "";
    $("same").hidden = true;
  }

  function setButtons(enabled, canClear) {
    for (const id of ["insert", "copy", "copycode"]) $(id).disabled = !enabled;
    $("clear").disabled = !canClear;
  }

  function update() {
    drawLayers();
    for (const [v, b] of vowelButtons) b.setAttribute("aria-pressed", String(v === vowel));
    for (const [m, b] of markButtons) b.setAttribute("aria-pressed", String(marks.includes(m)));
    // A subjoined-only letter needs a letter above it.
    for (const key of subjoinedOnly) gridCells.get(key).disabled = layers.length === 0;

    built = null;
    $("learn").textContent = "";
    const diag = $("diag");
    diag.textContent = "";
    blankResult();
    if (layers.length === 0) {
      $("result").hidden = true;
      setButtons(false, false);
      return;
    }
    $("result").hidden = false;
    const r = JSON.parse(build_stack_json(layers.join(" "), vowel, marks.join(" "), getPrecomposed()));
    if (!r.ok) {
      const li = el("li", "warn");
      li.append(el("span", "tag", "Cannot build"), document.createTextNode(r.error));
      diag.append(li);
      setButtons(false, true);
      return;
    }
    built = r;
    $("preview").textContent = r.text;
    $("canonical").textContent = r.canonical;
    $("shortest").textContent = r.shortest;
    $("same").hidden = r.shortest !== r.canonical;
    $("codepoints").textContent = r.codePoints;
    for (const d of r.diagnostics) {
      const li = el("li", d.severity === "Warning" ? "warn" : "note");
      li.append(el("span", "tag", d.severity), document.createTextNode(d.message));
      diag.append(li);
    }
    if (r.diagnostics.length === 0) {
      diag.append(el("li", "note", "The engine has nothing to report about this stack."));
    }
    setButtons(true, true);
  }

  $("insert").addEventListener("click", () => {
    if (!built) return;
    insert(built.text, built.shortest);
    $("learn").textContent = `Inserted. Next time, type ${built.shortest}.`;
  });
  $("copy").addEventListener("click", () => built && copy(built.text, "the stack"));
  $("copycode").addEventListener("click", () => built && copy(built.shortest, "the EWTS"));
  $("clear").addEventListener("click", clearAll);
  $("panel").addEventListener("keydown", (e) => {
    if (e.key === "Escape" && e.target !== keyInput) {
      e.preventDefault();
      focusEditor();
    }
  });
  // Opening the tab puts the cursor in the letter box, so typing starts at once.
  document.getElementById(ids.tab).addEventListener("click", () => {
    setTimeout(() => {
      if (!$("panel").hidden) keyInput.focus();
    }, 0);
  });

  drawGrid();
  drawVowelsMarksPresets();
  update();
}
