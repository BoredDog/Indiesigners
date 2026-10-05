class_name ComicLayout
extends RefCounted
## Splits a page into panel frames row by row (port of src/comic/layout.ts gridFrames).
## rows: [{ "h": 1, "cols": [1, 1.25] }, …] relative heights / widths.

static func grid_frames(bounds: Rect2, rows: Array, gutter := 22.0, margin := 28.0) -> Array[Rect2]:
	var inner := Rect2(bounds.position + Vector2(margin, margin), bounds.size - Vector2(margin, margin) * 2.0)
	var total_h := 0.0
	for r in rows:
		total_h += float(r.h)
	var usable_h := inner.size.y - gutter * (rows.size() - 1)
	var frames: Array[Rect2] = []
	var y := inner.position.y
	for r in rows:
		var rh: float = round(float(r.h) / total_h * usable_h)
		var total_w := 0.0
		for c in r.cols:
			total_w += float(c)
		var usable_w: float = inner.size.x - gutter * (r.cols.size() - 1)
		var x := inner.position.x
		for c in r.cols:
			var cw: float = round(float(c) / total_w * usable_w)
			frames.append(Rect2(x, y, cw, rh))
			x += cw + gutter
		y += rh + gutter
	return frames
