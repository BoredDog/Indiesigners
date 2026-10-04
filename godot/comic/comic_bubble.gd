class_name ComicBubble
extends Control
## Speech / thought / shout bubbles and narration / evidence caption boxes
## (port of src/comic/Bubble.ts). Positioned by its centre via place_at(); tail is relative
## to the centre. appear() plays the Blueprint N "rises 6 px" entrance.

var kind := "speech"
var tail := Vector2.ZERO
var has_tail := false
var _label: RichTextLabel
var _home := Vector2.ZERO

const OUTLINE := 4.0


static func make(kind_: String, text: String, max_width := 0.0, font_size := 0, tail_ = null) -> ComicBubble:
	var b := ComicBubble.new()
	b._build(kind_, text, max_width, font_size, tail_)
	return b


func _build(kind_: String, text: String, max_width: float, font_size: int, tail_) -> void:
	kind = kind_
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	var is_box := kind == "narration" or kind == "evidence"
	var fs := font_size if font_size > 0 else (24 if is_box else 28)
	var mw := max_width if max_width > 0.0 else (380.0 if is_box else 320.0)
	var font := ComicTheme.font("narration" if is_box else "speech")
	var pad := Vector2(18, 14) if is_box else Vector2(30, 22)

	var measured := font.get_multiline_string_size(ComicMarkup.plain(text), HORIZONTAL_ALIGNMENT_LEFT, mw, fs)
	var text_size := Vector2(minf(measured.x, mw) + 4.0, measured.y + 6.0)

	_label = RichTextLabel.new()
	_label.bbcode_enabled = true
	_label.scroll_active = false
	_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_label.add_theme_font_override("normal_font", font)
	_label.add_theme_font_override("bold_font", ComicTheme.font("speech_bold") if not is_box else font)
	_label.add_theme_font_size_override("normal_font_size", fs)
	_label.add_theme_font_size_override("bold_font_size", fs)
	_label.add_theme_color_override("default_color", ComicTheme.INK)
	_label.text = ("" if is_box else "[center]") + ComicMarkup.to_bbcode(text) + ("" if is_box else "[/center]")
	_label.size = text_size
	_label.position = pad
	add_child(_label)

	size = text_size + pad * 2.0
	pivot_offset = size / 2.0
	if tail_ != null:
		tail = tail_
		has_tail = true


## Put the bubble's centre at `p` (parent coordinates).
func place_at(p: Vector2) -> ComicBubble:
	_home = p - size / 2.0
	position = _home
	return self


func appear(delay := 0.0) -> ComicBubble:
	modulate.a = 0.0
	position = _home + Vector2(0, 6)
	var tw := create_tween().set_ease(Tween.EASE_OUT).set_trans(Tween.TRANS_CUBIC)
	tw.tween_interval(delay)
	tw.tween_property(self, "modulate:a", 1.0, ComicTheme.dur(ComicTheme.BUBBLE_APPEAR))
	tw.parallel().tween_property(self, "position", _home, ComicTheme.dur(ComicTheme.BUBBLE_APPEAR))
	return self


func _draw() -> void:
	var c := size / 2.0
	var w := size.x
	var h := size.y
	match kind:
		"narration", "evidence":
			var fill := ComicTheme.PAPER if kind == "narration" else ComicTheme.EVIDENCE_FILL
			draw_rect(Rect2(Vector2(6, 6), size), Color(ComicTheme.INK, 0.35))
			draw_rect(Rect2(Vector2.ZERO, size), fill)
			draw_rect(Rect2(Vector2.ZERO, size), ComicTheme.INK, false, 3.0)
			if kind == "evidence":
				draw_line(Vector2(3, 6), Vector2(3, h - 6), ComicTheme.SPIRIT_TEAL, 4.0)
		"speech":
			if has_tail:
				_tail(c, ComicTheme.INK, OUTLINE)
			_rounded(Rect2(Vector2(-OUTLINE, -OUTLINE), size + Vector2(OUTLINE, OUTLINE) * 2.0), ComicTheme.INK, 34)
			if has_tail:
				_tail(c, ComicTheme.WHITE, 0.0)
			_rounded(Rect2(Vector2.ZERO, size), ComicTheme.WHITE, 30)
		"thought":
			draw_colored_polygon(_ellipse(c, Vector2(w + 34 + OUTLINE * 2, h + 26 + OUTLINE * 2) / 2.0), ComicTheme.INK)
			draw_colored_polygon(_ellipse(c, Vector2(w + 34, h + 26) / 2.0), ComicTheme.WHITE)
			if has_tail:
				var ts := [0.62, 0.8, 0.93]
				for i in ts.size():
					var p: Vector2 = c + tail * ts[i]
					var r := 12.0 - i * 3.5
					draw_circle(p, r + OUTLINE, ComicTheme.INK)
					draw_circle(p, r, ComicTheme.WHITE)
		"shout":
			if has_tail:
				_tail(c, ComicTheme.INK, OUTLINE)
			draw_colored_polygon(burst_points(c, w * 0.62 + 30 + OUTLINE, h * 0.62 + 26 + OUTLINE, 18, 0.18), ComicTheme.INK)
			if has_tail:
				_tail(c, ComicTheme.WHITE, 0.0)
			draw_colored_polygon(burst_points(c, w * 0.62 + 30, h * 0.62 + 26, 18, 0.18), ComicTheme.WHITE)


func _rounded(r: Rect2, col: Color, radius: int) -> void:
	var sb := StyleBoxFlat.new()
	sb.bg_color = col
	sb.set_corner_radius_all(radius)
	sb.anti_aliasing = true
	draw_style_box(sb, r)


func _tail(c: Vector2, col: Color, grow: float) -> void:
	var angle := atan2(tail.y, tail.x)
	var edge: float = min(abs(size.x / 2.0 / cos(angle)), abs(size.y / 2.0 / sin(angle))) * 0.8
	var b := c + Vector2(cos(angle), sin(angle)) * edge
	var n := Vector2(-sin(angle), cos(angle))
	var half := 16.0 + grow
	var tip := c + tail + Vector2(cos(angle), sin(angle)) * grow * 2.0
	draw_colored_polygon(PackedVector2Array([b + n * half, b - n * half, tip]), col)


func _ellipse(c: Vector2, r: Vector2, steps := 48) -> PackedVector2Array:
	var pts := PackedVector2Array()
	for i in steps:
		var a := TAU * i / steps
		pts.append(c + Vector2(cos(a) * r.x, sin(a) * r.y))
	return pts


## Jagged starburst around `c` (same deterministic jitter as the Phaser build).
static func burst_points(c: Vector2, rx: float, ry: float, spikes: int, depth: float) -> PackedVector2Array:
	var pts := PackedVector2Array()
	for i in spikes * 2:
		var a := TAU * i / (spikes * 2)
		var k := 1.0 if i % 2 == 0 else 1.0 - depth - 0.06 * sin(i * 12.9898)
		pts.append(c + Vector2(cos(a) * rx * k, sin(a) * ry * k))
	return pts
