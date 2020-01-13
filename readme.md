# date-range-input

Allows users to select a date range

## Install

```sh
npm i @equipmentshare/date-range-input
```

## How to use

### As vanilla JS

```js
import DateRangeInput from '@equipmentshare/date-range-input'

const dateRangeInput = new DateRangeInput({
	target: document.querySelector('div.date-range-input'),
	props: {
	}
})

dateRangeInput.$on('change', event => console.log(event.detail))
```

### As a custom element

```js
import '@equipmentshare/date-range-input/custom-element'
```

```html
<date-range-input></date-range-input>
```

### As a Svelte component

```html
<script>
import DateRangeInput from '@equipmentshare/date-range-input'
</script>

<DateRangeInput>
```

## How to test/develop

```sh
npm run dev
```

Edit `src/TestApp.svelte` to play with the component.
