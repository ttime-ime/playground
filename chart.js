import { convert_json } from "./pkg/ttime_wasm.js?v=e360af5557";

// The stacking chart. Every glyph is made by the engine from the EWTS shown
// under it, so the chart cannot disagree with typing. `insert(text, label)` puts
// a glyph at the caret; where the panel is shown is the page's business.
const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};

// Each cell is [EWTS, label?]. The glyph is whatever the engine makes of the EWTS.
const row = (title, cells) => ({ title, cells });

const TIBETAN = [
  row("Velar", [["ka"], ["kha"], ["ga"], ["nga"]]),
  row("Palatal", [["ca"], ["cha"], ["ja"], ["nya"]]),
  row("Dental", [["ta"], ["tha"], ["da"], ["na"]]),
  row("Labial", [["pa"], ["pha"], ["ba"], ["ma"]]),
  row("Affricate", [["tsa"], ["tsha"], ["dza"], ["wa"]]),
  row("Others", [["zha"], ["za"], ["'a"], ["ya"]]),
  row("", [["ra"], ["la"], ["sha"], ["sa"]]),
  row("", [["ha"], ["a"]]),
];

const SANSKRIT = [
  row("Velar", [["ka", "ka"], ["kha", "kha"], ["ga", "ga"], ["gha", "gha"], ["nga", "ṅa"]]),
  row("Palatal", [["ca", "ca"], ["cha", "cha"], ["ja", "ja"], ["dzha", "jha"], ["nya", "ña"]]),
  row("Retroflex", [["Ta", "ṭa"], ["Tha", "ṭha"], ["Da", "ḍa"], ["Dha", "ḍha"], ["Na", "ṇa"]]),
  row("Dental", [["ta", "ta"], ["tha", "tha"], ["da", "da"], ["dha", "dha"], ["na", "na"]]),
  row("Labial", [["pa", "pa"], ["pha", "pha"], ["ba", "ba"], ["bha", "bha"], ["ma", "ma"]]),
  row("Semivowel", [["ya", "ya"], ["ra", "ra"], ["la", "la"], ["va", "va"]]),
  row("Sibilant, h", [["sha", "śa"], ["Sha", "ṣa"], ["sa", "sa"], ["ha", "ha"]]),
  row("Other", [["k+Sha", "kṣa"], ["j+nya", "jña"], ["fa", "fa"], ["Ra", "fixed ra"]]),
];

const INVERTED = [
  row("Upright", [["ta"], ["tha"], ["da"], ["na"], ["sha"]]),
  row("Inverted", [["Ta", "ṭa"], ["Tha", "ṭha"], ["Da", "ḍa"], ["Na", "ṇa"], ["Sha", "ṣa"]]),
  row("Fixed form", [["ra"], ["Ra", "fixed-form ra"]]),
];

const TIB_STACK = [
  row("Over ka, ga", [["rka"], ["rga"], ["lka"], ["lga"], ["ska"], ["sga"]]),
  row("Over nga, nya", [["rnga"], ["lnga"], ["snga"], ["rnya"], ["snya"]]),
  row("Over ca, ja", [["lca"], ["rja"], ["lja"]]),
  row("Over ta, da, na", [["rta"], ["lta"], ["sta"], ["rda"], ["lda"], ["sda"], ["rna"], ["sna"]]),
  row("Over pa, ba, ma", [["lpa"], ["spa"], ["lba"], ["sba"], ["rma"], ["sma"]]),
  row("Over tsa, dza", [["rtsa"], ["stsa"], ["rdza"]]),
  row("Subjoined ya", [["kya"], ["khya"], ["gya"], ["pya"], ["phya"], ["bya"], ["mya"]]),
  row("Subjoined ra", [["kra"], ["khra"], ["gra"], ["tra"], ["thra"], ["dra"], ["pra"], ["phra"], ["bra"], ["mra"], ["sra"], ["hra"]]),
  row("Subjoined la", [["kla"], ["gla"], ["bla"], ["rla"], ["sla"], ["zla"]]),
  row("Subjoined wa", [["kwa"], ["khwa"], ["gwa"], ["cwa"], ["nywa"], ["twa"], ["dwa"], ["tswa"], ["tshwa"], ["zhwa"], ["zwa"], ["rwa"], ["lwa"], ["shwa"], ["swa"], ["hwa"]]),
  row("Three letters", [["skya"], ["skra"], ["sgya"], ["sgra"], ["spya"], ["spra"], ["sbya"], ["sbra"], ["smra"], ["rkya"], ["rgya"], ["rmya"], ["rtswa"]]),
  row("With prefix", [["brgya"], ["bskra"], ["bsgra"], ["bsgrubs"], ["brdza"]]),
];

const SKT_STACK = [
  row("Doubled", [["k+ka", "kka"], ["k+kha", "kkha"], ["t+ta", "tta"], ["d+da", "dda"], ["n+na", "nna"], ["p+pa", "ppa"], ["m+ma", "mma"], ["T+Ta", "ṭṭa"], ["D+Da", "ḍḍa"], ["d+dha", "ddha"]]),
  row("Nasal + stop", [["ng+ka", "ṅka"], ["ng+ga", "ṅga"], ["ny+ca", "ñca"], ["ny+ja", "ñja"], ["N+Ta", "ṇṭa"], ["N+Da", "ṇḍa"], ["n+ta", "nta"], ["n+da", "nda"], ["m+pa", "mpa"], ["m+ba", "mba"]]),
  row("Sibilant + stop", [["s+ta", "sta"], ["s+tha", "stha"], ["sh+ca", "śca"], ["sh+na", "śna"], ["Sh+Ta", "ṣṭa"], ["Sh+Na", "ṣṇa"], ["t+sa", "tsa"], ["k+sa", "ksa"]]),
  row("kṣ, jñ, h", [["k+Sha", "kṣa"], ["k+Sha+ma", "kṣma"], ["k+Sha+wa", "kṣva"], ["j+nya", "jña"], ["h+na", "hṇa, hna"], ["h+ma", "hma"]]),
  row("With subjoined ya", [["k+ya", "kya"], ["t+ya", "tya"], ["sh+ya", "śya"], ["dh+ya", "dhya"], ["t+t+ya", "ttya"], ["d+dh+ya", "ddhya"]]),
  row("With subjoined ra", [["k+ra", "kra"], ["t+ra", "tra"], ["sh+ra", "śra"], ["h+ra", "hra"], ["n+d+ra", "ndra"], ["s+t+ra", "stra"]]),
  row("With wa-zur", [["k+wa", "kva"], ["s+wa", "sva"], ["dh+wa", "dhva"], ["t+wa", "tva"], ["d+wa", "dva"]]),
];

const VOWELS = [
  row("Independent", [["a", "a"], ["A", "ā"], ["i", "i"], ["I", "ī"], ["u", "u"], ["U", "ū"], ["e", "e"], ["ai", "ai"], ["o", "o"], ["au", "au"]]),
  row("On ka", [["ka", "ka"], ["kA", "kā"], ["ki", "ki"], ["kI", "kī"], ["ku", "ku"], ["kU", "kū"], ["ke", "ke"], ["kai", "kai"], ["ko", "ko"], ["kau", "kau"]]),
  row("Reversed i", [["k-i", "reversed i"], ["k-I", "reversed ī"]]),
  row("Vocalic r, l", [["kr-i", "kṛ"], ["kr-I", "kṝ"], ["kl-i", "kḷ"], ["kl-I", "kḹ"]]),
  row("Marks on ka", [["kaM", "ṃ anusvara"], ["kaH", "ḥ visarga"], ["ka~M", "candrabindu"], ["ka~M`", "candrabindu, 2nd form"]]),
  row("Syllables", [["oM", "oṃ"], ["hUM", "hūṃ"], ["hU~M", "hūṃ, candrabindu"]]),
];

const PUNCT = [
  row("Marks", [["*", "tsheg, non-breaking"], ["/", "shad"], ["//", "double shad"], ["|", "rin chen spungs shad"], [";", "tsheg shad"], ["!", "sbrul shad"], [":", "gter tsheg"], ["=", "bsdus rtags"]]),
  row("Head marks", [["@", "initial yig mgo"], ["#", "closing yig mgo"], ["@#", "pair"], ["$", "caret yig mgo"], ["$%", "caret pair"]]),
  row("Brackets", [["(", "ang khang open"], [")", "ang khang close"], ["<", "gug rtags open"], [">", "gug rtags close"]]),
];

const NUMBERS = [
  row("Digits", ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => [d, d])),
  row("Half digits", [["-1", "half one"], ["-0", "half zero"]]),
];

const SECTIONS = [
  ["tibetan", "Tibetan letters", "The thirty letters, by class.", TIBETAN],
  ["sanskrit", "Sanskrit consonants", "The full grid in IAST order, with the Tibetan letter and the EWTS to type.", SANSKRIT],
  ["inverted", "Inverted letters", "The retroflex letters are inverted forms of the dental ones; ra has a fixed form for stacking under other letters.", INVERTED],
  ["tib-stack", "Tibetan stacking", "Superscribed r, l, s over a root; subjoined y, r, l, w under it. Typed as written, with no +.", TIB_STACK],
  ["skt-stack", "Sanskrit stacking", "Conjuncts of Sanskrit loanwords. Type + between the letters to stack them.", SKT_STACK],
  ["vowels", "Vowels and marks", "Independent vowels, vowel signs on ka, vocalic r and l, and the marks that attach to a syllable.", VOWELS],
  ["punct", "Punctuation", "Marks, head marks and brackets.", PUNCT],
  ["numbers", "Numbers", "Tibetan digits and half digits.", NUMBERS],
];

const hex = (s) => [...s].map((c) => c.codePointAt(0).toString(16).toUpperCase().padStart(4, "0")).join(" ");

function cell([ewts, label], insert) {
  const r = JSON.parse(convert_json(ewts, false));
  const warn = r.diagnostics.some((d) => d.severity === "Warning");
  const b = el("button", "cell" + (warn ? " warn" : ""));
  b.type = "button";
  b.title = `${hex(r.text)}${warn ? "; the engine warns about this input" : ""}`;
  const g = el("span", "tib glyph", r.text);
  g.lang = "bo";
  g.setAttribute("aria-hidden", "true");
  b.append(g, el("code", "", ewts));
  if (label && label !== ewts) b.append(el("span", "hint", label));
  if (warn) b.append(el("span", "tag", "Warning"));
  b.setAttribute("aria-label", `Insert ${label ?? ewts}, EWTS ${ewts}`);
  b.addEventListener("click", () => insert(r.text, label ?? ewts));
  return b;
}

export function initChart({ cats, intro, body, insert, focusEditor }) {
  let current = SECTIONS[0][0];

  function drawCats() {
    cats.textContent = "";
    for (const [id, title] of SECTIONS) {
      const b = el("button", "chip", title);
      b.type = "button";
      b.setAttribute("aria-pressed", String(id === current));
      b.addEventListener("click", () => {
        current = id;
        drawCats();
        drawBody();
      });
      cats.append(b);
    }
  }

  function drawBody() {
    const [, title, text, rows] = SECTIONS.find((s) => s[0] === current);
    intro.textContent = text;
    body.textContent = "";
    body.setAttribute("aria-label", title);
    for (const r of rows) {
      const line = el("div", "chart-row");
      line.append(el("div", "chart-label", r.title));
      const cells = el("div", "chart-cells");
      for (const c of r.cells) cells.append(cell(c, insert));
      line.append(cells);
      body.append(line);
    }
  }

  body.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      focusEditor();
    }
  });
  drawCats();
  drawBody();
}
