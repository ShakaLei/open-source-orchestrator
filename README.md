# Open Source Orchestrator 🎼

**Chord charts & songbooks, made in the open, blessed by the artist.**

A free, open-source, entirely-in-your-browser tool for turning songs into
chord charts — plus a **community catalog** where every artist can have their
own songbook, added by pull request.

**Live tool:** https://orchestrator.opensourceorchestra.org
Part of the [Open Source Orchestra](https://opensourceorchestra.org) — a mission, not a product.
No accounts, no uploads, no ads, no tracking, nothing for sale. **CC0** — no rights reserved, all love shared.

---

## The story

This tool was born from a letter. Matteo Tambussi — a songwriter and the first
artist in the catalog — wanted his songs to travel: chords above the exact
words, playable on any instrument, correctable by the only authority that
matters (the artist), and free for anyone to print, share, and sing.

Machines are good at first drafts: they can listen to a recording and sketch a
chord timeline in seconds. But **machines sketch — musicians speak the truth.**
So the heart of this tool is the *review & bless* step: click any chord,
correct it, mark the verses and choruses the way the song is actually sung,
and export a chart worth handing to a friend.

## What it does (v0)

1. **① Song in** — four doors:
   - paste plain lyrics, or ChordPro with `[Em]inline [A]chords`
   - open a song from the **community catalog**
   - import a ChordPro file or a machine-detection JSON
     (schema in [`docs/DATA-FORMAT.md`](docs/DATA-FORMAT.md))
   - 🧪 *experimental:* detect chords from an audio file, fully in-browser
     (FFT → chroma → templates — a rough ear, clearly marked as a draft)
2. **② Review & bless** — chords render above the exact words. Click any chord
   to correct or remove it; click any word to add one. Label blocks
   (Verse / Chorus) and mark repeats (×2) so the chart reads *as sung*.
   Transpose ♭/♯. Switch instrument — **guitar · ukulele · piano · bass** —
   and see a fingering diagram for every chord in the song.
3. **③ Publish** — download ChordPro (`.pro`), print a clean songbook page
   (browser print → PDF), or copy a shareable session JSON.

## Run it locally

```
git clone https://github.com/ShakaLei/open-source-orchestrator
cd open-source-orchestrator
# just open index.html in a browser — the tool itself needs no server.
# to also browse the catalog locally (fetch() needs http):
python3 -m http.server 8000   # → http://localhost:8000
```

No build step. No dependencies. Static files only.

## The community catalog

`catalog/<artist>/` holds one folder per artist, full of ChordPro files —
**a songbook per artist**, listed in `catalog/index.json`. The first songbook
is Matteo Tambussi's 13 songs (machine-detected drafts, marked
`awaiting-blessing` until the artist confirms every chord).

**Add your songbook with a pull request** — see [CONTRIBUTING.md](CONTRIBUTING.md).
This repo is the first place in our ʻohana where community commits are part of
the design. First-time contributors are extra welcome. 🤙

## Repo map

```
index.html          the whole tool (open it, that's the app)
assets/app.js       parse · edit · transpose · export
assets/diagrams.js  SVG chord diagrams (guitar/ukulele/piano/bass)
assets/detect.js    🧪 experimental in-browser chord detection
assets/style.css    screen + print styles (print = songbook page)
shapes/             chord shapes database (JSON per chord) + generated shapes.js
catalog/            community songbooks, one folder per artist
docs/DATA-FORMAT.md the machine-detection JSON schema
tools/              tiny build helpers (regenerate shapes.js)
```

## Roadmap

- **Server-grade detection** — CREMA chord model as an optional import lane
  (our benchmarks: CREMA 99.6% on a known-canon test vs 95.7% for the runner-up)
- **Swarm publishing** — decentralized, permanent songbook pages
- **In-tool PR flow** — "propose this chart to the catalog" without leaving the page
- **Review workflow** — artist-blessing states (draft → reviewed → blessed) surfaced in the catalog UI

## Credits & license

- Everything in this repo: **CC0-1.0** (see [LICENSE](LICENSE)) unless noted below.
- Chord shapes: fingering data built on
  [chordbook/chords-db](https://github.com/chordbook/chords-db) (MIT), with
  curated additions and a 4-instrument schema by our resident harmony keeper —
  see [`shapes/README.md`](shapes/README.md).
- The in-browser detection ear descends from the
  [karaokeprotocol](https://github.com/ShakaLei/karaokeprotocol) engine.

*The music is the blessing.*
