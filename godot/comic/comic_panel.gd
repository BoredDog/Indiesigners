class_name ComicPanel
extends Control
## One comic panel (port of src/comic/ComicPanel.ts): a crop of the page background plus
## cutouts, rendered into a SubViewport so the whole panel takes the comic shader as one image.
## `overlay` holds SFX words and bubbles in panel-local coordinates (not clipped).

const FX_SHADER := preload("res://comic/comic_fx.gdshader")

var def: Dictionary = {}
var overlay: Control
var material_fx: ShaderMaterial
var home_position := Vector2.ZERO
var _vp: SubViewport


static func make(bg: Texture2D, panel_def: Dictionary, frame: Rect2, quality := 2.0, grey := true) -> ComicPanel:
	var p := ComicPanel.new()
	p._build(bg, panel_def, frame, quality, grey)
	return p


func _build(bg: Texture2D, panel_def: Dictionary, frame: Rect2, quality: float, grey: bool) -> void:
	def = panel_def
	name = panel_def.get("id", "Panel")
	position = frame.position
	size = frame.size
	home_position = position
	pivot_offset = size / 2.0

	_vp = SubViewport.new()
	_vp.size = Vector2i(ceil(size.x * quality), ceil(size.y * quality))
	_vp.transparent_bg = false
	_vp.render_target_update_mode = SubViewport.UPDATE_ALWAYS
	add_child(_vp)

	# Background crop, cover-fitted to the frame.
	var src: Dictionary = panel_def.src
	var atlas := AtlasTexture.new()
	atlas.atlas = bg
	atlas.region = Rect2(src.x, src.y, src.w, src.h)
	var cover := maxf(size.x / src.w, size.y / src.h) * quality
	var bg_sprite := Sprite2D.new()
	bg_sprite.texture = atlas
	bg_sprite.scale = Vector2(cover, cover)
	bg_sprite.position = Vector2(_vp.size) / 2.0
	_vp.add_child(bg_sprite)

	for c in panel_def.get("cutouts", []):
		var tex: Texture2D = ComicTheme.art(c.key)
		if tex == null:
			continue
		var s := Sprite2D.new()
		s.texture = tex
		s.centered = false
		var sc: float = c.get("scale", 1.0) * quality
		s.scale = Vector2(sc, sc)
		s.flip_h = c.get("flipX", false)
		s.position = Vector2(c.x * quality - tex.get_width() * sc / 2.0, c.y * quality - tex.get_height() * sc)
		_vp.add_child(s)

	var view := TextureRect.new()
	view.texture = _vp.get_texture()
	view.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	view.stretch_mode = TextureRect.STRETCH_SCALE
	view.size = size
	view.mouse_filter = Control.MOUSE_FILTER_IGNORE
	material_fx = ShaderMaterial.new()
	material_fx.shader = FX_SHADER
	material_fx.set_shader_parameter("colour", 0.0 if grey else 1.0)
	view.material = material_fx
	add_child(view)

	overlay = Control.new()
	overlay.size = size
	overlay.mouse_filter = Control.MOUSE_FILTER_PASS
	add_child(overlay)


func _draw() -> void:
	draw_rect(Rect2(Vector2.ZERO, size), ComicTheme.INK, false, ComicTheme.PANEL_BORDER)


func colour() -> float:
	return material_fx.get_shader_parameter("colour")


## 0 = grey memory, 1 = full colour.
func set_colour(v: float, seconds := ComicTheme.COLOUR_FILL) -> void:
	_tween_param("colour", v, seconds)


func set_ink(v: float, seconds := 0.9) -> void:
	_tween_param("ink", v, seconds)


func set_halftone(v: float) -> void:
	material_fx.set_shader_parameter("halftone", v)


func _tween_param(param: String, to: float, seconds: float) -> void:
	var from: float = material_fx.get_shader_parameter(param)
	var d := ComicTheme.dur(seconds)
	if d <= 0.0:
		material_fx.set_shader_parameter(param, to)
		return
	create_tween().tween_method(func(x: float): material_fx.set_shader_parameter(param, x), from, to, d).set_trans(Tween.TRANS_SINE)
