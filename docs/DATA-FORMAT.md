# Data formats

Three JSON shapes flow through the Orchestrator. All are plain, readable JSON.

## 1. Machine-detection JSON (import)

Produced by a detection pipeline (ours: CREMA chord model + stable-ts forced
lyric alignment). The tool merges the chord timeline onto the timed words, so
each chord lands above the exact syllable where it changes.

Required fields (everything else is carried along or ignored):

```jsonc
{
  "title": "Island",
  "artist": "Matteo Tambussi",       // optional
  "key": "Bm",                        // optional
  "tempo": 89.1,                      // optional, bpm
  "detected_with": "CREMA … — DRAFT", // optional provenance note (shown on the chart)

  // chord segments, seconds, non-overlapping, sorted
  "chords_timeline": [
    { "start": 2.51, "end": 4.18, "chord": "Bm" },
    { "start": 4.18, "end": 8.17, "chord": "D" }
  ],

  // lyric lines with per-word timings (seconds)
  "lines": [
    {
      "text": "oh life",
      "start": 22.62, "end": 25.12,
      "words": [
        { "w": " oh",   "t": 22.62 },
        { "w": " life", "t": 22.92 }
      ]
    }
  ]
}
```

Import rules:
- a chord is attached to the first word whose time falls inside its segment
  (only on chord *changes* — repeats aren't re-marked)
- a silence gap of more than 3.5 s between lines starts a new block
- if `lines` is missing you'll get an empty chart — paste the lyrics first,
  then place the detected chords by hand

Our full pipeline files also carry `key_alternatives`, `confidence`,
`bach_notes` (theory-review annotations), `alignment` — all optional and
preserved-by-ignoring.

## 2. Session JSON (`*.oso.json`, export/import)

The tool's own editable state — lossless round trip:

```jsonc
{
  "format": "oso-orchestrator-v0",
  "meta": { "title": "…", "artist": "…", "key": "…", "tempo": "…", "comment": "…" },
  "sections": [
    {
      "label": "Chorus",
      "repeat": 2,                    // ×N as sung
      "lines": [
        [                             // a line = array of tokens
          { "c": "Em", "t": "oh " },  // c: chord or null · t: word fragment
          { "c": null, "t": "life " } //   (fragments may split mid-word: "l"+"ife")
        ]
      ]
    }
  ]
}
```

## 3. Chord shape entries (`shapes/*.json`)

One file per chord: intervals, notes, and per-instrument fingering data for
guitar, ukulele, piano, and bass. Schema documented in
[`../shapes/README.md`](../shapes/README.md). `shapes/index.json` maps every
accepted symbol spelling (`F#m`, `F#min`, `F#-` …) to its file;
`shapes/shapes.js` is the generated browser bundle
(`python3 tools/build_shapes_bundle.py`).

## ChordPro (`.pro`)

The catalog's native format — see the example in
[CONTRIBUTING.md](../CONTRIBUTING.md). Directives understood on import:
`{title}`, `{artist}`/`{subtitle}`, `{key}`, `{tempo}`, `{comment}`/`{c}`
(block label, `x2` suffix = repeat count), `{start_of_chorus}`/`{end_of_chorus}`.
