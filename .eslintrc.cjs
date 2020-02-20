module.exports = {
	"env": {
		"browser": true,
		"node": true,
		"es6": true
	},
	"plugins": [
		"svelte3"
	],
	"extends": [
		"./es-internal/eslint-config-es-base-js"
	],
	"parserOptions": {
		"ecmaVersion": 2019,
		"sourceType": "module"
	},
	"overrides": [{
		"files": ["**/*.svelte"],
		"processor": "svelte3/svelte3"
	}],
	"rules": {
		"semi": [
			"warn",
			"never"
		],
		"indent": [
			"warn",
			"tab"
		],
		"no-sparse-arrays": 0,
		"no-param-reassign": 0,
		"no-unused-vars": "warn",
		"no-unused-expressions": 0,
	},
	settings: {
		'svelte3/ignore-warnings': warning => {
			return warning.code === "missing-custom-element-compile-options"
		}
	}
}

