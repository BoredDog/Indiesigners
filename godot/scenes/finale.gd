extends SequenceScene
## Finale (port of FinaleScene.ts, Blueprint L): eight frames converging every witness's
## decisive clue on THE FIGURE, then the silhouette dissolves into young Elias.

const FX_SHADER := preload("res://comic/comic_fx.gdshader")


func _ready() -> void:
	backdrop_color = Color("06070a")
	if GameState.finale() != "complete":
		GameState.set_finale("revealed")
	super._ready()
	var border := Panel.new()
	var sb := StyleBoxFlat.new()
	sb.draw_center = false
	sb.border_color = Color(ComicTheme.SPIRIT_TEAL, 0.35)
	sb.set_border_width_all(10)
	border.add_theme_stylebox_override("panel", sb)
	border.position = Vector2(20, 20)
	border.size = Vector2(1880, 1040)
	border.mouse_filter = Control.MOUSE_FILTER_IGNORE
	border.z_index = 55
	add_child(border)


func has_own_button() -> bool:
	return true


func _dark(layer: Control, col := Color("10131a")) -> void:
	var r := Panel.new()
	var sb := StyleBoxFlat.new()
	sb.bg_color = col
	sb.border_color = ComicTheme.INK
	sb.set_border_width_all(6)
	r.add_theme_stylebox_override("panel", sb)
	r.position = FRAME.position
	r.size = FRAME.size
	r.mouse_filter = Control.MOUSE_FILTER_IGNORE
	layer.add_child(r)


func frames() -> Array[Callable]:
	var f: Array = StoryData.finale.frames
	var n := func(i): return f[i].narration
	var F := FRAME
	return [
		func(layer):  # 1 · three witness panels slide into one board
			var crops := [
				{"src": Rect2(780, 90, 470, 340), "who": "MIRA", "clue": "The bell rang with no hand on the rope."},
				{"src": Rect2(0, 760, 600, 320), "who": "ARUN", "clue": "The watch kept going: 2:31."},
				{"src": Rect2(1100, 430, 520, 400), "who": "LEELA", "clue": "The lantern binds minds as anchors."},
			]
			for i in crops.size():
				var target := Vector2(F.position.x + 60 + i * 510, F.position.y + 220)
				var p := panel(layer, crops[i].src, [], Rect2(target, Vector2(480, 360)))
				p.position = target + Vector2((i - 1) * 260, (i - 1) * 40)
				p.rotation_degrees = (i - 1) * 6
				var tw := p.create_tween().set_parallel().set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT)
				tw.tween_property(p, "position", target, ComicTheme.dur(0.9)).set_delay(0.3)
				tw.tween_property(p, "rotation_degrees", 0.0, ComicTheme.dur(0.9)).set_delay(0.3)
				var lab := Label.new()
				lab.text = "%s\n%s" % [crops[i].who, crops[i].clue]
				lab.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
				lab.autowrap_mode = TextServer.AUTOWRAP_WORD
				lab.add_theme_font_override("font", ComicTheme.font("narration"))
				lab.add_theme_font_size_override("font_size", 24)
				lab.position = Vector2(target.x, F.position.y + 640)
				lab.size = Vector2(480, 90)
				layer.add_child(lab)
			narration(layer, n.call(0), Vector2(F.position.x + 300, F.position.y + 80))
			sfx_word(layer, f[0].sfx, Vector2(F.position.x + 1300, F.position.y + 820), 46, 0.6, Color("b3261e")),
		func(layer):  # 2 · 2:17 clocks with Arun's 2:31 watch; its hand keeps moving
			panel(layer, Rect2(643, 150, 534, 300))
			var w := Vector2(F.position.x + 1250, F.position.y + 560)
			var face := Control.new()
			face.position = w
			face.draw.connect(func():
				face.draw_circle(Vector2.ZERO, 175, ComicTheme.AMBER)
				face.draw_circle(Vector2.ZERO, 165, ComicTheme.PAPER))
			layer.add_child(face)
			CoreUi.label(layer, w + Vector2(0, 70), "2:31", 54, ComicTheme.INK, Vector2(0.5, 0.5))
			clock_hand(layer, w, 80, 14, (2 + 31.0 / 60.0) * 5.0)
			var minute := clock_hand(layer, w, 130, 9, 31, Color("b3261e"))
			if not ComicTheme.reduce_motion:
				minute.create_tween().set_loops().tween_property(minute, "rotation", minute.rotation + TAU, 9.0).from(minute.rotation)
			narration(layer, n.call(1))
			sfx_word(layer, f[1].sfx, Vector2(F.position.x + 260, F.position.y + 760), 60),
		func(layer):  # 3 · Nia's clinic record; the redacted name resolves
			var p := panel(layer, Rect2(0, 690, 1920, 390))
			p.set_colour(0.25, 0.0)
			var nia := image(layer, "ph_nia", Vector2(F.position.x + 1260, F.end.y - 40), 1.7)
			nia.modulate.a = 0.85
			var d := document(layer, Vector2(F.position.x + 560, F.position.y + 520), Vector2(680, 420), "VEYRA CLINIC · RECORD", "", false, -3)
			d.text.queue_free()
			var body := RichTextLabel.new()
			body.bbcode_enabled = true
			body.scroll_active = false
			body.add_theme_font_override("normal_font", ComicTheme.font("narration"))
			body.add_theme_font_override("bold_font", ComicTheme.font("narration"))
			body.add_theme_font_size_override("normal_font_size", 30)
			body.add_theme_font_size_override("bold_font_size", 30)
			body.add_theme_color_override("default_color", ComicTheme.INK)
			body.position = Vector2(30, 90)
			body.size = Vector2(620, 300)
			var text := "Patient: %s\nSister of the lantern apprentice.\nMemory preservation trial: requested."
			body.text = ComicMarkup.to_bbcode(text % "[[Nia Vane]]")
			d.doc.add_child(body)
			var reveal: Tween = body.create_tween()  # dies with the frame if skipped past
			reveal.tween_interval(maxf(ComicTheme.dur(1.3), 0.05))
			reveal.tween_callback(func(): body.text = ComicMarkup.to_bbcode(text % "*Nia Vane*"))
			narration(layer, n.call(2), Vector2(F.position.x + 300, F.position.y + 70))
			sfx_word(layer, f[2].sfx, Vector2(F.position.x + 1450, F.position.y + 220), 64, 1.3),
		func(layer):  # 4 · console + 32 village nodes light up
			_dark(layer)
			var c := Vector2(F.get_center().x, F.get_center().y + 60)
			var nodes: Array[Vector2] = []
			for i in 32:
				var a := i * 2.39996
				var r := 140.0 + float((i * 97) % 300)
				nodes.append(c + Vector2(cos(a) * r * 1.9, sin(a) * r * 0.85))
			var lit := {"k": 0.0}
			var net := Control.new()
			net.mouse_filter = Control.MOUSE_FILTER_IGNORE
			net.draw.connect(func():
				for i in nodes.size():
					var on := i < int(lit.k)
					if on:
						net.draw_line(c, nodes[i], Color(ComicTheme.SPIRIT_TEAL, 0.7), 3.0)
					net.draw_circle(nodes[i], 9, ComicTheme.SPIRIT_TEAL if on else Color("3a4150"))
				net.draw_rect(Rect2(c - Vector2(60, 40), Vector2(120, 80)), Color("2a2a30")))
			layer.add_child(net)
			var tw := net.create_tween()
			tw.tween_interval(0.3)
			tw.tween_method(func(k: float):
				lit.k = k
				net.queue_redraw(), 0.0, 32.0, ComicTheme.dur(2.2))
			narration(layer, n.call(3))
			sfx_word(layer, f[3].sfx, Vector2(F.position.x + 1360, F.position.y + 150), 80, 1.8),
		func(layer):  # 5 · casebook threads snap onto THE FIGURE
			var paper := TextureRect.new()
			paper.texture = load("res://assets/textures/paper002.jpg")
			paper.stretch_mode = TextureRect.STRETCH_TILE
			paper.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
			paper.position = F.position
			paper.size = F.size
			paper.modulate = Color("8a6a48")
			layer.add_child(paper)
			var c := Vector2(F.get_center().x, F.get_center().y + 40)
			var cards := StoryData.casebook.filter(func(x): return String(x.id).begins_with("sis_") or String(x.id).begins_with("bro_") or String(x.id).begins_with("mom_"))
			var pins: Array[Vector2] = []
			var prog := {"p": 0.0}
			var lines := Control.new()
			lines.mouse_filter = Control.MOUSE_FILTER_IGNORE
			lines.draw.connect(func():
				for pin in pins:
					lines.draw_line(pin, pin + (c - Vector2(0, 120) - pin) * prog.p, Color("b3261e"), 4.0))
			layer.add_child(lines)
			var fig := image(layer, "ph_figure", c + Vector2(0, 150), 0.62)
			fig.modulate = Color.BLACK
			for i in cards.size():
				var a := -PI / 2 + float(i) / cards.size() * TAU
				var at := c + Vector2(cos(a) * 620, sin(a) * 300)
				pins.append(at)
				var card := Panel.new()
				var sb := StyleBoxFlat.new()
				sb.bg_color = ComicTheme.PAPER
				sb.border_color = ComicTheme.INK
				sb.set_border_width_all(3)
				card.add_theme_stylebox_override("panel", sb)
				card.size = Vector2(230, 80)
				card.position = at - card.size / 2.0
				card.mouse_filter = Control.MOUSE_FILTER_IGNORE
				var t := Label.new()
				t.text = cards[i].title
				t.autowrap_mode = TextServer.AUTOWRAP_WORD
				t.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
				t.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
				t.add_theme_font_override("font", ComicTheme.font("narration"))
				t.add_theme_font_size_override("font_size", 19)
				t.add_theme_color_override("font_color", ComicTheme.INK)
				t.size = card.size
				card.add_child(t)
				layer.add_child(card)
			var tw := lines.create_tween()
			tw.tween_interval(0.4)
			tw.tween_method(func(v: float):
				prog.p = v
				lines.queue_redraw(), 0.0, 1.0, ComicTheme.dur(0.9))
			narration(layer, n.call(4), Vector2(F.position.x + 260, F.end.y - 70))
			sfx_word(layer, f[4].sfx, c + Vector2(260, -200), 72, 1.3),
		func(layer):  # 6 · case request vs apprentice log: same hand
			_dark(layer, Color("16181f"))
			var line := "“Someone has to finish the record of Veyra.”"
			var left := document(layer, Vector2(F.position.x + 430, F.position.y + 500), Vector2(600, 460), "CASE REQUEST", "%s\n\n— unsigned" % line, true, -4)
			var right := document(layer, Vector2(F.position.x + 1170, F.position.y + 500), Vector2(600, 460), "APPRENTICE LOG · E. VANE", "%s\n\n— E.V." % line, true, 3)
			for d in [left, right]:
				var hl := ColorRect.new()
				hl.color = Color(ComicTheme.SPIRIT_TEAL, 0.35)
				hl.position = d.text.position - Vector2(8, 4)
				hl.size = Vector2(0, 100)
				hl.mouse_filter = Control.MOUSE_FILTER_IGNORE
				d.doc.add_child(hl)
				d.doc.move_child(hl, 1)
				hl.create_tween().tween_property(hl, "size:x", d.text.size.x + 16, ComicTheme.dur(0.7)).set_delay(1.1)
			var stamp := CoreUi.label(layer, Vector2(F.position.x + 800, F.position.y + 520), "SAME HAND", 64, Color("b3261e"), Vector2(0.5, 0.5))
			stamp.pivot_offset = stamp.size / 2.0
			stamp.rotation_degrees = -12
			stamp.modulate.a = 0.0
			stamp.scale = Vector2(2.2, 2.2)
			var st := stamp.create_tween().set_parallel()
			st.tween_property(stamp, "modulate:a", 0.9, ComicTheme.dur(0.26)).set_delay(2.0)
			st.tween_property(stamp, "scale", Vector2.ONE, ComicTheme.dur(0.26)).set_delay(2.0)
			narration(layer, n.call(5), Vector2(F.position.x + 330, F.position.y + 70))
			sfx_word(layer, f[5].sfx, Vector2(F.position.x + 1350, F.position.y + 820), 64, 2.3),
		func(layer):  # 7 · the silhouette dissolves into young Elias
			_dark(layer, Color("0d0e12"))
			var feet := Vector2(F.get_center().x + 250, F.end.y - 30)
			var young := image(layer, "ph_elias_young", feet, 1.3)
			var mat := ShaderMaterial.new()
			mat.shader = FX_SHADER
			mat.set_shader_parameter("ink", 1.0)
			mat.set_shader_parameter("halftone", 0.3)
			young.material = mat
			var shadow := image(layer, "ph_figure", feet, 1.3)
			shadow.modulate = Color.BLACK
			var tw: Tween = layer.create_tween().set_parallel()
			tw.tween_property(shadow, "modulate:a", 0.0, ComicTheme.dur(2.6)).set_delay(0.5)
			tw.tween_method(func(v: float): mat.set_shader_parameter("ink", v), 1.0, 0.0, ComicTheme.dur(3.2)).set_delay(0.9)
			narration(layer, n.call(6), Vector2(F.position.x + 380, F.position.y + 120))
			sfx_word(layer, f[6].sfx, Vector2(F.position.x + 380, F.position.y + 700), 90, 3.0),
		func(layer):  # 8 · young Elias at the console, reaching for the purge
			_dark(layer, Color("12141b"))
			var console := Panel.new()
			var sb := StyleBoxFlat.new()
			sb.bg_color = Color("2a2a30")
			sb.border_color = ComicTheme.SPIRIT_TEAL
			sb.set_border_width_all(6)
			console.add_theme_stylebox_override("panel", sb)
			console.size = Vector2(520, 300)
			console.position = Vector2(F.position.x + 900, F.position.y + 450)
			layer.add_child(console)
			var purge := Control.new()
			purge.position = Vector2(F.position.x + 1300, F.position.y + 560)
			purge.draw.connect(func(): purge.draw_circle(Vector2.ZERO, 40, Color("b3261e")))
			layer.add_child(purge)
			CoreUi.label(layer, Vector2(F.position.x + 1300, F.position.y + 630), "PURGE", 30, ComicTheme.PAPER, Vector2(0.5, 0.5))
			if not ComicTheme.reduce_flashing:
				var pt := purge.create_tween().set_loops()
				pt.tween_property(purge, "modulate:a", 0.4, 0.5)
				pt.tween_property(purge, "modulate:a", 1.0, 0.5)
			image(layer, "ph_elias_young", Vector2(F.position.x + 720, F.end.y - 20), 1.15)
			narration(layer, n.call(7), Vector2(F.position.x + 330, F.position.y + 90))
			sfx_word(layer, f[7].sfx, Vector2(F.position.x + 1150, F.position.y + 330), 54, 1.2, ComicTheme.PAPER)
			var b := CoreUi.button(layer, Vector2(F.end.x - 200, F.end.y - 70), f[7].get("button", "CONTINUE"), next, 0, 34, ComicTheme.SPIRIT_TEAL)
			b.name = "btn_CONTINUE",
	]


func finish() -> void:
	Router.goto("ending")
