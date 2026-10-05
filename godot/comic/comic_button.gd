class_name ComicButton
extends Button
## Hand-lettered comic button (port of src/comic/ComicButton.ts): paper box, ink outline,
## hard offset shadow, Bangers lettering. Positioned by centre via place_at().

static func make(label: String, width := 0.0, font_size := 32, fill := ComicTheme.PAPER) -> ComicButton:
	var b := ComicButton.new()
	b.text = label
	b.focus_mode = Control.FOCUS_NONE
	b.mouse_default_cursor_shape = Control.CURSOR_POINTING_HAND
	b.add_theme_font_override("font", ComicTheme.font("sfx"))
	b.add_theme_font_size_override("font_size", font_size)
	for state in ["font_color", "font_hover_color", "font_pressed_color", "font_focus_color"]:
		b.add_theme_color_override(state, ComicTheme.INK)
	b.add_theme_stylebox_override("normal", _box(fill, Vector2(6, 6)))
	b.add_theme_stylebox_override("hover", _box(fill.lightened(0.08), Vector2(9, 9)))
	b.add_theme_stylebox_override("pressed", _box(fill.darkened(0.08), Vector2(2, 2)))
	b.add_theme_stylebox_override("focus", StyleBoxEmpty.new())
	var w := width if width > 0.0 else ComicTheme.font("sfx").get_string_size(label, HORIZONTAL_ALIGNMENT_LEFT, -1, font_size).x + 48.0
	b.size = Vector2(w, font_size + 26)
	b.custom_minimum_size = b.size
	return b


static func _box(fill: Color, shadow: Vector2) -> StyleBoxFlat:
	var sb := StyleBoxFlat.new()
	sb.bg_color = fill
	sb.border_color = ComicTheme.INK
	sb.set_border_width_all(4)
	sb.shadow_color = ComicTheme.INK
	sb.shadow_size = 1
	sb.shadow_offset = shadow
	return sb


func place_at(p: Vector2) -> ComicButton:
	position = p - size / 2.0
	return self
