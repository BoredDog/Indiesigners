"""One-off generator for content/pages/{arun,leela}.json from content/memory_text.json.

Places bubbles/fragments with simple rules based on each panel's real size; positions are then
hand-tuned in the JSON (re-running overwrites them). Usage: python tools/gen-pages.py arun leela
"""
import json
import sys

BOUNDS = {"x": 60, "y": 24, "w": 1580, "h": 1032}  # MemoryScene PAGE_BOUNDS
MARGIN, GUTTER = 28, 22

LAYOUTS = {
    # Blueprint H2: Arun "2x3 grid; P2/P4 wide action panels"
    "arun": [{"h": 1, "cols": [0.8, 1.3]}, {"h": 1, "cols": [0.8, 1.3]}, {"h": 1, "cols": [1, 1]}],
    # Leela "2x3 grid; P1/P4 wide setup panels"
    "leela": [{"h": 1, "cols": [1.3, 0.8]}, {"h": 1, "cols": [0.8, 1.3]}, {"h": 1, "cols": [1, 1]}],
}
# Placeholder crops of the procedural village (swap for bg_arun / bg_leela when Arya's art lands).
SRCS = {
    "arun": [(0, 760, 700, 320), (790, 210, 240, 180), (300, 780, 900, 300), (600, 560, 900, 420), (620, 480, 380, 380), (0, 820, 1920, 260)],
    "leela": [(1100, 430, 640, 400), (780, 90, 270, 340), (90, 480, 520, 360), (500, 450, 1000, 450), (820, 160, 320, 300), (600, 480, 600, 420)],
}


def frames(layout):
    iw, ih = BOUNDS["w"] - 2 * MARGIN, BOUNDS["h"] - 2 * MARGIN
    total_h = sum(r["h"] for r in layout)
    usable_h = ih - GUTTER * (len(layout) - 1)
    out = []
    for r in layout:
        rh = round(r["h"] / total_h * usable_h)
        usable_w = iw - GUTTER * (len(r["cols"]) - 1)
        for c in r["cols"]:
            out.append((round(c / sum(r["cols"]) * usable_w), rh))
    return out


def build(w):
    text = json.load(open("content/memory_text.json", encoding="utf-8"))["pages"][w]
    sizes = frames(LAYOUTS[w])
    page = {
        "witness": w,
        "title": text["title"],
        "background": "ph_village",
        "layout": LAYOUTS[w],
        "panels": [],
        "openingNarration": text["openingNarration"],
        "closingNarration": text["closingNarration"],
        "bubbles": [],
        "fragments": [],
    }
    first_done = False
    for i, p in enumerate(text["panels"]):
        pw, ph = sizes[i]
        sx, sy, sw, sh = SRCS[w][i]
        panel = {"id": p["id"], "src": {"x": sx, "y": sy, "w": sw, "h": sh}}
        if p.get("silhouette"):
            panel["cutouts"] = [{"key": "ph_figure", "x": round(pw * 0.82), "y": round(ph * 0.98), "scale": 0.42}]
        page["panels"].append(panel)

        nw = min(320, round(pw * 0.48))
        if p.get("narration"):
            page["bubbles"].append({"panel": p["id"], "kind": "narration", "text": p["narration"], "x": nw // 2 + 24, "y": 62, "maxWidth": nw})
        for j, d in enumerate(p.get("dialogue", [])):
            kind = "shout" if d.get("tone") in ("shouting",) else "speech"
            line = d["line"]
            if d.get("tone") == "fragmented memory":
                line = f"~{line}~"
            bx = pw - 150 if j == 0 else pw - 330
            by = 70 if j == 0 else 175
            page["bubbles"].append({"panel": p["id"], "kind": kind, "text": line, "x": bx, "y": by, "tail": {"x": -40, "y": 70}, "maxWidth": 220})
        for k, ev in enumerate(p["evidence"]):
            frag = {"evidence": ev, "panel": p["id"], "x": round(pw * (0.22 if k == 0 else 0.6)), "y": round(ph * 0.46)}
            if not first_done:
                frag["first"] = True
                first_done = True
            page["fragments"].append(frag)
    path = f"content/pages/{w}.json"
    json.dump(page, open(path, "w", encoding="utf-8"), indent=2, ensure_ascii=False)
    open(path, "a").write("\n")
    print("wrote", path, "panel sizes", sizes)


for w in sys.argv[1:]:
    build(w)
