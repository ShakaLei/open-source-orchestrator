/* detect.js — 🧪 EXPERIMENTAL in-browser chord detection. CC0.
 * FFT → chroma → 36 chord templates (maj / min / dom7), median-smoothed,
 * plus a Krumhansl key guess. Descended from the karaokeprotocol engine.
 * A rough first ear only — server-grade detection (CREMA) is the roadmap.
 */
(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);

  // ---------------------------------------------------------- tiny radix-2 FFT
  function fft(re, im) {
    const n = re.length;
    for (let i = 1, j = 0; i < n; i++) {
      let bit = n >> 1;
      for (; j & bit; bit >>= 1) j ^= bit;
      j ^= bit;
      if (i < j) { let t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; }
    }
    for (let len = 2; len <= n; len <<= 1) {
      const ang = (-2 * Math.PI) / len, wr = Math.cos(ang), wi = Math.sin(ang);
      for (let i = 0; i < n; i += len) {
        let cr = 1, ci = 0;
        for (let k = 0; k < len / 2; k++) {
          const ur = re[i + k], ui = im[i + k];
          const vr = re[i + k + len / 2] * cr - im[i + k + len / 2] * ci;
          const vi = re[i + k + len / 2] * ci + im[i + k + len / 2] * cr;
          re[i + k] = ur + vr; im[i + k] = ui + vi;
          re[i + k + len / 2] = ur - vr; im[i + k + len / 2] = ui - vi;
          const ncr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = ncr;
        }
      }
    }
  }

  // ---------------------------------------------------------- chords + key
  const NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  const TEMPLATES = [];
  for (let r = 0; r < 12; r++) {
    const maj = new Float32Array(12), min = new Float32Array(12), dom = new Float32Array(12);
    maj[r] = 1.0; maj[(r + 4) % 12] = 0.8; maj[(r + 7) % 12] = 0.9;
    min[r] = 1.0; min[(r + 3) % 12] = 0.8; min[(r + 7) % 12] = 0.9;
    dom[r] = 1.0; dom[(r + 4) % 12] = 0.7; dom[(r + 7) % 12] = 0.8; dom[(r + 10) % 12] = 0.6;
    TEMPLATES.push({ name: NAMES[r], v: maj }, { name: NAMES[r] + "m", v: min }, { name: NAMES[r] + "7", v: dom });
  }
  const K_MAJ = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
  const K_MIN = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];

  function corr(a, b) {
    const n = a.length;
    let ma = 0, mb = 0;
    for (let i = 0; i < n; i++) { ma += a[i]; mb += b[i]; }
    ma /= n; mb /= n;
    let num = 0, da = 0, db = 0;
    for (let i = 0; i < n; i++) {
      num += (a[i] - ma) * (b[i] - mb);
      da += (a[i] - ma) ** 2; db += (b[i] - mb) ** 2;
    }
    return num / (Math.sqrt(da * db) || 1);
  }

  function guessKey(meanChroma) {
    let best = null;
    for (let r = 0; r < 12; r++) {
      const rotM = [], rotN = [];
      for (let i = 0; i < 12; i++) { rotM[i] = K_MAJ[(i - r + 12) % 12]; rotN[i] = K_MIN[(i - r + 12) % 12]; }
      const cM = corr(meanChroma, rotM), cN = corr(meanChroma, rotN);
      if (!best || cM > best.score) best = { name: NAMES[r], score: cM };
      if (cN > best.score) best = { name: NAMES[r] + "m", score: cN };
    }
    return best.name;
  }

  // ---------------------------------------------------------- analysis
  const SR = 22050, WIN = 8192, HOP = 4096;

  async function analyze(file, onProgress) {
    const buf = await file.arrayBuffer();
    const probe = new (window.AudioContext || window.webkitAudioContext)();
    const decoded = await probe.decodeAudioData(buf);
    probe.close && probe.close();
    const frames = Math.ceil((decoded.duration * SR) / 1);
    const off = new OfflineAudioContext(1, frames, SR);
    const src = off.createBufferSource();
    src.buffer = decoded; src.connect(off.destination); src.start();
    const mono = (await off.startRendering()).getChannelData(0);

    // bin → pitch-class map (55 Hz .. 1760 Hz)
    const binPc = new Int8Array(WIN / 2).fill(-1);
    for (let b = 1; b < WIN / 2; b++) {
      const f = (b * SR) / WIN;
      if (f < 55 || f > 1760) continue;
      const midi = 69 + 12 * Math.log2(f / 440);
      if (Math.abs(midi - Math.round(midi)) < 0.35) binPc[b] = ((Math.round(midi) % 12) + 12) % 12;
    }
    const hann = new Float32Array(WIN);
    for (let i = 0; i < WIN; i++) hann[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (WIN - 1));

    const raw = [];
    const nFrames = Math.max(1, Math.floor((mono.length - WIN) / HOP));
    const meanChroma = new Float32Array(12);
    for (let fi = 0; fi < nFrames; fi++) {
      const re = new Float32Array(WIN), im = new Float32Array(WIN);
      const o = fi * HOP;
      for (let i = 0; i < WIN; i++) re[i] = (mono[o + i] || 0) * hann[i];
      fft(re, im);
      const chroma = new Float32Array(12);
      for (let b = 1; b < WIN / 2; b++) {
        const pc = binPc[b];
        if (pc >= 0) chroma[pc] += Math.hypot(re[b], im[b]);
      }
      let mx = 0;
      for (let i = 0; i < 12; i++) mx = Math.max(mx, chroma[i]);
      if (mx > 0) for (let i = 0; i < 12; i++) { chroma[i] /= mx; meanChroma[i] += chroma[i]; }
      let best = 0, bestScore = -1;
      TEMPLATES.forEach((tp, i) => {
        let s = 0, tn = 0;
        for (let k = 0; k < 12; k++) { s += chroma[k] * tp.v[k]; tn += tp.v[k] * tp.v[k]; }
        s /= Math.sqrt(tn);
        if (s > bestScore) { bestScore = s; best = i; }
      });
      raw.push(mx > 0 ? best : -1);
      if (fi % 32 === 0 && onProgress) { onProgress(fi / nFrames); await new Promise((r) => setTimeout(r)); }
    }

    // median smoothing (window 5) then merge runs, drop segments < 0.6 s
    const sm = raw.map((_, i) => {
      const w = raw.slice(Math.max(0, i - 2), i + 3).filter((v) => v >= 0).sort((a, b) => a - b);
      return w.length ? w[Math.floor(w.length / 2)] : -1;
    });
    const secPerHop = HOP / SR;
    const timeline = [];
    sm.forEach((v, i) => {
      const t = i * secPerHop;
      if (v < 0) return;
      const name = TEMPLATES[v].name;
      const last = timeline[timeline.length - 1];
      if (last && last.chord === name) last.end = t + secPerHop;
      else timeline.push({ start: t, end: t + secPerHop, chord: name });
    });
    const clean = timeline.filter((s) => s.end - s.start >= 0.6);
    const counts = {};
    let total = 0;
    clean.forEach((s) => { const d = s.end - s.start; counts[s.chord] = (counts[s.chord] || 0) + d; total += d; });
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([c]) => c);
    return {
      key: guessKey(meanChroma),
      duration: decoded.duration,
      chords_timeline: clean.map((s) => ({ start: +s.start.toFixed(2), end: +s.end.toFixed(2), chord: s.chord })),
      core_progression: top,
      detected_with: "OSO Orchestrator in-browser ear (FFT chroma + 36 templates) — EXPERIMENTAL draft, bless before trusting",
    };
  }

  // ---------------------------------------------------------- UI
  function init() {
    const inp = $("in-audio"), out = $("detect-out");
    if (!inp) return;
    inp.addEventListener("change", async (ev) => {
      const f = ev.target.files[0];
      if (!f) return;
      out.innerHTML = '<p class="hint">🧪 listening… <span id="det-pct">0</span>%</p>';
      try {
        const res = await analyze(f, (p) => { const el = $("det-pct"); if (el) el.textContent = Math.round(p * 100); });
        window.OSO_LAST_DETECTION = res;
        out.innerHTML =
          `<p><strong>Rough draft ear:</strong> key guess <strong>${res.key}</strong> · ` +
          `most-heard chords: <strong>${res.core_progression.join(" – ") || "?"}</strong> · ` +
          `${res.chords_timeline.length} segments over ${Math.round(res.duration)}s.</p>` +
          `<p class="hint">This ear is a sketch, not a verdict. Paste the lyrics in the first tab, then click words in Step ② to place these chords where they truly land — or download the JSON below and refine it.</p>` +
          `<button id="det-dl">download detection JSON</button>`;
        $("det-dl").addEventListener("click", () => {
          const a = document.createElement("a");
          a.href = URL.createObjectURL(new Blob([JSON.stringify(res, null, 1)], { type: "application/json" }));
          a.download = (f.name.replace(/\.[^.]+$/, "") || "detection") + ".detect.json";
          document.body.appendChild(a); a.click();
          setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 400);
        });
      } catch (e) {
        out.innerHTML = `<p class="hint">Couldn’t decode that file (${e.message}). Try an mp3/wav/m4a.</p>`;
      }
    });
  }
  document.addEventListener("DOMContentLoaded", init);
})();
