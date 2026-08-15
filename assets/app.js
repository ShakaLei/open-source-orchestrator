/* app.js — Open Source Orchestrator v0
 * paste / import → review & bless → publish. Everything client-side. CC0.
 */
(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);

  // ================================================================ state
  // token: {c: "Em"|null, t: "text fragment (may carry trailing space)"}
  // line:  [token, ...]
  // section: {label: "Chorus", repeat: 1, lines: [line, ...]}
  let S = {
    meta: { title: "", artist: "", key: "", tempo: "", comment: "" },
    sections: [],
    instrument: "guitar",
  };

  // ================================================================ music helpers
  const PC = { C: 0, "C#": 1, Db: 1, D: 2, "D#": 3, Eb: 3, E: 4, Fb: 4, "E#": 5, F: 5,
    "F#": 6, Gb: 6, G: 7, "G#": 8, Ab: 8, A: 9, "A#": 10, Bb: 10, B: 11, Cb: 11, "B#": 0 };
  const N_SHARP = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  const N_FLAT = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
  // keys conventionally spelled with flats, by pitch class of the tonic
  const MAJOR_FLAT_PCS = [1, 3, 5, 6, 8, 10];   // Db Eb F Gb Ab Bb
  const MINOR_FLAT_PCS = [0, 2, 3, 5, 7, 10];   // Cm Dm Ebm Fm Gm Bbm

  function transposeSym(sym, n, flat) {
    if (!sym) return sym;
    return sym.replace(/[A-G][#b]?/g, (m) => {
      const pc = PC[m];
      if (pc === undefined) return m;
      return (flat ? N_FLAT : N_SHARP)[(pc + (n % 12) + 12) % 12];
    });
  }

  function transposeAll(n) {
    if (!n) return;
    let flat = false;
    const km = (S.meta.key || "").match(/^([A-G][#b]?)\s*(m|min)?/);
    if (km && PC[km[1]] !== undefined) {
      const pc = (PC[km[1]] + (n % 12) + 12) % 12;
      flat = (km[2] ? MINOR_FLAT_PCS : MAJOR_FLAT_PCS).indexOf(pc) !== -1;
    }
    S.meta.key = transposeSym(S.meta.key, n, flat);
    S.sections.forEach((sec) => sec.lines.forEach((ln) => ln.forEach((tok) => {
      if (tok.c) tok.c = transposeSym(tok.c, n, flat);
    })));
    renderAll();
  }

  function chordsUsed() {
    const seen = [], have = {};
    S.sections.forEach((sec) => sec.lines.forEach((ln) => ln.forEach((tok) => {
      if (tok.c && !have[tok.c]) { have[tok.c] = 1; seen.push(tok.c); }
    })));
    return seen;
  }

  // ================================================================ parsing
  // split a chunk of plain text into word-fragment tokens (spaces kept on the fragment)
  function fragTokens(text, firstChord) {
    const parts = text.split(/(?<=\s)(?=\S)/); // break where whitespace ends and a word starts
    const toks = [];
    parts.forEach((p, i) => {
      if (p === "") return;
      toks.push({ c: i === 0 ? firstChord : null, t: p });
    });
    if (!toks.length && firstChord) toks.push({ c: firstChord, t: "" });
    return toks;
  }

  function parseLine(raw) {
    const toks = [];
    const re = /\[([^\]]+)\]/g;
    let last = 0, m, pendingChord = null;
    while ((m = re.exec(raw)) !== null) {
      const text = raw.slice(last, m.index);
      if (text || pendingChord) fragTokens(text, pendingChord).forEach((t) => toks.push(t));
      pendingChord = m[1].trim();
      last = re.lastIndex;
    }
    const tail = raw.slice(last);
    if (tail || pendingChord) fragTokens(tail, pendingChord).forEach((t) => toks.push(t));
    return toks;
  }

  function parseChordPro(text) {
    const meta = { title: "", artist: "", key: "", tempo: "", comment: "" };
    const sections = [];
    let cur = null, curLabel = "", curRepeat = 1;
    function flush() {
      if (cur && cur.length) sections.push({ label: curLabel, repeat: curRepeat, lines: cur });
      cur = null; curLabel = ""; curRepeat = 1;
    }
    text.split(/\r?\n/).forEach((raw) => {
      const line = raw.replace(/\s+$/, "");
      const dm = line.match(/^\{\s*([^:}]+?)\s*(?::\s*(.*?))?\s*\}\s*$/);
      if (dm) {
        const key = dm[1].toLowerCase(), val = dm[2] || "";
        if (key === "title" || key === "t") meta.title = val;
        else if (key === "artist" || key === "subtitle" || key === "st") meta.artist = val;
        else if (key === "key") meta.key = val;
        else if (key === "tempo") meta.tempo = val;
        else if (key === "comment" || key === "c") {
          // section label? "Chorus x2" / plain note
          const lm = val.match(/^(.*?)(?:\s*[x×]\s*(\d+))?$/);
          if (cur === null || cur.length === 0) {
            if (!meta.comment && sections.length === 0 && cur === null && /draft|machine|detect|bless/i.test(val)) {
              meta.comment = val;                    // provenance note up top
            } else {
              flush();
              cur = []; curLabel = lm[1]; curRepeat = lm[2] ? parseInt(lm[2], 10) : 1;
            }
          } else {
            flush();
            cur = []; curLabel = lm[1]; curRepeat = lm[2] ? parseInt(lm[2], 10) : 1;
          }
        } else if (key === "start_of_chorus" || key === "soc") { flush(); cur = []; curLabel = "Chorus"; }
        else if (key === "end_of_chorus" || key === "eoc") flush();
        return;
      }
      if (line.trim() === "") { flush(); return; }
      if (cur === null) cur = [];
      cur.push(parseLine(line));
    });
    flush();
    return { meta, sections };
  }

  function parseMachineJSON(j) {
    const meta = {
      title: j.title || "", artist: j.artist || "",
      key: j.key || "", tempo: j.tempo ? String(Math.round(j.tempo)) : "",
      comment: j.detected_with || "machine-detected draft — awaiting artist blessing",
    };
    const tl = j.chords_timeline || [];
    function chordAt(t) {
      for (let i = tl.length - 1; i >= 0; i--) if (t >= tl[i].start) return tl[i].chord;
      return null;
    }
    const sections = [];
    let cur = [], prevEnd = null;
    (j.lines || []).forEach((line) => {
      if (prevEnd !== null && line.start - prevEnd > 3.5 && cur.length) {
        sections.push({ label: "", repeat: 1, lines: cur }); cur = [];
      }
      prevEnd = line.end;
      let lastChord = null;
      // seed lastChord with what was sounding before the line, so we only mark changes
      const toks = [];
      (line.words || []).forEach((w) => {
        const c = chordAt(w.t);
        const text = w.w.replace(/^\s+/, "") + " ";
        if (c && c !== lastChord) { toks.push({ c: c, t: text }); lastChord = c; }
        else toks.push({ c: null, t: text });
      });
      if (toks.length) cur.push(toks);
    });
    if (cur.length) sections.push({ label: "", repeat: 1, lines: cur });
    return { meta, sections };
  }

  function parsePlainLyrics(text) {
    const sections = [];
    let cur = [];
    text.split(/\r?\n/).forEach((raw) => {
      const line = raw.trimEnd();
      if (line.trim() === "") { if (cur.length) { sections.push({ label: "", repeat: 1, lines: cur }); cur = []; } return; }
      cur.push(fragTokens(line, null));
    });
    if (cur.length) sections.push({ label: "", repeat: 1, lines: cur });
    return { meta: { title: "", artist: "", key: "", tempo: "", comment: "" }, sections };
  }

  // ================================================================ export
  function toChordPro() {
    const L = [];
    const m = S.meta;
    if (m.title) L.push(`{title: ${m.title}}`);
    if (m.artist) L.push(`{artist: ${m.artist}}`);
    if (m.key) L.push(`{key: ${m.key}}`);
    if (m.tempo) L.push(`{tempo: ${m.tempo}}`);
    if (m.comment) L.push(`{comment: ${m.comment}}`);
    S.sections.forEach((sec) => {
      L.push("");
      if (sec.label || sec.repeat > 1) {
        L.push(`{c: ${sec.label || "Section"}${sec.repeat > 1 ? " x" + sec.repeat : ""}}`);
      }
      sec.lines.forEach((ln) => {
        L.push(ln.map((tok) => (tok.c ? `[${tok.c}]` : "") + tok.t).join("").replace(/\s+$/, ""));
      });
    });
    return L.join("\n") + "\n";
  }

  function slug() {
    return (S.meta.title || "song").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "song";
  }

  function download(name, text, type) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type: type || "text/plain" }));
    a.download = name;
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 400);
  }

  // ================================================================ render
  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }

  function renderMeta() {
    $("m-title").value = S.meta.title;
    $("m-artist").value = S.meta.artist;
    $("m-key").value = S.meta.key;
    $("m-tempo").value = S.meta.tempo;
    $("m-comment").value = S.meta.comment;
    $("pv-title").textContent = S.meta.title || "Untitled";
    $("pv-sub").textContent = [S.meta.artist, S.meta.key ? "key " + S.meta.key : "", S.meta.tempo ? S.meta.tempo + " bpm" : ""].filter(Boolean).join(" · ");
    $("pv-note").textContent = S.meta.comment || "";
    $("pv-note").style.display = S.meta.comment ? "" : "none";
  }

  function renderChart() {
    const host = $("chart");
    if (!S.sections.length) {
      host.innerHTML = '<p class="hint">No song loaded yet — bring one in with Step ① above.</p>';
      return;
    }
    const H = [];
    S.sections.forEach((sec, si) => {
      H.push(`<div class="sec" data-si="${si}">`);
      H.push(`<div class="sec-head no-print-controls">` +
        `<input class="sec-label" data-si="${si}" value="${esc(sec.label)}" placeholder="label (Verse / Chorus…)"/>` +
        `<button class="sec-rep" data-si="${si}" title="times this block is sung — click to cycle">×${sec.repeat}</button>` +
        `<button class="sec-del" data-si="${si}" title="remove block">🗑</button>` +
        `</div>`);
      H.push(`<div class="sec-head-print">${esc(sec.label || "")}${sec.repeat > 1 ? "  ×" + sec.repeat : ""}</div>`);
      sec.lines.forEach((ln, li) => {
        H.push(`<div class="line">`);
        if (li > 0) H.push(`<button class="ln-split no-print-controls" data-si="${si}" data-li="${li}" title="split the block before this line">✂</button>`);
        ln.forEach((tok, ti) => {
          const at = `data-si="${si}" data-li="${li}" data-ti="${ti}"`;
          H.push(`<span class="tok" ${at}>` +
            `<span class="chip ${tok.c ? "has" : "empty"}" ${at} title="${tok.c ? "click to correct / remove" : "click to add a chord here"}">${tok.c ? esc(tok.c) : "+"}</span>` +
            `<span class="word" ${at}>${esc(tok.t.replace(/\s+$/, "")) || "&nbsp;"}</span>` +
            (/\s$/.test(tok.t) ? '<span class="sp"> </span>' : "") +
            `</span>`);
        });
        H.push(`</div>`);
      });
      H.push(`</div>`);
    });
    host.innerHTML = H.join("");
  }

  function renderDiagrams() {
    const used = chordsUsed();
    const host = $("diagrams");
    if (!used.length) { host.innerHTML = ""; return; }
    const inst = S.instrument;
    const H = [`<h3 class="diag-title">${inst.toUpperCase()} shapes</h3><div class="diag-row">`];
    used.forEach((c) => {
      const svg = window.OSO_DIAGRAMS.render(c, inst);
      H.push(`<figure class="diag"><figcaption>${esc(c)}</figcaption>` +
        (svg || '<div class="noshape">no shape yet<br><small>add it in shapes/ 🤙</small></div>') +
        `</figure>`);
    });
    H.push("</div>");
    host.innerHTML = H.join("");
    document.querySelectorAll(".instr button").forEach((b) =>
      b.classList.toggle("on", b.dataset.inst === inst));
  }

  function renderAll() { renderMeta(); renderChart(); renderDiagrams(); }

  // ================================================================ chord popover
  const pop = $("chordpop");
  let popTarget = null; // {si,li,ti}

  function openPop(target, anchorEl) {
    popTarget = target;
    const tok = S.sections[target.si].lines[target.li][target.ti];
    $("pop-input").value = tok.c || "";
    $("pop-word").textContent = tok.t.trim() || "(here)";
    const r = anchorEl.getBoundingClientRect();
    pop.style.display = "block";
    const pw = pop.offsetWidth;
    pop.style.left = Math.max(8, Math.min(window.innerWidth - pw - 8, r.left + window.scrollX - 10)) + "px";
    pop.style.top = (r.bottom + window.scrollY + 6) + "px";
    $("pop-input").focus();
    $("pop-input").select();
  }
  function closePop() { pop.style.display = "none"; popTarget = null; }

  function applyPop(remove) {
    if (!popTarget) return;
    const tok = S.sections[popTarget.si].lines[popTarget.li][popTarget.ti];
    if (remove) tok.c = null;
    else {
      const v = $("pop-input").value.trim();
      tok.c = v || null;
    }
    closePop();
    renderChart(); renderDiagrams();
  }

  // ================================================================ catalog
  function loadCatalog() {
    const host = $("catalog-list");
    fetch("catalog/index.json")
      .then((r) => { if (!r.ok) throw 0; return r.json(); })
      .then((idx) => {
        const H = [];
        (idx.artists || []).forEach((a) => {
          H.push(`<div class="cat-artist"><h4>${esc(a.name)}</h4><div class="cat-songs">`);
          (a.songs || []).forEach((s) => {
            H.push(`<button class="cat-song" data-path="catalog/${a.dir}/${s.file}">${esc(s.title)}</button>`);
          });
          H.push(`</div>${a.note ? `<p class="hint">${esc(a.note)}</p>` : ""}</div>`);
        });
        host.innerHTML = H.join("") || '<p class="hint">Catalog is empty — be the first to add a songbook!</p>';
      })
      .catch(() => {
        host.innerHTML = '<p class="hint">Couldn’t load the catalog (opening index.html straight from disk? fetch() needs http). Run <code>python3 -m http.server</code> here, or use the live site.</p>';
      });
  }

  function loadSong(parsed, sourceNote) {
    S.meta = parsed.meta;
    S.sections = parsed.sections;
    renderAll();
    $("step2").scrollIntoView({ behavior: "smooth" });
    void sourceNote;
  }

  // ================================================================ wire-up
  function init() {
    // step-1 tabs
    document.querySelectorAll(".tabs button").forEach((b) => {
      b.addEventListener("click", () => {
        document.querySelectorAll(".tabs button").forEach((x) => x.classList.toggle("on", x === b));
        document.querySelectorAll(".tabpane").forEach((p) => { p.style.display = p.id === b.dataset.pane ? "" : "none"; });
      });
    });

    $("btn-parse").addEventListener("click", () => {
      const txt = $("in-text").value;
      if (!txt.trim()) return;
      const hasChords = /\[[^\]]+\]/.test(txt) || /^\{/m.test(txt);
      loadSong(hasChords ? parseChordPro(txt) : parsePlainLyrics(txt));
    });

    $("in-json").addEventListener("change", (ev) => {
      const f = ev.target.files[0];
      if (!f) return;
      f.text().then((t) => {
        try { loadSong(parseMachineJSON(JSON.parse(t))); }
        catch (e) { alert("That didn’t parse as a detection JSON: " + e.message); }
      });
    });

    $("in-pro").addEventListener("change", (ev) => {
      const f = ev.target.files[0];
      if (!f) return;
      f.text().then((t) => loadSong(parseChordPro(t)));
    });

    loadCatalog();
    $("catalog-list").addEventListener("click", (ev) => {
      const b = ev.target.closest(".cat-song");
      if (!b) return;
      fetch(b.dataset.path).then((r) => r.text()).then((t) => loadSong(parseChordPro(t)));
    });

    // meta edits
    [["m-title", "title"], ["m-artist", "artist"], ["m-key", "key"], ["m-tempo", "tempo"], ["m-comment", "comment"]].forEach(([id, k]) => {
      $(id).addEventListener("input", () => { S.meta[k] = $(id).value; renderMeta(); });
    });

    // chart interactions (event delegation)
    $("chart").addEventListener("click", (ev) => {
      const chip = ev.target.closest(".chip, .word");
      if (chip && chip.dataset.ti !== undefined) {
        openPop({ si: +chip.dataset.si, li: +chip.dataset.li, ti: +chip.dataset.ti }, chip);
        ev.stopPropagation();
        return;
      }
    });
    $("chart").addEventListener("input", (ev) => {
      const inp = ev.target.closest(".sec-label");
      if (inp) S.sections[+inp.dataset.si].label = inp.value;
    });
    $("chart").addEventListener("click", (ev) => {
      const rep = ev.target.closest(".sec-rep");
      if (rep) {
        const sec = S.sections[+rep.dataset.si];
        sec.repeat = sec.repeat >= 4 ? 1 : sec.repeat + 1;
        renderChart();
      }
      const del = ev.target.closest(".sec-del");
      if (del && confirm("Remove this block?")) {
        S.sections.splice(+del.dataset.si, 1);
        renderChart(); renderDiagrams();
      }
      const sp = ev.target.closest(".ln-split");
      if (sp) {
        const si = +sp.dataset.si, li = +sp.dataset.li;
        const rest = S.sections[si].lines.splice(li);
        S.sections.splice(si + 1, 0, { label: "", repeat: 1, lines: rest });
        renderChart();
      }
    });

    // popover
    $("pop-apply").addEventListener("click", () => applyPop(false));
    $("pop-remove").addEventListener("click", () => applyPop(true));
    $("pop-cancel").addEventListener("click", closePop);
    $("pop-input").addEventListener("keydown", (ev) => {
      if (ev.key === "Enter") applyPop(false);
      if (ev.key === "Escape") closePop();
    });
    document.addEventListener("click", (ev) => {
      if (pop.style.display === "block" && !pop.contains(ev.target) && !ev.target.closest(".chip, .word")) closePop();
    });

    // transpose + instruments
    $("tr-down").addEventListener("click", () => transposeAll(-1));
    $("tr-up").addEventListener("click", () => transposeAll(1));
    document.querySelectorAll(".instr button").forEach((b) => {
      b.addEventListener("click", () => { S.instrument = b.dataset.inst; renderDiagrams(); });
    });

    // exports
    $("ex-pro").addEventListener("click", () => download(slug() + ".pro", toChordPro()));
    $("ex-json").addEventListener("click", () => {
      const j = JSON.stringify({ format: "oso-orchestrator-v0", meta: S.meta, sections: S.sections }, null, 1);
      download(slug() + ".oso.json", j, "application/json");
    });
    $("ex-copy").addEventListener("click", () => {
      const j = JSON.stringify({ format: "oso-orchestrator-v0", meta: S.meta, sections: S.sections });
      (navigator.clipboard ? navigator.clipboard.writeText(j) : Promise.reject())
        .then(() => { $("ex-copy").textContent = "copied ✓"; setTimeout(() => $("ex-copy").textContent = "copy share JSON", 1500); })
        .catch(() => download(slug() + ".oso.json", j, "application/json"));
    });
    $("ex-print").addEventListener("click", () => window.print());

    // load .oso.json back in
    $("in-oso").addEventListener("change", (ev) => {
      const f = ev.target.files[0];
      if (!f) return;
      f.text().then((t) => {
        try {
          const j = JSON.parse(t);
          if (j.format === "oso-orchestrator-v0") loadSong({ meta: j.meta, sections: j.sections });
          else loadSong(parseMachineJSON(j));
        } catch (e) { alert("Couldn’t read that JSON: " + e.message); }
      });
    });

    renderAll();
  }

  // expose for detect.js + console tinkering
  window.OSO_APP = { loadSong, parseChordPro, parseMachineJSON, toChordPro, get state() { return S; }, renderAll };

  document.addEventListener("DOMContentLoaded", init);
})();
