import {
	DataTexture,
	FloatType,
	RGBFormat,
	Uniform,
	Vector2
} from "three";

import { BlendFunction } from "./blending/BlendFunction.js";
import { Effect } from "./Effect.js";

import fragment from "./glsl/glitch/shader.frag";

/**
 * A label for generated data textures.
 *
 * @type {String}
 * @private
 */

const generatedTexture = "Glitch.Generated";

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
 * Thie effect can be paired with the {@link ChromaticAberrationEffect}.
 *
 * Reference: https://github.com/staffantan/unityglitch
 *
 * Warning: This effect cannot be merged with antialiasing effects. It is
 * recommended to run this effect in a separate {@link EffectPass}.
 */

export class GlitchEffect extends Effect {

	/**
	 * Constructs a new glitch effect.
	 *
	 * @param {Object} [options] - The options.
	 * @param {BlendFunction} [options.blendFunction=BlendFunction.NORMAL] - The blend function of this effect.
	 * @param {ChromaticAberrationEffect} [options.chromaticAberrationEffect] - A chromatic aberration effect that should be influenced by this glitch effect.
	 * @param {Texture} [options.perturbationMap] - A perturbation map. If none is provided, a noise texture will be created.
	 * @param {Number} [options.dtSize=64] - The size of the generated noise map. Will be ignored if a perturbation map is provided.
	 * @param {Number} [options.columns=0.05] - The scale of the blocky glitch columns.
	 */

	constructor(options = {}) {

		const settings = Object.assign({
			blendFunction: BlendFunction.NORMAL,
			chromaticAberrationEffect: null,
			perturbationMap: null,
			dtSize: 64,
			columns: 0.05
		}, options);

		super("GlitchEffect", fragment, {

			blendFunction: settings.blendFunction,

			uniforms: new Map([
				["perturbationMap", new Uniform(null)],
				["columns", new Uniform(settings.columns)],
				["active", new Uniform(false)],
				["random", new Uniform(0.02)],
				["seed", new Uniform(new Vector2())],
				["distortion", new Uniform(new Vector2())]
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
		this.perturbationMap.generateMipmaps = false;

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

		/**
		 * The effect mode.
		 *
		 * @type {GlitchMode}
		 */

		this.mode = GlitchMode.SPORADIC;

		/**
		 * The color offset of the given {@link ChromaticAberrationEffect}, or null.
		 *
		 * @type {Vector2}
		 * @private
		 */

		this.offset = null;

		if(settings.chromaticAberrationEffect !== null) {

			const uniforms = settings.chromaticAberrationEffect.uniforms;

			this.offset = uniforms.get("offset").value;
			uniforms.set("active", this.uniforms.get("active"));

		}

	}

	/**
	 * Indicates whether the glitch effect is currently active.
	 *
	 * @type {Boolean}
	 */

	get active() {

		return this.uniforms.get("active").value;

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
	 * Replaces the current perturbation map with the given one.
	 *
	 * The current map will be disposed if it was generated by this effect.
	 *
	 * @param {Texture} perturbationMap - The new perturbation map.
	 */

	setPerturbationMap(perturbationMap) {

		if(this.perturbationMap !== null && this.perturbationMap.name === generatedTexture) {

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

		const map = new DataTexture(data, size, size, RGBFormat, FloatType);
		map.name = generatedTexture;
		map.needsUpdate = true;

		return map;

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
		const offset = this.offset;
		const counter = this.counter;
		const breakPoint = this.breakPoint;
		const uniforms = this.uniforms;

		let active = false;

		if(mode !== GlitchMode.DISABLED) {

			uniforms.get("random").value = Math.random();

			if(counter % breakPoint === 0 || mode === GlitchMode.CONSTANT_WILD) {

				if(offset !== null) {

					const angle = randomFloat(-Math.PI, Math.PI);
					offset.set(Math.cos(angle), Math.sin(angle)).multiplyScalar(Math.random() / 30.0);

				}

				uniforms.get("seed").value.set(randomFloat(-1.0, 1.0), randomFloat(-1.0, 1.0));
				uniforms.get("distortion").value.set(randomFloat(0.0, 1.0), randomFloat(0.0, 1.0));
				active = true;

				this.breakPoint = randomInt(120, 240);
				this.counter = 0;

			} else if(counter % breakPoint < breakPoint / 5 || mode === GlitchMode.CONSTANT_MILD) {

				if(offset !== null) {

					const angle = randomFloat(-Math.PI, Math.PI);
					offset.set(Math.cos(angle), Math.sin(angle)).multiplyScalar(Math.random() / 90.0);

				}

				uniforms.get("seed").value.set(randomFloat(-0.3, 0.3), randomFloat(-0.3, 0.3));
				uniforms.get("distortion").value.set(randomFloat(0.0, 1.0), randomFloat(0.0, 1.0));
				active = true;

			}

			++this.counter;

		}

		uniforms.get("active").value = active;

	}

}

/**
 * A glitch mode enumeration.
 *
 * @type {Object}
 * @property {Number} DISABLED - No glitches.
 * @property {Number} SPORADIC - Sporadic glitches.
 * @property {Number} CONSTANT_MILD - Constant mild glitches.
 * @property {Number} CONSTANT_WILD - Constant wild glitches.
 */

export const GlitchMode = {

	DISABLED: 0,
	SPORADIC: 1,
	CONSTANT_MILD: 2,
	CONSTANT_WILD: 3

};
