# Contributing 🤙

Aloha — and welcome. If this is your first open-source contribution ever,
you're in exactly the right place: this project was *designed* to receive
community commits, and we will help you land yours.

## Add a songbook (the most wanted contribution)

One folder per artist, ChordPro files inside, one line in the index:

1. **Fork** this repo and create `catalog/your-artist-name/` (lowercase,
   hyphens: `catalog/jane-doe/`).
2. Add one **ChordPro** file per song (`.pro`). Minimal example:

   ```
   {title: My Song}
   {artist: Jane Doe}
   {key: G}
   {comment: blessed by the artist}

   {c: Verse 1}
   [G]butterflies and [Em]love
   [C]carry me [D]home

   {c: Chorus x2}
   [G]la la [D]la
   ```

   - chords go `[inline]` right before the syllable they land on
   - blank line = new block; `{c: Label xN}` names a block and marks repeats
   - a `{comment: …}` at the top is the provenance note — please say whether
     the chords are **artist-blessed** or a **draft**
3. List your songs in [`catalog/index.json`](catalog/index.json) (copy the
   existing artist entry and edit).
4. Open a **pull request**. That's it — we review with aloha, not gatekeeping.

**The artist's word is law.** Please only submit songbooks you have the right
to share: your own songs, songs whose artist asked you to, or public-domain
material. Everything in the catalog is CC0, so the artist must be genuinely
happy with that. Machine-detected drafts are welcome as long as they're
labeled as drafts awaiting blessing.

*Tip: you can build the whole chart in the
[tool](https://orchestrator.opensourceorchestra.org) itself and use
“⬇ ChordPro” in step ③ — the export is PR-ready.*

## Improve the tool

- The entire app is static, dependency-free, and readable:
  `index.html` + `assets/*.js`. Open an issue or just send a PR.
- If you touch `shapes/*.json`, regenerate the bundle:
  `python3 tools/build_shapes_bundle.py`
- Please test in a real browser before submitting (open `index.html`, click
  around; `python3 -m http.server` if you need the catalog).
- Keep it in the spirit of the place: **no ads, no trackers, no paywalls, no
  monetization — ever.** This is a mission, not a product.

## Add an instrument 🎸🪕

The instrument switcher is pluggable — an instrument is just:

1. per-chord data under a new field in `shapes/*.json` (e.g. `"mandolin": { "frets": …, "tuning": "GDAE" }`)
2. `python3 tools/build_shapes_bundle.py`
3. one entry in the `INSTRUMENTS` config at the top of `assets/diagrams.js`
   (types: `fretted` — any string count · `keyboard` · `positions`)

Buttons appear automatically once at least one chord carries the field.
Mandolin (GDAE) and banjo (open-G) shape sets are already in progress.

## Ideas we'd love help with

- more chord shapes (extended/altered chords, left-handed diagrams)
- better section auto-labeling on import
- CREMA-based detection lane · Swarm publishing · in-tool PR flow
- accessibility passes, translations, mobile polish

## Code of conduct: aloha

Be kind. Assume good faith. Newcomers are honored guests. Disagreements are
about the music, never about the person. If something feels off, open an issue
and we'll talk story.

*Mahalo for helping songs travel.* 🌺
