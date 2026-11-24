/*! OSO chart-tools v1.2 — rainbow chords (Shaka-style 1-7 colour theory · 3·6·9),
 *  auto-scroll stage (slow ↔ fast), screen/word colours, word size, fonts.
 *  Built by Open Source Orchestra: Shaka Lei Kaumaka & the AI ʻohana (https://opensourceorchestra.org)
 *  SPDX-License-Identifier: GPL-3.0-or-later
 *
 *  One tag:  <script src="/assets/chart-tools.js" defer
 *               data-book=".book"          (the chart container: themed + carried onto the stage)
 *               data-chords=".cd b"        (elements whose text is a chord name)
 *               data-key="G"               (song key; or data-key-input="#m-key" to read a field)
 *               data-after=".meta"         (the inline toolbar is placed right after this element)
 *               data-words=".verse p"></script>
 *  Laws kept: nothing floats over words (toolbar sits in the page flow; the stage is a view the
 *  visitor opens, its control bar sits BELOW the scrolling pane, never over it) · one ✕ / Esc closes.
 */
(function () {
  "use strict";
  var S = document.currentScript || document.querySelector('script[src*="chart-tools"]');
  var D = (S && S.dataset) || {};
  var SEL_BOOK = D.book || ".book", SEL_CH = D.chords || ".cd b", SEL_AFTER = D.after || ".meta",
      SEL_WORDS = D.words || ".verse p", KEY_INPUT = D.keyInput || "";
  var LS = "oso-chart-tools-v1";

  // ---------------------------------------------------------------- the rainbow (Shaka style)
  // 1 red (root) · 2 orange (minor 2nd chord) · 3 yellow (minor 3rd chord) · 4 green (major 4th)
  // 5 blue (major 5th) · 6 indigo (minor 6th) · 7 violet (diminished 7th) — notes between the
  // steps wear the blend of their two neighbours; the 9 is the 2 an octave up: the light keeps climbing.
  var RAINBOW = { 1: "#ff3b3b", 2: "#ff8c1a", 3: "#ffd60a", 4: "#2ee86b", 5: "#3b8cff", 6: "#7d6bff", 7: "#c86bff" };
  var NAMES = { 1: "red", 2: "orange", 3: "yellow", 4: "green", 5: "blue", 6: "indigo", 7: "violet" };
  var QUAL = { 1: "", 2: "m", 3: "m", 4: "", 5: "", 6: "m", 7: "°" };
  var STEP = { 0: 1, 2: 2, 4: 3, 5: 4, 7: 5, 9: 6, 11: 7 };
  var BETWEEN = { 1: [1, 2, "♭2"], 3: [2, 3, "♭3"], 6: [4, 5, "♯4"], 8: [5, 6, "♭6"], 10: [6, 7, "♭7"] };
  var PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  var SHARP = ["C", "C♯", "D", "E♭", "E", "F", "F♯", "G", "A♭", "A", "B♭", "B"];
  var SHARP_K = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];
  function pc(name) {
    var m = /^\s*([A-Ga-g])([#♯b♭]?)/.exec(name || ""); if (!m) return null;
    var v = PC[m[1].toUpperCase()]; if (m[2] === "#" || m[2] === "♯") v++; if (m[2] === "b" || m[2] === "♭") v--;
    return (v + 12) % 12;
  }
  function home(key) { // key "G", "Am", "D mixolydian" → the major-scale home (relative major for minor keys)
    var t = pc(key); if (t === null) return null;
    var minor = /^\s*[A-Ga-g][#♯b♭]?\s*(m(?!aj)|min|minor|aeolian)/i.test(key || "");
    return minor ? (t + 3) % 12 : t;
  }
  function degreeOf(chord, h) {
    var r = pc(String(chord).split("/")[0]); if (r === null || h === null) return null;
    var iv = (r - h + 12) % 12;
    if (STEP[iv] !== undefined) return { n: STEP[iv], label: String(STEP[iv]), c: RAINBOW[STEP[iv]] };
    var b = BETWEEN[iv]; return { n: null, label: b[2], c: "linear-gradient(90deg," + RAINBOW[b[0]] + "," + RAINBOW[b[1]] + ")" };
  }

  // ---------------------------------------------------------------- prefs
  var THEMES = {
    page:    { label: "🌙 the page", bg: "", ink: "" },
    stage:   { label: "🖤 stage black", bg: "#000000", ink: "#ffffff" },
    paper:   { label: "📜 paper", bg: "#f6efe0", ink: "#1d1a16" },
    ocean:   { label: "🌊 ocean", bg: "#06263a", ink: "#dff6ff" },
    sunrise: { label: "🌅 sunrise", bg: "#3a1022", ink: "#ffe9c7" },
    forest:  { label: "🌿 forest", bg: "#0c2416", ink: "#e9ffe9" },
    custom:  { label: "🎨 my colours", bg: null, ink: null }
  };
  var FONTS = {
    page: { label: "Aa the page", css: "" },
    serif: { label: "Georgia serif", css: "Georgia,'Times New Roman',serif" },
    sans: { label: "Clean sans", css: "'Avenir Next','Segoe UI',system-ui,sans-serif" },
    round: { label: "Rounded", css: "ui-rounded,'SF Pro Rounded','Nunito','Varela Round',system-ui,sans-serif" },
    hand: { label: "Handwritten", css: "'Bradley Hand','Segoe Print','Comic Sans MS','Chalkboard SE',cursive" },
    poster: { label: "Poster bold", css: "Impact,'Arial Black','Haettenschweiler',sans-serif" },
    mono: { label: "Typewriter", css: "'Courier New',ui-monospace,Menlo,monospace" }
  };
  var P = { chord: 1, theme: "page", bg: "#101018", ink: "#ffffff", font: "page", scale: 1, rainbow: true, chords: true, speed: 28 };
  try { var saved = JSON.parse(localStorage.getItem(LS) || "{}"); for (var k in saved) if (k in P) P[k] = saved[k]; } catch (e) {}
  function save() { try { localStorage.setItem(LS, JSON.stringify(P)); } catch (e) {} }

  // ---------------------------------------------------------------- styles
  var css = [
    ".ct-bar{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;align-items:center;margin:0 auto 18px;max-width:720px}",
    ".ct-bar button,.ct-bar select,.ct-sbar button,.ct-sbar select{font:600 .8rem/1.2 system-ui,sans-serif;color:#ffe9b0;background:rgba(23,17,38,.85);border:1px solid rgba(240,180,41,.45);border-radius:999px;padding:7px 12px;cursor:pointer}",
    ".ct-bar button[aria-pressed=false]{opacity:.55}",
    ".ct-bar label.ct-col{font:600 .75rem system-ui;color:#ffe9b0;display:inline-flex;gap:4px;align-items:center}",
    ".ct-bar input[type=color]{width:30px;height:26px;border:0;background:none;padding:0;cursor:pointer}",
    ".ct-legend{display:flex;flex-wrap:wrap;gap:6px;justify-content:center;margin:0 auto 22px;max-width:720px;font:600 .74rem/1.3 system-ui,sans-serif}",
    ".ct-legend span{border-radius:999px;padding:4px 9px;color:#111}",
    ".ct-legend .ct-369{background:rgba(23,17,38,.88);color:#ffe9b0;border:1px dashed rgba(240,180,41,.5);flex-basis:100%;text-align:center;border-radius:12px;padding:6px 10px;font-weight:500}",
    ".ct-rb .ct-chord{color:#111!important;background:var(--ct-c,#f0b429);border-radius:.45em;padding:0 .32em!important}",
    ".ct-rb .ct-chord.ct-grad{background:var(--ct-c)}",
    ".ct-chord sup{font-size:.62em;margin-left:.12em;opacity:.8;vertical-align:.45em}",
    // v1.1 — big chords you can read from across the room (🎸− / 🎸+ to taste)
    ".cd b.ct-chord{font-size:calc(1.25em * var(--ct-chord,1))!important;bottom:.62em!important;padding:.02em .3em!important;border-radius:.4em}",
    ".verse p.chorded{line-height:calc(2.3 + 1.3 * var(--ct-chord,1))!important;padding-top:calc(.35em * var(--ct-chord,1))}",
    "html.ct-nochords .verse p.chorded{line-height:1.75!important}",
    ".chip.has.ct-chord{font-size:calc(18px * var(--ct-chord,1))!important;line-height:1.2}",
    "html.ct-nochords .cd{display:none}",
    "html.ct-nochords .verse p.chorded{line-height:1.75}",
    "html.ct-themed body{background:var(--ct-bg)!important}",
    "html.ct-themed " + SEL_BOOK + "{background:var(--ct-bg)!important;border-color:color-mix(in srgb,var(--ct-ink) 35%,transparent)!important}",
    "html.ct-themed " + SEL_WORDS + ",html.ct-themed " + SEL_WORDS + " strong,html.ct-themed " + SEL_WORDS + " em,html.ct-themed " + SEL_BOOK + " .v-label{color:var(--ct-ink)!important}",
    "html.ct-font " + SEL_WORDS + ",html.ct-font #ct-stage .ct-pane{font-family:var(--ct-font)!important}",
    "html.ct-scaled " + SEL_WORDS + "{font-size:calc(1.05rem * var(--ct-scale))!important}",
    "#ct-stage{position:fixed;inset:0;z-index:2147483600;display:flex;flex-direction:column;background:var(--ct-sbg,#07060c);color:var(--ct-sink,#fff)}",
    "#ct-stage .ct-band{position:absolute;left:0;right:0;top:28%;height:3.4em;background:linear-gradient(90deg,transparent,rgba(255,214,10,.10),rgba(46,232,107,.10),rgba(59,140,255,.10),transparent);pointer-events:none;z-index:0}",
    "#ct-stage .ct-pane{position:relative;z-index:1;flex:1 1 0;min-height:0;overflow-y:auto;padding:0 6vw;-webkit-overflow-scrolling:touch;scrollbar-width:thin}",
    "#ct-stage .ct-pad{height:28vh}#ct-stage .ct-pad.ct-end{height:62vh}",
    "#ct-stage .ct-pane .ct-title{font:700 calc(1.6rem * var(--ct-scale,1)) Georgia,serif;text-align:center;margin-bottom:1.2em}",
    "#ct-stage .ct-pane " + SEL_BOOK + "{background:none!important;border:0!important;box-shadow:none!important;padding:0!important;max-width:900px;margin:0 auto}",
    "#ct-stage .ct-pane " + SEL_WORDS + "{font-size:calc(1.5rem * var(--ct-scale,1))!important;color:var(--ct-sink,#fff)!important}",
    "#ct-stage .ct-pane " + SEL_WORDS + " strong,#ct-stage .ct-pane " + SEL_WORDS + " em{color:inherit!important}",
    "#ct-stage .no-print-controls,#ct-stage .ln-split{display:none!important}",
    "#ct-stage .ct-pane .v-label{font-size:.85rem;color:#2dd4bf}",
    "#ct-stage .ct-sbar{position:relative;z-index:2;flex:0 0 auto;display:flex;flex-wrap:wrap;gap:8px;justify-content:center;align-items:center;padding:10px 12px calc(10px + env(safe-area-inset-bottom));background:rgba(10,8,18,.96);border-top:1px solid rgba(240,180,41,.35)}",
    "#ct-stage .ct-more{display:none;flex-basis:100%;flex-wrap:wrap;gap:8px;justify-content:center}#ct-stage .ct-sbar.ct-open .ct-more{display:flex}",
    "#ct-stage .ct-speed{font:700 .85rem system-ui;color:#ffe9b0;min-width:6.5em;text-align:center}",
    "#ct-stage .ct-x{font-size:1rem!important;padding:6px 12px!important}",
    "@media (max-width:520px){.ct-bar button,.ct-bar select{padding:6px 9px;font-size:.74rem}#ct-stage .ct-pane{padding-left:5vw;padding-right:5vw}}",
    "@media print{.ct-bar,.ct-legend{display:none}}"
  ].join("\n");
  var st = document.createElement("style"); st.id = "ct-style"; st.textContent = css; document.head.appendChild(st);

  // ---------------------------------------------------------------- helpers
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function el(tag, attrs, html) {
    var e = document.createElement(tag);
    for (var a in attrs || {}) { if (a === "on") continue; e.setAttribute(a, attrs[a]); }
    if (attrs && attrs.on) for (var ev in attrs.on) e.addEventListener(ev, attrs.on[ev]);
    if (html !== undefined) e.innerHTML = html; return e;
  }
  function songKey() {
    if (KEY_INPUT) { var i = $(KEY_INPUT); if (i && i.value) return i.value; }
    return D.key || (document.body && document.body.dataset.key) || "";
  }

  // ---------------------------------------------------------------- colour every chord
  var painting = false;
  function paint(root) {
    painting = true;
    var h = home(songKey());
    $$(SEL_CH, root || document).forEach(function (b) {
      var name = (b.getAttribute("data-chord") || b.firstChild && b.firstChild.nodeType === 3 && b.firstChild.nodeValue || b.textContent || "").trim();
      if (!b.getAttribute("data-chord")) b.setAttribute("data-chord", name);
      b.classList.add("ct-chord"); b.setAttribute("translate", "no"); b.classList.add("notranslate");
      var d = degreeOf(name, h), sup = b.querySelector("sup.ct-deg");
      if (!d) { b.style.removeProperty("--ct-c"); if (sup) sup.remove(); return; }
      b.style.setProperty("--ct-c", d.c);
      b.classList.toggle("ct-grad", d.n === null);
      b.title = name + " · step " + d.label + (d.n ? " · " + NAMES[d.n] : " · between the colours");
      if (!sup) { sup = el("sup", { "class": "ct-deg", "aria-hidden": "true" }); b.appendChild(sup); }
      if (sup.textContent !== d.label) sup.textContent = d.label; // no-op writes would wake the observer forever
    });
    painting = false; relayout();
  }
  function legend(box) {
    var h = home(songKey()); if (h === null) { box.innerHTML = ""; return; }
    var steps = [0, 2, 4, 5, 7, 9, 11], out = "";
    steps.forEach(function (iv, i) {
      var n = i + 1, root = SHARP_K[(h + iv) % 12].replace("#", "♯").replace("b", "♭");
      out += '<span style="background:' + RAINBOW[n] + '" title="' + NAMES[n] + '">' + n + " · " + root + QUAL[n] + "</span>";
    });
    out += '<span class="ct-369">🌈 home key <b>' + SHARP[h] + '</b> — red is always the root 1 · 🔺 <b>3 · 6 · 9</b>: the yellow third, the indigo sixth, and the 9 = the orange 2 one octave up. ' +
      "Extended harmony keeps climbing the rainbow — the frequency lifts and the song keeps vibing into the future.</span>";
    box.innerHTML = out;
  }

  // ---------------------------------------------------------------- make room: big chords never overlap
  // Chords keep their exact landing word; if a chord would bump into the next one on the same line,
  // the words in between are spread (the gap opens in the lyric line, like a hand-written chart).
  var lay = 0;
  function layout(root) {
    var scope = root || document;
    var marks = $$(".cd", scope);
    marks.forEach(function (m) { m.style.marginLeft = ""; });
    var prev = null;
    marks.forEach(function (m) {
      var b = m.querySelector("b"); if (!b || b.offsetParent === null) { prev = null; return; }
      if (prev && prev.p === m.closest("p")) {
        var pr = prev.b.getBoundingClientRect(), cr = b.getBoundingClientRect();
        if (Math.abs(pr.top - cr.top) < 4) {
          var need = pr.right + 6 - cr.left;
          if (need > 0) { m.style.marginLeft = Math.ceil(need) + "px"; }
        }
      }
      prev = { b: b, p: m.closest("p") };
    });
  }
  function relayout() { cancelAnimationFrame(lay); lay = requestAnimationFrame(function () { layout(); if (stage) layout(stage); }); }
  window.addEventListener("resize", relayout);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(relayout);

  // ---------------------------------------------------------------- apply prefs
  function apply() {
    var R = document.documentElement, t = THEMES[P.theme] || THEMES.page;
    var bg = P.theme === "custom" ? P.bg : t.bg, ink = P.theme === "custom" ? P.ink : t.ink;
    R.classList.toggle("ct-themed", !!bg);
    if (bg) { R.style.setProperty("--ct-bg", bg); R.style.setProperty("--ct-ink", ink); }
    R.style.setProperty("--ct-sbg", bg || "#07060c"); R.style.setProperty("--ct-sink", ink || "#ffffff");
    var f = FONTS[P.font] || FONTS.page;
    R.classList.toggle("ct-font", !!f.css); if (f.css) R.style.setProperty("--ct-font", f.css);
    R.classList.toggle("ct-scaled", P.scale !== 1); R.style.setProperty("--ct-scale", String(P.scale));
    R.style.setProperty("--ct-chord", String(P.chord));
    R.classList.toggle("ct-rb", !!P.rainbow);
    R.classList.toggle("ct-nochords", !P.chords);
    $$(".ct-rbtog").forEach(function (b) { b.setAttribute("aria-pressed", String(!!P.rainbow)); });
    $$(".ct-chtog").forEach(function (b) { b.setAttribute("aria-pressed", String(!!P.chords)); });
    $$(".ct-theme").forEach(function (s) { s.value = P.theme; });
    $$(".ct-fontsel").forEach(function (s) { s.value = P.font; });
    $$(".ct-col").forEach(function (l) { l.style.display = P.theme === "custom" ? "" : "none"; });
    $$(".ct-speed").forEach(function (s) { s.textContent = speedLabel(); });
    save(); relayout();
  }
  function speedLabel() { return (P.speed < 14 ? "🐢 " : P.speed > 60 ? "🐇 " : "🎸 ") + Math.round(P.speed) + " px/s"; }
  function size(d) { P.scale = Math.max(0.7, Math.min(3, Math.round((P.scale + d) * 100) / 100)); apply(); }
  function csize(d) { P.chord = Math.max(0.6, Math.min(3, Math.round((P.chord + d) * 100) / 100)); apply(); }
  function speed(f) { P.speed = Math.max(4, Math.min(240, P.speed * f)); apply(); }

  function selects() {
    var th = el("select", { "class": "ct-theme", "aria-label": "screen and word colours", on: { change: function () { P.theme = this.value; apply(); } } });
    for (var k in THEMES) th.appendChild(el("option", { value: k }, THEMES[k].label));
    var fo = el("select", { "class": "ct-fontsel", "aria-label": "font", on: { change: function () { P.font = this.value; apply(); } } });
    for (var f in FONTS) fo.appendChild(el("option", { value: f }, FONTS[f].label));
    var cb = el("label", { "class": "ct-col" }, "screen ");
    var ib = el("input", { type: "color", value: P.bg, "aria-label": "screen colour", on: { input: function () { P.bg = this.value; apply(); } } });
    cb.appendChild(ib);
    var ci = el("label", { "class": "ct-col" }, "words ");
    var ii = el("input", { type: "color", value: P.ink, "aria-label": "word colour", on: { input: function () { P.ink = this.value; apply(); } } });
    ci.appendChild(ii);
    return [th, cb, ci, fo];
  }
  function common(bar) {
    bar.appendChild(el("button", { type: "button", title: "smaller words", on: { click: function () { size(-0.1); } } }, "A−"));
    bar.appendChild(el("button", { type: "button", title: "bigger words", on: { click: function () { size(0.1); } } }, "A+"));
    bar.appendChild(el("button", { type: "button", title: "smaller chords", on: { click: function () { csize(-0.2); } } }, "🎸−"));
    bar.appendChild(el("button", { type: "button", title: "bigger chords — read them from across the room", on: { click: function () { csize(0.2); } } }, "🎸+"));
    selects().forEach(function (n) { bar.appendChild(n); });
    bar.appendChild(el("button", { type: "button", "class": "ct-rbtog", "aria-pressed": "true", title: "rainbow chords on/off", on: { click: function () { P.rainbow = !P.rainbow; apply(); } } }, "🌈 rainbow"));
    bar.appendChild(el("button", { type: "button", "class": "ct-chtog", "aria-pressed": "true", title: "chords on/off (words only)", on: { click: function () { P.chords = !P.chords; apply(); } } }, "🎸 chords"));
  }

  // ---------------------------------------------------------------- the stage (auto-scroll)
  var stage = null, raf = 0, playing = false, last = 0, acc = 0;
  function tick(t) {
    if (!stage) return;
    if (playing) {
      var pane = stage.querySelector(".ct-pane");
      if (last) { acc += P.speed * (t - last) / 1000; var whole = Math.floor(acc); if (whole) { pane.scrollTop += whole; acc -= whole; } }
      if (pane.scrollTop + pane.clientHeight >= pane.scrollHeight - 1) setPlay(false);
    }
    last = t; raf = requestAnimationFrame(tick);
  }
  function setPlay(on) {
    playing = on; last = 0; acc = 0;
    if (stage) stage.querySelector(".ct-play").textContent = on ? "⏸ pause" : "▶ play";
  }
  function openStage() {
    if (stage) return;
    var book = $(SEL_BOOK); if (!book) return;
    stage = el("div", { id: "ct-stage", role: "dialog", "aria-modal": "true", "aria-label": "auto-scroll stage" });
    stage.appendChild(el("div", { "class": "ct-band", "aria-hidden": "true" }));
    var pane = el("div", { "class": "ct-pane", tabindex: "0" });
    pane.appendChild(el("div", { "class": "ct-pad", "aria-hidden": "true" }));
    var h1 = $("h1"); pane.appendChild(el("div", { "class": "ct-title" }, h1 ? h1.innerHTML : document.title));
    var copy = book.cloneNode(true); $$("[id]", copy).forEach(function (n) { n.removeAttribute("id"); });
    $$(".chip", copy).forEach(function (n) { n.removeAttribute("title"); });
    pane.appendChild(copy);
    pane.appendChild(el("div", { "class": "ct-pad ct-end", "aria-hidden": "true" }));
    pane.addEventListener("click", function (e) { if (!e.target.closest("a,button")) setPlay(!playing); });
    pane.addEventListener("wheel", function () { last = 0; }, { passive: true });
    stage.appendChild(pane);
    var bar = el("div", { "class": "ct-sbar" });
    bar.appendChild(el("button", { type: "button", "class": "ct-play", on: { click: function () { setPlay(!playing); } } }, "▶ play"));
    bar.appendChild(el("button", { type: "button", title: "slower", on: { click: function () { speed(1 / 1.25); } } }, "🐢 −"));
    bar.appendChild(el("span", { "class": "ct-speed", "aria-live": "polite" }, speedLabel()));
    bar.appendChild(el("button", { type: "button", title: "faster", on: { click: function () { speed(1.25); } } }, "+ 🐇"));
    bar.appendChild(el("button", { type: "button", title: "back to the top", on: { click: function () { pane.scrollTop = 0; } } }, "⏮"));
    var more = el("div", { "class": "ct-more" }); common(more);
    bar.appendChild(el("button", { type: "button", title: "colours · size · font", "aria-expanded": "false", on: { click: function () {
      var o = bar.classList.toggle("ct-open"); this.setAttribute("aria-expanded", String(o)); } } }, "⚙"));
    bar.appendChild(el("button", { type: "button", "class": "ct-x", title: "close the stage (Esc)", "aria-label": "close", on: { click: closeStage } }, "✕"));
    bar.appendChild(more);
    stage.appendChild(bar);
    document.body.appendChild(stage);
    document.documentElement.style.overflow = "hidden";
    try { if (window.OSOFrames && OSOFrames.sleep) OSOFrames.sleep(); } catch (e) {}
    apply(); paint(stage); pane.focus();
    raf = requestAnimationFrame(tick);
    setTimeout(function () { if (stage) setPlay(true); }, 1500); // a breath to pick up the instrument
  }
  function closeStage() {
    if (!stage) return; cancelAnimationFrame(raf); setPlay(false);
    stage.remove(); stage = null; document.documentElement.style.overflow = "";
    try { if (window.OSOFrames && OSOFrames.wake) OSOFrames.wake(); } catch (e) {}
  }
  document.addEventListener("keydown", function (e) {
    if (!stage) return;
    if (e.key === "Escape") { closeStage(); e.preventDefault(); }
    else if (e.key === " " && !/^(INPUT|SELECT|BUTTON|TEXTAREA)$/.test(e.target.tagName)) { setPlay(!playing); e.preventDefault(); }
    else if (e.key === "ArrowUp" && e.shiftKey) { speed(1.25); e.preventDefault(); }
    else if (e.key === "ArrowDown" && e.shiftKey) { speed(1 / 1.25); e.preventDefault(); }
    else if (e.key === "+" || e.key === "=") size(0.1);
    else if (e.key === "-") size(-0.1);
  });

  // ---------------------------------------------------------------- mount
  function mount() {
    var book = $(SEL_BOOK); if (!book) return;
    var anchor = $(SEL_AFTER) || book;
    var bar = el("div", { "class": "ct-bar", role: "toolbar", "aria-label": "chart tools" });
    bar.appendChild(el("button", { type: "button", title: "auto-scroll the chart, Guitar-Hero style", on: { click: openStage } }, "▶ auto-scroll stage"));
    common(bar);
    var lg = el("div", { "class": "ct-legend", "aria-label": "rainbow chord legend" });
    if (anchor === book) { book.parentNode.insertBefore(bar, book); book.parentNode.insertBefore(lg, book); }
    else { anchor.parentNode.insertBefore(lg, anchor.nextSibling); anchor.parentNode.insertBefore(bar, lg); }
    legend(lg); paint(); apply();
    // charts that re-render themselves (the Orchestrator editor) get re-painted
    var target = book;
    if (window.MutationObserver) new MutationObserver(function () { if (!painting) { paint(target); legend(lg); } })
      .observe(target, { childList: true, subtree: true });
    if (KEY_INPUT) { var ki = $(KEY_INPUT); if (ki) ki.addEventListener("input", function () { paint(); legend(lg); }); }
    window.OSOChartTools = { paint: paint, open: openStage, close: closeStage, degreeOf: degreeOf, home: home };
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount); else mount();
})();
