# eslint-config-es-base-js

A starting point for new JS package ESLint configurations at EquipmentShare.

## Goals

Code quality rules and style choices chosen by some JS-lovers at EquipmentShare.

They should be easy for you to use as a default, and simple for you to override any individual rules based on your team's preferences.

## To use in your own projects

```sh
npm i --save-dev @equipmentshare/eslint-config-es-base-js
```

And add this to your `.eslintrc`:

```json
{
	"extends": [
		"@equipmentshare/es-base-js"
	]
}
```

### Autoformatting

It's a great idea to configure your editor to have eslint auto-fix your file on save.  This gives you a great code auto-formatter, since almost all of the meaningful code style options are fixable, as well as many of the code-quality rules.

For the benefit of folks opening MRs against your codebases, it's good form to include an `autoformat` script in your `package.json`, e.g.

```json
{
	"scripts": {
		"autoformat": "eslint src/js/ --fix --ext .js,.ts"
	}
}
```

## "Problems" versus "styles"

"Problems" are issues in code that will always produce undesired/unexpected behavior.

Stylistic rules are issues that some people may have differing opinions on – either pure stylistic issues like whitespace or brace placement, or code that might seem risky/undesirable to some folks, but some people are willing to tolerate in their own code.

If you disagree with any of the style vs problem judgments, feel free to bring them up in the `#eslint-config-working-group` Slack channel.

You can include only the "problems" rules if you prefer:

```json
{
	"extends": [
		"@equipmentshare/es-base-js/problems.eslintrc.js"
	]
}
```

or just the "styles" rules:

```json
{
	"extends": [
		"@equipmentshare/es-base-js/styles.eslintrc.js"
	]
}
```

## Warnings versus errors

Issues that will cause parse errors or runtime exceptions are set to "error".  Everything else is set to "warn".

If you want eslint to return a non-zero exit code when it finds any warnings, use `eslint --max-warnings=0`.


## Contributing

Want to contribute? Check out [CONTRIBUTING.md](./CONTRIBUTING.md)

## Creators

The following people were involved in the creation of this config as well as the selection of rules contained within.

- Josh Duff
- Dylan Klohr
- Steven Kolb
- Brian Reynolds
- Sarah Johnston
- Troy Blank
