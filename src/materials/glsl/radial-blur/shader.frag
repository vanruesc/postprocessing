#include <common>
#include <dithering_pars_fragment>

uniform sampler2D inputBuffer;
uniform vec3 center;
uniform float exposure;
uniform float decay;
uniform float density;
uniform float weight;
uniform float clampMax;

varying vec2 vUv;

void main() {

	vec2 coord = vUv;

	// Calculate the vector from this pixel to the center in screen space.
	vec2 delta = coord - center.st;
	delta *= 1.0 / NUM_SAMPLES_FLOAT * density;

	// A decreasing illumination factor.
	float illuminationDecay = 1.0;

	vec4 sample;
	vec4 color = vec4(0.0);

	/* Estimate the probability of occlusion at each pixel by summing samples
	along a ray to the center position. */
	for(int i = 0; i < NUM_SAMPLES_INT; i++) {

		coord -= delta;
		sample = texture2D(inputBuffer, coord);

		// Apply the sample attenuation scale/decay factors.
		sample *= illuminationDecay * weight;
		color += sample;

		// Update the exponential decay factor.
		illuminationDecay *= decay;

	}

	gl_FragColor = clamp(color * exposure, 0.0, clampMax);

	#include <dithering_fragment>

}
