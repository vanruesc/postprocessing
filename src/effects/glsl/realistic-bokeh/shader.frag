uniform float focus;
uniform float focalLength;
uniform float maxBlur;
uniform float luminanceThreshold;
uniform float luminanceGain;
uniform float bias;
uniform float fringe;

#ifdef PENTAGON

	float pentagon(const in vec2 coords) {

		const vec4 HS0 = vec4( 1.0,          0.0,         0.0, 1.0);
		const vec4 HS1 = vec4( 0.309016994,  0.951056516, 0.0, 1.0);
		const vec4 HS2 = vec4(-0.809016994,  0.587785252, 0.0, 1.0);
		const vec4 HS3 = vec4(-0.809016994, -0.587785252, 0.0, 1.0);
		const vec4 HS4 = vec4( 0.309016994, -0.951056516, 0.0, 1.0);
		const vec4 HS5 = vec4( 0.0,          0.0,         1.0, 1.0);

		const vec4 ONE = vec4(1.0);

		const float P_FEATHER = 0.4;
		const float N_FEATHER = -P_FEATHER;

		float inOrOut = -4.0;

		vec4 P = vec4(coords, vec2(RINGS_FLOAT - 1.3));

		vec4 dist = vec4(
			dot(P, HS0),
			dot(P, HS1),
			dot(P, HS2),
			dot(P, HS3)
		);

		dist = smoothstep(N_FEATHER, P_FEATHER, dist);

		inOrOut += dot(dist, ONE);

		dist.x = dot(P, HS4);
		dist.y = HS5.w - abs(P.z);

		dist = smoothstep(N_FEATHER, P_FEATHER, dist);
		inOrOut += dist.x;

		return clamp(inOrOut, 0.0, 1.0);

	}

#endif

vec3 processTexel(const in vec2 coords, const in float blur) {

	vec3 c = vec3(
		texture2D(inputBuffer, coords + vec2(0.0, 1.0) * texelSize * fringe * blur).r,
		texture2D(inputBuffer, coords + vec2(-0.866, -0.5) * texelSize * fringe * blur).g,
		texture2D(inputBuffer, coords + vec2(0.866, -0.5) * texelSize * fringe * blur).b
	);

	// Calculate the luminance of the constructed colour.
	float luminance = linearToRelativeLuminance(c);
	float threshold = max((luminance - luminanceThreshold) * luminanceGain, 0.0);

	return c + mix(vec3(0.0), c, threshold * blur);

}

float gather(const in float i, const in float j, const in float ringSamples,
	const in vec2 uv, const in vec2 blurFactor, const in float blur, inout vec3 color) {

	const float TWO_PI = 6.28318531;
	float step = TWO_PI / ringSamples;
	float wh = vec2(cos(j * step) * i, sin(j * step) * i);

	#ifdef PENTAGON

		float p = pentagon(wh);

	#else

		float p = 1.0;

	#endif

	color += processTexel(wh * blurFactor + uv, blur) * mix(1.0, i / RINGS_FLOAT, bias) * p;

	return mix(1.0, i / RINGS_FLOAT, bias) * p;

}

void mainImage(const in vec4 inputColor, const in vec2 uv, const in float depth, out vec4 outputColor) {

	#ifdef MANUAL_DOF

		const float nDoFStart = 1.0; 
		const float nDoFDist = 2.0;
		const float fDoFStart = 1.0;
		const float fDoFDist = 3.0;

		float focalPlane = depth - focus;
		float farDoF = (focalPlane - fDoFStart) / fDoFDist;
		float nearDoF = (-focalPlane - nDoFStart) / nDoFDist;

		float blur = (focalPlane > 0.0) ? farDoF : nearDoF;

	#else

		const float CIRCLE_OF_CONFUSION = 0.03; // 35mm film = 0.03mm CoC.

		float focalPlaneMM = focus * 1000.0;
		float depthMM = depth * 1000.0;

		float focalPlane = (depthMM * focalLength) / (depthMM - focalLength);
		float farDoF = (focalPlaneMM * focalLength) / (focalPlaneMM - focalLength);
		float nearDoF = (focalPlaneMM - focalLength) / (focalPlaneMM * focalStop * CIRCLE_OF_CONFUSION);

		float blur = abs(focalPlane - farDoF) * nearDoF;

	#endif

	blur = clamp(blur, 0.0, 1.0);

	float blurFactor = vec2(
		texelSize.x * blur * maxBlur,
		texelSize.y * blur * maxBlur
	);

	const int MAX_RING_SAMPLES = RINGS_INT * SAMPLES_INT;

	vec4 color = inputColor;

	if(blur >= 0.05) {

		float s = 1.0;
		int ringSamples;

		for(int i = 1; i <= RINGS_INT; i++) {

			ringSamples = i * SAMPLES_INT;

			for(int j = 0; j < MAX_RING_SAMPLES; j++) {

				if(j >= ringSamples) {

					break;

				}

				s += gather(float(i), float(j), float(ringSamples), uv, blurFactor, blur, color.rgb);

			}

		}

		color.rgb /= s;

	}

	#ifdef SHOW_FOCUS

		float edge = 0.002 * depth;
		float m = clamp(smoothstep(0.0, edge, blur), 0.0, 1.0);
		float e = clamp(smoothstep(1.0 - edge, 1.0, blur), 0.0, 1.0);

		color.rgb = mix(color.rgb, vec3(1.0, 0.5, 0.0), (1.0 - m) * 0.6);
		color.rgb = mix(color.rgb, vec3(0.0, 0.5, 1.0), ((1.0 - e) - (1.0 - m)) * 0.2);

	#endif

	outputColor = color;

}