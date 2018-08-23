import { Uniform, Vector2 } from "three";
import { Effect } from "./Effect.js";

import fragment from "./glsl/dot-screen/shader.frag";

/**
 * A dot screen effect.
 */

export class DotScreenEffect extends Effect {

	/**
	 * Constructs a new dot screen effect.
	 *
	 * @param {Object} [options] - The options.
	 * @param {Number} [options.angle=1.57] - The angle of the dot pattern.
	 * @param {Number} [options.scale=1.0] - The scale of the dot pattern.
	 * @param {Number} [options.intensity=1.0] - The intensity of the effect.
	 */

	constructor(options = {}) {

		const settings = Object.assign({
			angle: Math.PI * 0.5,
			scale: 1.0,
			intensity: 1.0
		}, options);

		super("DotScreenEffect", fragment, {

			uniforms: new Map([
				["angle", new Uniform(new Vector2())],
				["scale", new Uniform(settings.scale)],
				["intensity", new Uniform(settings.intensity)]
			])

		});

		this.setAngle(settings.angle);

	}

	/**
	 * Sets the pattern angle.
	 *
	 * @param {Number} [angle] - The angle of the dot pattern.
	 */

	setAngle(angle) {

		this.uniforms.get("angle").value.set(Math.sin(angle), Math.cos(angle));

	}

}
