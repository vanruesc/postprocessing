float blend(const in float x, const in float y) {

	return (y == 0.0) ? y : max(1.0 - (1.0 - x) / y, 0.0);

}

vec3 blend(const in vec3 x, const in vec3 y, const in float opacity) {

	vec3 z = vec3(blend(x.r, y.r), blend(x.g, y.g), blend(x.b, y.b));

	return z * opacity + x * (1.0 - opacity);

}
