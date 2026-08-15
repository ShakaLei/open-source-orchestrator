/* diagrams.js — render chord-shape entries (shapes/*.json schema) as inline SVG.
 * 4 diagram types: guitar grid, ukulele grid, mini piano, bass positions.
 * JS port of shapes/render_diagram.py (CC0). Black-on-white, print-friendly.
 */
(function () {
  "use strict";
  const INK = "#1b1b1b", FAINT = "#8a8a8a", PRESS = "#d9d9d9";

  // ------------------------------------------------- pluggable instruments
  // Adding an instrument = ① put its per-chord data under this field name in
  // shapes/*.json (see shapes/README.md) ② rebuild shapes.js ③ add one entry
  // here. Types: "fretted" (any string count — guitar/uke/mandolin/banjo…),
  // "keyboard" (piano-style), "positions" (bass-style R/5/8 stops).
  // Entries are shown only when at least one chord in the DB carries the field,
  // so shipping shapes first and config later (or vice versa) is always safe.
  const INSTRUMENTS = [
    { id: "guitar", label: "guitar", type: "fretted" },
    { id: "ukulele", label: "ukulele", type: "fretted" },
    { id: "piano", label: "piano", type: "keyboard" },
    { id: "bass", label: "bass", type: "positions" },
    { id: "mandolin", label: "mandolin", type: "fretted" },   // shapes in progress
    { id: "banjo", label: "banjo", type: "fretted" },         // shapes in progress
  ];

  // ------------------------------------------------- lookup
  const DB = window.OSO_SHAPES || { index: {}, chords: {} };

  function available() {
    const entries = Object.values(DB.chords);
    return INSTRUMENTS.filter((ins) => entries.some((e) => e[ins.id]));
  }

  function lookup(sym) {
    if (!sym) return null;
    let s = String(sym).trim();
    const tries = [s, s.split("/")[0]];             // strip slash bass
    // fall back to root triad quality
    const m = s.match(/^([A-G][#b]?)(.*)$/);
    if (m) {
      const root = m[1], rest = m[2].split("/")[0];
      if (/^m(?!aj)/.test(rest)) tries.push(root + "m");
      tries.push(root);
    }
    for (const t of tries) {
      const fn = DB.index[t];
      if (fn && DB.chords[fn]) return DB.chords[fn];
    }
    return null;
  }

  // ------------------------------------------------- fret grids
  function gridSvg(frets, fingers, barres, tuning, dotLabels, nFretsMin) {
    nFretsMin = nFretsMin || 4;
    const n = frets.length;
    const played = frets.filter((f) => f > 0);
    const maxF = played.length ? Math.max.apply(null, played) : 0;
    const start = maxF <= nFretsMin + 1 ? 1 : Math.min.apply(null, played);
    const nfr = Math.max(nFretsMin, maxF - start + 1);
    const sp = 22, fh = 26, left = 30, top = 34;
    const w = left + sp * (n - 1) + (start > 1 ? 44 : 26);
    const h = top + fh * nfr + 26;
    const x = (s) => left + sp * s;
    const ymid = (f) => top + fh * (f - start) + fh / 2;
    const out = [
      `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" font-family="Helvetica,Arial,sans-serif">`,
    ];
    if (start === 1) {
      out.push(`<rect x="${x(0) - 1.5}" y="${top - 4}" width="${sp * (n - 1) + 3}" height="4" fill="${INK}"/>`);
    } else {
      out.push(`<text x="${x(n - 1) + 16}" y="${ymid(start) + 4}" font-size="12" fill="${INK}" text-anchor="start">${start}fr</text>`);
    }
    for (let s = 0; s < n; s++)
      out.push(`<line x1="${x(s)}" y1="${top}" x2="${x(s)}" y2="${top + fh * nfr}" stroke="${INK}" stroke-width="1.2"/>`);
    for (let f = 0; f <= nfr; f++)
      out.push(`<line x1="${x(0)}" y1="${top + fh * f}" x2="${x(n - 1)}" y2="${top + fh * f}" stroke="${FAINT}" stroke-width="1"/>`);
    (barres || []).forEach((bf) => {
      const idxs = [];
      frets.forEach((f, s) => { if (f >= bf) idxs.push(s); });
      if (idxs.length >= 2) {
        const x0 = x(Math.min.apply(null, idxs)), x1 = x(Math.max.apply(null, idxs));
        out.push(`<rect x="${x0 - 7}" y="${ymid(bf) - 7}" width="${x1 - x0 + 14}" height="14" rx="7" fill="${INK}"/>`);
      }
    });
    frets.forEach((f, s) => {
      if (f === -1) {
        out.push(`<text x="${x(s)}" y="${top - 10}" font-size="13" fill="${INK}" text-anchor="middle">&#10005;</text>`);
      } else if (f === 0) {
        if (dotLabels && dotLabels[s]) {
          out.push(`<circle cx="${x(s)}" cy="${top - 14}" r="6.5" fill="${INK}"/>` +
            `<text x="${x(s)}" y="${top - 10.5}" font-size="9" fill="#fff" text-anchor="middle" font-weight="bold">${dotLabels[s]}</text>`);
        } else {
          out.push(`<circle cx="${x(s)}" cy="${top - 14}" r="4.5" fill="none" stroke="${INK}" stroke-width="1.4"/>`);
        }
      } else {
        const inBarre = (barres || []).indexOf(f) !== -1;
        let label = null;
        if (dotLabels) label = dotLabels[s];
        else if (fingers && fingers[s]) label = String(fingers[s]);
        if (!inBarre || dotLabels) out.push(`<circle cx="${x(s)}" cy="${ymid(f)}" r="8" fill="${INK}"/>`);
        if (label) out.push(`<text x="${x(s)}" y="${ymid(f) + 3.5}" font-size="10" fill="#fff" text-anchor="middle" font-weight="bold">${label}</text>`);
      }
    });
    tuning.split ? tuning = tuning.split("") : 0;
    tuning.forEach((t, s) =>
      out.push(`<text x="${x(s)}" y="${top + fh * nfr + 16}" font-size="11" fill="${FAINT}" text-anchor="middle">${t}</text>`));
    out.push("</svg>");
    return out.join("");
  }

  function frettedSvg(d) {
    const tuning = Array.isArray(d.tuning) ? d.tuning : d.tuning.split("");
    return gridSvg(d.frets, d.fingers, d.barres, tuning, null);
  }

  function positionsSvg(b) {
    const order = Array.isArray(b.tuning) ? b.tuning : b.tuning.split("");
    const frets = order.map(() => -1), labels = order.map(() => null);
    function put(stop, lab) {
      if (!stop) return;
      const s = order.indexOf(stop.string);
      frets[s] = stop.fret; labels[s] = lab;
    }
    put(b.octave, "8"); put(b.fifth, "5"); put(b.fifth_below, "5"); put(b.root, "R");
    return gridSvg(frets, null, [], order, labels);
  }

  // ------------------------------------------------- mini piano
  const WHITE_PCS = [0, 2, 4, 5, 7, 9, 11];
  const BLACK_AFTER = { 0: 1, 2: 3, 5: 6, 7: 8, 9: 10 };

  function keyboardSvg(d) {
    const pressed = new Set(d.midi);
    const noteOf = {};
    d.notes.forEach((n, i) => { noteOf[d.midi[i]] = n; });
    const lowMidi = 60, nWhite = 15, ww = 16, wh = 64, bw = 10, bh = 40, top = 6;
    const w = ww * nWhite + 2, h = top + wh + 18;
    const out = [`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" font-family="Helvetica,Arial,sans-serif">`];
    const whites = [];
    for (let m = lowMidi; whites.length < nWhite; m++) if (WHITE_PCS.indexOf(m % 12) !== -1) whites.push(m);
    whites.forEach((m, i) => {
      const fill = pressed.has(m) ? PRESS : "#fff";
      out.push(`<rect x="${1 + i * ww}" y="${top}" width="${ww}" height="${wh}" fill="${fill}" stroke="${INK}" stroke-width="1"/>`);
      if (pressed.has(m)) {
        const cx = 1 + i * ww + ww / 2;
        out.push(`<circle cx="${cx}" cy="${top + wh - 10}" r="4" fill="${INK}"/>`);
        out.push(`<text x="${cx}" y="${top + wh + 13}" font-size="9" fill="${INK}" text-anchor="middle">${noteOf[m]}</text>`);
      }
    });
    whites.slice(0, -1).forEach((m, i) => {
      if (m % 12 in BLACK_AFTER) {
        const bm = m + 1, cx = 1 + (i + 1) * ww;
        const fill = pressed.has(bm) ? "#666" : INK;
        out.push(`<rect x="${cx - bw / 2}" y="${top}" width="${bw}" height="${bh}" fill="${fill}" stroke="${INK}" stroke-width="1"/>`);
        if (pressed.has(bm)) {
          out.push(`<circle cx="${cx}" cy="${top + bh - 8}" r="3.4" fill="#fff"/>`);
          out.push(`<text x="${cx}" y="${top + wh + 13}" font-size="9" fill="${INK}" text-anchor="middle">${noteOf[bm]}</text>`);
        }
      }
    });
    out.push("</svg>");
    return out.join("");
  }

  const TYPE_RENDERERS = { fretted: frettedSvg, keyboard: keyboardSvg, positions: positionsSvg };

  function render(sym, instrumentId) {
    const e = lookup(sym);
    if (!e) return null;
    const ins = INSTRUMENTS.find((i) => i.id === instrumentId);
    if (!ins || !e[ins.id]) return null;
    try { return TYPE_RENDERERS[ins.type](e[ins.id]); } catch (err) { return null; }
  }

  window.OSO_DIAGRAMS = { lookup, render, available, INSTRUMENTS };
})();
