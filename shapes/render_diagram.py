#!/usr/bin/env python3
"""Render a chord-shape entry (see README.md schema) into inline SVGs:
guitar grid, ukulele grid, mandolin grid (GDAE), banjo grid (gDGBD with
dashed drone-string column: ○ = open g drone fits, ✕ = omit/spike it),
mini piano with pressed keys, bass positions.

Pure Python stdlib, print-friendly (black on white, grayscale-safe).

Usage:
    python3 render_diagram.py G                       # HTML fragment for one chord to stdout
    python3 render_diagram.py Fsharp_minor.json       # same, by filename
    python3 render_diagram.py --preview out.html G Em C D "F#m" Bb

Library use:
    from render_diagram import load_entry, render_all
    svgs = render_all(load_entry("F#m"))   # {"guitar":..,"ukulele":..,"piano":..,"bass":..}
"""
import json, os, sys, html

HERE = os.path.dirname(os.path.abspath(__file__))

INK = "#1b1b1b"        # strokes & dots
FAINT = "#8a8a8a"      # grid lines
PRESS = "#d9d9d9"      # pressed white piano key tint


def load_entry(sym):
    """Load a chord entry by symbol (e.g. 'F#m'), file token or filename."""
    if sym.endswith(".json"):
        path = sym if os.path.isabs(sym) else os.path.join(HERE, sym)
        return json.load(open(path))
    idx = json.load(open(os.path.join(HERE, "index.json")))
    fname = idx.get(sym)
    if not fname:
        raise KeyError(f"unknown chord symbol: {sym!r}")
    return json.load(open(os.path.join(HERE, fname)))


# ---------------------------------------------------------------- fret grids

def _grid_svg(frets, fingers, barres, tuning, dot_labels=None, n_frets_min=4):
    """Generic vertical fretboard diagram. Lowest string on the left, nut on top."""
    n = len(frets)
    played = [f for f in frets if f > 0]
    max_f = max(played) if played else 0
    start = 1 if max_f <= n_frets_min + 1 else min(played)
    nfr = max(n_frets_min, (max_f - start + 1))

    sp = 22          # string spacing
    fh = 26          # fret row height
    left, top = 30, 34
    w = left + sp * (n - 1) + (44 if start > 1 else 26)
    h = top + fh * nfr + 26
    x = lambda s: left + sp * s               # string index -> x
    ymid = lambda f: top + fh * (f - start) + fh / 2   # fret number -> row center

    out = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" '
           f'viewBox="0 0 {w} {h}" font-family="Helvetica,Arial,sans-serif">']
    # nut or position label
    if start == 1:
        out.append(f'<rect x="{x(0)-1.5}" y="{top-4}" width="{sp*(n-1)+3}" height="4" fill="{INK}"/>')
    else:
        out.append(f'<text x="{x(n-1)+16}" y="{ymid(start)+4}" font-size="12" fill="{INK}" '
                   f'text-anchor="start">{start}fr</text>')
    # grid
    for s in range(n):
        out.append(f'<line x1="{x(s)}" y1="{top}" x2="{x(s)}" y2="{top+fh*nfr}" '
                   f'stroke="{INK}" stroke-width="1.2"/>')
    for f in range(nfr + 1):
        out.append(f'<line x1="{x(0)}" y1="{top+fh*f}" x2="{x(n-1)}" y2="{top+fh*f}" '
                   f'stroke="{FAINT}" stroke-width="1"/>')
    # barres
    for bf in barres or []:
        idxs = [s for s, f in enumerate(frets) if f >= bf]
        if len(idxs) >= 2:
            x0, x1 = x(min(idxs)), x(max(idxs))
            out.append(f'<rect x="{x0-7}" y="{ymid(bf)-7}" width="{x1-x0+14}" height="14" '
                       f'rx="7" fill="{INK}"/>')
    # open / muted markers + dots
    for s, f in enumerate(frets):
        if f == -1:
            out.append(f'<text x="{x(s)}" y="{top-10}" font-size="13" fill="{INK}" '
                       f'text-anchor="middle">&#10005;</text>')
        elif f == 0:
            out.append(f'<circle cx="{x(s)}" cy="{top-14}" r="4.5" fill="none" '
                       f'stroke="{INK}" stroke-width="1.4"/>')
        else:
            in_barre = any(f == bf for bf in (barres or []))
            label = None
            if dot_labels is not None:
                label = dot_labels[s]
            elif fingers and fingers[s]:
                label = str(fingers[s])
            if not in_barre or dot_labels is not None:
                out.append(f'<circle cx="{x(s)}" cy="{ymid(f)}" r="8" fill="{INK}"/>')
            if label:
                out.append(f'<text x="{x(s)}" y="{ymid(f)+3.5}" font-size="10" fill="#fff" '
                           f'text-anchor="middle" font-weight="bold">{label}</text>')
    # string names
    for s, t in enumerate(tuning):
        out.append(f'<text x="{x(s)}" y="{top+fh*nfr+16}" font-size="11" fill="{FAINT}" '
                   f'text-anchor="middle">{t}</text>')
    out.append('</svg>')
    return "".join(out)


def guitar_svg(entry):
    g = entry["guitar"]
    return _grid_svg(g["frets"], g.get("fingers"), g.get("barres"), g["tuning"])


def ukulele_svg(entry):
    u = entry["ukulele"]
    return _grid_svg(u["frets"], u.get("fingers"), u.get("barres"), u["tuning"])


def mandolin_svg(entry):
    """4-course grid, GDAE low->high (each line = one double course)."""
    m = entry["mandolin"]
    return _grid_svg(m["frets"], m.get("fingers"), m.get("barres"), m["tuning"])


def banjo_svg(entry):
    """5-string open-G banjo: 4 fretted strings (D G B D) as a normal grid,
    plus the short 5th drone string as a dashed column on the left —
    marked ● g (open drone fits the chord) or ✕ (clashes: omit / spike it)."""
    b = entry["banjo"]
    core = _grid_svg(b["frets"], b.get("fingers"), b.get("barres"), "DGBD")
    drone = b.get("drone", {})
    fits = drone.get("fits_open", False)
    sp, left, top = 22, 30, 34
    dx = 24                      # extra width for the drone column
    # shift the whole core diagram right by dx, widen the canvas
    import re
    def bump_w(mo):
        return f'width="{float(mo.group(1)) + dx}"'
    core = re.sub(r'width="([\d.]+)"', bump_w, core, count=1)
    core = re.sub(r'viewBox="0 0 ([\d.]+) ', lambda mo: f'viewBox="0 0 {float(mo.group(1))+dx} ', core, count=1)
    core = core.replace('<svg ', f'<svg data-banjo="1" ', 1)
    # wrap all core content in a translated group
    head, body = core.split(">", 1)
    body = body.rsplit("</svg>", 1)[0]
    x0 = left - dx + 4           # drone column x (in un-translated coords, left of grid)
    # drone: dashed line over the lower 3/4 of the window (the short string
    # physically starts at the 5th fret — drawn symbolically)
    nfr_px = None
    # find grid height from the first string line we drew (top..top+fh*nfr)
    m2 = re.search(r'y2="([\d.]+)" stroke="%s" stroke-width="1.2"' % INK, body)
    ybot = float(m2.group(1)) if m2 else top + 26 * 4
    ytop = top + (ybot - top) * 0.25
    if fits:
        marker = (f'<circle cx="{x0}" cy="{top-14}" r="4.5" fill="none" '
                  f'stroke="{INK}" stroke-width="1.4"/>')
    else:
        marker = (f'<text x="{x0}" y="{top-10}" font-size="13" fill="{INK}" '
                  f'text-anchor="middle">&#10005;</text>')
    extra = (f'<line x1="{x0}" y1="{ytop}" x2="{x0}" y2="{ybot}" stroke="{FAINT}" '
             f'stroke-width="1.2" stroke-dasharray="3,3"/>'
             f'{marker}'
             f'<text x="{x0}" y="{ybot+16}" font-size="11" fill="{FAINT}" '
             f'text-anchor="middle" font-style="italic">g</text>')
    return f'{head}>{extra}<g transform="translate({dx},0)">{body}</g></svg>'


def bass_svg(entry):
    """Root/fifth/octave positions on an EADG grid, labelled R / 5 / 8."""
    b = entry["bass"]
    order = list(b["tuning"])  # E A D G, low to high
    frets = [-1] * 4
    labels = [None] * 4
    def put(stop, lab):
        if not stop: return
        s = order.index(stop["string"])
        frets[s] = stop["fret"]
        labels[s] = lab
    put(b.get("octave"), "8")
    put(b.get("fifth"), "5")
    put(b.get("fifth_below"), "5")
    put(b["root"], "R")     # root last so it wins its string
    # open strings need labels too -> render 0 as a labelled dot at the nut line
    svg = _grid_svg([f if f != 0 else 0 for f in frets], None, [], b["tuning"],
                    dot_labels=labels)
    # open-string R/5 markers: _grid_svg draws plain O; overlay label
    if any(f == 0 and lab for f, lab in zip(frets, labels)):
        # simplest correct approach: re-render with open strings shifted to a filled marker
        sp, left, top = 22, 30, 34
        extra = []
        for s, (f, lab) in enumerate(zip(frets, labels)):
            if f == 0 and lab:
                cx = left + sp * s
                extra.append(f'<circle cx="{cx}" cy="{top-14}" r="6.5" fill="{INK}"/>'
                             f'<text x="{cx}" y="{top-10.5}" font-size="9" fill="#fff" '
                             f'text-anchor="middle" font-weight="bold">{lab}</text>')
        svg = svg.replace("</svg>", "".join(extra) + "</svg>")
    return svg


# ---------------------------------------------------------------- mini piano

_WHITE_PCS = [0, 2, 4, 5, 7, 9, 11]              # C D E F G A B
_BLACK_AFTER = {0: 1, 2: 3, 5: 6, 7: 8, 9: 10}   # white pc -> black pc on its right


def piano_svg(entry, low_midi=60, n_white=15):
    """Mini keyboard C4..C6 (two octaves) with pressed keys tinted + dotted."""
    pressed = set(entry["piano"]["midi"])
    note_of = {m: n for n, m in zip(entry["piano"]["notes"], entry["piano"]["midi"])}
    ww, wh = 16, 64
    bw, bh = 10, 40
    top = 6
    w = ww * n_white + 2
    h = top + wh + 18
    out = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" '
           f'viewBox="0 0 {w} {h}" font-family="Helvetica,Arial,sans-serif">']
    # build white key list from low_midi (must be a white pc)
    whites = []
    m = low_midi
    while len(whites) < n_white:
        if m % 12 in _WHITE_PCS:
            whites.append(m)
        m += 1
    # white keys
    for i, m in enumerate(whites):
        fill = PRESS if m in pressed else "#fff"
        out.append(f'<rect x="{1+i*ww}" y="{top}" width="{ww}" height="{wh}" fill="{fill}" '
                   f'stroke="{INK}" stroke-width="1"/>')
        if m in pressed:
            cx = 1 + i * ww + ww / 2
            out.append(f'<circle cx="{cx}" cy="{top+wh-10}" r="4" fill="{INK}"/>')
            out.append(f'<text x="{cx}" y="{top+wh+13}" font-size="9" fill="{INK}" '
                       f'text-anchor="middle">{html.escape(note_of[m])}</text>')
    # black keys (drawn after so they sit on top)
    for i, m in enumerate(whites[:-1]):
        if m % 12 in _BLACK_AFTER:
            bm = m + 1
            cx = 1 + (i + 1) * ww  # boundary between this white key and the next
            fill = "#666" if bm in pressed else INK
            out.append(f'<rect x="{cx-bw/2}" y="{top}" width="{bw}" height="{bh}" fill="{fill}" '
                       f'stroke="{INK}" stroke-width="1"/>')
            if bm in pressed:
                out.append(f'<circle cx="{cx}" cy="{top+bh-8}" r="3.4" fill="#fff"/>')
                out.append(f'<text x="{cx}" y="{top+wh+13}" font-size="9" fill="{INK}" '
                           f'text-anchor="middle">{html.escape(note_of[bm])}</text>')
    out.append('</svg>')
    return "".join(out)


# ---------------------------------------------------------------- assembly

def render_all(entry):
    out = {"guitar": guitar_svg(entry), "ukulele": ukulele_svg(entry),
           "piano": piano_svg(entry), "bass": bass_svg(entry)}
    if "mandolin" in entry:
        out["mandolin"] = mandolin_svg(entry)
    if "banjo" in entry:
        out["banjo"] = banjo_svg(entry)
    return out


INSTRUMENT_ORDER = ["guitar", "ukulele", "mandolin", "banjo", "piano", "bass"]


def chord_html(entry):
    svgs = render_all(entry)
    cells = "".join(
        f'<figure class="d"><figcaption>{inst}</figcaption>{svgs[inst]}</figure>'
        for inst in INSTRUMENT_ORDER if inst in svgs)
    notes = " – ".join(entry["notes"])
    return (f'<section class="chord"><h2>{html.escape(entry["name"])} '
            f'<small>({html.escape(notes)})</small></h2><div class="row">{cells}</div></section>')


PAGE = """<!doctype html>
<html><head><meta charset="utf-8"><title>Chord shapes preview — ʻohana shapes DB</title>
<style>
 body {{ font-family: Georgia, serif; margin: 24px; color: #1b1b1b; }}
 h1 {{ font-size: 20px; }} h2 {{ margin: 4px 0 2px; font-size: 18px; }}
 h2 small {{ color: #777; font-weight: normal; font-size: 12px; }}
 .chord {{ page-break-inside: avoid; margin-bottom: 10px; border-bottom: 1px solid #ddd; }}
 .row {{ display: flex; gap: 18px; align-items: flex-end; flex-wrap: wrap; }}
 figure.d {{ margin: 0; text-align: center; }}
 figcaption {{ font-size: 10px; color: #888; text-transform: uppercase; letter-spacing: .08em; }}
 footer {{ color: #999; font-size: 11px; margin-top: 16px; }}
</style></head><body>
<h1>ʻOhana chord shapes — preview</h1>
{body}
<footer>Generated by render_diagram.py · shapes DB: /shared/songs/chords/shapes/ · CC0</footer>
</body></html>
"""


def main(argv):
    if argv and argv[0] == "--preview":
        out_path, syms = argv[1], argv[2:]
        body = "\n".join(chord_html(load_entry(s)) for s in syms)
        with open(out_path, "w") as f:
            f.write(PAGE.format(body=body))
        print(f"wrote {out_path} ({len(syms)} chords)")
    elif argv:
        for s in argv:
            print(chord_html(load_entry(s)))
    else:
        print(__doc__)


if __name__ == "__main__":
    main(sys.argv[1:])
