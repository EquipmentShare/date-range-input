import svelte from "rollup-plugin-svelte"
import resolve from "rollup-plugin-node-resolve"
import commonjs from "rollup-plugin-commonjs"
import sveltePreprocessPostcss from "svelte-preprocess-postcss"
import postcssImport from "postcss-import"

const stylePreprocessor = sveltePreprocessPostcss({
	useConfigFile: false,
	plugins: [
		postcssImport({
			path: "src",
		}),
	],
})

const customElement = process.env.OUTPUT === "custom-element"
const devMode = !!process.env.ROLLUP_WATCH
const testApp = devMode && !customElement

const outputFileName = customElement
	? "custom-element.js"
	: "bundle.js"

const outputPath = devMode
	? "./public/build/" + outputFileName
	: "./" + outputFileName

const componentConfig = {
	input: "src/DateRangeInput.svelte",
	output: {
		sourcemap: true,
		format: "esm",
		name: "DateRangeInput",
		file: outputPath,
	},
	plugins: [
		svelte({
			dev: devMode,
			preprocess: {
				style: stylePreprocessor,
			},
			customElement,
			tag: "time-input",
		}),
		resolve({
			browser: true,
			dedupe: importee => importee === "svelte" || importee.startsWith("svelte/"),
		}),
		commonjs(),
	],
	watch: {
		clearScreen: false,
	},
}

const testAppConfig = {
	input: "src/test-app.js",
	output: {
		sourcemap: true,
		format: "iife",
		name: "TimeInputTestApp",
		file: outputPath,
	},
	external: [],
}

export default testApp
	? Object.assign(componentConfig, testAppConfig)
	: componentConfig
