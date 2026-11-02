import { search_symbols_json, symbol_categories_json } from "./pkg/ttime_wasm.js";

// Searchable symbol palette. The catalogue and the search live in the Rust core;
// this file only draws results and reports which symbol was chosen.
//
// `insert(text)` puts text at the caret; `copy(text)` puts it on the clipboard.
// Both are supplied by the page, so the palette knows nothing about composition.
export function initPalette({ toggle, panel, closeButton, input, cats, count, list, insert, copy, focusEditor }) {
  const categories = JSON.parse(symbol_categories_json());
  let category = "";

  const el = (tag, cls, text) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  };
  // A lone combining mark is drawn on a dotted circle so it is visible.
  const shown = (text) => (/^\p{M}/u.test(text) ? "\u25CC" + text : text);

  function drawCategories() {
    cats.textContent = "";
    for (const name of ["", ...categories]) {
      const b = el("button", "chip", name || "All");
      b.type = "button";
      b.setAttribute("aria-pressed", String(name === category));
      b.addEventListener("click", () => {
        category = name;
        drawCategories();
        draw();
        input.focus();
      });
      cats.append(b);
    }
  }

  function draw() {
    const all = JSON.parse(search_symbols_json(input.value));
    const hits = category ? all.filter((s) => s.category === category) : all;
    count.textContent = hits.length === 0 ? "No symbols match." : `${hits.length} symbol${hits.length === 1 ? "" : "s"}`;
    list.textContent = "";
    for (const s of hits) {
      const li = el("li", "sym");
      const choose = el("button", "sym-insert");
      choose.type = "button";
      choose.setAttribute("aria-label", `Insert ${s.label}, ${s.codePoints}`);
      choose.title = s.name + (s.note ? `\n${s.note}` : "") + `\nEvidence: ${s.evidence}`;
      const glyph = el("span", "tib sym-glyph", shown(s.text));
      glyph.lang = "bo";
      glyph.setAttribute("aria-hidden", "true");
      choose.append(glyph, el("span", "sym-label", s.label), el("span", "sym-meta", s.codePoints));
      choose.append(el("code", "sym-ewts", s.ewts === null ? "no EWTS" : s.ewts === " " ? "space" : s.ewts));
      choose.addEventListener("click", () => insert(s));
      const cp = el("button", "sym-copy quiet", "Copy");
      cp.type = "button";
      cp.setAttribute("aria-label", `Copy ${s.label}`);
      cp.addEventListener("click", () => copy(s));
      li.append(choose, cp);
      list.append(li);
    }
  }

  function open() {
    panel.hidden = false;
    toggle.setAttribute("aria-expanded", "true");
    input.focus();
    input.select();
  }
  function close() {
    panel.hidden = true;
    toggle.setAttribute("aria-expanded", "false");
    focusEditor();
  }

  toggle.addEventListener("click", () => (panel.hidden ? open() : close()));
  closeButton.addEventListener("click", close);
  panel.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      close();
    }
  });
  input.addEventListener("input", draw);
  drawCategories();
  draw();
}
