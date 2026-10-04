// Port of src/comic/ComicFxPipeline.ts: one shader for every comic look, so art is drawn once
// in full colour.
//   colour   0 = greyscale memory, 1 = full colour
//   halftone 0..1 strength of the rotated dot screen (screen-space, like the Phaser build)
//   dot      dot cell size in screen pixels
//   ink      0..1 black ink creeping over the image (darks first)
shader_type canvas_item;

uniform float colour : hint_range(0.0, 1.0) = 1.0;
uniform float halftone : hint_range(0.0, 1.0) = 0.55;
uniform float dot = 6.0;
uniform float ink : hint_range(0.0, 1.0) = 0.0;

float hash(vec2 p) {
	return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

void fragment() {
	vec4 c = texture(TEXTURE, UV) * COLOR;
	if (c.a <= 0.0) {
		discard;
	}
	vec3 rgb = c.rgb;
	float lum = dot(rgb, vec3(0.299, 0.587, 0.114));

	vec3 grey = vec3(lum) * vec3(1.0, 0.97, 0.9);
	vec3 col = mix(grey, rgb, colour);

	vec2 px = FRAGCOORD.xy;
	float a = 0.7853982;
	vec2 r = mat2(vec2(cos(a), sin(a)), vec2(-sin(a), cos(a))) * px;
	vec2 cell = mod(r, dot) - 0.5 * dot;
	float d = length(cell) / (0.5 * dot);
	float radius = sqrt(1.0 - lum) * 1.1;
	float dot_mask = 1.0 - smoothstep(radius - 0.15, radius + 0.15, d);
	col *= 1.0 - halftone * 0.5 * dot_mask;

	float n = hash(floor(px / 3.0));
	float ink_amt = clamp((ink * 1.15 - lum) * 2.5 - n * 0.35, 0.0, 1.0);
	col = mix(col, vec3(0.05, 0.05, 0.07), ink_amt);

	COLOR = vec4(col, c.a);
}
