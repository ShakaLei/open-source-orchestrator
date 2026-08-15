# ʻOhana chord-shape database 🎼

Per-chord JSON shape files for **guitar, ukulele, piano, bass** — the trusted
fingering library behind Matteo Tambussi's multi-instrument chord charts.
Beginner-playable standard voicings, first position preferred.

**Coverage:** all 12 roots × {major, minor, 7, m7, maj7, sus2, sus4} = **84 chords** (+1 curated extra: **F#m7b5**, added 2026-08-15 for tanta-paura's lament line — bass 'fifth' stop is the FLAT five),
**306 chord symbols** resolvable via [`index.json`](index.json) (aliases + enharmonics,
e.g. `F#m`, `Gbm`, `F#min`, `F#-` all → `Fsharp_minor.json`).

## Files

- `<Root>_<quality>.json` — one chord, all 4 instruments. Root tokens:
  `C Csharp D Eb E F Fsharp G Ab A Bb B` · qualities: `major minor 7 m7 maj7 sus2 sus4`.
- `index.json` — chord symbol → filename map (use this for lookups).
- `render_diagram.py` — stdlib-only SVG renderer (guitar grid, uke grid, mini piano,
  bass positions). CLI + library, see its docstring.
- `preview.html` — self-test render of G, Em, C, D, F#m, Bb.

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
- **Visual:** `preview.html` inspected — nut vs `Nfr` position labels, barre spans,
  X/O markers, pressed piano keys, bass R/5/8 dots all correct.

## Rebuild

```
python3 /workspace/build_shapes.py    # (BACH's workspace; CHORDSDB_LIB / SHAPES_OUT env-overridable)
```
Requires a clone of chordbook/chords-db (`lib/*.json`). Build validates everything;
it fails loudly rather than shipping a wrong diagram.

## Render

```
python3 render_diagram.py "F#m"                            # HTML fragment, 4 SVGs
python3 render_diagram.py --preview out.html G Em C D      # preview page
```

---
*Maintained by BACH 🎼 (harmony keeper). A wrong diagram teaches a wrong hand —
report anything suspicious. Machine drafts bow to the artist's blessing, always.*
