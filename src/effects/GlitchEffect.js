import { DataTexture, FloatType, RGBFormat, Uniform, Vector2 } from "three";
import { Effect } from "./Effect.js";

import fragment from "./glsl/glitch/shader.frag";

/**
 * Returns a random integer in the specified range.
 *
 * @private
 * @param {Number} low - The lowest possible value.
 * @param {Number} high - The highest possible value.
 * @return {Number} The random value.
 */

function randomInt(low, high) {

	return low + Math.floor(Math.random() * (high - low + 1));

}

/**
 * Returns a random float in the specified range.
 *
 * @private
 * @param {Number} low - The lowest possible value.
 * @param {Number} high - The highest possible value.
 * @return {Number} The random value.
 */

function randomFloat(low, high) {

	return low + Math.random() * (high - low);

}

/**
 * A glitch effect.
 *
 * Reference: https://github.com/staffantan/unityglitch
 *
 * Warning: This effect cannot be merged with antialiasing effects. It is
 * recommended to run this effect last using a stand-alone {@link EffectPass}.
 */

export class GlitchEffect extends Effect {

	/**
	 * Constructs a new sepia effect.
	 *
	 * @param {Object} [options] - The options.
	 * @param {Texture} [options.perturbationMap] - A perturbation map. If none is provided, a noise texture will be created.
	 * @param {Number} [options.dtSize=64] - The size of the generated noise map. Will be ignored if a perturbation map is provided.
	 */

	constructor(options = {}) {

		const settings = Object.assign({
			perturbationMap: null,
			dtSize: 64
		}, options);

		super("GlitchEffect", fragment, {

			blendFunction: settings.blendFunction,

			uniforms: new Map([
				["perturbationMap", new Uniform(null)],
				["active", new Uniform(false)],
				["amount", new Uniform(0.8)],
				["angle", new Uniform(0.02)],
				["x", new Uniform(0.02)],
				["colS", new Uniform(0.05)],
				["seed", new Uniform(new Vector2(0.02, 0.02))],
				["distortion", new Uniform(new Vector2(0.5, 0.6))]
			])

		});

		/**
		 * The current perturbation map.
		 *
		 * @type {Texture}
		 * @private
		 */

		this.perturbationMap = null;

		this.setPerturbationMap((settings.perturbationMap !== null) ? settings.perturbationMap : this.generatePerturbationMap(settings.dtSize));
		this.perturbationMap.name = "Glitch.Perturbation";
		this.perturbationMap.generateMipmaps = false;

		/**
		 * The effect mode.
		 *
		 * @type {GlitchMode}
		 */

		this.mode = GlitchMode.SPORADIC;

		/**
		 * A counter for the glitch activation and deactivation.
		 *
		 * @type {Number}
		 * @private
		 */

		this.counter = 0;

		/**
		 * A random break point for the sporadic glitch activation.
		 *
		 * @type {Number}
		 * @private
		 */

		this.breakPoint = randomInt(120, 240);

	}

	/**
	 * Returns the current perturbation map.
	 *
	 * @return {Texture} The current perturbation map.
	 */

	getPerturbationMap() {

		return this.perturbationMap;

	}

	/**
	 * Destroys the current perturbation map and replaces it with the given one.
	 *
	 * @param {Texture} perturbationMap - The new perturbation map.
	 */

	setPerturbationMap(perturbationMap) {

		if(this.perturbationMap !== null) {

			this.perturbationMap.dispose();

		}

		this.perturbationMap = perturbationMap;
		this.uniforms.get("perturbationMap").value = perturbationMap;

	}

	/**
	 * Generates a perturbation map.
	 *
	 * @param {Number} [size=64] - The texture size.
	 * @return {DataTexture} The perturbation map.
	 */

	generatePerturbationMap(size = 64) {

		const pixels = size * size;
		const data = new Float32Array(pixels * 3);

		let i, x;

		for(i = 0; i < pixels; ++i) {

			x = Math.random();

			data[i * 3] = x;
			data[i * 3 + 1] = x;
			data[i * 3 + 2] = x;

		}

		return new DataTexture(data, size, size, RGBFormat, FloatType);

	}

	/**
	 * Updates this effect.
	 *
	 * @param {WebGLRenderer} renderer - The renderer.
	 * @param {WebGLRenderTarget} inputBuffer - A frame buffer that contains the result of the previous pass.
	 * @param {Number} [delta] - The time between the last frame and the current one in seconds.
	 */

	update(renderer, inputBuffer, delta) {

		const mode = this.mode;
		const counter = this.counter;
		const breakPoint = this.breakPoint;
		const uniforms = this.uniforms;

		uniforms.get("x").value = Math.random();
		uniforms.get("active").value = true;

		if(counter % breakPoint === 0 || mode === GlitchMode.CONSTANT_WILD) {

			uniforms.get("amount").value = Math.random() / 30.0;
			uniforms.get("angle").value = randomFloat(-Math.PI, Math.PI);
			uniforms.get("seed").set(randomFloat(-1.0, 1.0), randomFloat(-1.0, 1.0));
			uniforms.get("distortion").set(randomFloat(0.0, 1.0), randomFloat(0.0, 1.0));

			this.breakPoint = randomInt(120, 240);
			this.counter = 0;

		} else {

			if(counter % breakPoint < breakPoint / 5 || mode === GlitchMode.CONSTANT_MILD) {

				uniforms.get("amount").value = Math.random() / 90.0;
				uniforms.get("angle").value = randomFloat(-Math.PI, Math.PI);
				uniforms.get("seed").set(randomFloat(-0.3, 0.3), randomFloat(-0.3, 0.3));
				uniforms.get("distortion").set(randomFloat(0.0, 1.0), randomFloat(0.0, 1.0));

			} else {

				// Sporadic.
				uniforms.get("active").value = false;

			}

		}

		++this.counter;

	}

}

/**
 * A glitch mode enumeration.
 *
 * @type {Object}
 * @property {Number} SPORADIC - Sporadic glitches.
 * @property {Number} CONSTANT_MILD - Constant mild glitches.
 * @property {Number} CONSTANT_WILD - Constant wild glitches.
 */

export const GlitchMode = {

	SPORADIC: 0,
	CONSTANT_MILD: 1,
	CONSTANT_WILD: 2

};
