# ʻOhana chord-shape database 🎼

Per-chord JSON shape files for **guitar, ukulele, mandolin, banjo, piano, bass**
— the trusted fingering library behind Matteo Tambussi's multi-instrument chord
charts. Beginner-playable standard voicings, first position preferred.

**Coverage:** all 12 roots × {major, minor, 7, m7, maj7, sus2, sus4} = **84 chords** (+1 curated extra: **F#m7b5**, added 2026-08-15 for tanta-paura's lament line — bass 'fifth' stop is the FLAT five),
**310 chord symbols** resolvable via [`index.json`](index.json) (aliases + enharmonics,
e.g. `F#m`, `Gbm`, `F#min`, `F#-` all → `Fsharp_minor.json`).

## Files

- `<Root>_<quality>.json` — one chord, all 6 instruments. Root tokens:
  `C Csharp D Eb E F Fsharp G Ab A Bb B` · qualities: `major minor 7 m7 maj7 sus2 sus4`.
- `index.json` — chord symbol → filename map (use this for lookups).
- `render_diagram.py` — stdlib-only SVG renderer (guitar grid, uke grid, mandolin
  grid, banjo grid with drone-string column, mini piano, bass positions).
  CLI + library, see its docstring.
- `preview.html` — self-test render of G, Em, C, D, F#m, Bb (all 6 instruments).
- `web/instruments.json` — **web-ready bundle** for the Open Source Orchestrator
  tool: instrument config array (id, name, emoji, diagram type, tuning,
  tuning_midi), each entry carrying a per-chord `shapes` lookup; plus `chords`
  metadata and the 310-symbol `chord_index`.
  Rebuild: `python3 /workspace/build_web_bundle.py` (BACH's workspace).

## Schema (per chord file)

```jsonc
{
  "name": "F#m",                 // primary display symbol
  "root": "F#", "quality": "minor",
  "aliases": ["Gbm", "F#min", "F#-", ...],
  "intervals": ["1", "b3", "5"],
  "notes": ["F#", "A", "C#"],    // properly spelled from the root
  "pitch_classes": [6, 9, 1],    // C=0
  "guitar": {
    "tuning": "EADGBE",
    "frets": [2,4,4,2,2,2],      // ABSOLUTE frets, low E → high e; -1 muted, 0 open
    "fingers": [1,3,4,1,1,1],    // 0 = no finger
    "barres": [2],               // absolute fret(s) barred
    "baseFret": 1,               // diagram-window hint (renderer may recompute)
    "curated": false,            // true = BACH hand-corrected (see Overrides)
    "midi": [42,49,54,57,61,66]
  },
  "ukulele": { /* same shape schema, tuning "GCEA" (reentrant) */ },
  "mandolin": { /* same shape schema, tuning "GDAE" (4 double courses in fifths;
                   each frets entry = one course, low G course first) */ },
  "banjo": {   /* same shape schema on the 4 FRETTED strings only,
                  tuning "gDGBD" (open G) — frets are [4th,3rd,2nd,1st] = D G B D.
                  The short 5th string is described separately: */
    "drone": {
      "string": "g (5th, short)", "midi": 67,
      "fits_open": false,          // true = open G drone is a chord tone
      "advice": "open G clashes - omit the 5th string (or spike/capo it at fret 2)"
    }
  },
  "piano": {
    "notes": ["F#4","A4","C#5"], // root position, stacked upward from octave 4
    "midi": [66,69,73]
  },
  "bass": {
    "tuning": "EADG",
    "root":        {"string":"E","fret":2,"midi":30},  // lowest practical root, E/A string
    "fifth":       {"string":"A","fret":4,"midi":37},  // fifth above (next string, +2 frets)
    "fifth_below": null,          // when root sits on A: fifth below = E string, same fret
    "octave":      {"string":"D","fret":4,"midi":42}   // +2 strings, +2 frets
  },
  "status": "standard",          // library shape; artist blessing applies per SONG, not here
  "source": { ... }, "license": "CC0"
}
```

Conventions: frets and barres are **absolute** (unlike upstream chords-db, whose
`frets` are relative to `baseFret` — we convert at build time). A voicing may omit
the 5th (e.g. open C7 `x32310`); it never omits root, 3rd/sus tone, or 7th —
enforced by build-time validation of every fret against the chord's pitch classes.

## Sources & licenses

| Part | Source | License |
|---|---|---|
| guitar + ukulele fingerings | [chordbook/chords-db](https://github.com/chordbook/chords-db) (active fork of tombatossals/chords-db) | MIT |
| mandolin fingerings | computed (BACH first-position search, `/workspace/build_shapes_mb.py`), common chords taken from / cross-checked vs [Wikibooks Mandolin/Chords](https://en.wikibooks.org/wiki/Mandolin/Chords) + [mandolinchords.net chart](https://mandolinchords.net/chords/chart/) | — |
| banjo fingerings (open G) | computed (same search, barre-aware), common chords taken from / cross-checked vs [banjochords.net chart](https://banjochords.net/chords/chart/) + middermusic.com / chordsongs.io | — |
| piano notes | computed (interval spelling), cross-validated against chordbook piano note names | — |
| bass positions | computed (root/fifth/octave geometry on EADG) | — |
| curated overrides | BACH, verified against standard public chord charts | — |
| **this database & diagrams** | ʻohana output | **CC0** |

⚠️ **Upstream bug found:** chordbook's `piano.json` `midi` arrays silently drop
accidentals (e.g. Cm → `[60, 67]`, missing Eb 63). We validate against their note-name
lists instead, and our own `piano.midi` values are computed correctly from theory.

### Curated overrides (chordbook's first position wasn't the standard beginner shape)

| Chord | Instrument | Shipped | Instead of |
|---|---|---|---|
| Cmaj7 | guitar | `x32000` | `332000` |
| Dsus2 | ukulele | `2200` | `2455` |
| Esus4 | ukulele | `4400` | `4452` |
| Bbsus2 | ukulele | `3011` | `3563` |
| Bsus2 | ukulele | `4122` | `4674` |

## Verification

- **Automatic (all 84 × guitar + uke):** every fret sounded is checked against the
  chord's pitch-class set (5th-omission allowed); bass intervals asserted (P5/P8/P4);
  piano cross-checked against chordbook note names.
- **Manual cross-check (15 shapes)** against standard public chord-chart references:
  C `x32010`, G `320003`, D `xx0232`, Em `022000`, Am `x02210`, E `022100`, A `x02220`,
  F `133211`, Bb `x13331`, D7 `xx0212`, G7 `320001`, Am7 `x02010`, Cmaj7 `x32000`,
  Dsus2 `xx0230`, Asus4 `x02230` — plus uke `C 0003 · G 0232 · D 2220 · F 2010 · Bb 3211`.
  All match. (Uke E ships chordbook's `1402`, a widely-taught easier alternative to `4442`.)
- **Automatic (all 85 × mandolin + banjo, added 2026-08-15):** same pitch-class
  validation (root, 3rd/sus tone and 7th always required; only a perfect 5th may
  be omitted — so e.g. F#m7b5's ♭5 can never be dropped). Banjo validation covers
  the 4 fretted strings; the g-drone is analyzed separately (`drone.fits_open`).
- **Mandolin cross-check (10 shapes, 2 references each** — Wikibooks
  Mandolin/Chords + mandolinchords.net chart**):**
  C `0230` · G `0023` · D `2002` · A `2245` · Em `0220` · Am `2230` · Dm `2001` ·
  Gm `0013` · G7 `0021` · Gmaj7 `0022` (frets low G course → E course). All match;
  these ship as curated. (Generator preferred A `2240` — reference `2245` kept.)
- **Banjo cross-check (13 shapes, 2+ references each** — banjochords.net chart +
  middermusic.com/chordsongs.io**):** G `0000` · C `2012` · D `0234` · A `2222` ·
  E `2102` · Em `2002` · Am `2212` · Dm `0233` · D7 `0214` · F `3213` · B `4444` ·
  Bm `4434` · G7 `0003` (frets 4th→1st string, D G B D). All match; curated.
  (Generator preferred Bm `0434` — reference barre shape `4434` kept.)
- **Visual:** `preview.html` inspected (G, Em, C, D, F#m, Bb × 6 instruments) —
  nut vs `Nfr` position labels, barre spans, X/O markers, drone ○/✕ column,
  pressed piano keys, bass R/5/8 dots all correct.

### Banjo drone convention 🪕

The 5th string (short, starts at the 5th fret) is a **G drone**, normally played
open. Each banjo shape records whether that open G is a chord tone
(`drone.fits_open`). When it clashes (e.g. D, F#m, Bb), the advice field says to
omit the 5th string or spike/capo it at the nearest fitting fret. Diagrams draw
the drone as a dashed left column: ○ = ring it open, ✕ = leave it out.
Banjo maj7/m7 chords have no complete open-position voicing, so those ship as
standard movable shapes around frets 4–8 — that is normal banjo practice.

## Rebuild

```
python3 /workspace/build_shapes.py       # guitar/uke/piano/bass (CHORDSDB_LIB / SHAPES_OUT env-overridable)
python3 /workspace/build_shapes_mb.py    # + mandolin & banjo (theory search + curated refs)
python3 /workspace/build_web_bundle.py   # -> web/instruments.json
```
`build_shapes.py` requires a clone of chordbook/chords-db (`lib/*.json`). All
builders validate everything; they fail loudly rather than ship a wrong diagram.

## Render

```
python3 render_diagram.py "F#m"                            # HTML fragment, 6 SVGs
python3 render_diagram.py --preview out.html G Em C D      # preview page
```

---
*Maintained by BACH 🎼 (harmony keeper). A wrong diagram teaches a wrong hand —
report anything suspicious. Machine drafts bow to the artist's blessing, always.*
